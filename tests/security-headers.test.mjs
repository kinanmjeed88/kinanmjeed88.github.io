#!/usr/bin/env node
/**
 * اختبارات ترويسات الأمان (Security Headers / CSP)
 * التشغيل: node tests/security-headers.test.mjs
 *
 * يتحقق من:
 *  1) وجود ترويسات الأمان الأساسية بقيمها الصحيحة (HSTS، nosniff، X-Frame-Options، Referrer-Policy).
 *  2) بنية CSP: default-src 'self'، object-src 'none'، base-uri 'self'، frame-ancestors 'none'، form-action 'self'.
 *  3) عدم وجود ثغرات في السياسة: لا 'unsafe-eval'، ولا '*http:'، ولا مصدر غير مشفّر (http:).
 *  4) 🎯 اختبار التغطية: كل مصدر خارجي يستخدمه الموقع فعلياً مُدرج في التوجيه المناسب
 *     (script/style/img/font/connect/frame) — حتى لا تكسر السياسة أي مورد عند النشر.
 *  5) صيغة ملف _headers صحيحة لـ Cloudflare Pages (سطر واحد لكل ترويسة، لا أسطر مكسورة).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'admin-preview.local', 'tests', 'functions', 'scripts', 'admin-preview']);

let pass = 0, fail = 0;
const log = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; log.push(`PASS | ${name}`); }
  else { fail++; log.push(`FAIL | ${name}${extra ? ' — ' + String(extra).slice(0, 400) : ''}`); }
}

// ---------------------------------------------------------------- قراءة _headers
const headersPath = path.join(ROOT, '_headers');
check('ملف _headers موجود في الجذر', fs.existsSync(headersPath));
const raw = fs.existsSync(headersPath) ? fs.readFileSync(headersPath, 'utf8') : '';
check('ملف _headers غير فارغ', raw.trim().length > 100, `الحجم: ${raw.length}`);

// محلّل بسيط لصيغة Cloudflare Pages
const rules = [];
let current = null;
for (const line of raw.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (/^\s/.test(line)) {
    const m = line.match(/^\s+([A-Za-z0-9-]+):\s*(.+)$/);
    if (m && current) current.headers[m[1].toLowerCase()] = m[2].trim();
  } else {
    if (current) rules.push(current);
    current = { path: line.trim(), headers: {} };
  }
}
if (current) rules.push(current);

const globalRule = rules.find((r) => r.path === '/*') || rules[0];
check('يوجد قاعدة عامة للمسار /*', !!globalRule && globalRule.path === '/*', rules.map((r) => r.path).join(', '));

const H = globalRule ? globalRule.headers : {};
const get = (name) => H[name.toLowerCase()] || '';

// ---------------------------------------------------------------- 1) الترويسات الأساسية
const hsts = get('strict-transport-security');
check('HSTS مُعرَّف', !!hsts, hsts);
check('HSTS: max-age سنة كاملة على الأقل', /max-age=(\d+)/.test(hsts) && Number(hsts.match(/max-age=(\d+)/)[1]) >= 31536000, hsts);
check('HSTS: includeSubDomains موجود', /includeSubDomains/i.test(hsts), hsts);
check('HSTS: preload موجود', /preload/i.test(hsts), hsts);

check('X-Content-Type-Options: nosniff', get('x-content-type-options').toLowerCase() === 'nosniff', get('x-content-type-options'));
check('X-Frame-Options مُعرَّف (DENY/SAMEORIGIN)', /^(deny|sameorigin)$/i.test(get('x-frame-options')), get('x-frame-options'));
check('Referrer-Policy: strict-origin-when-cross-origin', get('referrer-policy').toLowerCase() === 'strict-origin-when-cross-origin', get('referrer-policy'));

// ---------------------------------------------------------------- 2) بنية CSP
const csp = get('content-security-policy');
check('CSP مُعرَّف', csp.length > 50, `طول: ${csp.length}`);
check('CSP: سطر واحد بلا أسطر مكسورة', !/[\r\n]/.test(csp));

const dir = {};
for (const part of csp.split(';')) {
  const t = part.trim();
  if (!t) continue;
  const [name, ...vals] = t.split(/\s+/);
  dir[name.toLowerCase()] = vals;
}
const has = (name, token) => (dir[name] || []).includes(token);

check("CSP: default-src 'self'", has('default-src', "'self'"), (dir['default-src'] || []).join(' '));
check("CSP: object-src 'none'", has('object-src', "'none'"), (dir['object-src'] || []).join(' '));
check("CSP: base-uri 'self'", has('base-uri', "'self'"), (dir['base-uri'] || []).join(' '));
check("CSP: frame-ancestors 'none'", has('frame-ancestors', "'none'"), (dir['frame-ancestors'] || []).join(' '));
check("CSP: form-action 'self'", has('form-action', "'self'"), (dir['form-action'] || []).join(' '));
check('CSP: upgrade-insecure-requests', 'upgrade-insecure-requests' in dir);
check("CSP: script-src يحتوي 'self'", has('script-src', "'self'"));
check("CSP: worker-src يحتوي 'self' (Service Worker)", has('worker-src', "'self'"), (dir['worker-src'] || []).join(' '));

// ---------------------------------------------------------------- 3) لا ثغرات في السياسة
check("CSP: لا يوجد 'unsafe-eval'", !/unsafe-eval/.test(csp));
check('CSP: لا يوجد http: غير مشفّر في المصادر', !/(^|\s)http:\/\//.test(csp));
check('CSP: لا يوجد * مطلق في script-src', !(dir['script-src'] || []).includes('*'));
check('CSP: لا يوجد * مطلق في default-src', !(dir['default-src'] || []).includes('*'));
check('CSP: لوحة التحكم تستطيع الاتصال بـ api.github.com', (dir['connect-src'] || []).includes('https://api.github.com'));
check('CSP: img-src يسمح بـ data: و blob: (رفع الصور في اللوحة)', has('img-src', 'data:') && has('img-src', 'blob:'));

// ---------------------------------------------------------------- أدوات مطابقة المصادر
function matchesSource(sourceList, url) {
  let host, scheme;
  try { const u = new URL(url); host = u.hostname; scheme = u.protocol; } catch { return false; }
  for (const src of sourceList) {
    if (src === "'self'") continue;
    if (src.endsWith(':') && !src.includes('//')) { if (scheme === src) return true; continue; }
    if (src.startsWith('https://')) {
      const sHost = src.slice(8);
      if (scheme !== 'https:') continue;
      if (sHost === host) return true;
      if (sHost.startsWith('*.')) {
        const base = sHost.slice(2);
        if (host === base || host.endsWith('.' + base)) return true;
      }
    }
  }
  return false;
}

function walk(dirPath, exts, out = []) {
  if (!fs.existsSync(dirPath)) return out;
  for (const e of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dirPath, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}
const browserFiles = walk(ROOT, ['.html', '.js', '.mjs', '.json']);
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const rel = (p) => p.replace(ROOT + path.sep, '');
const isSameOrigin = (u) => /^(\.|\/|assets\/|admin\/|content\/)/.test(u) || !/^https?:/i.test(u);

// ---------------------------------------------------------------- 4) اختبار التغطية
const contexts = {
  'script-src': [
    /<script[^>]*\bsrc=["'](https?:[^"']+)["']/gi,
    /(?:import|from)\s*\(?\s*["'](https?:[^"']+)["']/gi,
    /"imports"\s*:\s*\{[^}]*"(https?:[^"]+)"/gi,
    /\bt\.src\s*=\s*["'](https?:[^"']+)["']/gi,
  ],
  'style-src': [/<link[^>]*\bhref=["'](https?:[^"']+\.css[^"']*)["']/gi],
  'img-src': [/<img[^>]*\bsrc=["'](https?:[^"']+)["']/gi, /(?:og:image|twitter:image)["']\s+content=["'](https?:[^"']+)["']/gi, /url\(\s*["']?(https?:[^"')]+)/gi],
  'frame-src': [/<iframe[^>]*\bsrc=["'](https?:[^"']+)["']/gi],
  'connect-src': [/\bfetch\(\s*["'`](https?:[^"'`]+)["'`]/gi, /\bsendBeacon\(\s*["'](https?:[^"']+)["']/gi],
};
const fontHosts = ['https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'];

let coverageProblems = [];
const foundHosts = {};
for (const [directive, regexes] of Object.entries(contexts)) {
  const list = dir[directive] || [];
  const hits = new Set();
  for (const f of browserFiles) {
    const t = read(f);
    for (const re of regexes) {
      for (const m of t.matchAll(re)) {
        const url = m[1];
        if (!/^https?:/i.test(url)) continue;
        hits.add(url);
        if (!matchesSource(list, url)) coverageProblems.push(`${directive}: ${url} ← ${rel(f)}`);
      }
    }
  }
  foundHosts[directive] = [...hits];
}
check('تغطية CSP: كل مورد/اتصال خارجي مُدرج في توجيهه المناسب', coverageProblems.length === 0, coverageProblems.slice(0, 6).join(' | '));
check('تغطية font-src: مضيفات الخطوط المعروفة مسموحة', fontHosts.every((h) => matchesSource(dir['font-src'] || [], h)), (dir['font-src'] || []).join(' '));
check('اختبار التغطية وجد مصادر فعلية (وليس فارغاً)', (foundHosts['script-src'] || []).length > 0 && (foundHosts['img-src'] || []).length > 0,
  `script=${(foundHosts['script-src'] || []).length} img=${(foundHosts['img-src'] || []).length} frame=${(foundHosts['frame-src'] || []).length} connect=${(foundHosts['connect-src'] || []).length}`);

// ---------------------------------------------------------------- 5) استثناءات موثّقة داخل CSP
// عناوين واقعية كما يستخدمها الموقع فعلاً (وليس أسماء نطاقات مجرّدة)
const REQUIRED_SOURCES = {
  'script-src': [
    'https://www.googletagmanager.com/gtag/js?id=G-NZVS1EN9RG',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
    'https://unpkg.com/lucide@1.50.0/dist/umd/lucide.min.js',
    'https://esm.sh/@google/genai@0.1.1',
  ],
  'style-src': [
    'https://fonts.googleapis.com/css2?family=Tajawal',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  ],
  'font-src': [
    'https://fonts.gstatic.com/s/tajawal/v9/xxx.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  ],
  'connect-src': [
    'https://api.github.com/repos/o/r/contents/x',
    'https://www.google-analytics.com/g/collect',
    'https://region1.google-analytics.com/g/collect',
    'https://api.onesignal.com/apps/x',
  ],
  'frame-src': [
    'https://www.youtube.com/embed/abc',
    'https://googleads.g.doubleclick.net/pagead/ads',
    'https://tpc.googlesyndication.com/safeframe/1-0-40/html/container.html',
  ],
};
const missingRequired = [];
for (const [d, urls] of Object.entries(REQUIRED_SOURCES)) {
  for (const u of urls) if (!matchesSource(dir[d] || [], u)) missingRequired.push(`${d}: ${u}`);
}
check('CSP يسمح بكل المصادر الأساسية الموثّقة (إحصاءات/إعلانات/أيقونات/خطوط/يوتيوب/GitHub)',
  missingRequired.length === 0, missingRequired.join(' | '));

// ---------------------------------------------------------------- التقرير
console.log(log.map((r) => (r.startsWith('PASS') ? '✅ ' + r.slice(5) : '❌ ' + r.slice(5))).join('\n'));
console.log(`\n${fail === 0 ? '✅ ALL TESTS PASSED' : '❌ FAILURES: ' + fail} (${pass + fail} فحصاً — نجح ${pass})`);
process.exit(fail === 0 ? 0 : 1);
