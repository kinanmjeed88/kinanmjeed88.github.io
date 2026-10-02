#!/usr/bin/env node
/**
 * اختبارات سلامة الموارد الخارجية (CDN Pinning + SRI)
 * التشغيل: node tests/assets-integrity.test.mjs
 *
 * يتحقق من:
 *  1) لا توجد روابط CDN غير مثبّتة (@latest) في أي صفحة.
 *  2) كل سكربت خارجي يحمل integrity + crossorigin (مع استثناءات موثّقة).
 *  3) بصمات SRI المكتوبة في الصفحات تطابق بايتات الملفات المستضافة ذاتياً فعلياً.
 *  4) محتوى المقالات (JSON) لا يحمّل Tailwind من الخارج.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'admin-preview.local', 'tests']);

let pass = 0, fail = 0;
const results = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; results.push(`PASS | ${name}`); }
  else { fail++; results.push(`FAIL | ${name}${extra ? ' — ' + extra : ''}`); }
}

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const htmlFiles = walk(ROOT, ['.html']);
const jsonFiles = walk(ROOT, ['.json']);
const read = (p) => fs.readFileSync(p, 'utf8');

// استثناءات موثّقة: لا يمكن تطبيق SRI عليها (تُحدَّث من المصدر باستمرار / CSS يُخدم حسب المتصفح)
const SCRIPT_EXCEPTIONS = [
  'googletagmanager.com',            // Google Tag Manager/GA4
  'pagead2.googlesyndication.com',   // AdSense
  'cdn.onesignal.com',               // OneSignal SDK (النسخة الرئيسية فقط)
];
const LINK_EXCEPTIONS = [
  'fonts.googleapis.com',            // Google Fonts: CSS مختلف لكل متصفح ⇒ SRI يكسره
  'fonts.gstatic.com',
];

// ---------------- 1) لا روابط غير مثبّتة ----------------
const unpinned = [];
for (const f of [...htmlFiles, ...jsonFiles, ...walk(ROOT, ['.js', '.mjs'])]) {
  const t = read(f);
  if (t.includes('@latest')) unpinned.push(f.replace(ROOT + '/', ''));
}
check('لا يوجد أي رابط مكتبة بوسم @latest', unpinned.length === 0, unpinned.slice(0, 5).join(', '));

const legacyTailwind = [];
for (const f of [...htmlFiles, ...jsonFiles]) {
  const t = read(f);
  if (t.includes('cdn.tailwindcss.com')) legacyTailwind.push(f.replace(ROOT + '/', ''));
}
check('لا توجد روابط Tailwind CDN في الصفحات/المحتوى', legacyTailwind.length === 0, legacyTailwind.slice(0, 5).join(', '));

// ---------------- 2) كل سكربت خارجي يحمل integrity + crossorigin ----------------
const scriptTags = /<script\b[^>]*\bsrc="(https?:\/\/[^"]+)"[^>]*>/g;
const missingSRI = [];
for (const f of htmlFiles) {
  const t = read(f);
  for (const m of t.matchAll(scriptTags)) {
    const tag = m[0], url = m[1];
    if (SCRIPT_EXCEPTIONS.some((h) => url.includes(h))) continue;
    if (!/\sintegrity="sha(256|384|512)-/.test(tag) || !/\scrossorigin=/.test(tag)) {
      missingSRI.push(`${f.replace(ROOT + '/', '')} :: ${url}`);
    }
  }
}
check('كل سكربت خارجي (غير مستثنى) يحمل integrity + crossorigin', missingSRI.length === 0, missingSRI.slice(0, 5).join(' | '));

const linkTags = /<link\b[^>]*\bhref="(https?:\/\/[^"]+\.(?:css|js))"[^>]*>/g;
const missingLinkSRI = [];
for (const f of htmlFiles) {
  const t = read(f);
  for (const m of t.matchAll(linkTags)) {
    const tag = m[0], url = m[1];
    if (LINK_EXCEPTIONS.some((h) => url.includes(h))) continue;
    if (!/\sintegrity="sha(256|384|512)-/.test(tag) || !/\scrossorigin=/.test(tag)) {
      missingLinkSRI.push(`${f.replace(ROOT + '/', '')} :: ${url}`);
    }
  }
}
check('كل <link> خارجي (غير مستثنى) يحمل integrity + crossorigin', missingLinkSRI.length === 0, missingLinkSRI.slice(0, 5).join(' | '));

// ---------------- 3) بصمات SRI تطابق الملفات المستضافة ذاتياً ----------------
const localAssets = [];
for (const f of htmlFiles) {
  const t = read(f);
  for (const m of t.matchAll(/<script\b[^>]*\bsrc="(\/assets\/[^"]+)"[^>]*\bintegrity="(sha384-[^"]+)"/g)) {
    localAssets.push({ file: f, src: m[1], integrity: m[2] });
  }
}
check('يوجد سكربتات محلية موقّعة بـ SRI لفحصها', localAssets.length > 0, `عدد: ${localAssets.length}`);

const seen = new Set();
let hashOk = 0, hashBad = [];
for (const a of localAssets) {
  if (seen.has(a.src)) continue;
  seen.add(a.src);
  const p = path.join(ROOT, a.src);
  if (!fs.existsSync(p)) { hashBad.push(`${a.src} غير موجود`); continue; }
  const actual = 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(p)).digest('base64');
  if (actual === a.integrity) hashOk++;
  else hashBad.push(`${a.src}: المتوقع ${a.integrity} لكن الفعلي ${actual}`);
}
check(`بصمات SRI للملفات المحلية صحيحة (${hashOk} ملف)`, hashBad.length === 0, hashBad.join(' | '));

// ---------------- 4) تغطية كل الصفحات ----------------
const usesTailwind = htmlFiles.filter((f) => /tailwind/i.test(read(f)));
const usesLucide = htmlFiles.filter((f) => /lucide/i.test(read(f)));
const tailwindLocal = usesTailwind.filter((f) => read(f).includes('/assets/vendor/tailwind-3.4.17.min.js'));
const lucidePinned = usesLucide.filter((f) => read(f).includes('unpkg.com/lucide@1.50.0/dist/umd/lucide.min.js'));
check(`كل صفحة تستخدم Tailwind تعتمد النسخة المستضافة ذاتياً (${tailwindLocal.length}/${usesTailwind.length})`, tailwindLocal.length === usesTailwind.length);
check(`كل صفحة تستخدم Lucide تعتمد النسخة المثبّتة + SRI (${lucidePinned.length}/${usesLucide.length})`, lucidePinned.length === usesLucide.length);
const strayPages = htmlFiles.filter((f) => !/tailwind/i.test(read(f)) && !/lucide/i.test(read(f)));
check('ملفات HTML التي لا تستخدم أي مكتبة خارجية هي ملفات اختبار محلية فقط', strayPages.every((f) => /test_|_local/.test(f)), strayPages.join(', '));

// ---------------- 5) محتوى المقالات محصّن ----------------
const badContent = [];
for (const f of jsonFiles) {
  const t = read(f);
  if (!t.includes('cdn.tailwindcss.com')) continue;
  badContent.push(f.replace(ROOT + '/', ''));
}
check('محتوى المقالات لا يحمّل Tailwind من الخارج', badContent.length === 0, badContent.slice(0, 5).join(', '));

const loaders = jsonFiles.filter((f) => read(f).includes('/assets/vendor/tailwind-3.4.17.min.js'));
const loadersWithSRI = loaders.filter((f) => read(f).includes("t.integrity='sha384-"));
check(`المُحمِّل الديناميكي في المقالات يحمل SRI (${loadersWithSRI.length}/${loaders.length})`, loaders.length === loadersWithSRI.length);

// ---------------- التقرير ----------------
console.log(results.map((r) => (r.startsWith('PASS') ? '✅ ' + r.slice(5) : '❌ ' + r.slice(5))).join('\n'));
console.log(`\n${fail === 0 ? '✅ ALL TESTS PASSED' : '❌ FAILURES: ' + fail} (${pass + fail} فحصاً — نجح ${pass})`);
process.exit(fail === 0 ? 0 : 1);
