/**
 * analytics-windows.js
 * ---------------------
 * دوال نقية (Pure) لتحويل صفوف GA4 الخام إلى نوافذ زمنية:
 *   - آخر 24 ساعة
 *   - آخر 48 ساعة
 *   - آخر 30 يوماً (شهر)
 *   - آخر 365 يوماً (سنة)
 * مع مقارنة تلقائية بالفترة السابقة (Previous Period) لحساب نسبة التغير.
 *
 * لا تعتمد هذه الوحدة على أي مكتبة خارجية، لذا يمكن اختبارها مباشرة:
 *   node -e "import('./scripts/utils/analytics-windows.js').then(m => ...)"
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** يحوّل قيمة بُعد dateHour (YYYYMMDDHH) إلى رقم زمني بالمللي ثانية (توقيت الجدار الزمني للملكية) */
export function parseDateHourKey(key) {
    const k = String(key || '').trim();
    if (!/^\d{10}$/.test(k)) return NaN;
    const y = Number(k.slice(0, 4));
    const m = Number(k.slice(4, 6));
    const d = Number(k.slice(6, 8));
    const h = Number(k.slice(8, 10));
    if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23) return NaN;
    return Date.UTC(y, m - 1, d, h);
}

/** يحوّل قيمة بُعد date (YYYYMMDD) إلى رقم زمني بالمللي ثانية */
export function parseDateKey(key) {
    const k = String(key || '').trim();
    if (!/^\d{8}$/.test(k)) return NaN;
    const y = Number(k.slice(0, 4));
    const m = Number(k.slice(4, 6));
    const d = Number(k.slice(6, 8));
    if (m < 1 || m > 12 || d < 1 || d > 31) return NaN;
    return Date.UTC(y, m - 1, d);
}

/**
 * يحوّل صفوف GA4 إلى سلسلة زمنية مرتبة تصاعدياً.
 * @param {Array} rows صفوف response.rows
 * @param {Function} keyParser parseDateHourKey أو parseDateKey
 * @param {Object} options { keyIndex }
 */
export function rowsToSeries(rows, keyParser, { keyIndex = 0 } = {}) {
    const series = [];
    (rows || []).forEach(row => {
        const dims = row.dimensionValues || [];
        const rawKey = dims[keyIndex] ? dims[keyIndex].value : '';
        const t = keyParser(rawKey);
        if (Number.isNaN(t)) return;
        series.push({ t, metrics: readMetrics(row) });
    });
    series.sort((a, b) => a.t - b.t);
    return series;
}

/** يقرأ قيم المقاييس من صف GA4 بالترتيب الثابت الذي نطلبه من الـ API */
export const METRIC_NAMES = ['activeUsers', 'totalUsers', 'newUsers', 'sessions', 'screenPageViews'];

export function readMetrics(row) {
    const values = (row && row.metricValues) || [];
    const out = {};
    METRIC_NAMES.forEach((name, i) => {
        out[name] = values[i] ? (parseInt(values[i].value, 10) || 0) : 0;
    });
    return out;
}

export function emptyMetrics() {
    const out = {};
    METRIC_NAMES.forEach(name => { out[name] = 0; });
    return out;
}

export function addMetrics(a, b) {
    const out = {};
    METRIC_NAMES.forEach(name => { out[name] = (a[name] || 0) + (b[name] || 0); });
    return out;
}

/**
 * يقصّ نافذة زمنية من سلسلة زمنية.
 * النافذة تنتهي عند نهاية أحدث عنصر (bucket) في السلسلة، وليست "الآن"،
 * حتى لا نحسب ساعات ناقصة لم تصل بياناتها من GA4 بعد.
 *
 * @param {Array} series سلسلة مرتبة تصاعدياً [{t, metrics}]
 * @param {number} sizeMs طول النافذة بالمللي ثانية (مثال: 24*HOUR_MS)
 * @param {number} offsetMs إزاحة للخلف (0 = النافذة الأخيرة، sizeMs = الفترة السابقة لها)
 * @param {number} bucketMs حجم الدلو الزمني في السلسلة (ساعة افتراضياً)
 * @returns {{ totals: Object, start: number|null, end: number|null, partial: boolean, buckets: number }}
 */
export function sliceWindow(series, sizeMs, offsetMs = 0, bucketMs = HOUR_MS) {
    if (!series || series.length === 0) {
        return { totals: emptyMetrics(), start: null, end: null, partial: true, buckets: 0 };
    }
    const latest = series[series.length - 1].t;
    const end = latest + bucketMs - offsetMs;
    const start = end - sizeMs;

    const picked = series.filter(p => p.t >= start && p.t < end);
    let totals = emptyMetrics();
    picked.forEach(p => { totals = addMetrics(totals, p.metrics); });

    const earliest = series[0].t;
    const partial = earliest > start; // لا توجد بيانات كافية لتغطية كامل النافذة

    return { totals, start, end, partial, buckets: picked.length };
}

/** يبني نافذة زمنية من إجماليات جاهزة (تُستخدم لنوافذ الشهر/السنة المطلوبة مباشرة من GA4) */
export function totalsWindow(totals, start, end, { partial = false } = {}) {
    return { totals: totals || emptyMetrics(), start, end, partial, buckets: null };
}

/** نسبة التغير مقارنة بالفترة السابقة */
export function changeRatio(current, previous) {
    if (!previous) return null;
    return (current - previous) / previous;
}

/**
 * يبني كائن ملخص كامل لجزء من البيانات.
 * @param {Object} input
 *  - hourlySeries: سلسلة بالساعات (تشمل على الأقل آخر 96 ساعة)
 *  - monthTotals / monthPrevTotals: إجماليات 30 يوماً والفترة السابقة لها
 *  - yearTotals / yearPrevTotals: إجماليات 365 يوماً والفترة السابقة لها
 *  - monthRange / yearRange: { start, end } أرقام زمنية لعرض الحدود
 */
export function buildPeriodsPayload({
    hourlySeries = [],
    monthTotals = null,
    monthPrevTotals = null,
    monthRange = {},
    yearTotals = null,
    yearPrevTotals = null,
    yearRange = {},
} = {}) {
    const periods = {};

    const h24 = sliceWindow(hourlySeries, 24 * HOUR_MS, 0);
    const h24prev = sliceWindow(hourlySeries, 24 * HOUR_MS, 24 * HOUR_MS);
    const h48 = sliceWindow(hourlySeries, 48 * HOUR_MS, 0);
    const h48prev = sliceWindow(hourlySeries, 48 * HOUR_MS, 48 * HOUR_MS);

    periods.h24 = packPeriod(h24, h24prev);
    periods.h48 = packPeriod(h48, h48prev);

    if (monthTotals) {
        periods.d30 = packPeriod(
            totalsWindow(monthTotals, monthRange.start ?? null, monthRange.end ?? null),
            monthPrevTotals ? totalsWindow(monthPrevTotals, null, null) : null
        );
    }
    if (yearTotals) {
        periods.d365 = packPeriod(
            totalsWindow(yearTotals, yearRange.start ?? null, yearRange.end ?? null),
            yearPrevTotals ? totalsWindow(yearPrevTotals, null, null) : null
        );
    }

    return periods;
}

function packPeriod(current, previous) {
    const m = current.totals;
    const prev = previous ? previous.totals : null;
    const pack = {
        users: m.activeUsers,
        totalUsers: m.totalUsers,
        newUsers: m.newUsers,
        sessions: m.sessions,
        views: m.screenPageViews,
        start: current.start,
        end: current.end,
        partial: !!current.partial,
        buckets: current.buckets,
        prev: prev ? {
            users: prev.activeUsers,
            totalUsers: prev.totalUsers,
            newUsers: prev.newUsers,
            sessions: prev.sessions,
            views: prev.screenPageViews,
        } : null,
        change: prev ? changeRatio(m.activeUsers, prev.activeUsers) : null,
    };
    return pack;
}
