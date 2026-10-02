import fs from 'fs';
import path from 'path';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import dotenv from 'dotenv';
import { ROOT_DIR } from './utils/paths.js';
import {
  rowsToSeries,
  parseDateHourKey,
  buildPeriodsPayload,
  sliceWindow,
  METRIC_NAMES,
  emptyMetrics,
  readMetrics,
  HOUR_MS,
} from './utils/analytics-windows.js';

dotenv.config();

const propertyId = '521215223'; // User provided GA4 Property ID
const outputPath = path.join(ROOT_DIR, 'content/data/analytics.json');
const summaryPath = path.join(ROOT_DIR, 'content/data/analytics-summary.json');

/* =========================================================================
 * Credentials
 * ========================================================================= */
function loadCredentials() {
  if (process.env.GA4_SECRET_JSON) {
    try {
      const credentials = JSON.parse(process.env.GA4_SECRET_JSON);
      console.log('✅ Found GA4 credentials from environment variable.');
      return credentials;
    } catch (e) {
      console.error('❌ Failed to parse GA4_SECRET_JSON:', e.message);
    }
  }
  return undefined; // Fall back to Application Default Credentials if present
}

/* =========================================================================
 * 1) All-time page views per slug  ->  content/data/analytics.json
 *    (نفس السلوك القديم تماماً، حتى لا ينكسر بناء الموقع)
 * ========================================================================= */
async function fetchPageViews(client) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '2024-01-01', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
  });

  const analyticsData = {};
  response.rows.forEach(row => {
    const rawPath = row.dimensionValues[0].value;
    const views = parseInt(row.metricValues[0].value, 10);

    let decodedPath = rawPath;
    try { decodedPath = decodeURIComponent(rawPath); } catch (e) { /* keep raw */ }

    // Normalize path to get the exact slug
    // E.g. "/article-my-slug.html?fbclid=123" -> "my-slug"
    const slugMatch = decodedPath.match(/^\/article-([^/?#\.]+)/);
    if (slugMatch) {
      const slug = slugMatch[1].trim().toLowerCase();
      analyticsData[slug] = (analyticsData[slug] || 0) + views;
    } else if (decodedPath === '/' || decodedPath.startsWith('/index.html')) {
      analyticsData['/'] = (analyticsData['/'] || 0) + views;
    }
  });

  return analyticsData;
}

/* =========================================================================
 * 2) Visitor windows  ->  content/data/analytics-summary.json
 *    24h / 48h / 30d / 365d + الفترة السابقة لكل منها
 * ========================================================================= */

/** إجماليات دقيقة لنافذة أيام كاملة (GA4 يحسب الزوار الفريدين بنفسه) */
async function fetchTotals(client, startDate, endDate) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: METRIC_NAMES.map(name => ({ name })),
    metricAggregations: ['TOTAL'],
  });

  const row = (response.totals && response.totals[0]) || (response.rows && response.rows[0]) || null;
  return row ? readMetrics(row) : emptyMetrics();
}

/** سلسلة ساعية لآخر أسبوع (تكفي لتغطية 48 ساعة + الفترة السابقة لها) */
async function fetchHourlySeries(client, { days = 7, limit = 1000 } = {}) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'dateHour' }],
    metrics: METRIC_NAMES.map(name => ({ name })),
    orderBys: [{ dimension: { dimensionName: 'dateHour' } }],
    limit,
  });
  return rowsToSeries(response.rows, parseDateHourKey);
}

async function fetchVisitorPeriods(client) {
  const warnings = [];

  // (أ) السلسلة الساعية: آخر 24 / 48 ساعة + الفترة السابقة
  let hourlySeries = [];
  try {
    hourlySeries = await fetchHourlySeries(client);
  } catch (e) {
    warnings.push(`hourly_report_failed: ${e.message}`);
    console.error('❌ Hourly report failed:', e.message);
  }
  if (hourlySeries.length === 0) {
    warnings.push('no_hourly_data');
  }

  // (ب) إجماليات الشهر (30 يوماً) والفترة السابقة (30 يوماً قبلها)
  let monthTotals = null;
  let monthPrevTotals = null;
  try {
    monthTotals = await fetchTotals(client, '29daysAgo', 'today');
    monthPrevTotals = await fetchTotals(client, '59daysAgo', '30daysAgo');
  } catch (e) {
    warnings.push(`month_report_failed: ${e.message}`);
    console.error('❌ Month report failed:', e.message);
  }

  // (ج) إجماليات السنة (365 يوماً) والفترة السابقة (365 يوماً قبلها)
  let yearTotals = null;
  let yearPrevTotals = null;
  try {
    yearTotals = await fetchTotals(client, '364daysAgo', 'today');
    yearPrevTotals = await fetchTotals(client, '729daysAgo', '365daysAgo');
  } catch (e) {
    warnings.push(`year_report_failed: ${e.message}`);
    console.error('❌ Year report failed:', e.message);
  }

  const periods = buildPeriodsPayload({
    hourlySeries,
    monthTotals,
    monthPrevTotals,
    yearTotals,
    yearPrevTotals,
  });

  // حدود النوافذ الساعية (للعرض في الواجهة)
  const h24 = sliceWindow(hourlySeries, 24 * HOUR_MS, 0);
  const h48 = sliceWindow(hourlySeries, 48 * HOUR_MS, 0);

  return {
    generatedAt: new Date().toISOString(),
    propertyId,
    source: 'ga4-data-api',
    note: 'Hourly windows end at the latest hour GA4 has data for; day windows use GA4 relative dates (property timezone).',
    hourlyRange: {
      start: hourlySeries.length ? new Date(hourlySeries[0].t).toISOString() : null,
      end: hourlySeries.length ? new Date(hourlySeries[hourlySeries.length - 1].t + HOUR_MS).toISOString() : null,
    },
    effectiveWindows: {
      h24: { start: h24.start ? new Date(h24.start).toISOString() : null, end: h24.end ? new Date(h24.end).toISOString() : null },
      h48: { start: h48.start ? new Date(h48.start).toISOString() : null, end: h48.end ? new Date(h48.end).toISOString() : null },
    },
    periods,
    warnings,
  };
}

/* =========================================================================
 * Main
 * ========================================================================= */
async function main() {
  console.log('🔄 Fetching GA4 Analytics...');

  const credentials = loadCredentials();
  const client = credentials
    ? new BetaAnalyticsDataClient({ credentials })
    : new BetaAnalyticsDataClient();

  let hadFailure = false;

  // ---- analytics.json (لا نلمس الملف القديم إذا فشل الجلب) ----
  try {
    const analyticsData = await fetchPageViews(client);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(analyticsData, null, 2), 'utf-8');
    console.log(`✅ Page views saved to content/data/analytics.json (${Object.keys(analyticsData).length} paths)`);
  } catch (error) {
    hadFailure = true;
    console.error('❌ Failed to fetch page views:', error.message);
    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, JSON.stringify({}, null, 2), 'utf-8');
      console.log('ℹ️ Wrote an empty analytics.json so the build does not crash.');
    } else {
      console.log('ℹ️ Keeping the previous analytics.json as-is.');
    }
  }

  // ---- analytics-summary.json (زوار 24س/48س/شهر/سنة) ----
  try {
    const summary = await fetchVisitorPeriods(client);
    const hasAnyData =
      (summary.periods.h24 && summary.periods.h24.buckets > 0) ||
      (summary.periods.h48 && summary.periods.h48.buckets > 0) ||
      !!summary.periods.d30 || !!summary.periods.d365;

    if (!hasAnyData) {
      hadFailure = true;
      console.error('❌ No visitor data could be collected. Keeping the previous analytics-summary.json as-is.');
      return finish(hadFailure);
    }

    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log('✅ Visitor windows saved to content/data/analytics-summary.json');
    console.log(`   • 24h users: ${summary.periods.h24?.users ?? 0}`);
    console.log(`   • 48h users: ${summary.periods.h48?.users ?? 0}`);
    console.log(`   • 30d users: ${summary.periods.d30?.users ?? 'n/a'}`);
    console.log(`   • 365d users: ${summary.periods.d365?.users ?? 'n/a'}`);
    if (summary.warnings.length) console.log('   ⚠️ warnings:', summary.warnings.join(', '));
  } catch (error) {
    hadFailure = true;
    console.error('❌ Failed to fetch visitor windows:', error.message);
    console.log('ℹ️ Keeping the previous analytics-summary.json as-is.');
  }

  finish(hadFailure);
}

/** ينهي السكربت دائماً بنجاح حتى لا يتوقف بناء الموقع اليومي، مع تسجيل الخطأ بوضوح */
function finish(hadFailure) {
  if (hadFailure) {
    // لا نُفشل سير العمل حتى لا يتوقف بناء الموقع اليومي، لكن نسجّل الخطأ بوضوح.
    console.error('⚠️ Analytics finished with errors. Site build/commit will continue with previous data.');
  }
  console.log('🏁 Analytics script finished.');
  process.exitCode = 0;
}

// مكتبة google-auth-library قد تُطلق رفضاً غير معالج عند غياب بيانات الاعتماد،
// نلتقطه هنا حتى لا يسقط السكربت قبل حفظ الملفات.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled rejection in analytics script:', reason && reason.message ? reason.message : reason);
});

main();
