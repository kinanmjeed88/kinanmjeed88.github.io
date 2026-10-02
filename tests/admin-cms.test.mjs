/**
 * اختبارات لوحة تحكم TechTouch CMS
 * -----------------------------------
 * تشغيل الاختبارات:
 *   npm i --no-save jsdom     # لازم مرة واحدة (لا يُعدَّل package.json)
 *   node tests/admin-cms.test.mjs
 *
 * ما يغطيه الاختبار:
 *   1) الحماية (الأمن): محلّل المصفوفة الآمن (بديل new Function) + هجمات فعلية
 *   2) تعقيم النصوص: escapeHtml / sanitizeRichText / sanitizeSvg / safeUrl / safeIconName
 *   3) حقن فعلي في قائمة المقالات وتحذيرات GA4
 *   4) التوقيت: توقيت بغداد (UTC+03:00) في الإنشاء والتعديل
 *   5) حذف المقال: ملف JSON + صفحة HTML في Commit واحد + خطة بديلة
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'admin/index.html'), 'utf8');
const js = fs.readFileSync(path.join(repo, 'admin/admin.js'), 'utf8');

const dom = new JSDOM(html, { url: 'https://example.com/admin/index.html', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.localStorage.setItem('gh_owner', 'o');
window.localStorage.setItem('gh_repo', 'r');
window.localStorage.setItem('gh_token', 't');
window.lucide = { createIcons() {} };
window.alert = () => {};
window.confirm = () => true;

// نُقيّم admin.js مع جسر اختبار في نفس النطاق (للوصول إلى المتغيرات المحلية)
window.eval(js + `
window.__t = {
  setPosts(p) { cachedPosts = p; },
  renderPosts() { renderPosts(); },
  setEditingPost(p) { currentEditingPost = p; },
  setSlugMode(m) { document.getElementById('pSlug').dataset.mode = m; },
  todayBaghdad, nowBaghdadHM, escapeHtml, sanitizeRichText, sanitizeSvg, safeUrl, safeIconName, safeParseJsArray,
  // جسر المصادقة
  detectTokenKind, verifyGithubConnection, renderGhValidation, showLoginModal,
  clearGithubSession, renderConnectionStatus, writeSetting, readSetting, removeSetting, isTokenPersisted,
  getConfig: () => ({ ...ghConfig }),
  setConfig: (c) => { ghConfig = { ...ghConfig, ...c }; }
};
`);

const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${extra ? '  -- ' + extra : ''}`);
};
const b64encode = (s) => Buffer.from(s, 'utf8').toString('base64');
const b64decode = (b) => Buffer.from(b, 'base64').toString('utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ============================================================
 * 1) محلّل المصفوفة الآمن (بديل new Function/eval)
 * ============================================================ */
const parse = window.__t.safeParseJsArray;

const legit = `[
    { name: "Netflix", url: "https://netflix.com", icon: "tv" },
    { name: 'شاهد Shahid', url: "https://shahid.mbc.net", icon: "https://cdn/x.png", store: "الترفيه" }
]`;
const parsed = parse(legit);
check('يقبل المصفوفة الشرعية (مفاتيح بدون اقتباس + نص عربي)', Array.isArray(parsed) && parsed.length === 2 && parsed[1].name === 'شاهد Shahid', JSON.stringify(parsed[1]));

const SCRIPT_CLOSE = '<' + '/script>';
const attacks = [
  ['تنفيذ دالة فورياً', '[ (function(){ globalThis.__pwned = 1; return {}; })() ]'],
  ['استدعاء fetch', '[ fetch("https://evil.example") ]'],
  ['new Function داخل المصفوفة', '[ new Function("return 1")() ]'],
  ['سهم (arrow function)', '[ (() => 1)() ]'],
  ['استدعاء constructor', '[ { name: "x", url: this.constructor.constructor("return process")() } ]'],
  ['مفتاح __proto__', '[ { __proto__: { polluted: true } } ]'],
  ['كود بعد المصفوفة', '[{name:"x"}]; globalThis.__pwned = 2;'],
  ['backtick/قالب نصي', '[ { name: `x${globalThis}` } ]'],
  ['كتابة على window', '[ { name: "x", icon: window.location } ]']
];
for (const [label, payload] of attacks) {
  let threw = false, msg = '';
  try { parse(payload); } catch (e) { threw = true; msg = e.message.slice(0, 50); }
  check('يرفض: ' + label, threw, msg);
}
check('لم يُنفَّذ أي كود خبيث', window.__pwned === undefined);

/* ============================================================
 * 2) أدوات التعقيم
 * ============================================================ */
const esc = window.__t.escapeHtml;
check('escapeHtml يهرّب الوسوم', esc('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;');
check('escapeHtml يهرّب الاقتباسات', esc('"\'&') === '&quot;&#039;&amp;');
check('escapeHtml يتعامل مع null/undefined', esc(null) === '' && esc(undefined) === '');

const srt = window.__t.sanitizeRichText;
const evilTitle = '<span class="text-blue-600">عنوان</span><img src=x onerror="globalThis.__xss=1"><script>globalThis.__xss=2' + SCRIPT_CLOSE;
const cleanTitle = srt(evilTitle);
check('sanitizeRichText يحفظ التنسيق المسموح', cleanTitle.includes('<span class="text-blue-600">عنوان</span>'), cleanTitle);
check('sanitizeRichText يحذف <img onerror>', !/img|onerror/i.test(cleanTitle));
check('sanitizeRichText يحذف <script>', !/script/i.test(cleanTitle));
check('sanitizeRichText يحذف onclick من span', !/onclick/i.test(srt('<span onclick="x()">a</span>')));
check('sanitizeRichText يحذف class الخطر', !/javascript/i.test(srt('<span class="javascript:alert(1) x">a</span>')));

const svgEvil = '<path d="M0 0h24v24H0z" onload="globalThis.__svg=1"/><script>globalThis.__svg=2' + SCRIPT_CLOSE + '<foreignObject></foreignObject>';
const cleanSvg = window.__t.sanitizeSvg(svgEvil);
check('sanitizeSvg يحفظ المسار', cleanSvg.includes('<path') && cleanSvg.includes('d="M0 0h24v24H0z"'), cleanSvg.slice(0, 70));
check('sanitizeSvg يحذف script/onload/foreignObject', !/script|onload|foreignObject/i.test(cleanSvg));

const url = window.__t.safeUrl;
check('safeUrl يمنع javascript:', url('javascript:alert(1)') === '');
check('safeUrl يمنع javascript مع فراغ/سطر جديد', url('java\nscript:alert(1)') === '');
check('safeUrl يمنع data:text/html', url('data:text/html,<script>1' + SCRIPT_CLOSE) === '');
check('safeUrl يسمح https', url('https://x.com/a.png') === 'https://x.com/a.png');
check('safeUrl يسمح المسار النسبي', url('assets/images/x.webp') === 'assets/images/x.webp');
check('safeIconName يمنع الحقن', window.__t.safeIconName('x"></i><img src=x>') === 'star');

/* ============================================================
 * 3) mock لطبقة GitHub
 * ============================================================ */
window.__records = [];
window.fetch = async function (fetchUrl, opts = {}) {
  const u = String(fetchUrl);
  const method = opts.method || 'GET';
  window.__records.push({ url: u, method, body: opts.body ? JSON.parse(opts.body) : null });

  if (u.includes('/git/')) { // Git Data API (للحذف الذري)
    if (u.includes('/git/ref/heads/') && method === 'GET') return { ok: true, status: 200, json: async () => ({ object: { sha: 'headsha' } }) };
    if (u.includes('/git/commits/headsha')) return { ok: true, status: 200, json: async () => ({ tree: { sha: 'basetree' } }) };
    if (u.endsWith('/git/trees')) return { ok: true, status: 200, json: async () => ({ sha: 'newtree' }) };
    if (u.endsWith('/git/commits')) return { ok: true, status: 200, json: async () => ({ sha: 'newcommit' }) };
    if (u.includes('/git/refs/heads/')) return { ok: true, status: 200, json: async () => ({ object: { sha: 'newcommit' } }) };
  }
  if (u.includes('/contents/')) {
    const contentPath = decodeURIComponent(u.split('/contents/')[1]).split('?')[0];
    if (method === 'PUT' || method === 'DELETE') return { ok: true, status: 200, json: async () => ({ content: { sha: 'x' } }) };
    if (contentPath === 'content/posts') return { ok: true, status: 200, json: async () => ([{ name: 'a.json', path: 'content/posts/a.json', sha: 'sa', type: 'file' }]) };
    if (contentPath === 'content/data/categories.json') return { ok: true, status: 200, json: async () => ({ content: b64encode(JSON.stringify([{ id: 'articles', name: 'اخبار' }])), sha: 'sc' }) };
    return { ok: true, status: 200, json: async () => ({ content: b64encode('{}'), sha: 's', path: contentPath }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

/* ============================================================
 * 4) حقن فعلي في قائمة المقالات + تحذيرات GA4
 * ============================================================ */
window.__t.setPosts([{
  title: '<span class="font-bold">عنوان عادي</span><img src=x onerror="window.__listxss=1"><b>عريض</b>',
  slug: 'evil', category: '<img src=x onerror="window.__catxss=1">',
  date: '2026-10-01', time: '10:00', image: 'assets/images/me.jpg',
  path: 'content/posts/evil.json', sha: 's'
}]);
window.__t.renderPosts();
const listEl = window.document.getElementById('postsList');
const cardImgs = [...listEl.querySelectorAll('img')].map(i => i.getAttribute('src'));
check('قائمة المقالات: لا عنصر مُدرج من المحتوى الخبيث',
  listEl.querySelector('[onerror]') === null && listEl.querySelector('script') === null &&
  cardImgs.length === 1 && cardImgs[0] === '../assets/images/me.jpg', JSON.stringify(cardImgs));
check('قائمة المقالات: التنسيق المسموح (span/b) محفوظ', !!listEl.querySelector('span.font-bold') && !!listEl.querySelector('b'));
check('قائمة المقالات: لم يُنفَّذ أي سكربت', window.__listxss === undefined && window.__catxss === undefined);

window.renderVisitorPeriods({
  generatedAt: new Date().toISOString(),
  warnings: ['<img src=x onerror="window.__wx=1">'],
  periods: { h24: { users: 5, views: 9, sessions: 6, newUsers: 2, change: 0.1 } }
});
const noteEl = window.document.getElementById('visitorPeriodsNote');
check('تحذيرات GA4 معروضة كنص لا كعنصر', noteEl.querySelector('img') === null && noteEl.querySelector('[onerror]') === null);
check('تحذيرات GA4 ظاهرة فعلاً', noteEl.textContent.includes('<img'));

/* ============================================================
 * 5) التوقيت: بغداد UTC+03:00
 * ============================================================ */
const tzParts = (d) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const o = {}; f.formatToParts(d).forEach(p => o[p.type] = p.value); return o;
};
const tp = tzParts(new Date());
const expectedDate = `${tp.year}-${tp.month}-${tp.day}`;
const expectedTime = `${tp.hour}:${tp.minute}`;

check('todayBaghdad يطابق توقيت بغداد', window.__t.todayBaghdad() === expectedDate, window.__t.todayBaghdad());
check('nowBaghdadHM يطابق توقيت بغداد', window.__t.nowBaghdadHM() === expectedTime, window.__t.nowBaghdadHM());
check('لا وجود لتأريخ UTC في مسار حفظ المقالات', !/toISOString\(\)\.split\('T'\)\[0\]/.test(js));
check('فرق التوقيت عن UTC هو +03:00', ((Number(tp.hour) - new Date().getUTCHours() + 24) % 24) === 3, `UTC=${new Date().getUTCHours()} Baghdad=${tp.hour}`);

window.__records.length = 0;
window.eval(`
  openPostEditor();
  document.getElementById('pTitle').value = 'مقال اختبار التوقيت';
  document.getElementById('pSlug').value = 'tz-test';
  document.getElementById('pCat').value = 'articles';
  document.getElementById('pContent').value = 'محتوى';
`);
check('المحرّر يملأ الوقت افتراضياً بتوقيت بغداد', window.document.getElementById('pTime').value === expectedTime, window.document.getElementById('pTime').value);
check('المحرّر يعرض تلميح التوقيت', window.document.getElementById('pTimeHint').textContent.includes('بغداد'), window.document.getElementById('pTimeHint').textContent);

window.document.getElementById('pDate').value = '';
window.document.getElementById('pTime').value = '';
window.eval('savePost()');
await sleep(150);
const putReq = window.__records.find(r => r.method === 'PUT' && r.url.includes('content/posts/tz-test.json'));
check('تم إرسال حفظ المقال', !!putReq);
if (putReq) {
  const saved = JSON.parse(b64decode(putReq.body.content));
  check('تاريخ المقال بتوقيت بغداد', saved.date === expectedDate, `${saved.date} (متوقع ${expectedDate})`);
  check('وقت المقال بتوقيت بغداد', saved.time === expectedTime, saved.time);
  check('لا يوجد حقل updated عند الإنشاء', saved.updated === undefined);
}

window.__records.length = 0;
window.eval(`
  openPostEditor();
  __t.setSlugMode('edit');
  __t.setEditingPost({ path: 'content/posts/tz-test.json', sha: 's' });
  document.getElementById('pTitle').value = 'تعديل';
  document.getElementById('pDate').value = '2026-09-01';
  document.getElementById('pTime').value = '21:45';
  savePost();
`);
await sleep(150);
const putEdit = [...window.__records].reverse().find(r => r.method === 'PUT' && r.url.includes('content/posts/tz-test.json'));
check('تم إرسال تحديث المقال', !!putEdit);
if (putEdit) {
  const saved = JSON.parse(b64decode(putEdit.body.content));
  check('تاريخ التحديث (updated) بتوقيت بغداد', saved.updated === expectedDate, `${saved.updated} (متوقع ${expectedDate})`);
  check('الوقت اليدوي يُحفظ كما هو', saved.time === '21:45', saved.time);
}

/* ============================================================
 * 6) حذف المقال + صفحته المولَّدة (Commit واحد)
 * ============================================================ */
window.__records.length = 0;
window.__t.setPosts([{ title: 'لحذف', slug: 'del-me', path: 'content/posts/del-me.json', sha: 'sha-del', date: '2026-01-01' }]);
window.deleteByIndex(0);
await sleep(250);

const treeReq = window.__records.find(r => r.url.endsWith('/git/trees'));
check('الحذف يستخدم Git Data API (Commit واحد)', !!treeReq);
if (treeReq) {
  const paths = treeReq.body.tree.map(t => t.path).sort();
  check('يحذف ملف JSON وصفحة HTML معاً', paths.includes('content/posts/del-me.json') && paths.includes('article-del-me.html'), JSON.stringify(paths));
  check('الحذف عبر sha:null (إزالة من الشجرة)', treeReq.body.tree.every(t => t.sha === null));
}
const commitReq = window.__records.find(r => r.url.endsWith('/git/commits') && r.method === 'POST');
check('Commit واحد برسالة واضحة وأب واحد', !!commitReq && commitReq.body.message === 'Delete Post: del-me' && commitReq.body.parents.length === 1 && commitReq.body.parents[0] === 'headsha', commitReq && commitReq.body.message);
const refReq = window.__records.find(r => r.url.includes('/git/refs/heads/') && r.method === 'PATCH');
check('تحديث المرجع (ref) بعد الحذف', !!refReq && refReq.body.sha === 'newcommit');
check('لم يُستخدم DELETE منفصل في المسار الذري', !window.__records.some(r => r.method === 'DELETE'));

/* ---------- الخطة البديلة عند فشل المسار الذري ---------- */
window.__records.length = 0;
window.fetch = async function (fetchUrl, opts = {}) {
  const u = String(fetchUrl); const method = opts.method || 'GET';
  window.__records.push({ url: u, method });
  if (u.includes('/git/')) return { ok: false, status: 403, json: async () => ({}) };
  if (method === 'DELETE') return { ok: true, status: 200, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => ({ sha: 'sha-of-file', content: b64encode('{}') }) };
};
window.__t.setPosts([{ title: 'لحذف', slug: 'fallback-post', path: 'content/posts/fallback-post.json', sha: 'sha-x', date: '2026-01-01' }]);
window.deleteByIndex(0);
await sleep(250);
const deletes = window.__records.filter(r => r.method === 'DELETE').map(r => r.url.split('/contents/')[1]);
check('الخطة البديلة: حذف الملفين (JSON + HTML)', deletes.includes('content/posts/fallback-post.json') && deletes.includes('article-fallback-post.html'), JSON.stringify(deletes));


/* ============================================================
 * 7) أمان الجلسة: تسجيل الخروج + التحقق من نوع الرمز + التخزين
 * ============================================================ */

/* ---------- 7-أ) كشف نوع الرمز ---------- */
const detect = window.__t.detectTokenKind;
check('كشف Fine-grained PAT', detect('github_pat_' + 'A'.repeat(60)) === 'fine-grained');
check('كشف Classic PAT', detect('ghp_' + 'a'.repeat(36)) === 'classic');
check('كشف Classic القديم (40 hex)', detect('a'.repeat(40)) === 'classic-legacy');
check('كشف OAuth token', detect('gho_' + 'x'.repeat(30)) === 'oauth');
check('رفض تنسيق غير معروف', detect('my-random-token') === 'unknown');
check('كشف الرمز الفارغ', detect('') === 'empty' && detect(null) === 'empty');

/* ---------- 7-ب) التخزين: جلسة افتراضياً، ودائم مع "تذكّرني" فقط ---------- */
window.__t.writeSetting('gh_token', 'github_pat_TEST_TOKEN_123', false);
check('بدون "تذكّرني": الرمز في sessionStorage فقط', window.sessionStorage.getItem('gh_token') === 'github_pat_TEST_TOKEN_123' && window.localStorage.getItem('gh_token') === null);
check('isTokenPersisted = false للجلسة', window.__t.isTokenPersisted() === false);
window.__t.writeSetting('gh_token', 'github_pat_TEST_TOKEN_123', true);
check('مع "تذكّرني": يُحفظ في localStorage', window.localStorage.getItem('gh_token') === 'github_pat_TEST_TOKEN_123' && window.sessionStorage.getItem('gh_token') === null);
check('isTokenPersisted = true للرمز الدائم', window.__t.isTokenPersisted() === true);


/* ---------- 7-ج) مؤشر حالة الاتصال ---------- */
window.__t.setConfig({ owner: 'demo-owner', repo: 'demo-repo', token: 'github_pat_TEST_TOKEN_123' });
window.__t.renderConnectionStatus();
check('مؤشر الحالة: متصل', window.document.getElementById('ghStatusText').textContent === 'متصل');
check('مؤشر الحالة: يعرض المستودع', window.document.getElementById('ghStatusSub').textContent === 'demo-owner/demo-repo');
check('زر تسجيل الخروج ظاهر عند الاتصال', window.document.getElementById('btnDisconnect').style.display === 'flex');

/* ---------- 7-د) مسح الجلسة (تسجيل الخروج) ---------- */
window.document.getElementById('ghToken').value = 'github_pat_TEST_TOKEN_123';   // محاكاة حقل مملوء
window.__t.setPosts([{ title: 'مقال', slug: 'p', path: 'content/posts/p.json', sha: 's', date: '2026-01-01' }]);
window.document.getElementById('pContent').value = 'محتوى محرّر';
const cleared = window.__t.clearGithubSession();

check('clearGithubSession يعيد النجاح', cleared === true);
check('مسح الرمز من localStorage', window.localStorage.getItem('gh_token') === null);
check('مسح الرمز من sessionStorage', window.sessionStorage.getItem('gh_token') === null);
check('الاحتفاظ باسم المستودع فقط (غير حسّاس) لتسهيل الدخول', window.localStorage.getItem('gh_owner') === 'demo-owner' && window.localStorage.getItem('gh_repo') === 'demo-repo');
check('مسح الرمز من ذاكرة الإدارة (ghConfig)', window.__t.getConfig().token === '' && window.__t.getConfig().owner === 'demo-owner');
check('مسح حقل الرمز من الواجهة', window.document.getElementById('ghToken').value === '');
check('مسح كاش المحتوى', window.document.getElementById('postsList').children.length === 0);
check('إغلاق المحرّرات المفتوحة', window.document.getElementById('postEditor').classList.contains('hidden'));
check('لا أثر للرمز في أي قيمة تخزين', (() => {
  const scan = (store) => Object.keys(store).some(k => String(store.getItem(k)).includes('github_pat_TEST_TOKEN_123'));
  return !scan(window.localStorage) && !scan(window.sessionStorage);
})());

/* ---------- 7-هـ) مؤشر الحالة بعد الخروج ---------- */
window.__t.setConfig({ token: '' });
window.__t.renderConnectionStatus();
check('مؤشر الحالة: غير متصل بعد الخروج', window.document.getElementById('ghStatusText').textContent === 'غير متصل');
check('زر تسجيل الخروج مخفي بعد الخروج', window.document.getElementById('btnDisconnect').style.display === 'none');

/* ---------- 7-و) شاشة الدخول تظهر ولا تعبّئ الرمز أبداً ---------- */
window.localStorage.setItem('gh_owner', 'kinanmjeed88');
window.localStorage.setItem('gh_repo', 'repo-X');
window.localStorage.setItem('gh_token', 'github_pat_SHOULD_NOT_BE_PREFILLED');
window.__t.setConfig({ owner: 'kinanmjeed88', repo: 'repo-X', token: '' });
window.__t.showLoginModal();
check('شاشة الدخول ظاهرة', !window.document.getElementById('ghModal').classList.contains('hidden'));
check('لا يتم تعبئة الرمز في الواجهة مطلقاً (حتى لو وُجد في التخزين)', window.document.getElementById('ghToken').value === '');
check('تعبئة owner/repo مسموح (غير حسّاس)', window.document.getElementById('ghOwner').value === 'kinanmjeed88' && window.document.getElementById('ghRepo').value === 'repo-X');
window.__t.clearGithubSession();
window.localStorage.removeItem('gh_owner'); window.localStorage.removeItem('gh_repo');

/* ---------- 7-ز) منع تحميل البيانات بدون رمز ---------- */
window.__records.length = 0;
window.__t.setConfig({ token: '' });
window.switchTab('posts');
await sleep(30);
check('switchTab لا يطلب بيانات بدون تسجيل دخول', window.__records.filter(r => r.url.includes('/contents/')).length === 0);
check('switchTab يظهر شاشة الدخول بدل الخطأ', !window.document.getElementById('ghModal').classList.contains('hidden'));

/* ---------- 7-ح) التحقق من الرمز عبر GitHub (رفض/قبول) ---------- */
const realFetch = window.fetch;
const mockGithubVerify = (opts) => { window.fetch = async function (u, o = {}) { return opts(String(u), o); }; };

mockGithubVerify(async (u) => {
  if (u.endsWith('/user')) return { ok: false, status: 401, headers: { get: () => '' }, json: async () => ({}) };
  return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
});
let r1 = await window.__t.verifyGithubConnection({ owner: 'o', repo: 'r', token: 'github_pat_bad' });
check('التحقق يرفض رمزاً غير صالح (401)', r1.ok === false && r1.kind === 'invalid');

mockGithubVerify(async (u) => {
  if (u.endsWith('/user')) return { ok: true, status: 200, headers: { get: (h) => (h === 'x-oauth-scopes' ? '' : '') }, json: async () => ({ login: 'kinan' }) };
  return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
});
let r2 = await window.__t.verifyGithubConnection({ owner: 'o', repo: 'r', token: 'github_pat_x' });
check('التحقق يرفض رمزاً بلا وصول للمستودع (404)', r2.ok === false && r2.kind === 'no-repo', r2.kind);

mockGithubVerify(async (u) => {
  if (u.endsWith('/user')) return { ok: true, status: 200, headers: { get: (h) => (h === 'x-oauth-scopes' ? 'repo, gist' : '') }, json: async () => ({ login: 'kinan' }) };
  return { ok: true, status: 200, headers: { get: () => '' }, json: async () => ({ permissions: { push: true, admin: false }, default_branch: 'main', private: false }) };
});
let r3 = await window.__t.verifyGithubConnection({ owner: 'o', repo: 'r', token: 'ghp_classic' });
check('التحقق يقرأ صلاحيات Classic الواسعة (repo)', r3.ok === true && r3.scopes.includes('repo'), r3.scopes);

mockGithubVerify(async (u) => {
  if (u.endsWith('/user')) return { ok: true, status: 200, headers: { get: () => '' }, json: async () => ({ login: 'kinan' }) };
  return { ok: true, status: 200, headers: { get: () => '' }, json: async () => ({ permissions: { push: false }, default_branch: 'main' }) };
});
let r4 = await window.__t.verifyGithubConnection({ owner: 'o', repo: 'r', token: 'github_pat_readonly' });
check('التحقق يرفض الرمز بصلاحية قراءة فقط', r4.ok === false && r4.kind === 'read-only');

/* ---------- 7-ط) saveGhSettings: يرفض التنسيق غير المعروف ---------- */
let confirmCalls = 0;
window.confirm = () => { confirmCalls++; return false; };
window.document.getElementById('ghOwner').value = 'o';
window.document.getElementById('ghRepo').value = 'r';
window.document.getElementById('ghToken').value = 'not-a-github-token';
window.__t.setConfig({ owner: 'o', repo: 'r', token: '' });
await window.saveGhSettings();
const boxUnknown = window.document.getElementById('ghValidationBox');
check('يرفض الرمز ذا التنسيق غير المعروف', !boxUnknown.className.includes('hidden') && boxUnknown.textContent.includes('غير معروف'));
check('لم يُحفظ أي رمز بعد الرفض', window.localStorage.getItem('gh_token') === null && window.sessionStorage.getItem('gh_token') === null);

/* ---------- 7-ي) saveGhSettings: يحذّر من Classic ثم يقبل بعد الموافقة ---------- */
window.confirm = () => { confirmCalls++; return true; };
mockGithubVerify(async (u) => {
  if (u.endsWith('/user')) return { ok: true, status: 200, headers: { get: (h) => (h === 'x-oauth-scopes' ? 'repo' : '') }, json: async () => ({ login: 'kinan' }) };
  return { ok: true, status: 200, headers: { get: () => '' }, json: async () => ({ permissions: { push: true }, default_branch: 'main' }) };
});
window.document.getElementById('ghToken').value = 'ghp_' + 'a'.repeat(36);
window.document.getElementById('ghRemember').checked = false;
await window.saveGhSettings();
check('يُطلب تأكيد صريح قبل قبول Classic Token', confirmCalls >= 1, 'confirm calls: ' + confirmCalls);
check('Classic المقبول يُحفظ في الجلسة فقط (بدون تذكّرني)', window.sessionStorage.getItem('gh_token') === 'ghp_' + 'a'.repeat(36) && window.localStorage.getItem('gh_token') === null);
check('عرض تحذير صلاحية repo في رسالة النجاح', window.document.getElementById('ghValidationBox').textContent.includes('repo'));

/* ---------- 7-ك) Fine-grained يُحفظ بلا تحذير + مع "تذكّرني" ---------- */
confirmCalls = 0;
window.document.getElementById('ghToken').value = 'github_pat_' + 'B'.repeat(40);
window.document.getElementById('ghRemember').checked = true;
window.__records.length = 0;
await window.saveGhSettings();
check('Fine-grained يُقبل بدون أي تحذير', confirmCalls === 0);
check('Fine-grained مع "تذكّرني" يُحفظ دائماً', window.localStorage.getItem('gh_token') === 'github_pat_' + 'B'.repeat(40));
check('لا يُرسل الرمز لأي خادم غير GitHub', window.__records.every(r => r.url.startsWith('https://api.github.com/')));
window.__t.clearGithubSession();
window.fetch = realFetch;

const failed = results.filter(r => !r.pass);
console.log('\n' + (failed.length === 0 ? `✅ ALL TESTS PASSED (${results.length})` : `❌ ${failed.length} FAILED of ${results.length}`));
process.exit(failed.length === 0 ? 0 : 1);
