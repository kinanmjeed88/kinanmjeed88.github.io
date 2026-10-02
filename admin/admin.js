// --- Configuration & State ---
// التخزين الآمن: التوكن يُحفظ في sessionStorage افتراضياً (يُمحى بإغلاق التبويب)،
// ولا يُحفظ في localStorage إلا إذا اختار المستخدم "تذكّرني على هذا الجهاز".
const GH_KEYS = { owner: 'gh_owner', repo: 'gh_repo', token: 'gh_token' };

/** يقرأ إعداداً من الجلسة أولاً ثم من التخزين الدائم (السلوك القديم مدعوم) */
function readSetting(key) {
    try {
        return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    } catch (e) { return ''; }
}

/** يكتب إعداداً: دائم (localStorage) أو للجلسة فقط (sessionStorage) */
function writeSetting(key, value, persist = false) {
    try {
        if (persist) {
            localStorage.setItem(key, value);
            sessionStorage.removeItem(key);
        } else {
            sessionStorage.setItem(key, value);
            localStorage.removeItem(key);
        }
    } catch (e) { console.warn('تعذّر حفظ الإعداد', e); }
}

/** يمسح إعداداً من التخزينين معاً */
function removeSetting(key) {
    try { localStorage.removeItem(key); } catch (e) {}
    try { sessionStorage.removeItem(key); } catch (e) {}
}

/** هل الرمز محفوظ بشكل دائم على هذا الجهاز؟ */
function isTokenPersisted() {
    try { return !!localStorage.getItem(GH_KEYS.token); } catch (e) { return false; }
}

let ghConfig = {
    owner: readSetting(GH_KEYS.owner),
    repo: readSetting(GH_KEYS.repo),
    token: readSetting(GH_KEYS.token)
};

let cachedPosts = [];
let cachedChannels = [];
let categories = [];
let cachedAbout = {};
let currentEditingPost = null; // Store path/sha for updates

// Icon Picker State
let iconPickerTarget = null;

// Standard Lucide Icons
const commonIcons = [
    'home', 'user', 'users', 'settings', 'menu', 'x', 'search', 'bell', 'star', 'heart', 'thumbs-up', 
    'check', 'check-circle', 'alert-circle', 'alert-triangle', 'info', 'help-circle', 'plus', 'minus', 
    'trash', 'trash-2', 'edit', 'edit-2', 'edit-3', 'copy', 'external-link', 'more-horizontal', 'more-vertical',
    'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
    'download', 'upload', 'refresh-cw', 'rotate-cw', 'maximize', 'minimize', 'grid', 'list', 'layout', 'layers',
    'smartphone', 'monitor', 'laptop', 'tablet', 'watch', 'cpu', 'hard-drive', 'wifi', 'bluetooth', 'battery', 'zap',
    'gamepad', 'gamepad-2', 'joystick', 'mouse', 'keyboard', 'printer', 'server', 'database', 'code', 'terminal',
    'sun', 'moon', 'cloud', 'umbrella', 'shopping-cart', 'credit-card', 'dollar-sign', 'gift', 'award', 'trophy', 'medal', 
    'activity', 'calendar', 'clock', 'timer', 'map', 'map-pin', 'navigation', 'compass', 'flag', 'bookmark', 'book', 'file-text', 
    'image', 'film', 'tv', 'radio', 'mic', 'headphones', 'video', 'camera', 'music', 'shield', 'lock', 'key', 'eye', 'bot', 'sparkles'
];

// Custom Brand SVG Paths (For icons missing in Lucide)
const brandIcons = {
    "Facebook": { path: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Instagram": { path: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "X (Twitter)": { path: '<path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "TikTok": { path: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "YouTube": { path: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Snapchat": { path: '<path d="M12 2c-3.5 0-6 2.5-6 6 0 1.5.5 2.5 1 3.5-.5 1-1.5 1-2 1-1.5 0-2 1.5-2 1.5S3.5 16 6 16c0 1.5 1.5 3 2 3s2.5 3 4 3 3.5-1 4-3 2-1.5 2-3c2.5 0 3 .5 3 2s-1.5 1.5-3 1.5c-.5 0-1.5 0-2-1 .5-1 1-2 1-3.5 0-3.5-2.5-6-6-6z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Telegram": { path: '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "WhatsApp": { path: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "LinkedIn": { path: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Pinterest": { path: '<path d="M8 14.5c-3-1-3-5 0-6 2-1 5-1 6 1 2 2 1 6-1 7-2 1-4 0-5-2"/><line x1="8" y1="20" x2="12" y2="10"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Reddit": { path: '<circle cx="12" cy="12" r="1"/><path d="M16 12a2 2 0 1 1-2-2 2 2 0 0 1 2 2z"/><path d="M10 12a2 2 0 1 1-2-2 2 2 0 0 1 2 2z"/><path d="M9 16c1.5 1 4.5 1 6 0"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Threads": { path: '<path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-5-9"/><path d="M15 11.5a3.5 3.5 0 1 1-3.5-3.5 3.5 3.5 0 0 1 3.5 3.5c0 3-2.5 5.5-5 5.5"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Discord": { path: '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M7.5 7.5c3.5-1 5.5-1 9 0"/><path d="M7 16.5c3.5 1 5.5 1 9 0"/><path d="M15.5 17c0 1 1.5 3 2 3 1.5 0 2.8-3.3 3.2-6 .4-3.3-.3-5.5-1.3-8.7A10 10 0 0 0 13 4.3c-1 .3-1.4 1-1.4 1s-1-.7-2-1a10 10 0 0 0-6.4 1c-1 3.2-1.7 5.4-1.3 8.7.4 2.7 1.7 6 3.2 6 .5 0 2-2 2-3"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Tumblr": { path: '<path d="M14 6a4 4 0 0 0-4-4v4H6v4h4v6a4 4 0 0 0 4 4h4v-4h-2a2 2 0 0 1-2-2v-4h4V6h-4z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Twitch": { path: '<path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "WeChat": { path: '<path d="M7.5 13.5c-3.3 0-6-2.5-6-5.5S4.2 2.5 7.5 2.5 13.5 5 13.5 8s-2.7 5.5-6 5.5c-.6 0-1.2-.1-1.8-.2l-2.4 1.4.5-2.2c-1.4-1.2-2.3-2.9-2.3-4.8 0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6z"/><path d="M16.5 14.5c-2.8 0-5-2-5-4.5s2.2-4.5 5-4.5 5 2 5 4.5c0 1.5-.8 2.9-2 3.8l.4 1.9-2-1.2c-.5.1-1 .1-1.4.1z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "LINE": { path: '<path d="M20.9 10c0-4.4-4-8-8.9-8S3.1 5.6 3.1 10c0 3.9 3.1 7.2 7.3 7.9.3 0 .7.1.8.2.2.2.1.5 0 .9-.2.8-.7 2.1-1.1 2.9-.1.3 0 .7.4.7h.1c1.9 0 5-2.7 6.8-4.6 2.4-1.7 3.5-4.1 3.5-7z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Kwai": { path: '<path d="M16.5 6a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0z M3 21h18v-2a4 4 0 0 0-4-4h-10a4 4 0 0 0-4 4v2z" />', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Quora": { path: '<path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 17a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm2.5-9.5c0 1.5-1.5 2-2.5 3-.5.5-1 1-1 2h-2c0-2 2-3 3-4 1-1 1-2-1-2s-3 1-3 1l-1-2c1-1 3-2 5-2s4 2 4 4z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
    "Viber": { path: '<path d="M19.9 16.5c-1.3-.6-2.5-1-3.6-.6-1 .4-1.5 1.4-1.8 1.5-.7-.2-2.6-1-3.8-2.2-1.2-1.2-2-3.1-2.2-3.8.1-.3 1.1-.8 1.5-1.8.4-1.1 0-2.3-.6-3.6-1-2.2-3.4-1.8-3.9-1.6-.5.1-.9.6-1.1 1-.8 1.7-.6 4.7 2.1 7.4 2.7 2.7 5.7 2.9 7.4 2.1.4-.2.9-.6 1-1.1.2-.5.6-2.9-1.6-3.9z"/>', viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }
};


// ============================================================================
//  🔒 أدوات الحماية (Sanitization / Escaping)
//  تُستخدم قبل أي إدراج في innerHTML لمنع ثغرات XSS المخزّنة.
// ============================================================================

const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** تهريب كامل للنص قبل إدراجه في HTML (مناسب أيضاً لقيم السمات) */
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}
const escapeAttr = escapeHtml;

/** يسمح بالروابط الآمنة فقط (http/https/نسبية/مرساة) ويمنع javascript: وأمثالها */
function safeUrl(value) {
    const url = String(value === null || value === undefined ? '' : value).trim();
    if (!url) return '';
    const probe = url.toLowerCase().replace(/[\u0000-\u0020]/g, '');
    if (probe.startsWith('javascript:') || probe.startsWith('vbscript:') || probe.startsWith('data:text/html')) return '';
    if (/^data:image\//i.test(url)) return url;
    if (/^(https?:)?\/\//i.test(url) || /^[.#?/]/.test(url) || /^[\w.-]/.test(url)) return url;
    return '';
}

/** أسماء أيقونات Lucide المسموح بها (حروف لاتينية صغيرة وأرقام وشرطات) */
function safeIconName(value, fallback = 'star') {
    const name = String(value || '').trim();
    return /^[a-z0-9-]{1,40}$/.test(name) ? name : fallback;
}

// ============================================================================
//  🕒 التوقيت المعتمد للوحة: توقيت بغداد (UTC+03:00) — وليس التوقيت العالمي UTC
// ============================================================================
const SITE_TIMEZONE = 'Asia/Baghdad';

/** تفكيك التاريخ الحالي إلى أجزائه في توقيت بغداد */
function baghdadDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: SITE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
    const parts = {};
    formatter.formatToParts(date).forEach(p => { parts[p.type] = p.value; });
    return parts;
}

/** تاريخ اليوم بصيغة YYYY-MM-DD بتوقيت بغداد */
function todayBaghdad(date = new Date()) {
    const p = baghdadDateParts(date);
    return `${p.year}-${p.month}-${p.day}`;
}

/** الوقت الحالي بصيغة HH:MM بتوقيت بغداد */
function nowBaghdadHM(date = new Date()) {
    const p = baghdadDateParts(date);
    return `${p.hour}:${p.minute}`;
}

const RICH_TEXT_ALLOWED = {
    SPAN: ['class'], B: [], STRONG: [], I: [], EM: [], U: [], MARK: [], SMALL: [], SUP: [], SUB: [], BR: []
};

/**
 * يعقّم HTML مع السماح بمجموعة محدودة من الوسوم الآمنة فقط
 * (يُستخدم لعناوين المقالات التي قد تحتوي تنسيقاً مقصوداً مثل <span class="...">).
 */
function sanitizeRichText(markup) {
    const source = String(markup === null || markup === undefined ? '' : markup);
    if (!source) return '';
    const template = document.createElement('template');
    template.innerHTML = source; // المحتوى داخل <template> لا يُنفّذ
    const clean = (node) => {
        [...node.childNodes].forEach(child => {
            if (child.nodeType === 1) {
                clean(child);
                const allowedAttrs = RICH_TEXT_ALLOWED[child.tagName.toUpperCase()];
                if (!allowedAttrs) {
                    const inner = [...child.childNodes];
                    child.replaceWith(...inner); // إزالة الوسم مع الإبقاء على النص
                    return;
                }
                [...child.attributes].forEach(attr => {
                    const name = attr.name.toLowerCase();
                    if (/^on/i.test(name) || !allowedAttrs.includes(name)) { child.removeAttribute(attr.name); return; }
                    if (name === 'class') {
                        const safeClasses = attr.value.split(/\s+/).filter(c => /^[A-Za-z0-9_-]{1,40}$/.test(c)).join(' ');
                        if (safeClasses) child.setAttribute('class', safeClasses); else child.removeAttribute('class');
                    }
                });
            } else if (child.nodeType === 8 || child.nodeType !== 3) {
                child.remove(); // تعليقات وعقد غير نصية
            }
        });
    };
    clean(template.content);
    return template.innerHTML;
}

const SVG_ALLOWED_TAGS = ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];
const SVG_ALLOWED_ATTRS = ['viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'd', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points',
    'transform', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity'];

/** يعقّم مقطع SVG مخزَّن في ملفات البيانات قبل إدراجه في الصفحة */
function sanitizeSvg(fragment) {
    const source = String(fragment === null || fragment === undefined ? '' : fragment);
    if (!source) return '';
    let doc;
    try {
        doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${source}</svg>`, 'image/svg+xml');
    } catch (e) { return ''; }
    if (!doc || !doc.documentElement || doc.documentElement.nodeName === 'parsererror') return '';
    const walk = (el) => {
        [...el.children].forEach(child => {
            if (!SVG_ALLOWED_TAGS.includes(child.tagName.toLowerCase())) { child.remove(); return; }
            [...child.attributes].forEach(attr => {
                const lname = attr.name.toLowerCase();
                const bad = lname.startsWith('on') || /javascript:/i.test(attr.value) || /url\s*\(/i.test(attr.value);
                if (bad || !SVG_ALLOWED_ATTRS.includes(lname)) child.removeAttribute(attr.name);
            });
            walk(child);
        });
    };
    walk(doc.documentElement);
    return [...doc.documentElement.children].map(c => new XMLSerializer().serializeToString(c)).join('');
}

/**
 * محلّل آمن لمصفوفة JavaScript مكتوبة داخل ملف (بديل new Function/eval).
 * يقبل فقط: مصفوفات/كائنات/نصوص/أرقام/true/false/null ومفاتيح بدون علامات اقتباس.
 * يرفض أي دالة أو تعبير أو أي رمز آخر ويرمي خطأ.
 */
function safeParseJsArray(src) {
    const text = String(src === null || src === undefined ? '' : src);
    const len = text.length;
    const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];
    let i = 0;

    const skipWs = () => { while (i < len && /\s/.test(text[i])) i++; };

    const parseString = (quote) => {
        i++;
        let out = '';
        while (i < len) {
            const ch = text[i++];
            if (ch === '\\') {
                const esc = text[i++];
                const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '\\': '\\', '/': '/', '"': '"', "'": "'" };
                if (esc === 'u') {
                    const hex = text.substr(i, 4);
                    if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('unicode escape غير صالح');
                    out += String.fromCharCode(parseInt(hex, 16)); i += 4;
                } else if (map[esc] !== undefined) { out += map[esc]; }
                else { out += esc; }
            } else if (ch === quote) {
                return out;
            } else {
                if (ch === '\n' || ch === '\r') throw new Error('نص غير مغلق');
                out += ch;
            }
        }
        throw new Error('نص غير مغلق داخل الملف');
    };

    const parseObject = () => {
        i++; // {
        const obj = {};
        skipWs();
        if (text[i] === '}') { i++; return obj; }
        while (i < len) {
            skipWs();
            let key;
            if (text[i] === '"' || text[i] === "'") { key = parseString(text[i]); }
            else {
                const start = i;
                while (i < len && /[\w$]/.test(text[i])) i++;
                key = text.slice(start, i);
            }
            if (!key) throw new Error('مفتاح غير صالح في الملف');
            if (FORBIDDEN_KEYS.includes(key)) throw new Error('مفتاح ممنوع: ' + key);
            skipWs();
            if (text[i] !== ':') throw new Error('متوقع ":" في الملف');
            i++;
            obj[key] = parseValue();
            skipWs();
            if (text[i] === ',') { i++; continue; }
            if (text[i] === '}') { i++; return obj; }
            throw new Error('متوقع "," أو "}" في الملف');
        }
        throw new Error('كائن غير مغلق في الملف');
    };

    const parseArray = () => {
        i++; // [
        const arr = [];
        skipWs();
        if (text[i] === ']') { i++; return arr; }
        while (i < len) {
            arr.push(parseValue());
            skipWs();
            if (text[i] === ',') { i++; continue; }
            if (text[i] === ']') { i++; return arr; }
            throw new Error('متوقع "," أو "]" في الملف');
        }
        throw new Error('مصفوفة غير مغلقة في الملف');
    };

    const parseValue = () => {
        skipWs();
        const ch = text[i];
        if (ch === '{') return parseObject();
        if (ch === '[') return parseArray();
        if (ch === '"' || ch === "'") return parseString(ch);
        const start = i;
        while (i < len && /[-\w.+E]/.test(text[i])) i++;
        const raw = text.slice(start, i);
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (raw === 'null') return null;
        if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(raw)) return Number(raw);
        throw new Error('قيمة غير مدعومة (تم رفضها لأسباب أمنية): ' + raw.slice(0, 30));
    };

    const result = parseValue();
    skipWs();
    if (i < len) throw new Error('يوجد محتوى إضافي بعد نهاية المصفوفة');
    if (!Array.isArray(result)) throw new Error('البنية ليست مصفوفة');
    return result;
}

/* ============================================================================
 *  🔐 إدارة جلسة GitHub (تسجيل الدخول / الخروج + التحقق من الرمز)
 * ============================================================================ */

/** يكشف نوع رمز الوصول من بادئته */
function detectTokenKind(token) {
    const t = String(token || '').trim();
    if (!t) return 'empty';
    if (t.startsWith('github_pat_')) return 'fine-grained';  // النوع الموصى به
    if (t.startsWith('ghp_')) return 'classic';
    if (/^(gho_|ghu_|ghs_|ghr_)/.test(t)) return 'oauth';
    if (/^[0-9a-f]{40}$/i.test(t)) return 'classic-legacy';
    return 'unknown';
}

/** رسائل إرشاد حسب نوع الرمز */
const TOKEN_KIND_INFO = {
    'fine-grained': { tone: 'ok', label: 'Fine-grained PAT (مُقيَّد الصلاحيات) ✅' },
    'classic': { tone: 'danger', label: 'Classic Token (صلاحية repo كاملة على كل مستودعاتك) ⚠️' },
    'classic-legacy': { tone: 'danger', label: 'Classic Token قديم (صلاحيات واسعة) ⚠️' },
    'oauth': { tone: 'warn', label: 'رمز OAuth/تطبيق — ليس Fine-grained PAT' },
    'unknown': { tone: 'danger', label: 'تنسيق غير معروف' }
};

function renderGhValidation(tone, html) {
    const box = document.getElementById('ghValidationBox');
    if (!box) return;
    const tones = {
        ok: 'bg-green-50 border-green-200 text-green-800',
        warn: 'bg-amber-50 border-amber-200 text-amber-800',
        danger: 'bg-red-50 border-red-200 text-red-700',
        info: 'bg-gray-50 border-gray-200 text-gray-700'
    };
    box.className = `text-xs rounded-xl p-3 border leading-relaxed ${tones[tone] || tones.info}`;
    box.innerHTML = html;
}

/**
 * يتحقق من الرمز مع GitHub مباشرة من المتصفح:
 *  • صلاحية الرمز (401 ⇒ غير صالح)
 *  • نوعه والصلاحيات الممنوحة له (X-OAuth-Scopes للـ Classic)
 *  • الوصول إلى المستودع وصلاحية الكتابة عليه
 */
async function verifyGithubConnection({ owner, repo, token }) {
    const headers = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' };

    let userRes;
    try {
        userRes = await fetch('https://api.github.com/user', { headers });
    } catch (e) {
        return { ok: false, kind: 'network', message: 'تعذّر الاتصال بـ GitHub. تحقّق من اتصال الإنترنت ثم أعد المحاولة.' };
    }

    if (userRes.status === 401) {
        return { ok: false, kind: 'invalid', message: 'الرمز غير صالح أو منتهي الصلاحية أو تم إبطاله من GitHub.' };
    }
    if (userRes.status === 403) {
        return { ok: false, kind: 'blocked', message: 'رفض GitHub الطلب (403) — قد يكون الرمز محظوراً أو تجاوزت حد الطلبات.' };
    }
    if (!userRes.ok) {
        return { ok: false, kind: 'error', message: `استجابة غير متوقعة من GitHub (${userRes.status}).` };
    }

    const user = await userRes.json().catch(() => ({}));
    let scopes = '';
    try { scopes = String(userRes.headers.get('x-oauth-scopes') || '').trim(); } catch (e) {}

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 404) {
        return {
            ok: false, kind: 'no-repo', login: user.login, scopes,
            message: `الرمز صحيح (الحساب: ${user.login}) لكن لا يملك وصولاً إلى المستودع <span class="dir-ltr">${escapeHtml(owner)}/${escapeHtml(repo)}</span>. تأكد من تحديد المستودع في «Repository access» عند إنشاء الرمز.`
        };
    }
    if (!repoRes.ok) {
        return { ok: false, kind: 'repo-error', login: user.login, scopes, message: `تعذّر قراءة بيانات المستودع (${repoRes.status}).` };
    }

    const repoData = await repoRes.json().catch(() => ({}));
    const canPush = !!(repoData.permissions && repoData.permissions.push);

    return {
        ok: canPush,
        kind: canPush ? 'ok' : 'read-only',
        login: user.login,
        scopes,
        private: !!repoData.private,
        defaultBranch: repoData.default_branch || 'main',
        message: canPush
            ? ''
            : 'الرمز يملك وصولاً للقراءة فقط على هذا المستودع. امنحه صلاحية <b>Contents: Read and write</b> ثم أعد المحاولة.'
    };
}

/** يعرض شاشة الدخول (تُستدعى عند غياب الرمز أو بعد تسجيل الخروج) */
function showLoginModal() {
    const modal = document.getElementById('ghModal');
    if (!modal) return;
    const ownerEl = document.getElementById('ghOwner');
    const repoEl = document.getElementById('ghRepo');
    const tokenEl = document.getElementById('ghToken');
    if (ownerEl) ownerEl.value = ghConfig.owner || '';
    if (repoEl) repoEl.value = ghConfig.repo || '';
    if (tokenEl) tokenEl.value = '';              // لا يُعاد أبداً تعبئة الرمز في الواجهة
    const box = document.getElementById('ghValidationBox');
    if (box) box.className = 'hidden';
    const cancel = document.getElementById('ghCancelBtn');
    if (cancel) cancel.style.display = ghConfig.token ? '' : 'none';
    modal.classList.remove('hidden');
    lucide.createIcons();
}

function hideLoginModal() {
    const modal = document.getElementById('ghModal');
    if (modal) modal.classList.add('hidden');
}

window.toggleTokenVisibility = () => {
    const input = document.getElementById('ghToken');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
};

/** يحدّث مؤشر حالة الاتصال في الشريط الجانبي */
function renderConnectionStatus() {
    const dot = document.getElementById('ghStatusDot');
    const text = document.getElementById('ghStatusText');
    const sub = document.getElementById('ghStatusSub');
    const btn = document.getElementById('btnDisconnect');
    const btnMobile = document.getElementById('btnDisconnectMobile');
    if (!text) return;

    const connected = !!ghConfig.token;
    if (dot) dot.className = `w-2 h-2 rounded-full mt-1 shrink-0 ${connected ? 'bg-green-500' : 'bg-gray-300'}`;
    text.textContent = connected ? 'متصل' : 'غير متصل';
    text.className = `font-bold truncate ${connected ? 'text-green-700' : 'text-gray-600'}`;
    if (sub) sub.textContent = connected ? `${ghConfig.owner}/${ghConfig.repo}` : 'سجّل الدخول للمتابعة';
    if (btn) btn.style.display = connected ? 'flex' : 'none';
    if (btnMobile) btnMobile.style.display = connected ? '' : 'none';
}

/**
 * يمسح كل آثار الرمز والبيانات الحسّاسة من المتصفح ومن الذاكرة ومن الواجهة.
 * @returns {boolean} نجاح المسح
 */
function clearGithubSession() {
    // 1) مسح الرمز مسحاً كاملاً من التخزين الدائم والمؤقت (localStorage + sessionStorage)
    removeSetting(GH_KEYS.token);

    // 2) الإبقاء على اسم المستخدم/المستودع (بيانات غير حسّاسة) لتسهيل الدخول التالي
    if (ghConfig.owner) writeSetting(GH_KEYS.owner, ghConfig.owner, true);
    if (ghConfig.repo) writeSetting(GH_KEYS.repo, ghConfig.repo, true);

    // 3) الذاكرة: إسقاط نسخة الرمز فقط + كاش المحتوى
    ghConfig = { owner: ghConfig.owner, repo: ghConfig.repo, token: '' };
    try { api._branch = null; } catch (e) {}
    cachedPosts = []; cachedChannels = []; categories = []; cachedAbout = {};
    currentEditingPost = null; iconPickerTarget = null;
    parsedApps = []; parsedStores = []; storeDataRaw = null;
    cachedPhones = []; visitorPeriodsData = null;

    // 3) الواجهة: حقول الإدخال والمحتوى المعروض
    const tokenEl = document.getElementById('ghToken');
    if (tokenEl) { tokenEl.value = ''; tokenEl.type = 'password'; }
    ['postsList', 'channelsList', 'categoriesList', 'phonesList', 'statsContent',
     'storesList', 'appsTableBody', 'statCatsList', 'statTopPostsList', 'visitorPeriodsGrid']
        .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

    // 4) إغلاق كل المحرّرات والنوافذ المفتوحة
    ['postEditor', 'phoneEditor', 'categoryEditor', 'appModal', 'storeModal', 'iconPickerModal']
        .forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
    document.body.style.overflow = '';

    renderConnectionStatus();
    return true;
}

/** تسجيل الخروج / فصل الاتصال: مسح آمن ثم العودة لشاشة الدخول */
window.disconnectGithub = () => {
    if (!confirm('سيتم مسح رمز الوصول (Token) نهائياً من هذا المتصفح ومسح المحتوى المحمّل في الذاكرة، وسجّل الخروج فوراً.\n\n(يبقى اسم المستودع فقط — بيانات غير حسّاسة — لتسهيل الدخول التالي).\n\nهل تريد المتابعة؟')) return;

    const tokenEl = document.getElementById('ghToken');
    if (tokenEl) tokenEl.value = '';   // مسح الحقل قبل أي خطوة أخرى
    clearGithubSession();
    showToast('تم تسجيل الخروج ومسح رمز الوصول ✓');

    // إعادة تحميل نظيفة للصفحة ⇒ تظهر شاشة إدخال الرمز مباشرة بلا أي بقايا في الذاكرة
    setTimeout(() => {
        try {
            location.replace(location.pathname + '?logged_out=1');
        } catch (e) {
            showLoginModal(); // بديل آمن إن تعذّرت إعادة التوجيه
        }
    }, 700);
};

document.addEventListener('DOMContentLoaded', () => {
    initIconPicker();
    renderConnectionStatus();

    // رسالة تأكيد الخروج بعد إعادة التوجيه + تنظيف الرابط
    try {
        if (location.search.indexOf('logged_out=1') !== -1) {
            showToast('تم تسجيل الخروج ومسح رمز الوصول من هذا المتصفح');
            history.replaceState({}, '', location.pathname);
        }
    } catch (e) {}

    if (!ghConfig.token) {
        showLoginModal();
    } else {
        loadPosts();
        loadCategories();
    }
    
    document.addEventListener('click', function (e) {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const index = editBtn.dataset.index;
            openEditByIndex(index);
            return;
        }
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const index = deleteBtn.dataset.index;
            deleteByIndex(index);
            return;
        }
    });
});

window.switchTab = (tabName) => {
    if (!ghConfig.token) { showLoginModal(); return; }  // لا بيانات بدون تسجيل دخول
    document.querySelectorAll('aside button').forEach(btn => btn.classList.remove('tab-active'));
    document.getElementById(`nav-${tabName}`).classList.add('tab-active');
    
    // Hide all main content sections (divs or sections with id starting with sec-)
    const sections = ['posts', 'channels', 'categories', 'settings', 'stats', 'phones', 'appstore'];
    sections.forEach(secName => {
        const el = document.getElementById(`sec-${secName}`);
        if(el) {
            el.classList.add('hidden-section');
            // Also add hidden for divs that might not use hidden-section class correctly
            el.classList.add('hidden');
        }
    });
    
    // Show active section
    const activeEl = document.getElementById(`sec-${tabName}`);
    if(activeEl) {
        activeEl.classList.remove('hidden-section');
        activeEl.classList.remove('hidden');
    }

    if (tabName === 'posts') loadPosts();
    if (tabName === 'channels') loadChannels();
    if (tabName === 'categories') loadCategories();
    if (tabName === 'settings') loadSettings();
    if (tabName === 'stats') loadStats();
    if (tabName === 'phones') loadPhones();
    if (tabName === 'appstore') loadAppStoreData(); // كان ناقصاً: القسم يظهر فارغاً حتى الضغط على "تحديث"
};

async function compressAndConvertToWebP(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const scaleSize = MAX_WIDTH / img.width;
                let width = img.width;
                let height = img.height;
                if (scaleSize < 1) {
                    width = MAX_WIDTH;
                    height = img.height * scaleSize;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const webpData = canvas.toDataURL('image/webp', 0.8);
                resolve(webpData.split(',')[1]); 
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

const api = {
    base: () => `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents`,
    repoApi: () => `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}`,
    headers: () => ({ 'Authorization': `token ${ghConfig.token}`, 'Content-Type': 'application/json' }),
    _branch: null,
    async defaultBranch() {
        if (this._branch) return this._branch;
        try {
            const res = await fetch(this.repoApi(), { headers: this.headers() });
            if (res.ok) { const info = await res.json(); this._branch = info.default_branch || 'main'; }
        } catch (e) { /* تجاهل */ }
        return this._branch || 'main';
    },
    async get(path) {
        const res = await fetch(`${this.base()}/${path}?t=${Date.now()}`, { headers: this.headers() });
        if (!res.ok) throw new Error(res.status === 404 ? `API Error 404: الملف غير موجود (${path})` : `API Error: ${res.status}`);
        return await res.json();
    },
    async put(path, content, msg, sha = null) {
        const body = { message: msg, content: btoa(unescape(encodeURIComponent(content))) };
        if (sha) body.sha = sha;
        const res = await fetch(`${this.base()}/${path}`, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`Save Failed (${res.status})`);
        return await res.json();
    },
    async delete(path, sha, msg) {
        const res = await fetch(`${this.base()}/${path}`, { method: 'DELETE', headers: this.headers(), body: JSON.stringify({ message: msg, sha: sha }) });
        if (!res.ok) throw new Error(`Delete Failed (${res.status})`);
        return true;
    },
    /**
     * يحذف عدة ملفات داخل Commit واحد عبر Git Data API (بدل Commit لكل ملف).
     * وإن تعذّر ذلك (صلاحيات/فرع محمي) يرجع تلقائياً إلى الحذف المتسلسل.
     * @returns {Promise<{atomic: boolean, deleted: string[], skipped: string[]}>}
     */
    async deleteFiles(paths, msg) {
        const list = [...new Set((paths || []).filter(Boolean))];
        const result = { atomic: false, deleted: [], skipped: [] };
        if (list.length === 0) return result;

        try {
            const branch = await this.defaultBranch();
            const refRes = await fetch(`${this.repoApi()}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: this.headers() });
            if (!refRes.ok) throw new Error(`ref ${refRes.status}`);
            const headSha = (await refRes.json()).object.sha;

            const commitRes = await fetch(`${this.repoApi()}/git/commits/${headSha}`, { headers: this.headers() });
            if (!commitRes.ok) throw new Error(`commit ${commitRes.status}`);
            const baseTree = (await commitRes.json()).tree.sha;

            const treeRes = await fetch(`${this.repoApi()}/git/trees`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({
                    base_tree: baseTree,
                    tree: list.map(p => ({ path: p, mode: '100644', type: 'blob', sha: null }))
                })
            });
            if (!treeRes.ok) throw new Error(`tree ${treeRes.status}`);
            const newTree = (await treeRes.json()).sha;

            const newCommitRes = await fetch(`${this.repoApi()}/git/commits`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({ message: msg, tree: newTree, parents: [headSha] })
            });
            if (!newCommitRes.ok) throw new Error(`new commit ${newCommitRes.status}`);
            const newCommit = (await newCommitRes.json()).sha;

            const patchRes = await fetch(`${this.repoApi()}/git/refs/heads/${encodeURIComponent(branch)}`, {
                method: 'PATCH',
                headers: this.headers(),
                body: JSON.stringify({ sha: newCommit, force: false })
            });
            if (!patchRes.ok) throw new Error(`update ref ${patchRes.status}`);

            result.atomic = true;
            result.deleted = list;
            return result;
        } catch (e) {
            console.warn('Atomic delete unavailable, falling back to sequential delete:', e.message || e);
        }

        // خطة بديلة: حذف كل ملف على حدة (Commit لكل ملف)
        for (const p of list) {
            try {
                const file = await this.get(p);
                if (!file || !file.sha) { result.skipped.push(p); continue; }
                await this.delete(p, file.sha, msg);
                result.deleted.push(p);
            } catch (err) {
                result.skipped.push(p);
            }
        }
        return result;
    },
    async uploadImage(file) {
        try {
            const b64 = await compressAndConvertToWebP(file);
            const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const fileName = `assets/images/${Date.now()}_${originalName.replace(/\s/g, '_')}.webp`;
            
            await fetch(`${this.base()}/${fileName}`, { 
                method: 'PUT', 
                headers: this.headers(), 
                body: JSON.stringify({ message: 'Upload Compressed WebP via CMS', content: b64 }) 
            });
            return fileName;
        } catch (e) {
            console.error("Compression/Upload Error:", e);
            throw e;
        }
    }
};

function initIconPicker() {
    const grid = document.getElementById('iconGrid');
    grid.innerHTML = ''; // Clear previous

    // 1. Add Custom Brand Icons
    for (const [name, svgData] of Object.entries(brandIcons)) {
        const div = document.createElement('div');
        div.className = 'icon-option bg-blue-50 border-blue-200';
        div.title = name;
        div.innerHTML = `<svg viewBox="${svgData.viewBox}" fill="${svgData.fill}" stroke="${svgData.stroke}" stroke-width="${svgData.strokeWidth}" class="w-5 h-5">${svgData.path}</svg>`;
        div.onclick = () => selectBrandIcon(svgData);
        grid.appendChild(div);
    }

    // Separator
    const sep = document.createElement('div');
    sep.className = 'col-span-full h-px bg-gray-200 my-2';
    grid.appendChild(sep);

    // 2. Add Standard Lucide Icons
    commonIcons.forEach(iconName => {
        const div = document.createElement('div');
        div.className = 'icon-option text-gray-700';
        div.title = iconName;
        div.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5"></i>`;
        div.onclick = () => selectLucideIcon(iconName);
        grid.appendChild(div);
    });
}

window.openIconPickerForChannel = (index) => { iconPickerTarget = { type: 'channel', id: index }; openPickerModal(); };
window.openIconPickerForSocial = (key) => { iconPickerTarget = { type: 'social', id: key }; openPickerModal(); };

function openPickerModal() {
    document.getElementById('iconPickerModal').classList.remove('hidden');
    switchPickerTab('lucide');
    document.getElementById('pickerSize').value = 24;
    updateSizeDisplay(24);
    document.getElementById('pickerUrl').value = '';
    document.getElementById('pickerPreviewImg').classList.add('hidden');
    document.getElementById('pickerPlaceholder').classList.remove('hidden');
    lucide.createIcons();
}

window.closeIconPicker = () => { document.getElementById('iconPickerModal').classList.add('hidden'); iconPickerTarget = null; };
window.switchPickerTab = (tab) => {
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-btn-${tab}`).classList.add('active');
    document.querySelectorAll('.picker-tab').forEach(t => t.classList.add('hidden'));
    document.getElementById(`picker-${tab}`).classList.remove('hidden');
};
window.updateSizeDisplay = (val) => { document.getElementById('sizeDisplay').innerText = `${val}px`; const prev = document.getElementById('pickerPreviewImg'); if(prev) { prev.style.width = val + 'px'; prev.style.height = val + 'px'; } };

window.selectLucideIcon = (iconName) => { 
    const size = document.getElementById('pickerSize').value; 
    applyIconChange({ type: 'lucide', value: iconName, size: size }); 
};

window.selectBrandIcon = (svgData) => {
    const size = document.getElementById('pickerSize').value;
    // We store the raw SVG parts needed to reconstruct it
    applyIconChange({ 
        type: 'svg', 
        value: svgData.path, 
        viewBox: svgData.viewBox,
        fill: svgData.fill,
        stroke: svgData.stroke,
        strokeWidth: svgData.strokeWidth,
        size: size 
    });
};

window.handlePickerFileSelect = async (input) => {
    if (input.files && input.files[0]) {
        const btn = document.getElementById('btnUploadPicker'); btn.innerText = 'جاري الضغط والرفع...'; btn.disabled = true;
        try { const url = await api.uploadImage(input.files[0]); document.getElementById('pickerUrl').value = url; updatePickerPreview(url); } catch(e) { alert('Upload failed: ' + e.message); }
        btn.innerHTML = '<i data-lucide="upload"></i> رفع صورة'; btn.disabled = false; lucide.createIcons();
    }
};
window.updatePickerPreview = (url) => {
    const img = document.getElementById('pickerPreviewImg'); const ph = document.getElementById('pickerPlaceholder');
    if (url) { 
        let displayUrl = url.startsWith('http') ? url : url.replace(/^(\.\.\/)+/, '');
        displayUrl = '../' + displayUrl; 
        img.src = displayUrl; 
        img.classList.remove('hidden'); ph.classList.add('hidden'); const size = document.getElementById('pickerSize').value; img.style.width = size + 'px'; img.style.height = size + 'px'; 
    } else { img.classList.add('hidden'); ph.classList.remove('hidden'); }
};
window.confirmImageSelection = () => { const url = document.getElementById('pickerUrl').value; const size = document.getElementById('pickerSize').value; if(!url) return alert('يرجى اختيار صورة أو رابط'); applyIconChange({ type: 'image', value: url, size: size }); };

function applyIconChange(iconData) {
    if (!iconPickerTarget) return;
    
    // Update Channel Icon
    if (iconPickerTarget.type === 'channel') { 
        cachedChannels[iconPickerTarget.id].iconData = iconData; 
        // For backwards compatibility, set .icon to value if it's a string (lucide), else 'star'
        cachedChannels[iconPickerTarget.id].icon = (iconData.type === 'lucide') ? iconData.value : 'star';
        renderChannels(); 
    }
    // Update Social Icon
    else if (iconPickerTarget.type === 'social') {
        const btn = document.getElementById(`btnIcon_${iconPickerTarget.id}`); 
        btn.dataset.iconInfo = JSON.stringify(iconData);
        
        let html = '';
        if(iconData.type === 'image') { 
            let sUrl = iconData.value;
            if(sUrl && !sUrl.startsWith('http')) sUrl = '../' + sUrl.replace(/^(\.\.\/)+/, '');
            html = `<img src="${escapeAttr(safeUrl(sUrl))}" style="width:24px; height:24px; object-fit:contain;">`; 
        } else if (iconData.type === 'svg') {
            html = `<svg viewBox="${escapeAttr(iconData.viewBox)}" fill="${escapeAttr(iconData.fill)}" stroke="${escapeAttr(iconData.stroke)}" stroke-width="${escapeAttr(iconData.strokeWidth)}" style="width:24px; height:24px">${sanitizeSvg(iconData.value)}</svg>`;
        } else { 
            html = `<i data-lucide="${safeIconName(iconData.value)}"></i>`; 
        }
        btn.innerHTML = html;
        if(iconData.type === 'lucide') lucide.createIcons(); 
    }
    closeIconPicker();
}

async function loadPosts() {
    const list = document.getElementById('postsList'); const loader = document.getElementById('postsLoader');
    list.innerHTML = ''; loader.classList.remove('hidden');
    try {
        const files = await api.get('content/posts'); cachedPosts = [];
        const promises = files.map(async file => { 
            if (!file.name.endsWith('.json')) return; 
            try {
                const data = await api.get(file.path); 
                let decodedContent = '';
                try { decodedContent = decodeURIComponent(escape(atob(data.content))); } catch(e) { console.error("Decoding error for " + file.name, e); return; }
                const content = JSON.parse(decodedContent); 
                if (!content.slug) { content.slug = file.name.replace('.json', ''); }
                cachedPosts.push({ ...content, sha: data.sha, path: file.path }); 
            } catch (err) { console.error("Error loading post: " + file.name, err); }
        });
        await Promise.all(promises);
        
        // --- Updated Sort Logic: Date + Time ---
        cachedPosts.sort((a, b) => {
            const dateStrA = a.updated || a.date;
            const timeStrA = a.time || "00:00";
            const dateStrB = b.updated || b.date;
            const timeStrB = b.time || "00:00";
            
            const dateTimeA = new Date(`${dateStrA}T${timeStrA}`);
            const dateTimeB = new Date(`${dateStrB}T${timeStrB}`);
            
            if (isNaN(dateTimeA)) return 1; 
            if (isNaN(dateTimeB)) return -1;
            
            return dateTimeB - dateTimeA;
        });
        
        loader.classList.add('hidden'); renderPosts();
    } catch (e) { console.error(e); loader.classList.add('hidden'); list.innerHTML = `<div class="text-center text-red-500">حدث خطأ في تحميل المقالات.<br>تأكد من إعدادات الاتصال.</div>`; }
}

function renderPosts() {
    const list = document.getElementById('postsList');
    if (!list) return;
    list.innerHTML = '';
    cachedPosts.forEach((p, index) => {
        let safeImage = p.image || '';
        if (safeImage && !safeImage.startsWith('http')) {
             safeImage = safeImage.replace(/^(\.\.\/)+/, '');
             safeImage = '../' + safeImage;
        } else if (!safeImage) {
            safeImage = 'https://via.placeholder.com/300x200?text=No+Image';
        }

        const dateDisplay = (p.updated && p.updated !== p.date) ? `<span class="text-blue-500 font-bold" title="تم التحديث">♻ ${escapeHtml(p.updated)}</span>` : `<span>${escapeHtml(p.date || '')}</span>`;
        // Show Time if exists
        const timeDisplay = p.time ? `<span class="text-gray-400 ml-1 text-[10px]">${escapeHtml(p.time)}</span>` : '';

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all';
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="${escapeAttr(safeUrl(safeImage))}" class="w-16 h-10 object-cover rounded-md bg-gray-100">
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-800 line-clamp-1">${sanitizeRichText(p.title || '')}</h3>
                    <div class="text-xs text-gray-400 flex gap-2 items-center">
                        ${dateDisplay} ${timeDisplay} <span>•</span> <span class="bg-gray-100 px-2 py-0.5 rounded text-gray-600">${escapeHtml(p.category || '')}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button class="btn-edit p-2 text-blue-600 hover:bg-blue-50 rounded-lg" data-index="${index}"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button class="btn-delete p-2 text-red-600 hover:bg-red-50 rounded-lg" data-index="${index}"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </div>`;
        list.appendChild(card);
    });
    lucide.createIcons();
}

window.openPostEditor = () => { 
    document.getElementById('postEditor').classList.remove('hidden'); 
    ['pTitle', 'pSlug', 'pDesc', 'pContent', 'pImage', 'pYoutubeId', 'pSummary', 'ptvAppLink'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('pSlug').dataset.mode = 'new'; document.getElementById('pSlug').readOnly = false; document.getElementById('editorTitle').innerText = 'مقال جديد'; 
    document.getElementById('pDate').value = ''; // Reset date field for new posts
    
    // Set default render mode to Markdown
    document.querySelector('input[name="pRenderMode"][value="markdown"]').checked = true;

    // الوقت الافتراضي: الوقت الحالي بتوقيت بغداد (UTC+03:00)
    document.getElementById('pTime').value = nowBaghdadHM();
    const hint = document.getElementById('pTimeHint');
    if (hint) hint.textContent = `توقيت بغداد الآن: ${nowBaghdadHM()}`;
};
window.closePostEditor = () => document.getElementById('postEditor').classList.add('hidden');

// --- Updated openEditByIndex ---
window.openEditByIndex = (index) => {
    const p = cachedPosts[index];
    if (!p) return alert('المقال غير موجود');

    // Store path and sha for update
    currentEditingPost = {
        path: p.path,
        sha: p.sha
    };

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('pTitle', p.title);
    setVal('pSlug', p.slug);
    setVal('pCat', p.category);
    setVal('pDesc', p.description);
    setVal('pContent', p.content);
    setVal('pImage', p.image);
    setVal('pYoutubeId', p.youtubeVideoId);
    setVal('ptvAppLink', p.tvAppLink);
    setVal('pDate', p.date);
    setVal('pTime', p.time || "00:00");
    setVal('pSummary', p.summary);

    // Set render mode radio
    const renderMode = p.renderMode || 'markdown';
    const modeRadio = document.querySelector(`input[name="pRenderMode"][value="${renderMode}"]`);
    if(modeRadio) modeRadio.checked = true;

    const slugEl = document.getElementById('pSlug');
    slugEl.readOnly = true;
    slugEl.dataset.mode = 'edit';

    document.getElementById('editorTitle').innerText = 'تعديل مقال';
    document.getElementById('postEditor').classList.remove('hidden');
};

/**
 * حذف المقال: يحذف ملف البيانات (JSON) وصفحة HTML المولَّدة منه في نفس العملية
 * حتى لا تبقى صفحات يتيمة مفهرسة في محركات البحث.
 */
window.deleteByIndex = async (index) => {
    const p = cachedPosts[index];
    if (!p) return;

    const htmlPath = `article-${p.slug}.html`;
    const message = `Delete Post: ${p.slug}`;

    if (!confirm(`سيتم حذف المقال نهائياً:\n\n• ملف البيانات: ${p.path}\n• صفحة HTML المولَّدة: ${htmlPath} (إن وُجدت)\n\nهل أنت متأكد؟`)) return;

    const btn = document.querySelector(`.btn-delete[data-index="${index}"]`);
    if (btn) btn.disabled = true;

    try {
        const result = await api.deleteFiles([p.path, htmlPath], message);
        const skippedHtml = result.skipped.includes(htmlPath);

        if (skippedHtml) {
            showToast('تم حذف المقال (لا توجد صفحة HTML مولَّدة له)');
        } else {
            showToast('تم حذف المقال وصفحته المولَّدة ✓');
        }
        loadPosts();
    } catch (e) {
        alert('فشل الحذف: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
};

// --- Updated savePost ---
window.savePost = async () => {
    const btn = document.getElementById('btnSavePost');
    btn.innerText = 'جاري الحفظ...';
    btn.disabled = true;

    try {
        let slug = document.getElementById('pSlug').value.trim();
        if (!slug) slug = 'post-' + Date.now();

        const isEdit = document.getElementById('pSlug').dataset.mode === 'edit';

        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        let manualDate = document.getElementById('pDate')?.value;
        let finalDate = manualDate && manualDate.trim() !== ''
            ? manualDate
            : todayBaghdad(); // توقيت بغداد (UTC+03:00)

        const finalTime = document.getElementById('pTime').value || nowBaghdadHM();
        const now = todayBaghdad(); // تاريخ التحديث بتوقيت بغداد
        
        // Get selected render mode
        const renderMode = document.querySelector('input[name="pRenderMode"]:checked').value;

        const postData = {
            title: getVal('pTitle'),
            slug: slug,
            description: getVal('pDesc'),
            category: getVal('pCat'),
            date: finalDate,
            time: finalTime,
            updated: isEdit ? now : undefined,
            image: getVal('pImage'),
            content: getVal('pContent'),
            youtubeVideoId: getVal('pYoutubeId'),
            summary: getVal('pSummary'),
            renderMode: renderMode, // Save the render mode preference
            tvAppLink: document.getElementById('ptvAppLink') ? document.getElementById('ptvAppLink').value : ''
        };

        if (!postData.updated) delete postData.updated;

        let path;
        let sha;

        if (isEdit && currentEditingPost) {
            path = currentEditingPost.path;
            sha = currentEditingPost.sha;
        } else {
            path = `content/posts/${slug}.json`;
            sha = null;
        }

        await api.put(
            path,
            JSON.stringify(postData, null, 2),
            `${isEdit ? 'Update' : 'Create'} Post: ${postData.title}`,
            sha
        );

        showToast('تم حفظ المقال!');
        closePostEditor();
        currentEditingPost = null;
        loadPosts();

    } catch (e) {
        alert('خطأ في الحفظ: ' + e.message);
    } finally {
        btn.innerText = 'حفظ ونشر';
        btn.disabled = false;
    }
};

// --- AI Summary Generation ---
window.generateSummaryAI = async () => {
    const btn = document.getElementById('btnGenerateSummary');
    const content = document.getElementById('pContent').value;
    const summaryField = document.getElementById('pSummary');

    if (content.length < 50) {
        alert("المحتوى قصير جداً للتوليد. اكتب المقال أولاً.");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> جاري التوليد...`;
    btn.disabled = true;

    try {
        // Since Admin is client-side, we call the Cloudflare function
        // Note: In local dev or different domains, this might hit CORS issues unless configured.
        // Assuming Admin is served from same origin or function allows CORS.
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        if (data.summary) {
            summaryField.value = data.summary;
            showToast('تم توليد الملخص بنجاح!');
        } else {
            alert('فشل التوليد. حاول مرة أخرى.');
        }
    } catch (e) {
        console.error(e);
        alert('حدث خطأ أثناء الاتصال بـ AI.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
};

window.insertYoutube = () => { const url = prompt("رابط يوتيوب:"); if (url) window.insertTag(`\n@[youtube](${url})\n`); };
window.insertLink = () => { const url = prompt("الرابط:"); const text = prompt("النص:"); if(url) window.insertTag(`[${text || 'اضغط هنا'}](${url})`); };

async function loadChannels() {
    const loader = document.getElementById('channelsLoader'); loader.classList.remove('hidden');
    try { const file = await api.get('content/data/channels.json'); cachedChannels = JSON.parse(decodeURIComponent(escape(atob(file.content)))); cachedChannels.sha = file.sha; renderChannels(); } catch(e) { console.error(e); } loader.classList.add('hidden');
}
function renderChannels() {
    const list = document.getElementById('channelsList');
    list.innerHTML = cachedChannels.map((ch, index) => {
        let iconHtml = ''; 
        if (ch.iconData && ch.iconData.type === 'image') { 
            let iUrl = ch.iconData.value;
            if(iUrl && !iUrl.startsWith('http')) iUrl = '../' + iUrl.replace(/^(\.\.\/)+/, '');
            iconHtml = `<img src="${escapeAttr(safeUrl(iUrl))}" style="width:${Number(ch.iconData.size)||24}px; height:${Number(ch.iconData.size)||24}px; object-fit:contain;">`; 
        } else if (ch.iconData && ch.iconData.type === 'svg') {
            const size = Number(ch.iconData.size) || 24;
            iconHtml = `<svg viewBox="${escapeAttr(ch.iconData.viewBox)}" fill="${escapeAttr(ch.iconData.fill)}" stroke="${escapeAttr(ch.iconData.stroke)}" stroke-width="${escapeAttr(ch.iconData.strokeWidth)}" style="width:${size}px; height:${size}px">${sanitizeSvg(ch.iconData.value)}</svg>`;
        } else { 
            iconHtml = `<i data-lucide="${safeIconName((ch.iconData && ch.iconData.value) ? ch.iconData.value : ch.icon)}"></i>`; 
        }
        return `<div class="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 group"><button onclick="openIconPickerForChannel(${index})" class="w-12 h-12 flex items-center justify-center bg-${ch.color || 'blue'}-100 text-${ch.color || 'blue'}-600 rounded-lg hover:bg-gray-200 transition-colors overflow-hidden">${iconHtml}</button><div class="flex-1"><input type="text" value="${escapeAttr(ch.name)}" class="font-bold text-gray-800 w-full bg-transparent mb-1 outline-none focus:border-b border-blue-500" onchange="updateChannel(${index}, 'name', this.value)"><input type="text" value="${escapeAttr(ch.desc)}" class="text-xs text-gray-400 w-full bg-transparent outline-none focus:border-b border-blue-500" onchange="updateChannel(${index}, 'desc', this.value)"><input type="text" value="${escapeAttr(ch.url)}" class="text-xs text-blue-400 w-full bg-transparent outline-none focus:border-b border-blue-500 mt-1" onchange="updateChannel(${index}, 'url', this.value)"></div><div class="opacity-0 group-hover:opacity-100 transition-opacity"><button onclick="removeChannel(${index})" class="text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`;
    }).join('');
    if(!document.getElementById('btnSaveChannels')) { const btn = document.createElement('button'); btn.id = 'btnSaveChannels'; btn.className = 'w-full bg-purple-600 text-white py-3 rounded-xl font-bold mt-4'; btn.innerText = 'حفظ التغييرات على القنوات'; btn.onclick = saveChannels; list.parentElement.appendChild(btn); } lucide.createIcons();
}
window.addChannel = () => { cachedChannels.push({ id: Date.now(), name: 'جديد', desc: 'وصف', url: '#', icon: 'star', color: 'gray' }); renderChannels(); };
window.updateChannel = (index, field, value) => { cachedChannels[index][field] = value; };
window.removeChannel = (index) => { if(!confirm('حذف؟')) return; cachedChannels.splice(index, 1); renderChannels(); };
window.saveChannels = async () => { const btn = document.getElementById('btnSaveChannels'); btn.innerText = 'جاري الحفظ...'; try { const dataToSave = cachedChannels.filter(x => x); await api.put('content/data/channels.json', JSON.stringify(dataToSave, null, 2), 'Update Channels', cachedChannels.sha); showToast('تم تحديث القنوات'); const file = await api.get('content/data/channels.json'); cachedChannels.sha = file.sha; } catch(e) { alert(e.message); } btn.innerText = 'حفظ التغييرات على القنوات'; };

// --- NEW FUNCTIONS FOR AD BANNER ---
window.toggleTickerOpacity = () => {
    const enabled = document.getElementById('tickerEnabled').checked;
    const container = document.getElementById('tickerInputsContainer');
    if (enabled) { container.classList.remove('opacity-disabled'); } else { container.classList.add('opacity-disabled'); }
};
window.toggleTickerContent = () => {
    const type = document.querySelector('input[name="tickerType"]:checked')?.value || 'text';
    const textGroup = document.getElementById('tickerTextGroup'); const imageGroup = document.getElementById('tickerImageGroup');
    if (type === 'text') { textGroup.classList.remove('hidden'); imageGroup.classList.add('hidden'); } else { textGroup.classList.add('hidden'); imageGroup.classList.remove('hidden'); }
};

window.toggleAdBannerOpacity = () => {
    const enabled = document.getElementById('adBannerEnabled').checked;
    const container = document.getElementById('adBannerInputs');
    if (enabled) { container.classList.remove('opacity-disabled'); } else { container.classList.add('opacity-disabled'); }
};
window.toggleAdContent = () => {
    const type = document.querySelector('input[name="adType"]:checked')?.value || 'text';
    const textGroup = document.getElementById('adTextGroup'); const imageGroup = document.getElementById('adImageGroup');
    if (type === 'text') { textGroup.classList.remove('hidden'); imageGroup.classList.add('hidden'); } else { textGroup.classList.add('hidden'); imageGroup.classList.remove('hidden'); }
};

async function loadSettings() {
    const loader = document.getElementById('settingsLoader'); const form = document.getElementById('settingsForm'); 
    loader.classList.remove('hidden'); form.classList.add('hidden');
    try {
        const file = await api.get('content/data/about.json'); cachedAbout = JSON.parse(decodeURIComponent(escape(atob(file.content)))); cachedAbout.sha = file.sha;
        
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        setVal('siteName', cachedAbout.siteName || "TechTouch");
        setVal('valName', cachedAbout.profileName);
        setVal('valProfileImg', cachedAbout.profileImage);
        setVal('valBio', cachedAbout.bio);
        setVal('valLogoUrl', cachedAbout.logoUrl);

        const logoType = cachedAbout.logoType || 'text';
        const logoRb = document.querySelector(`input[name="logoType"][value="${logoType}"]`); 
        if(logoRb) logoRb.checked = true;
        toggleLogoInput();

        const cats = cachedAbout.categories?.labels || {};
        setVal('catLabel_articles', cats.articles || "اخبار");
        setVal('catLabel_apps', cats.apps || "تطبيقات");
        setVal('catLabel_games', cats.games || "ألعاب");
        setVal('catLabel_sports', cats.sports || "رياضة");
        
        const fonts = cachedAbout.globalFonts || { nav: 12, content: 13, titles: 14, mainTitles: 15 };
        const setFont = (id, val, displayId) => { const el = document.getElementById(id); const disp = document.getElementById(displayId); if(el) { el.value = val; } if(disp) { disp.innerText = val; } };
        setFont('fontSize_nav', fonts.nav || 12, 'f_nav_val');
        setFont('fontSize_content', fonts.content || 13, 'f_content_val');
        setFont('fontSize_titles', fonts.titles || 14, 'f_titles_val');
        setFont('fontSize_main', fonts.mainTitles || 15, 'f_main_val');

        let profileSrc = cachedAbout.profileImage;
        if (profileSrc && !profileSrc.startsWith('http')) { profileSrc = profileSrc.replace(/^(\.\.\/)+/, ''); profileSrc = '../' + profileSrc; }
        const previewEl = document.getElementById('previewProfile'); if(previewEl) previewEl.src = profileSrc || '../assets/images/me.jpg';
        
        if (cachedAbout.ticker) {
            setVal('tickerLabel', cachedAbout.ticker.label);
            setVal('tickerText', cachedAbout.ticker.text);
            setVal('tickerUrl', cachedAbout.ticker.url);
            setVal('tickerImageUrl', cachedAbout.ticker.imageUrl);
            setFont('tickerSize', cachedAbout.ticker.fontSize || 14, 'tickerSizeVal');
            
            const tickCheck = document.getElementById('tickerAnimated');
            if(tickCheck) tickCheck.checked = cachedAbout.ticker.animated !== false;
            
            const enabledCheck = document.getElementById('tickerEnabled');
            const isEnabled = cachedAbout.ticker.enabled !== false; 
            if(enabledCheck) enabledCheck.checked = isEnabled;
            
            const tickerType = cachedAbout.ticker.type || 'text';
            const typeRb = document.querySelector(`input[name="tickerType"][value="${tickerType}"]`);
            if(typeRb) typeRb.checked = true;

            toggleTickerOpacity(); toggleTickerContent();
        }

        // --- Load Ad Banner Settings ---
        if (cachedAbout.adBanner) {
            const ad = cachedAbout.adBanner;
            const adCheck = document.getElementById('adBannerEnabled');
            if(adCheck) adCheck.checked = ad.enabled !== false;
            
            const adTypeRb = document.querySelector(`input[name="adType"][value="${ad.type || 'text'}"]`);
            if(adTypeRb) adTypeRb.checked = true;

            setVal('adText', ad.text);
            setVal('adUrl', ad.url);
            setVal('adTextColor', ad.textColor);
            setVal('adBgColor', ad.bgColor);
            setVal('adImageUrl', ad.imageUrl);

            toggleAdBannerOpacity(); toggleAdContent();
        }

        setVal('valBotInfo', cachedAbout.botInfo || "");
        setVal('valSearchInfo', cachedAbout.searchInfo || "");
        setVal('valBotTitle', cachedAbout.botTitle || "مركز خدمة الطلبات (Bot)");
        setVal('valSearchTitle', cachedAbout.searchTitle || "دليل الوصول الذكي للمحتوى");
        
        const coverType = cachedAbout.coverType || 'color';
        const coverRb = document.querySelector(`input[name="coverType"][value="${coverType}"]`);
        if(coverRb) coverRb.checked = true;
        if(coverType === 'color') setVal('valCoverColor', cachedAbout.coverValue);
        else setVal('valCoverImg', cachedAbout.coverValue);
        toggleCoverInput();

        const social = cachedAbout.social || {};
        setVal('socFb', social.facebook);
        setVal('socInsta', social.instagram);
        setVal('socTikTok', social.tiktok);
        setVal('socYt', social.youtube);
        setVal('socTg', social.telegram);

        const socialIcons = cachedAbout.socialIcons || {};
        ['facebook','instagram','tiktok','youtube','telegram'].forEach(key => {
            const btn = document.getElementById(`btnIcon_${key}`);
            if(!btn) return;
            let data = socialIcons[key]; 
            if (!data || typeof data === 'string') data = { type: 'lucide', value: data || key, size: 24 };
            if(key === 'tiktok' && (!socialIcons[key] || socialIcons[key].value === 'video')) data.value = 'video'; 
            
            btn.dataset.iconInfo = JSON.stringify(data);
            
            let html = '';
            if (data.type === 'image') {
                let sUrl = data.value;
                if(sUrl && !sUrl.startsWith('http')) sUrl = '../' + sUrl.replace(/^(\.\.\/)+/, '');
                html = `<img src="${escapeAttr(safeUrl(sUrl))}" style="width:24px; height:24px; object-fit:contain;">`; 
            } else if (data.type === 'svg') {
                html = `<svg viewBox="${escapeAttr(data.viewBox)}" fill="${escapeAttr(data.fill)}" stroke="${escapeAttr(data.stroke)}" stroke-width="${escapeAttr(data.strokeWidth)}" style="width:24px; height:24px">${sanitizeSvg(data.value)}</svg>`;
            } else { 
                html = `<i data-lucide="${safeIconName(data.value)}"></i>`; 
            }
            btn.innerHTML = html;
        });
        
        lucide.createIcons(); 
    } catch(e) { console.error(e); alert("خطأ في تحميل الإعدادات: " + e.message); } finally { loader.classList.add('hidden'); form.classList.remove('hidden'); }
}

window.toggleCoverInput = () => { 
    const type = document.querySelector('input[name="coverType"]:checked')?.value || 'color'; 
    const colorInput = document.getElementById('coverColorInput'); const imgInput = document.getElementById('coverImageInput'); 
    if (colorInput && imgInput) { if(type === 'color') { colorInput.classList.remove('hidden'); imgInput.classList.add('hidden'); } else { colorInput.classList.add('hidden'); imgInput.classList.remove('hidden'); } } 
};

window.toggleLogoInput = () => { 
    const type = document.querySelector('input[name="logoType"]:checked')?.value || 'text'; 
    const logoInput = document.getElementById('logoImageInput'); const siteNameInput = document.getElementById('siteName');
    if (type === 'image') { if(logoInput) logoInput.classList.remove('hidden'); if(siteNameInput) siteNameInput.classList.add('opacity-50'); } else { if(logoInput) logoInput.classList.add('hidden'); if(siteNameInput) siteNameInput.classList.remove('opacity-50'); } 
};

window.saveSettingsData = async () => {
    const btn = document.getElementById('btnSaveSettings'); btn.innerText = 'جاري الحفظ...';
    try {
        const coverType = document.querySelector('input[name="coverType"]:checked').value;
        const logoType = document.querySelector('input[name="logoType"]:checked').value;
        const tickerType = document.querySelector('input[name="tickerType"]:checked').value;
        const adType = document.querySelector('input[name="adType"]:checked').value;
        const getIconData = (key) => { const el = document.getElementById(`btnIcon_${key}`); return el ? JSON.parse(el.dataset.iconInfo || '{}') : {}; };
        
        const newSettings = {
            profileName: document.getElementById('valName').value, 
            profileImage: document.getElementById('valProfileImg').value, 
            bio: document.getElementById('valBio').value,
            botInfo: document.getElementById('valBotInfo').value, 
            searchInfo: document.getElementById('valSearchInfo').value, 
            botTitle: document.getElementById('valBotTitle').value, 
            searchTitle: document.getElementById('valSearchTitle').value,
            coverType: coverType, 
            coverValue: coverType === 'color' ? document.getElementById('valCoverColor').value : document.getElementById('valCoverImg').value,
            siteName: document.getElementById('siteName').value,
            logoType: logoType, 
            logoUrl: document.getElementById('valLogoUrl').value,
            categories: { labels: { articles: document.getElementById('catLabel_articles').value, apps: document.getElementById('catLabel_apps').value, games: document.getElementById('catLabel_games').value, sports: document.getElementById('catLabel_sports').value } },
            globalFonts: { nav: parseInt(document.getElementById('fontSize_nav').value) || 12, content: parseInt(document.getElementById('fontSize_content').value) || 13, titles: parseInt(document.getElementById('fontSize_titles').value) || 14, mainTitles: parseInt(document.getElementById('fontSize_main').value) || 15 },
            ticker: { 
                label: document.getElementById('tickerLabel').value, 
                text: document.getElementById('tickerText').value, 
                url: document.getElementById('tickerUrl').value, 
                type: tickerType,
                imageUrl: document.getElementById('tickerImageUrl').value,
                fontSize: parseInt(document.getElementById('tickerSize').value) || 14, 
                animated: document.getElementById('tickerAnimated').checked,
                enabled: document.getElementById('tickerEnabled').checked
            },
            adBanner: {
                enabled: document.getElementById('adBannerEnabled').checked,
                type: adType,
                text: document.getElementById('adText').value,
                url: document.getElementById('adUrl').value,
                textColor: document.getElementById('adTextColor').value,
                bgColor: document.getElementById('adBgColor').value,
                imageUrl: document.getElementById('adImageUrl').value
            },
            social: { facebook: document.getElementById('socFb').value, instagram: document.getElementById('socInsta').value, tiktok: document.getElementById('socTikTok').value, youtube: document.getElementById('socYt').value, telegram: document.getElementById('socTg').value },
            socialIcons: { facebook: getIconData('facebook'), instagram: getIconData('instagram'), tiktok: getIconData('tiktok'), youtube: getIconData('youtube'), telegram: getIconData('telegram') }
        };
        await api.put('content/data/about.json', JSON.stringify(newSettings, null, 2), 'Update Settings', cachedAbout.sha); 
        showToast('تم تحديث الإعدادات'); 
        const file = await api.get('content/data/about.json'); cachedAbout.sha = file.sha;
    } catch(e) { alert(e.message); } 
    btn.innerText = 'حفظ التغييرات';
};

window.toggleGithubSettings = () => {
    const modal = document.getElementById('ghModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) showLoginModal();
    else hideLoginModal();
};

/**
 * حفظ بيانات الاتصال بعد التحقق منها مع GitHub.
 * - يرفض تنسيقات الرموز غير المعروفة، ويحذّر بشدة من Classic Token
 * - يتحقق من صلاحية الرمز ومن صلاحية الكتابة على المستودع
 */
window.saveGhSettings = async () => {
    const btn = document.getElementById('btnSaveGh');
    const owner = document.getElementById('ghOwner').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    const remember = !!document.getElementById('ghRemember')?.checked;
    const original = btn ? btn.innerHTML : '';

    if (!owner || !repo) { renderGhValidation('danger', 'يرجى إدخال اسم المستخدم واسم المستودع.'); return; }
    if (!token) { renderGhValidation('danger', 'يرجى إدخال رمز الوصول (Token).'); return; }

    const kind = detectTokenKind(token);
    const info = TOKEN_KIND_INFO[kind] || TOKEN_KIND_INFO.unknown;

    // رفض التنسيقات غير المعروفة (لا تطابق أي نوع رمز معروف من GitHub)
    if (kind === 'unknown') {
        renderGhValidation('danger',
            `❌ <b>تنسيق الرمز غير معروف.</b><br>الرموز الصحيحة تبدأ بـ <span class="dir-ltr">github_pat_</span> (Fine-grained) أو <span class="dir-ltr">ghp_</span> (Classic).<br>تأكد من نسخ الرمز كاملاً وبدون مسافات.`);
        return;
    }

    // تحذير صارم من Classic Token (يمنح repo كامل على كل المستودعات)
    if (kind === 'classic' || kind === 'classic-legacy' || kind === 'oauth') {
        const proceed = confirm(
            '⚠️ تحذير أمني مهم\n\n' +
            'هذا الرمز ليس Fine-grained PAT. النوع الحالي: ' + info.label + '\n\n' +
            'الـ Classic Token يمنح صلاحيات واسعة (repo) على كل مستودعاتك، وهو أخطر بكثير من المطلوب لهذه اللوحة ' +
            '(المطلوب فقط: Contents: Read and write على مستودع الموقع).\n\n' +
            'الخطوات الموصى بها:\n' +
            '1) GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens\n' +
            '2) Repository access: Only select repositories → مستودع الموقع\n' +
            '3) Repository permissions → Contents: Read and write\n\n' +
            'هل تريد المتابعة بالرمز الحالي رغم ذلك؟'
        );
        if (!proceed) {
            renderGhValidation('warn',
                '⏸️ تم إيقاف الاتصال. أنشئ <b>Fine-grained PAT</b> بصلاحية <span class="dir-ltr">Contents: Read and write</span> ثم أعد المحاولة — ' +
                '<a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" class="font-bold underline">إنشاء رمز الآن</a>.');
            return;
        }
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> جاري التحقق من GitHub...'; lucide.createIcons(); }
    renderGhValidation('info', '⏳ جاري التحقق من الرمز وطالب الوصول للمستودع...');

    try {
        const result = await verifyGithubConnection({ owner, repo, token });

        if (!result.ok) {
            renderGhValidation('danger', '❌ ' + result.message);
            return;
        }

        // حفظ آمن: دائم فقط عند اختيار "تذكّرني"، وإلا فالجلسة الحالية فقط
        writeSetting(GH_KEYS.owner, owner, true);
        writeSetting(GH_KEYS.repo, repo, true);
        writeSetting(GH_KEYS.token, token, remember);

        const kindNote = (kind === 'fine-grained')
            ? '<br>نوع الرمز: <b>Fine-grained PAT</b> ✅ (الأكثر أماناً)'
            : '<br>نوع الرمز: <b>' + info.label + '</b> — يُنصح بالتحويل إلى Fine-grained PAT.';
        const scopeNote = result.scopes
            ? '<br>صلاحيات الرمز المُعلنة من GitHub: <span class="dir-ltr">' + escapeHtml(result.scopes) + '</span>' +
              (result.scopes.split(/,\s*/).includes('repo') ? ' <b>⚠️ تتضمن repo (واسعة جداً)</b>' : '')
            : '';
        const storeNote = remember
            ? '<br>التخزين: <b>محفوظ على هذا الجهاز</b> (localStorage) حتى تسجيل الخروج.'
            : '<br>التخزين: <b>لجلسة هذا التبويب فقط</b> (sessionStorage) ويُمحى عند إغلاقه.';

        renderGhValidation('ok',
            '✅ <b>تم التحقق بنجاح!</b><br>الحساب: <span class="dir-ltr">' + escapeHtml(result.login || '') + '</span>' +
            ' — المستودع: <span class="dir-ltr">' + escapeHtml(owner + '/' + repo) + '</span>' +
            ' <span class="text-green-600">(صلاحية الكتابة متاحة)</span>' +
            kindNote + scopeNote + storeNote +
            '<br><br>جارٍ تحميل لوحة التحكم...');

        setTimeout(() => location.reload(), 1200);

    } catch (e) {
        console.error(e);
        renderGhValidation('danger', '❌ خطأ غير متوقع أثناء التحقق: ' + escapeHtml(e.message || String(e)));
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; lucide.createIcons(); }
    }
};

function arabicToLatin(str) { if(!str) return ''; const map = { 'أ':'a','إ':'e','آ':'a','ا':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'th','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'h','ء':'a','ئ':'e','ؤ':'o', '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9', ' ': '-' }; return str.split('').map(char => map[char] || char).join(''); }
window.autoSlug = () => { const title = document.getElementById('pTitle').value.replace(/<[^>]*>?/gm, '').trim(); if (document.getElementById('pSlug').dataset.mode === 'new') { let slug = arabicToLatin(title).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); if(slug.length < 2) slug = 'post-' + Date.now(); document.getElementById('pSlug').value = slug.substring(0, 20); } };
window.handleFileSelect = async (input, targetId, previewId = null) => { if (input.files && input.files[0]) { const btn = input.nextElementSibling; const originalText = btn.innerText; btn.innerText = 'جاري الضغط...'; btn.disabled = true; try { const url = await api.uploadImage(input.files[0]); document.getElementById(targetId).value = url; if(previewId) { let pUrl = url.startsWith('http') ? url : '../' + url; document.getElementById(previewId).src = pUrl; } } catch(e) { alert('Upload failed: ' + e.message); } btn.innerText = originalText; btn.disabled = false; } };
window.insertTag = (tag) => { const ta = document.getElementById('pContent'); const start = ta.selectionStart; const end = ta.selectionEnd; ta.value = ta.value.substring(0, start) + tag + ta.value.substring(end); ta.focus(); ta.selectionStart = ta.selectionEnd = start + tag.length; };
function showToast(msg) { const t = document.getElementById('toast'); document.getElementById('toastMsg').innerText = msg; t.classList.remove('translate-y-[-100%]', 'opacity-0'); setTimeout(() => t.classList.add('translate-y-[-100%]', 'opacity-0'), 3000); }
// --- Categories Logic ---
let editingCategoryIndex = -1;

window.loadCategories = async function() {
    try {
        const path = 'content/data/categories.json';
        const fileData = await api.get(path);
        
        if (fileData) {
            categories = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
        } else {
            categories = [
                { id: "articles", name: "اخبار" },
                { id: "apps", name: "تطبيقات" },
                { id: "games", name: "ألعاب" },
                { id: "sports", name: "رياضة" }
            ];
            await saveCategoriesToGithub();
        }
    } catch (e) {
        console.error("Error loading categories:", e);
        categories = [];
    }
    renderCategories();
    updateCategoryDropdown();
}

window.renderCategories = function() {
    const list = document.getElementById('categoriesList');
    if(!list) return;
    
    const countEl = document.getElementById('categoriesCount');
    if(countEl) countEl.innerText = `${categories.length} أقسام`;
    
    list.innerHTML = '';
    
    if (categories.length === 0) {
        list.innerHTML = '<div class="text-center py-10 text-gray-400">لا توجد أقسام حالياً.</div>';
        return;
    }
    
    categories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow group";
        
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <i data-lucide="folder" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-800">${escapeHtml(cat.name)}</h3>
                    <p class="text-xs text-gray-400 font-mono">${escapeHtml(cat.id)}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" onclick="editCategory(${index})"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" onclick="deleteCategory(${index})"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

window.updateCategoryDropdown = function() {
    const select = document.getElementById('pCat');
    if(!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;      // value و innerText آمنان (لا يُفسّران كـ HTML)
        option.innerText = cat.name;
        select.appendChild(option);
    });
    if(currentValue) select.value = currentValue;
}

window.openCategoryEditor = () => {
    editingCategoryIndex = -1;
    document.getElementById('cId').value = '';
    document.getElementById('cId').disabled = false;
    document.getElementById('cName').value = '';
    document.getElementById('categoryEditorTitle').innerText = 'إضافة قسم جديد';
    document.getElementById('categoryEditor').classList.remove('hidden');
};

window.closeCategoryEditor = () => {
    document.getElementById('categoryEditor').classList.add('hidden');
};

window.editCategory = (index) => {
    editingCategoryIndex = index;
    const cat = categories[index];
    document.getElementById('cId').value = cat.id;
    document.getElementById('cId').disabled = true;
    document.getElementById('cName').value = cat.name;
    document.getElementById('categoryEditorTitle').innerText = 'تعديل القسم';
    document.getElementById('categoryEditor').classList.remove('hidden');
};

window.saveCategory = async () => {
    const id = document.getElementById('cId').value.trim();
    const name = document.getElementById('cName').value.trim();
    
    if(!id || !name) {
        alert("يرجى إدخال المعرف والاسم.");
        return;
    }
    
    if(editingCategoryIndex === -1 && categories.some(c => c.id === id)) {
        alert("المعرف موجود مسبقاً، يرجى اختيار معرف آخر.");
        return;
    }
    
    const newCat = { id, name };
    
    if (editingCategoryIndex > -1) {
        categories[editingCategoryIndex] = newCat;
    } else {
        categories.push(newCat);
    }
    
    closeCategoryEditor();
    renderCategories();
    updateCategoryDropdown();
    
    await saveCategoriesToGithub();
};

window.deleteCategory = async (index) => {
    if(!confirm("هل أنت متأكد من حذف هذا القسم؟ قد يؤثر ذلك على المقالات المرتبطة به.")) return;
    
    categories.splice(index, 1);
    renderCategories();
    updateCategoryDropdown();
    
    await saveCategoriesToGithub();
};

window.saveCategoriesToGithub = async function() {
    const path = 'content/data/categories.json';
    const contentToSave = JSON.stringify(categories, null, 2);
    
    let sha = null;
    try {
        const existing = await api.get(path);
        if (existing) sha = existing.sha;
    } catch(e){}
    
    const btn = document.getElementById('categoriesCount'); 
    if(btn) btn.innerHTML = 'جاري الحفظ...';
    
    const success = await api.put(path, contentToSave, "Update categories", sha);
    
    if(btn) btn.innerHTML = `${categories.length} أقسام`;
    
    if(success) {
        alert("تم حفظ الأقسام بنجاح! يُرجى إعادة بناء الموقع لتطبيق التغييرات على القوائم.");
    } else {
        alert("فشل حفظ الأقسام.");
    }
}

// --- STATS LOGIC ---
async function loadStats() {
    const loader = document.getElementById('statsLoader');
    const content = document.getElementById('statsContent');
    loader.classList.remove('hidden');
    content.classList.add('hidden');

    try {
        // Fetch posts
        const postsFiles = await api.get('content/posts');
        const totalPosts = postsFiles.filter(f => f.name.endsWith('.json')).length;
        document.getElementById('statTotalPosts').innerText = totalPosts;

        // Fetch categories
        let catsObj = {};
        try {
            const catsFile = await api.get('content/data/categories.json');
            categories = JSON.parse(decodeURIComponent(escape(atob(catsFile.content))));
            document.getElementById('statTotalCats').innerText = categories.length;
        } catch(e) { console.error("Could not load categories", e); }

        // Aggregate posts per category
        let postsPerCat = {};
        const postsData = await Promise.all(postsFiles.map(async f => {
            if(f.name.endsWith('.json')) {
                try {
                    const file = await api.get(`content/posts/${f.name}`);
                    const parsed = JSON.parse(decodeURIComponent(escape(atob(file.content))));
                    // Safely assign slug from filename if missing, mirroring generator logic
                    if (!parsed.slug) parsed.slug = f.name.replace('.json', '');
                    return parsed;
                } catch(e) {
                    console.error("Error parsing post file:", f.name, e);
                    return null;
                }
            }
            return null;
        }));
        
        const validPosts = postsData.filter(p => p !== null);
        validPosts.forEach(post => {
            const cat = post.category || 'عام';
            postsPerCat[cat] = (postsPerCat[cat] || 0) + 1;
        });

        // Display Posts Per Category
        const catsListHtml = Object.entries(postsPerCat).sort((a,b)=>b[1]-a[1]).map(([cat, count]) => {
            const catName = categories.find(c => c.id === cat)?.name || cat;
            return `<div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span class="font-bold text-gray-700">${escapeHtml(catName)}</span>
                <span class="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">${count}</span>
            </div>`;
        }).join('');
        document.getElementById('statCatsList').innerHTML = catsListHtml || '<p class="text-gray-500">لا توجد بيانات</p>';

        // Fetch Analytics
        let analytics = {};
        try {
            const analyticsFile = await api.get('content/data/analytics.json');
            analytics = JSON.parse(decodeURIComponent(escape(atob(analyticsFile.content))));
        } catch(e) { console.warn("Analytics data not found or empty"); }

        // Calculate total views and top posts
        let totalViews = 0;
        let topPosts = [];

        Object.entries(analytics).forEach(([key, views]) => {
            totalViews += views;
            // 'key' is now exactly the slug (e.g. "my-post-slug") or "/"
            if (key !== '/') {
                const post = validPosts.find(p => (p.slug || '').trim().toLowerCase() === key);
                if (post) {
                    topPosts.push({ title: post.title || 'بدون عنوان', views: views, url: `/article-${key}.html` });
                }
            }
        });

        document.getElementById('statTotalViews').innerText = totalViews;

        // Display Top Posts
        const topPostsHtml = topPosts.sort((a,b)=>b.views - a.views).slice(0, 10).map((post, i) => {
            return `<div class="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span class="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">${i+1}</span>
                    <a href="${escapeAttr(safeUrl(post.url))}" target="_blank" class="font-bold text-gray-700 truncate hover:text-blue-600">${sanitizeRichText(post.title)}</a>
                </div>
                <span class="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm shrink-0 flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> ${post.views}</span>
            </div>`;
        }).join('');
        document.getElementById('statTopPostsList').innerHTML = topPostsHtml || '<p class="text-gray-500">جاري جمع البيانات من GA4 (يتم التحديث يومياً)</p>';

        lucide.createIcons();
        loader.classList.add('hidden');
        content.classList.remove('hidden');

    } catch (e) {
        console.error(e);
        loader.innerHTML = '<p class="text-red-500">حدث خطأ في جلب البيانات. تأكد من إعدادات الاتصال.</p>';
    }

    // أرقام الزوار (24س/48س/شهر/سنة) تُجلب بشكل مستقل حتى لا يُعطّل فشلها بقية الإحصائيات
    loadVisitorStats();
}

/* =======================================================================
 *  زوار الموقع حسب الفترة: 24 ساعة / 48 ساعة / شهر / سنة
 *  المصدر: content/data/analytics-summary.json (يُحدّثه GitHub Actions من GA4)
 * ======================================================================= */
const VISITOR_PERIODS = [
    { key: 'h24',  label: 'آخر 24 ساعة',          icon: 'clock',         bar: 'bg-blue-500',    text: 'text-blue-600',    soft: 'bg-blue-50' },
    { key: 'h48',  label: 'آخر 48 ساعة',          icon: 'activity',      bar: 'bg-indigo-500',  text: 'text-indigo-600',  soft: 'bg-indigo-50' },
    { key: 'd30',  label: 'خلال شهر (30 يوماً)',    icon: 'calendar',      bar: 'bg-purple-500',  text: 'text-purple-600',  soft: 'bg-purple-50' },
    { key: 'd365', label: 'خلال سنة (365 يوماً)',   icon: 'trending-up',   bar: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50' }
];

let visitorPeriodsData = null;

function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }

function fmtDateTime(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const parts = baghdadDateParts(d); // تُعرض بتوقيت بغداد
        return `${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
    } catch (e) { return ''; }
}

function fmtRelative(iso) {
    if (!iso) return '';
    const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (isNaN(diffMin)) return '';
    if (diffMin < 2) return 'الآن';
    if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
    const hours = Math.round(diffMin / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.round(hours / 24);
    return `قبل ${days} يوم`;
}

function visitorCardHtml(meta, period, maxUsers) {
    if (!period) {
        return `<div class="border border-dashed border-gray-200 rounded-2xl p-4 text-center text-gray-400 text-xs">لا توجد بيانات لهذه الفترة بعد.</div>`;
    }
    const users = period.users || 0;
    const views = period.views || 0;
    const sessions = period.sessions || 0;
    const newUsers = period.newUsers || 0;
    const width = maxUsers > 0 ? Math.max(2, Math.round((users / maxUsers) * 100)) : 0;

    let changeHtml = '';
    if (typeof period.change === 'number' && isFinite(period.change)) {
        const pct = Math.round(period.change * 100);
        if (pct > 0) changeHtml = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-600 mb-1">▲ ${pct}%</span>`;
        else if (pct < 0) changeHtml = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-500 mb-1">▼ ${Math.abs(pct)}%</span>`;
        else changeHtml = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 mb-1">= 0%</span>`;
    }

    let rangeHtml = '';
    if (period.start && period.end) {
        rangeHtml = `من ${fmtDateTime(new Date(period.start).toISOString())} إلى ${fmtDateTime(new Date(period.end).toISOString())}`;
    }

    return `
        <div class="border border-gray-100 rounded-2xl p-4 bg-gray-50/60 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-gray-500">${meta.label}</span>
                <span class="w-8 h-8 rounded-lg ${meta.soft} ${meta.text} flex items-center justify-center"><i data-lucide="${meta.icon}" class="w-4 h-4"></i></span>
            </div>
            <div class="flex items-end gap-2 flex-wrap">
                <span class="text-3xl font-black text-gray-800 leading-none">${fmtNum(users)}</span>
                <span class="text-[11px] text-gray-400 mb-0.5">زائر</span>
                ${changeHtml}
            </div>
            <div class="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div class="h-full ${meta.bar}" style="width:${width}%"></div></div>
            <div class="mt-2 text-[11px] text-gray-500 flex justify-between gap-2 flex-wrap">
                <span>المشاهدات: <b>${fmtNum(views)}</b></span>
                <span>الجلسات: <b>${fmtNum(sessions)}</b></span>
            </div>
            <div class="mt-1 text-[10px] text-gray-400">منهم ${fmtNum(newUsers)} زائر جديد</div>
            ${rangeHtml ? `<div class="mt-1 text-[10px] text-gray-400">${rangeHtml}</div>` : ''}
            ${period.partial ? `<div class="mt-1 text-[10px] text-amber-500">⚠ ساعات ناقصة في هذه الفترة</div>` : ''}
        </div>`;
}

function renderVisitorPeriods(summary) {
    const grid = document.getElementById('visitorPeriodsGrid');
    const note = document.getElementById('visitorPeriodsNote');
    const updated = document.getElementById('visitorUpdatedAt');
    if (!grid) return;

    const periods = (summary && summary.periods) || {};
    const maxUsers = Math.max(0, ...VISITOR_PERIODS.map(p => (periods[p.key] ? periods[p.key].users || 0 : 0)));

    grid.innerHTML = VISITOR_PERIODS.map(meta => visitorCardHtml(meta, periods[meta.key], maxUsers)).join('');

    if (updated) {
        const rel = fmtRelative(summary && summary.generatedAt);
        updated.textContent = rel ? `آخر تحديث: ${rel}` : '';
    }

    if (note) {
        const warnings = (summary && summary.warnings) || [];
        const staleHours = summary && summary.generatedAt ? (Date.now() - new Date(summary.generatedAt).getTime()) / 3600000 : 0;
        if (warnings.length) {
            note.className = 'mt-4 text-xs rounded-xl p-3 border bg-amber-50 border-amber-200 text-amber-700';
            note.innerHTML = `⚠️ تنبيه من مصدر البيانات: ${escapeHtml(warnings.join(' — '))}`;
        } else if (staleHours > 12) {
            note.className = 'mt-4 text-xs rounded-xl p-3 border bg-amber-50 border-amber-200 text-amber-700';
            note.innerHTML = `⚠️ الأرقام قديمة (${fmtRelative(summary.generatedAt)}). اضغط "جلب من Google Analytics" أو شغّل المهمة من GitHub Actions.`;
        } else {
            note.className = 'hidden';
        }
    }

    if (window.lucide) lucide.createIcons();
}

function renderVisitorPlaceholder(message, tone = 'gray') {
    const grid = document.getElementById('visitorPeriodsGrid');
    const note = document.getElementById('visitorPeriodsNote');
    if (!grid) return;
    const tones = {
        gray: 'text-gray-400',
        amber: 'text-amber-600',
        red: 'text-red-500'
    };
    grid.innerHTML = `<div class="col-span-full text-center py-6 ${tones[tone] || tones.gray} text-sm">${escapeHtml(message)}</div>`;
    if (note) note.className = 'hidden';
}

async function loadVisitorStats() {
    renderVisitorPlaceholder('جاري تحميل أرقام الزوار...');
    try {
        const file = await api.get('content/data/analytics-summary.json');
        const summary = JSON.parse(decodeURIComponent(escape(atob(file.content))));
        visitorPeriodsData = summary;
        renderVisitorPeriods(summary);
    } catch (e) {
        console.warn('Visitor summary not available:', e);
        visitorPeriodsData = null;
        renderVisitorPlaceholder(
            'لا يوجد ملف أرقام زوار بعد (content/data/analytics-summary.json). سيُنشأ تلقائياً عند تشغيل مهمة التحليلات — أو اضغط "جلب من Google Analytics".',
            'amber'
        );
    }
}

/** يعيد قراءة ملف الأرقام من GitHub (بدون تشغيل GA4) */
window.refreshVisitorStats = () => loadVisitorStats();

/** يشغّل مهمة GitHub Actions لجلب أحدث الأرقام من GA4 ثم يعيد القراءة تلقائياً */
window.dispatchAnalyticsWorkflow = async () => {
    const btn = document.getElementById('btnDispatchAnalytics');
    if (!ghConfig.owner || !ghConfig.repo || !ghConfig.token) {
        alert('يجب ربط المستودع أولاً من "إعدادات الاتصال".');
        return;
    }
    if (!confirm('سيتم تشغيل مهمة "Analytics & Site Build" على GitHub لجلب أحدث أرقام الزوار من Google Analytics.\n\nقد تستغرق 1-3 دقائق، وسيتم تحديث الأرقام هنا تلقائياً.\n\nهل تريد المتابعة؟')) return;

    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> جاري التشغيل...'; lucide.createIcons(); }

    try {
        const res = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/actions/workflows/analytics.yml/dispatches`, {
            method: 'POST',
            headers: { ...api.headers(), 'Accept': 'application/vnd.github+json' },
            body: JSON.stringify({ ref: 'main' })
        });

        if (res.status === 204) {
            showToast('تم تشغيل المهمة ✓ — ستظهر الأرقام الجديدة خلال دقائق');
            pollVisitorStats(5);
        } else if (res.status === 401) {
            alert('التوكن غير صالح أو منتهي الصلاحية. حدّث التوكن من "إعدادات الاتصال".');
        } else if (res.status === 403 || res.status === 404) {
            alert('تعذّر تشغيل المهمة: التوكن الحالي لا يملك صلاحية Actions (workflow / actions:write).\n\nيمكنك تشغيل المهمة يدوياً من تبويب Actions في GitHub.');
        } else {
            alert('تعذّر تشغيل المهمة (رمز ' + res.status + ').');
        }
    } catch (e) {
        console.error(e);
        alert('خطأ في الاتصال بـ GitHub: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; lucide.createIcons(); }
    }
};

/** ينتظر حتى يتغيّر generatedAt في ملف الأرقام (بحد أقصى maxTries محاولة كل دقيقة) */
function pollVisitorStats(maxTries = 5) {
    const previousAt = visitorPeriodsData && visitorPeriodsData.generatedAt;
    let tries = 0;
    const tick = async () => {
        tries++;
        try {
            const file = await api.get('content/data/analytics-summary.json');
            const summary = JSON.parse(decodeURIComponent(escape(atob(file.content))));
            if (summary.generatedAt && summary.generatedAt !== previousAt) {
                visitorPeriodsData = summary;
                renderVisitorPeriods(summary);
                showToast('تم تحديث أرقام الزوار ✓');
                return;
            }
        } catch (e) { /* تجاهل وأعد المحاولة */ }
        if (tries < maxTries) setTimeout(tick, 60000);
        else loadVisitorStats();
    };
    setTimeout(tick, 45000);
}


// --- PHONES LOGIC ---
let cachedPhones = [];
let phonesSha = null;

async function loadPhones() {
    const loader = document.getElementById('phonesLoader');
    const list = document.getElementById('phonesList');
    loader.classList.remove('hidden');
    list.innerHTML = '';

    try {
        const file = await api.get('content/data/phones.json');
        cachedPhones = JSON.parse(decodeURIComponent(escape(atob(file.content))));
        phonesSha = file.sha;

        // Populate Brand Filter
        const brands = [...new Set(cachedPhones.map(brandGroup => brandGroup.brand))].sort();
        const filterSelect = document.getElementById('filterPhoneBrand');
        filterSelect.innerHTML = '<option value="all">الكل</option>' + brands.map(b => `<option value="${escapeAttr(b)}">${escapeHtml(b)}</option>`).join('');

        renderPhonesList();
    } catch(e) {
        console.error("No phones DB found, creating empty.", e);
        cachedPhones = [];
        renderPhonesList();
    } finally {
        loader.classList.add('hidden');
    }
}

function renderPhonesList() {
    const list = document.getElementById('phonesList');
    const filter = document.getElementById('filterPhoneBrand').value;
    list.innerHTML = '';

    let displayedCount = 0;
    cachedPhones.forEach((brandGroup, bIndex) => {
        if (filter !== 'all' && brandGroup.brand !== filter) return;

        brandGroup.phones.forEach((phone, pIndex) => {
            displayedCount++;
            const div = document.createElement('div');
            div.className = 'bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md hover:-translate-y-1 group';
            
            const imgUrl = phone.image ? (phone.image.startsWith('http') ? phone.image : `../${phone.image}`) : '../assets/images/me.jpg';
            const specs = phone.specs || {};
            const specCell = (icon, value) => `<div class="flex gap-1.5 items-center bg-gray-50 p-2 rounded-lg"><i data-lucide="${icon}" class="w-3.5 h-3.5 shrink-0"></i><span class="truncate" title="${escapeAttr(value || '-')}">${escapeHtml(value || '-')}</span></div>`;
            
            div.innerHTML = `
                <div class="flex gap-4 items-center border-b pb-4">
                    <div class="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center">
                        <img src="${escapeAttr(safeUrl(imgUrl))}" class="max-w-full max-h-full object-contain" alt="${escapeAttr(phone.name)}" onerror="this.onerror=null; this.src='../assets/images/me.jpg';">
                    </div>
                    <div class="flex-1 min-w-0">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">${escapeHtml(brandGroup.brand)}</span>
                        <h3 class="font-black text-gray-900 truncate" title="${escapeAttr(phone.name)}">${escapeHtml(phone.name)}</h3>
                        ${phone.price ? `<span class="text-sm font-bold text-green-600 mt-1 inline-block">${escapeHtml(phone.price)}</span>` : ''}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 flex-1">
                    ${specCell('cpu', specs.chipset)}
                    ${specCell('memory-stick', specs.ram)}
                    ${specCell('hard-drive', specs.storage)}
                    ${specCell('battery-charging', specs.battery)}
                </div>
                <div class="flex justify-end gap-2 pt-3 mt-auto border-t">
                    <button onclick="openPhoneEditor(${bIndex}, ${pIndex})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deletePhone(${bIndex}, ${pIndex})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            `;
            list.appendChild(div);
        });
    });
    
    if (displayedCount === 0) list.innerHTML = '<div class="col-span-full py-8 text-center text-gray-500 font-bold">لا يوجد هواتف لعرضها، أضف هاتفاً جديداً.</div>';
    lucide.createIcons();
}

window.autoPhoneId = () => {
    const brand = document.getElementById('phBrand').value.trim();
    const name = document.getElementById('phName').value.trim();
    if(brand && name) {
        document.getElementById('phInternalId').value = `${brand.toLowerCase()}-${name.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
    }
};

window.openPhoneEditor = (bIndex = -1, pIndex = -1) => {
    document.getElementById('phoneEditor').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    const editorTitle = document.getElementById('phoneEditorTitle');
    const fields = ['Brand', 'Name', 'InternalId', 'Price', 'ImageUrl', 'SpecChipset', 'SpecRam', 'SpecStorage', 'SpecScreen', 'SpecBattery', 'SpecCamera'];
    
    if (bIndex >= 0 && pIndex >= 0) {
        const brandGroup = cachedPhones[bIndex];
        const phone = brandGroup.phones[pIndex];
        
        editorTitle.innerText = `تعديل: ${phone.name}`;
        document.getElementById('phId').value = `${bIndex}:${pIndex}`; // Store old indices
        
        document.getElementById('phBrand').value = brandGroup.brand || '';
        document.getElementById('phName').value = phone.name || '';
        document.getElementById('phInternalId').value = phone.id || '';
        document.getElementById('phPrice').value = phone.price || '';
        
        document.getElementById('phImageUrl').value = phone.image || '';
        document.getElementById('phPreviewImg').src = phone.image ? (phone.image.startsWith('http') ? phone.image : `../${phone.image}`) : '../assets/images/me.jpg';
        
        document.getElementById('phSpecChipset').value = phone.specs?.chipset || '';
        document.getElementById('phSpecRam').value = phone.specs?.ram || '';
        document.getElementById('phSpecStorage').value = phone.specs?.storage || '';
        document.getElementById('phSpecScreen').value = phone.specs?.screen || '';
        document.getElementById('phSpecBattery').value = phone.specs?.battery || '';
        document.getElementById('phSpecCamera').value = phone.specs?.camera || '';
        
    } else {
        editorTitle.innerText = "إضافة هاتف جديد";
        document.getElementById('phId').value = "new";
        fields.forEach(f => document.getElementById(`ph${f}`).value = '');
        document.getElementById('phPreviewImg').src = '';
    }
};

window.closePhoneEditor = () => {
    document.getElementById('phoneEditor').classList.add('hidden');
    document.body.style.overflow = 'auto';
};

window.savePhone = async () => {
    const brandRaw = document.getElementById('phBrand').value.trim();
    const nameRaw = document.getElementById('phName').value.trim();
    if (!brandRaw || !nameRaw) return alert("الشركة والاسم مطلوبان.");

    // Standardize brand capitalization (e.g. Apple, Samsung)
    const brand = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1).toLowerCase();

    const newPhoneData = {
        id: document.getElementById('phInternalId').value || `${brand}-${nameRaw}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
        name: nameRaw,
        image: document.getElementById('phImageUrl').value.trim(),
        price: document.getElementById('phPrice').value.trim(),
        specs: {
            chipset: document.getElementById('phSpecChipset').value.trim(),
            ram: document.getElementById('phSpecRam').value.trim(),
            storage: document.getElementById('phSpecStorage').value.trim(),
            screen: document.getElementById('phSpecScreen').value.trim(),
            battery: document.getElementById('phSpecBattery').value.trim(),
            camera: document.getElementById('phSpecCamera').value.trim()
        }
    };

    const editId = document.getElementById('phId').value;
    let oldBrandGroup = null;
    let oldPhoneIndex = -1;

    // If editing, find old position to replace or move
    if (editId !== "new") {
        const parts = editId.split(':');
        const bIdx = parseInt(parts[0]);
        const pIdx = parseInt(parts[1]);
        if (cachedPhones[bIdx]) {
            oldBrandGroup = cachedPhones[bIdx];
            oldPhoneIndex = pIdx;
            
            // Remove from old location before inserting to new/same location
            cachedPhones[bIdx].phones.splice(pIdx, 1);
            // Cleanup empty brand group
            if (cachedPhones[bIdx].phones.length === 0) {
                cachedPhones.splice(bIdx, 1);
            }
        }
    }

    // Insert into correct brand group
    let targetGroup = cachedPhones.find(bg => bg.brand === brand);
    if (!targetGroup) {
        targetGroup = { brand: brand, phones: [] };
        cachedPhones.push(targetGroup);
    }
    
    // Check if ID already exists in target group to prevent duplicates
    const existIdx = targetGroup.phones.findIndex(p => p.id === newPhoneData.id);
    if (existIdx >= 0) {
        targetGroup.phones[existIdx] = newPhoneData; // Update
    } else {
        targetGroup.phones.push(newPhoneData); // Append
    }

    // Sort brands and phones alphabetically for neatness
    cachedPhones.sort((a,b) => a.brand.localeCompare(b.brand));
    cachedPhones.forEach(bg => bg.phones.sort((a,b) => a.name.localeCompare(b.name)));

    try {
        const btn = document.querySelector('#phoneEditor .btn-primary');
        btn.innerText = "جاري الحفظ...";
        await api.put('content/data/phones.json', JSON.stringify(cachedPhones, null, 2), `Update Phones DB: ${nameRaw}`, phonesSha);
        showToast('تم حفظ الهاتف بنجاح');
        
        // Re-fetch to get new SHA and update UI
        await loadPhones();
        closePhoneEditor();
    } catch(e) {
        alert("فشل الحفظ: " + e.message);
    }
};

window.deletePhone = async (bIndex, pIndex) => {
    if (!confirm("هل أنت متأكد من حذف هذا الهاتف؟ سيؤثر هذا على صفحات مقارنة الهواتف.")) return;
    
    const phoneName = cachedPhones[bIndex].phones[pIndex].name;
    cachedPhones[bIndex].phones.splice(pIndex, 1);
    
    // Cleanup empty brands
    if (cachedPhones[bIndex].phones.length === 0) {
        cachedPhones.splice(bIndex, 1);
    }

    try {
        await api.put('content/data/phones.json', JSON.stringify(cachedPhones, null, 2), `Delete Phone: ${phoneName}`, phonesSha);
        showToast('تم الحذف بنجاح');
        await loadPhones();
    } catch(e) {
        alert("فشل الحذف: " + e.message);
    }
};

// Also patch the sections array in switchTab to include phones


// --- App Store CMS Logic ---
let storeDataRaw = null;
let parsedApps = [];
let parsedStores = []; // Optional stores

window.loadAppStoreData = async () => {
    document.getElementById('storeLoader').classList.remove('hidden');
    document.getElementById('storeContent').classList.add('hidden');
    try {
        const response = await api.get('content/posts/Smart-TV-dawnlwdr.json');
        storeDataRaw = response; // keep original response for sha
        
        // Decode base64 and parse JSON
        let decodedJson;
        try {
            decodedJson = JSON.parse(decodeURIComponent(escape(atob(storeDataRaw.content))));
        } catch(e) {
            console.error("Decoding error for App Store data", e);
            decodedJson = {};
        }

        // We will attach the parsed JSON back to storeDataRaw so we can save it later
        storeDataRaw.parsedData = decodedJson;
        
        let htmlContent = decodedJson.content || '';
        
        // Parse Apps — تحليل آمن بدون new Function/eval (منع تنفيذ أكواد خبيثة)
        const appsRegex = /const\s+appsData\s*=\s*(\[[\s\S]*?\])\s*;/;
        const appsMatch = appsRegex.exec(htmlContent);
        parsedApps = [];
        if (appsMatch && appsMatch[1]) {
            try {
                const rawApps = safeParseJsArray(appsMatch[1]);
                parsedApps = rawApps.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => {
                    const app = {};
                    ['name', 'url', 'icon', 'store'].forEach(key => {
                        if (item[key] !== undefined && item[key] !== null) app[key] = String(item[key]);
                    });
                    return app;
                });
            } catch(e) {
                console.error("Failed to parse appsData safely:", e);
                parsedApps = [];
                alert('تعذّر قراءة قائمة التطبيقات من الملف (تنسيق غير آمن أو غير صالح): ' + e.message);
            }
        }

        // Parse Stores (Categories) directly from HTML blocks based on the user's template
        const storesContainerRegex = /<div class="grid grid-cols-2 gap-3 sm:gap-5 mb-12">([\s\S]*?)<\/div>\s*<div class="bg-blue-50/s;
        const storesMatch = storesContainerRegex.exec(htmlContent);
        parsedStores = [];
        
        if (storesMatch && storesMatch[1]) {
            const storesHtml = storesMatch[1];
            // Split storesHtml into individual <a> tags to parse them more reliably
            const storeBlocks = storesHtml.split('</a>').filter(s => s.trim().length > 0);
            
            storeBlocks.forEach(block => {
                const urlMatch = block.match(/<a[^>]*href="([^"]+)"/);
                const nameMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
                const descMatch = block.match(/<p[^>]*>([^<]*)<\/p>/);
                
                let iconStr = '';
                const iconLucideMatch = block.match(/data-lucide="([^"]+)"/);
                const iconImgMatch = block.match(/<img[^>]*src="([^"]+)"[^>]*alt="Store Icon"/);
                if (iconImgMatch) iconStr = iconImgMatch[1];
                else if (iconLucideMatch) iconStr = iconLucideMatch[1];

                if (urlMatch && nameMatch) {
                    parsedStores.push({
                        url: safeUrl(urlMatch[1].trim()),
                        name: nameMatch[1].trim(),
                        desc: descMatch ? descMatch[1].trim() : '',
                        icon: String(iconStr || '').trim()
                    });
                }
            });
        }

        renderAppStoreUI();
        document.getElementById('storeLoader').classList.add('hidden');
        document.getElementById('storeContent').classList.remove('hidden');
    } catch(e) {
        alert("فشل تحميل بيانات المتجر: " + e.message);
        document.getElementById('storeLoader').classList.add('hidden');
    }
};

function renderAppStoreUI() {
    // 1. Render Stores
    const storesList = document.getElementById('storesList');
    storesList.innerHTML = '';
    
    // Hide or clear App Modal category select since it's no longer used
    const catSelect = document.getElementById('storeAppCategory');
    if(catSelect) {
        catSelect.innerHTML = '<option value="">بدون متجر</option>';
        catSelect.parentElement.style.display = 'none'; // Hide the entire label/select container
    }
    
    parsedStores.forEach((store, index) => {
        // Add to list
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg';
        let safeIcon = store.icon;
        let iconHtml = safeIcon
            ? (safeIcon.startsWith('http') || safeIcon.includes('/')
                ? `<img src="${escapeAttr(safeUrl(safeIcon))}" class="w-6 h-6 object-contain">`
                : `<i data-lucide="${safeIconName(safeIcon, 'store')}" class="w-5 h-5"></i>`)
            : '<i data-lucide="store" class="w-5 h-5"></i>';
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="bg-gray-200 p-2 rounded-lg text-gray-600 flex items-center justify-center">${iconHtml}</div>
                <div class="flex flex-col">
                    <span class="font-bold text-gray-800 text-sm">${escapeHtml(store.name)}</span>
                    <a href="${escapeAttr(safeUrl(store.url))}" target="_blank" class="text-xs text-blue-500 hover:underline truncate max-w-[150px] dir-ltr">${escapeHtml(store.url)}</a>
                </div>
            </div>
            <div class="flex gap-1 shrink-0">
                <button onclick="editStore(${index})" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><i data-lucide="edit" class="w-4 h-4"></i></button>
                <button onclick="deleteStore(${index})" class="p-1.5 text-red-600 hover:bg-red-100 rounded"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </div>
        `;
        storesList.appendChild(div);
    });
    
    if(parsedStores.length === 0) {
        storesList.innerHTML = '<div class="col-span-full text-sm text-gray-500 text-center py-2">لا توجد متاجر مضافة حتى الآن.</div>';
    }

    renderAppsTable();
    lucide.createIcons();
}

function renderAppsTable(query = '') {
    const tbody = document.getElementById('appsTableBody');
    tbody.innerHTML = '';
    
    const filtered = parsedApps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()));
    
    filtered.forEach((app, idx) => {
        const realIndex = parsedApps.indexOf(app);
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        let safeIcon = app.icon || '';
        if (safeIcon && !safeIcon.startsWith('http')) {
             safeIcon = safeIcon.replace(/^(\.\.\/)+/, '');
             safeIcon = '../' + safeIcon;
        }
        safeIcon = safeUrl(safeIcon) || '../assets/images/me.jpg';

        tr.innerHTML = `
            <td class="px-4 py-3 flex items-center gap-3">
                <img src="${escapeAttr(safeIcon)}" class="w-8 h-8 rounded object-contain bg-gray-100" onerror="this.onerror=null; this.src='../assets/images/me.jpg'">
                <span class="font-bold text-gray-800" dir="ltr">${escapeHtml(app.name)}</span>
            </td>
            <td class="px-4 py-3"><a href="${escapeAttr(safeUrl(app.url))}" target="_blank" class="text-blue-500 hover:underline dir-ltr text-xs inline-block truncate max-w-[150px]">${escapeHtml(app.url || '')}</a></td>
            <td class="px-4 py-3">
                <div class="flex gap-2">
                    <button onclick="editApp(${realIndex})" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button onclick="deleteApp(${realIndex})" class="p-1.5 text-red-600 hover:bg-red-100 rounded"><i data-lucide="trash" class="w-4 h-4"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

window.filterAppsInCMS = () => {
    renderAppsTable(document.getElementById('appSearchInput').value);
}

// Store CRUD
window.openStoreModal = () => {
    document.getElementById('storeEditIndex').value = '';
    document.getElementById('storeCatName').value = '';
    document.getElementById('storeCatUrl').value = '';
    document.getElementById('storeCatDesc').value = '';
    document.getElementById('storeCatIcon').value = '';
    document.getElementById('storeModalTitle').innerText = 'متجر جديد';
    document.getElementById('storeModal').classList.remove('hidden');
};

window.editStore = (idx) => {
    document.getElementById('storeEditIndex').value = idx;
    const store = parsedStores[idx];
    document.getElementById('storeCatName').value = store.name || '';
    document.getElementById('storeCatUrl').value = store.url || '';
    document.getElementById('storeCatDesc').value = store.desc || '';
    document.getElementById('storeCatIcon').value = store.icon || '';
    document.getElementById('storeModalTitle').innerText = 'تعديل متجر';
    document.getElementById('storeModal').classList.remove('hidden');
};

window.deleteStore = (idx) => {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    parsedStores.splice(idx, 1);
    renderAppStoreUI();
};

window.saveStoreToCategories = () => {
    const name = document.getElementById('storeCatName').value.trim();
    const url = document.getElementById('storeCatUrl').value.trim();
    const desc = document.getElementById('storeCatDesc').value.trim();
    const icon = document.getElementById('storeCatIcon').value.trim();
    
    if(!name || !url) return alert('يرجى كتابة الاسم والرابط');
    
    const idx = document.getElementById('storeEditIndex').value;
    
    if(idx !== '') {
        parsedStores[idx] = { name, url, desc, icon };
    } else {
        parsedStores.push({ name, url, desc, icon });
    }
    
    document.getElementById('storeModal').classList.add('hidden');
    renderAppStoreUI();
};

// App CRUD
window.openAppModal = () => {
    document.getElementById('appEditIndex').value = '';
    document.getElementById('storeAppName').value = '';
    document.getElementById('storeAppUrl').value = '';
    document.getElementById('storeAppIcon').value = '';
    document.getElementById('storeAppCategory').value = '';
    document.getElementById('appModalTitle').innerText = 'تطبيق جديد';
    document.getElementById('appModal').classList.remove('hidden');
};

window.editApp = (idx) => {
    const app = parsedApps[idx];
    document.getElementById('appEditIndex').value = idx;
    document.getElementById('storeAppName').value = app.name || '';
    document.getElementById('storeAppUrl').value = app.url || '';
    document.getElementById('storeAppIcon').value = app.icon || '';
    document.getElementById('storeAppCategory').value = app.store || '';
    document.getElementById('appModalTitle').innerText = 'تعديل تطبيق';
    document.getElementById('appModal').classList.remove('hidden');
};

window.deleteApp = (idx) => {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    parsedApps.splice(idx, 1);
    renderAppStoreUI();
};

window.saveAppToTable = () => {
    const name = document.getElementById('storeAppName').value.trim();
    const url = document.getElementById('storeAppUrl').value.trim();
    const icon = document.getElementById('storeAppIcon').value.trim();
    const store = document.getElementById('storeAppCategory').value.trim();
    
    if(!name || !url) return alert('الاسم والرابط مطلوبان');
    
    const newApp = { name, url };
    if(icon) newApp.icon = icon;
    if(store) newApp.store = store;
    
    const idx = document.getElementById('appEditIndex').value;
    if(idx !== '') {
        parsedApps[idx] = newApp;
    } else {
        parsedApps.push(newApp);
    }
    
    document.getElementById('appModal').classList.add('hidden');
    renderAppStoreUI();
};

window.saveAppStoreData = async () => {
    const btn = document.getElementById('btnSaveStore');
    btn.innerText = 'جاري الحفظ...';
    btn.disabled = true;

    try {
        let decodedJson = null;
        if (storeDataRaw && storeDataRaw.parsedData) {
            decodedJson = JSON.parse(JSON.stringify(storeDataRaw.parsedData));
        }

        if (!decodedJson) throw new Error("لا توجد بيانات ليتم حفظها.");

        let htmlContent = decodedJson.content || '';

        // 1. Serialize Apps
        // تهريب صحيح للقيم + منع كسر وسم <script> داخل الملف المولَّد
        const jsString = (value) => JSON.stringify(String(value)).replace(/<\//g, '<\\/');
        const serializeArray = (arr) => {
            return '[\n' + arr.map(item => {
                let parts = [];
                if(item.name) parts.push(`name: ${jsString(item.name)}`);
                if(item.url) parts.push(`url: ${jsString(item.url)}`);
                if(item.icon) parts.push(`icon: ${jsString(item.icon)}`);
                if(item.store) parts.push(`store: ${jsString(item.store)}`);
                return `            { ${parts.join(', ')} }`;
            }).join(',\n') + '\n        ]';
        };
        const newAppsString = serializeArray(parsedApps);

        if(htmlContent.match(/const\s+appsData\s*=\s*\[[\s\S]*?\]\s*;/s)) {
            htmlContent = htmlContent.replace(/const\s+appsData\s*=\s*\[[\s\S]*?\]\s*;/s, `const appsData = ${newAppsString};`);
        }

        // 2. Serialize Stores
        const storesContainerRegex = /(<div class="grid grid-cols-2 gap-3 sm:gap-5 mb-12">)[\s\S]*?(<\/div>\s*<div class="bg-blue-50)/s;
        if(htmlContent.match(storesContainerRegex)) {
            let generatedHtml = "\n";
            parsedStores.forEach((store, idx) => {
                const isFirst = idx % 2 === 0;
                const bgGradient = isFirst ? "from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-750 border-blue-100" : "from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-750 border-purple-100";
                const iconColor = isFirst ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400";
                const titleColor = isFirst ? "text-blue-900 dark:text-blue-300" : "text-purple-900 dark:text-purple-300";
                const glowColor = isFirst ? "bg-blue-400" : "bg-purple-400";

                let iconDisplay = `<i data-lucide="${safeIconName(store.icon, 'shopping-cart')}" class="w-7 h-7 sm:w-12 sm:h-12 ${iconColor}"></i>`;
                if (store.icon && (store.icon.startsWith('http') || store.icon.includes('/'))) {
                    iconDisplay = `<img src="${escapeAttr(safeUrl(store.icon))}" class="w-7 h-7 sm:w-12 sm:h-12 object-contain" alt="Store Icon">`;
                }

                generatedHtml += `        <a href="${escapeAttr(safeUrl(store.url))}" target="_self" class="group h-full block">
            <div class="bg-gradient-to-br ${bgGradient} dark:border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center justify-center text-center cursor-pointer">
                <div class="mb-3 sm:mb-6 relative">
                    <div class="absolute inset-0 ${glowColor} blur-2xl opacity-20 group-hover:opacity-30 transition-opacity rounded-full"></div>
                    <div class="relative bg-white dark:bg-slate-700 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                        ${iconDisplay}
                    </div>
                </div>
                <h3 class="font-black text-sm sm:text-2xl ${titleColor} mb-1 sm:mb-2">${escapeHtml(store.name)}</h3>
                <p class="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">${escapeHtml(store.desc || '')}</p>
            </div>
        </a>\n`;
            });
            htmlContent = htmlContent.replace(storesContainerRegex, `$1${generatedHtml}    $2`);
        }

        decodedJson.content = htmlContent;
        const finalContentToSave = JSON.stringify(decodedJson, null, 2);

        await api.put(storeDataRaw.path, finalContentToSave, "CMS: Restore & Update Smart-TV App Store JSON", storeDataRaw.sha);

        showToast('تم حفظ المتجر بنجاح!');
        await loadAppStoreData();

    } catch(e) {
        alert("فشل الحفظ: " + e.message);
    } finally {
        btn.innerText = 'حفظ جميع التعديلات';
        btn.disabled = false;
    }
};

