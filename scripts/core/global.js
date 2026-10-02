import * as cheerio from 'cheerio';
import { BASE_URL, GA_ID, ONESIGNAL_APP_ID, AD_CLIENT_ID, GOOGLE_SITE_VERIFICATION } from '../config/constants.js';
import { GA_SCRIPT, AD_SCRIPT, ONESIGNAL_SCRIPT, IMG_ERROR_SCRIPT, TICKER_HTML_TEMPLATE, generateSocialFooter } from './renderer.js';
import { cleanPath, escapeHtml, stripHtml, toAbsoluteUrl } from '../utils/helpers.js';

export const updateGlobalElements = (htmlContent, fileName = '', pageTitleOverride = '', aboutData) => {
    const $ = cheerio.load(htmlContent, { decodeEntities: false });

    // 1. Safe Definition
    const isArticle = typeof fileName === 'string' && fileName.startsWith('article-');

    // Safety fallback for fileName
    if (!fileName || typeof fileName !== 'string') {
        fileName = 'index.html';
    }

    // SEO Title Logic
    if (pageTitleOverride) {
        const cleanOverride = stripHtml(pageTitleOverride);
        $('title').text(cleanOverride);
        
        // Update or inject og:title
        if ($('meta[property="og:title"]').length) {
            $('meta[property="og:title"]').attr('content', cleanOverride);
        } else {
            $('head').append(`<meta property="og:title" content="${cleanOverride}">`);
        }
    }

    // Remove existing preconnect / speculation rules before prepending to ensure idempotency
    $('head link[rel="preconnect"][href*="esm.sh"]').remove();
    $('head link[rel="preconnect"][href*="googletagmanager.com"]').remove();
    $('head link[rel="preconnect"][href*="pagead2.googlesyndication.com"]').remove();
    $('head meta[http-equiv="X-UA-Compatible"]').remove();
    $('head meta[name="referrer"]').remove();
    $('head script[type="speculationrules"]').remove();

    // Preconnect for Performance & Speculation Rules for faster navigation (bfcache optimization)
    const preconnectTags = `
    <link rel="preconnect" href="https://esm.sh" crossorigin>
    <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
    <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <script type="speculationrules">
    {
      "prefetch": [{
        "where": {
          "and": [
            { "href_matches": "/*" },
            { "not": {"href_matches": "/logout"}},
            { "not": {"href_matches": "/admin/*"}}
          ]
        },
        "eagerness": "moderate"
      }]
    }
    </script>
    `;
    $('head').prepend(preconnectTags);

    $('script').each((i, el) => {
        const src = $(el).attr('src') || '';
        const content = $(el).html() || '';
        if (src.includes("cdn.onesignal.com") || content.includes("OneSignal")) { $(el).remove(); }
        if (src.includes('googletagmanager.com') || content.includes("gtag(") || src.includes('G-')) { $(el).remove(); }
        // if (src.includes("pagead2.googlesyndication.com") || content.includes("adsbygoogle")) { $(el).remove(); }
        if (content.includes("document.addEventListener('DOMContentLoaded', () => {") && (content.includes("fallbackImage") || content.includes("Dynamic Active State for Nav Tabs"))) { $(el).remove(); }
        // Remove Fuse CDN injection here (handled in search-engine.js module)
        if (src.includes("fuse.js")) { $(el).remove(); }
    });

    // Conditional Script Loading - USING isArticle
    if (!isArticle) {
        $('head').append(ONESIGNAL_SCRIPT(ONESIGNAL_APP_ID));
    }

    const noAdsPages = ['privacy.html', 'about.html'];
    if (!noAdsPages.includes(fileName)) {
        $('head script[src*="adsbygoogle"]').remove();
        $('head').append(AD_SCRIPT(AD_CLIENT_ID));
    }
    
    $('head').prepend(GA_SCRIPT(GA_ID));
    $('body').append(IMG_ERROR_SCRIPT);
    
    // --- GUARANTEE SEARCH ENGINE INJECTION ---
    const SEARCH_MODULE = '<script src="assets/js/search-engine.js" type="module"></script>';
    
    // Check if Search Engine exists, if not append to body
    let hasSearch = false;
    $('script').each((i, el) => { if($(el).attr('src')?.includes('search-engine.js')) hasSearch = true; });
    if(!hasSearch) $('body').append(SEARCH_MODULE);

    // --- CRITICAL SEO: Strict Canonical Logic ---
    let canonicalUrl;
    if (fileName === 'index.html') {
        canonicalUrl = `${BASE_URL}/`;
    } else {
        canonicalUrl = `${BASE_URL}/${fileName.replace('.html', '')}`;
    }
    
    $('link[rel="canonical"]').remove();
    $('head').append(`<link rel="canonical" href="${canonicalUrl}">`);

    if (GOOGLE_SITE_VERIFICATION) {
        $('meta[name="google-site-verification"]').remove();
        $('head').append(`<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />`);
    }

    // --- STRICT PROFILE IMAGE LOGIC (No Injection) ---
    // Reads directly from aboutData, cleans path, and updates existing DOM elements only.
    let profileImgSrc = aboutData.profileImage || 'assets/images/me.jpg';
    profileImgSrc = cleanPath(profileImgSrc);
    
    // 1. Update Header Image by ID (Primary)
    // IMPORTANT: This requires <img id="header-profile-img"> to exist in the template.
    $('#header-profile-img').attr('src', profileImgSrc);
    
    // 2. Update any other class instances (e.g. Mobile menus, About page cover overlay)
    $('.profile-img-display').attr('src', profileImgSrc);
    
    // 3. Update Header Name
    $('#header-profile-name').text(aboutData.profileName);

    // 4. Update Meta & Favicons
    $('link[rel*="icon"]').attr('href', profileImgSrc);
    // Only update og:image if it's not an article page or if it's currently empty
    if (!isArticle || $('meta[property="og:image"]').length === 0) {
        $('meta[property="og:image"]').attr('content', toAbsoluteUrl(profileImgSrc));
    }
    
    // Site Title Logic
    let siteTitleEl = $('header a[href="index.html"]').filter((i, el) => {
        const cls = $(el).attr('class') || '';
        const content = $(el).html() || '';
        return !cls.includes('p-2') && (content.includes(aboutData.siteName) || content.includes('<img') || cls.includes('font-black'));
    }).first();

    if (siteTitleEl.length) {
        if (aboutData.logoType === 'image' && aboutData.logoUrl) {
            const logoUrl = cleanPath(aboutData.logoUrl);
            siteTitleEl.html(`<img src="${logoUrl}" alt="${escapeHtml(aboutData.siteName)}" style="max-height: 40px; width: auto; display: block;" />`);
            siteTitleEl.removeClass('text-xl text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight truncate'); 
            siteTitleEl.addClass('flex items-center');
        } else {
            siteTitleEl.html(escapeHtml(aboutData.siteName || 'TechTouch'));
            siteTitleEl.removeClass('flex items-center');
            siteTitleEl.addClass('text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight truncate');
        }
    }

    const headerDiv = $('header > div');
    headerDiv.find('#theme-toggle').remove();
    headerDiv.find('#home-btn-header').remove();
    headerDiv.find('#search-trigger').remove();
    headerDiv.find('a:has(i[data-lucide="arrow-right"])').remove();
    headerDiv.find('button:has(i[data-lucide="arrow-right"])').remove();

    let actionsContainer = headerDiv.find('.header-actions');
    if (actionsContainer.length === 0) {
        const lastFlex = headerDiv.find('div.flex.items-center.gap-2').last();
        if(lastFlex.length) {
            actionsContainer = lastFlex;
            actionsContainer.addClass('header-actions');
        } else {
            actionsContainer = $('<div class="flex items-center gap-1 header-actions"></div>');
            headerDiv.append(actionsContainer);
        }
    }
    actionsContainer.empty();

    if (!isArticle) {
        const homeBtn = `
        <a href="index.html" id="home-btn-header" class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mx-1 order-1" aria-label="الرئيسية">
            <i data-lucide="home" class="w-5 h-5 text-gray-600 dark:text-gray-300"></i>
        </a>`;
        const themeBtn = `
        <button id="theme-toggle" class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors order-3">
            <i data-lucide="moon" class="w-5 h-5 text-gray-600 dark:hidden"></i>
            <i data-lucide="sun" class="w-5 h-5 text-yellow-500 hidden dark:block"></i>
        </button>`;
        actionsContainer.append(homeBtn);
        actionsContainer.append(themeBtn);
    }

    const mainNav = $('nav');
    
    // Main Nav Grid Structure
    const newNavHTML = `
    <div class="grid grid-cols-4 gap-1 px-3 py-1 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" style="height: 48px;">
        <a href="index.html" class="nav-tab">
            <span>الرئيسية</span>
        </a>
        <a href="tools.html" class="nav-tab">
            <span>الأدوات</span>
        </a>
        <a href="about.html" class="nav-tab">
            <span>حول</span>
        </a>
        <button id="nav-search-btn" class="nav-tab" aria-label="بحث">
            <i data-lucide="search"></i>
        </button>
    </div>
    `;
    
    mainNav.empty().removeClass().addClass('w-full sticky top-16 z-30').html(newNavHTML);

    const fonts = aboutData.globalFonts || { nav: 12, content: 13, titles: 14, mainTitles: 15 };
    const baseContentFont = fonts.content || 13;
    const spacingScale = baseContentFont / 13;

    const dynamicStyle = `
    <style id="dynamic-theme-styles">
/* =====================================
   STRUCTURAL PRESERVATION
===================================== */
.nav-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    border-radius: 8px;
    font-weight: 700;
    color: #6b7280;
    background: transparent;
    transition: all 0.2s ease;
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
}
.dark .nav-tab { color: #9ca3af; }
.nav-tab i { width: 18px; height: 18px; }

/* Active Main Nav: Glassy Blue, Smaller */
.nav-tab.active {
    background: rgba(37, 99, 235, 0.12); /* Glassy Blue */
    color: #2563eb;
    border: 1px solid rgba(37, 99, 235, 0.2); /* Subtle Border */
    backdrop-filter: blur(5px);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.05);
    transform: scale(0.95); /* Slightly smaller visual footprint */
}
.dark .nav-tab.active {
    background: rgba(37, 99, 235, 0.2);
    color: #60a5fa;
    border-color: rgba(37, 99, 235, 0.4);
}

.nav-tab:hover:not(.active) { background: #f3f4f6; color: #1f2937; }
.dark .nav-tab:hover:not(.active) { background: #1f2937; color: #f3f4f6; }

/* Category Nav: Outline Style */
.cat-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-weight: 700;
    border-radius: 999px;
    background: transparent;
    color: #6b7280;
    white-space: nowrap;
    transition: all 0.2s ease;
    border: 2px solid transparent; /* Prepare for outline */
}
.dark .cat-tab { color: #9ca3af; }

/* Active Category: Outline Only */
.cat-tab.active {
    background: transparent;
    color: #2563eb;
    border-color: #2563eb; /* The Outline */
}
.dark .cat-tab.active {
    color: #60a5fa;
    border-color: #60a5fa;
}

.cat-tab:hover:not(.active) { background: #f3f4f6; color: #1f2937; }
.dark .cat-tab:hover:not(.active) { background: #374151; color: white; }

.ticker-text, .ticker-text a { font-size: ${aboutData.ticker?.fontSize || 14}px !important; }

/* =====================================
   ROOT SCALE SYSTEM
===================================== */

:root {
  --spacing-scale: ${spacingScale};
}

/* =====================================
   NAVIGATION CONTROL
   (Main Nav + Category Nav)
===================================== */

.nav-tab,
.nav-tab span,
.cat-tab,
.cat-tab span,
nav .nav-link,
nav .nav-link span {
  font-size: ${fonts.nav || 12}px !important;
}

/* =====================================
   CONTENT BODY CONTROL
===================================== */

body,
p,
li,
.post-card .custom-desc-size,
.prose p,
.prose li,
article p,
article li {
  font-size: ${fonts.content || 14}px !important;
  line-height: 1.6 !important;
}

/* =====================================
   TITLES CONTROL (H2 / H3 / Cards)
===================================== */

h2,
h3,
h4,
.prose h2,
.prose h3,
.post-card .custom-title-size,
.related-fixed-title {
  font-size: ${fonts.titles || 18}px !important;
  margin-bottom: calc(8px * var(--spacing-scale)) !important;
}

/* =====================================
   MAIN TITLES (H1)
===================================== */

h1,
.article-header-card h1,
.text-3xl,
.text-4xl {
  font-size: ${fonts.mainTitles || 26}px !important;
  margin-bottom: calc(14px * var(--spacing-scale)) !important;
}

/* =====================================
   COMPACT SPACING SYSTEM
===================================== */

/* تقليل padding الرئيسي */
main {
  padding-top: calc(12px * var(--spacing-scale)) !important;
  padding-bottom: calc(12px * var(--spacing-scale)) !important;
}

/* تقليل المسافة بين البطاقات */
.grid {
  gap: calc(12px * var(--spacing-scale)) !important;
}

/* تقليل المسافات بين الأقسام */
section {
  margin-top: calc(16px * var(--spacing-scale)) !important;
  margin-bottom: calc(16px * var(--spacing-scale)) !important;
}

/* ضبط قسم related */
.related-posts {
  margin-top: calc(18px * var(--spacing-scale)) !important;
  padding-top: calc(12px * var(--spacing-scale)) !important;
}

/* تقليل مسافة المقال */
article {
  margin-top: 8px !important;
}

/* تقليل padding البطاقات */
.post-card .p-4 {
  padding: 12px !important;
}

#about-cover-section {
  padding: calc(30px * var(--spacing-scale)) !important;
}

</style>
    `;
    $('#dynamic-theme-styles').remove();
    $('head').append(dynamicStyle);

    $('footer').replaceWith(generateSocialFooter(aboutData));

    // Ticker Logic
    $('#news-ticker-bar').remove();
    const isCategoryPage = ['index.html', 'apps.html', 'games.html', 'sports.html'].includes(fileName) || fileName.match(/-page-\d+\.html$/);
    if (isCategoryPage && aboutData.ticker && aboutData.ticker.enabled !== false) {
        $('header').after(TICKER_HTML_TEMPLATE);
        $('#ticker-label').text(aboutData.ticker.label);
        const tickerContentDiv = $('#ticker-content');
        tickerContentDiv.removeClass().addClass('flex items-center h-full whitespace-nowrap');
        if (aboutData.ticker.animated !== false) {
            tickerContentDiv.addClass('animate-marquee absolute left-0');
        } else {
            tickerContentDiv.removeClass('animate-marquee absolute left-0');
        }
        if (aboutData.ticker.type === 'image' && aboutData.ticker.imageUrl) {
            const imgUrl = cleanPath(aboutData.ticker.imageUrl);
            const contentHtml = `<img src="${imgUrl}" alt="Ticker Banner" class="h-full object-contain mx-auto" style="max-height: 40px; width: auto;" onerror="this.style.display='none'"/>`;
            tickerContentDiv.html(contentHtml);
        } else {
            let contentHtml = `<span class="mx-4 font-medium text-gray-100 ticker-text whitespace-nowrap inline-block">${escapeHtml(aboutData.ticker.text)}</span>`;
            if(aboutData.ticker.url && aboutData.ticker.url !== '#') {
                contentHtml = `<a href="${aboutData.ticker.url}" class="hover:text-blue-300 transition-colors whitespace-nowrap inline-block ticker-text text-gray-100">${escapeHtml(aboutData.ticker.text)}</a>`;
            }
            tickerContentDiv.html(contentHtml);
        }
    }
    
    if (fileName === 'about.html') {
        const coverContainer = $('#about-cover-section');
        if (coverContainer.length) {
            coverContainer.attr('style', ''); 
            if (aboutData.coverType === 'image' && aboutData.coverValue) {
                const coverUrl = cleanPath(aboutData.coverValue);
                coverContainer.css('background', `url('${coverUrl}') center/cover no-repeat`);
                coverContainer.removeClass((i, c) => (c.match(/bg-gradient-\S+/g) || []).join(' '));
            } else {
                coverContainer.css('background', ''); 
                coverContainer.removeClass((i, c) => (c.match(/bg-gradient-\S+/g) || []).join(' '));
                coverContainer.addClass(aboutData.coverValue || 'bg-gradient-to-r from-blue-700 to-blue-500');
            }
        }
        $('#about-bot-list').parent().find('h2').contents().last().replaceWith(' ' + (aboutData.botTitle || 'مركز خدمة الطلبات (Bot)'));
        if(aboutData.botInfo) {
            const botItems = aboutData.botInfo.split('\n').filter(i => i.trim()).map(i => `<li class="flex items-start gap-2"><span class="text-blue-500 text-xl">✪</span><span>${escapeHtml(i)}</span></li>`).join('');
            $('#about-bot-list').html(botItems);
        }
        $('#about-search-list').parent().find('h2').contents().last().replaceWith(' ' + (aboutData.searchTitle || 'دليل الوصول الذكي للمحتوى'));
        if(aboutData.searchInfo) {
            const searchItems = aboutData.searchInfo.split('\n').filter(i => i.trim()).map(i => `<li class="flex items-start gap-2"><span class="text-green-500 text-xl">✪</span><span>${escapeHtml(i)}</span></li>`).join('');
            $('#about-search-list').html(searchItems);
        }
        $('.prose p:first').text(aboutData.bio);
    }

    if ($('#back-to-top').length === 0) {
        $('body').append(`
        <button id="back-to-top" class="fixed bottom-6 right-6 z-50 bg-gray-900/60 hover:bg-gray-900/80 backdrop-blur-md text-white p-2 rounded-full shadow-lg transition-all duration-300 transform translate-y-10 opacity-0 invisible hover:scale-110 hover:-translate-y-1 focus:outline-none border border-white/10 group" aria-label="العودة للأعلى">
            <i data-lucide="arrow-up" class="w-5 h-5"></i>
        </button>
        `);
    }

    let finalHtml = $.html();
    if (!finalHtml.trim().toLowerCase().startsWith('<!doctype html>')) {
        finalHtml = '<!DOCTYPE html>\n' + finalHtml;
    }
    return finalHtml;
};
