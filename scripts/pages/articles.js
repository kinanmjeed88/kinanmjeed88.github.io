import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { ROOT_DIR, TEMPLATES_DIR } from '../utils/paths.js';
import { safeWrite } from '../utils/fs.js';
import { updateGlobalElements } from '../core/global.js';
import { cleanPath, escapeHtml, escapeXml, stripHtml, toAbsoluteUrl } from '../utils/helpers.js';
import { parseMarkdown } from '../core/markdown.js';
import { getCatLabel, generateAdBannerHTML, FIXED_AD_UNIT, AUTO_FORMAT_AD_UNIT } from '../core/renderer.js';
import { BASE_URL } from '../config/constants.js';

export async function generateIndividualArticles({ allPosts, postsByCategory, aboutData, channelsData, categoriesData, analyticsData }) {
    let templatePath = path.join(TEMPLATES_DIR, 'article-asus-gx10.html');
    if (!fs.existsSync(templatePath)) templatePath = path.join(ROOT_DIR, 'article-asus-gx10.html');

    if (!fs.existsSync(templatePath)) {
        console.error("Article template missing. Skipping article generation.");
        return;
    }
    let template = fs.readFileSync(templatePath, 'utf8');

    allPosts.forEach(post => {
        const $ = cheerio.load(template);
        
        // --- CLEAN URL IMPLEMENTATION ---
        const pageSlug = `article-${post.slug}.html`; // Physical file name (MUST keep .html for save)
        const canonicalUrl = `${BASE_URL}/article-${post.slug}`; // Logical URL (Clean, for SEO/Share)
        const fullUrl = `${BASE_URL}/${pageSlug}`; // Fallback/Physical Ref
        const fullImageUrl = toAbsoluteUrl(post.image);
        
        const cleanTitle = stripHtml(post.title || '');
        const cleanDesc = stripHtml(post.description || '');
        
        $('title').text(`${cleanTitle} | ${aboutData.siteName || "TechTouch"}`);
        $('meta[name="description"]').attr('content', cleanDesc);
        
        // Also add strict OG tags here to ensure they are available for global.js or directly overridden
        $('head').append(`<meta property="og:title" content="${escapeXml(cleanTitle)}">`);
        $('head').append(`<meta property="og:description" content="${escapeXml(cleanDesc)}">`);
        $('head').append(`<meta property="og:url" content="${canonicalUrl}">`);
        $('head').append(`<meta property="og:image" content="${fullImageUrl}">`);
        $('head').append(`<meta name="twitter:card" content="summary_large_image">`);
        $('head').append(`<meta name="twitter:image" content="${fullImageUrl}">`);
        
        const formattedDate = post.effectiveDate.toLocaleString('ar-EG', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        
        // Match Analytics Path: key in analyticsData is now normalized to the post slug
        const slugKey = post.slug.trim().toLowerCase();
        const pageViews = (analyticsData && analyticsData[slugKey]) ? analyticsData[slugKey] : 0;

        // --- SMART TITLE RENDERING ---
        let titleContent = '';
        const titleRaw = (post.title || '').trim();
        if (titleRaw.startsWith('<') || titleRaw.startsWith('#')) {
            titleContent = parseMarkdown(titleRaw);
        } else {
            titleContent = `<h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight break-words w-full m-0 text-center">${escapeHtml(post.title)}</h1>`;
        }

        // --- AI SUMMARY BUTTON ---
        let summaryButtonHTML = '';
        if (post.summary) {
             summaryButtonHTML = `
            <div class="w-full flex justify-center mt-3 mb-5">
                <button class="ai-summary-btn">
                    <i data-lucide="sparkles" class="w-4 h-4 text-blue-500"></i>
                    <span>تلخيص المحتوى AI</span>
                </button>
            </div>
            `;
        }

        // --- DIRECT DOWNLOAD TV APP BUTTON ---
        let silentDownloadButtonHTML = '';
        if (post.tvAppLink) {
            silentDownloadButtonHTML = `
            <div class="w-full flex justify-center mt-3 mb-5">
                <button class="silent-dl-btn inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all" data-tvapplink="${escapeHtml(post.tvAppLink)}">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>تحميل تطبيق التلفاز مباشر</span>
                </button>
            </div>
            `;
        }

        const articleHeaderHTML = `
        <header class="mb-8 relative">
            <div class="article-header-card relative z-20">
                ${titleContent}
            </div>
            <div class="article-meta-bar flex flex-col items-center justify-center px-4 py-3 border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-x-auto no-scrollbar relative z-10">
                <div class="flex items-center gap-4 sm:gap-6 w-full justify-center">
                    <div class="flex items-center gap-1.5 group" title="تاريخ النشر">
                        <i data-lucide="calendar-clock" class="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform"></i>
                        <span dir="ltr" class="font-medium font-mono tracking-tight">${formattedDate}</span>
                    </div>
                    <div class="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                    <div class="flex items-center gap-1.5 view-count-wrapper group" title="المشاهدات">
                        <i data-lucide="eye" class="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform"></i>
                        <span class="view-count-display font-bold font-mono tracking-tight" data-slug="${post.slug}">${pageViews > 0 ? pageViews : '—'}</span>
                    </div>
                </div>
            </div>
            ${summaryButtonHTML}
            ${silentDownloadButtonHTML}
        </header>
        `;
        
        const existingHeader = $('main header').first();
        if(existingHeader.length) {
            existingHeader.replaceWith(articleHeaderHTML);
        } else {
            $('main').prepend(articleHeaderHTML);
        }

        $('#custom-ad-banner').remove();

        // Breadcrumbs: Point to real pages now
        let breadcrumbLabel = 'اخبار';
        let breadcrumbLink = 'index.html';
        if (post.category === 'apps') { breadcrumbLabel = 'تطبيقات'; breadcrumbLink = 'apps.html'; }
        else if (post.category === 'games') { breadcrumbLabel = 'ألعاب'; breadcrumbLink = 'games.html'; }
        else if (post.category === 'sports') { breadcrumbLabel = 'رياضة'; breadcrumbLink = 'sports.html'; }

        let breadcrumbElement = $('nav a[href="articles.html"]');
        if (!breadcrumbElement.length) {
            breadcrumbElement = $('nav a').filter((i, el) => { return $(el).text().trim() === 'اخبار'; }).first();
        }
        if (breadcrumbElement.length) {
            breadcrumbElement.text(breadcrumbLabel);
            breadcrumbElement.attr('href', breadcrumbLink);
        }
        
        $('nav span.truncate').text(post.title);
        
        const existingImgDiv = $('main > div.rounded-2xl');
        const adaptiveImageHTML = `
        <div class="article-image-container">
            <img src="${cleanPath(post.image)}" alt="${escapeHtml(stripHtml(post.title))}" class="article-featured-image" loading="eager" onerror="this.onerror=null;this.src='assets/images/me.jpg';" />
        </div>
        `;
        
        if (existingImgDiv.length) { existingImgDiv.replaceWith(adaptiveImageHTML); } else { $('main > header').after(adaptiveImageHTML); }

        // --- CONTENT PROCESSING & AD INJECTION ---
        const $content = cheerio.load(post.content, null, false);
        // $content('.adsbygoogle-container, .ad-placeholder').remove();
        
        // Optimize Images
        $content('img').each((i, img) => {
            const originalSrc = $content(img).attr('src');
            if (originalSrc) $content(img).attr('src', cleanPath(originalSrc));
            $content(img).attr('onerror', "this.onerror=null;this.src='assets/images/me.jpg';");
        });
        $content('img').addClass('w-full h-auto max-w-full rounded-xl shadow-md my-4 block mx-auto border border-gray-100 dark:border-gray-700');
        
        $('.share-buttons-container').remove();

        // Validation helper: prevent injecting ads inside narrow or invalid containers (grid, flex, ul, li, etc.)
        const isInvalidAdParent = (el) => {
            if (!el || !el.length || !el[0] || !el[0].tagName) return false;
            const tag = el[0].tagName.toLowerCase();
            if (['ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'p', 'span', 'a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                return true;
            }
            const classes = (el.attr('class') || '').trim().split(/\s+/);
            if (classes.some(c => ['grid', 'inline-grid', 'flex', 'inline-flex', 'hidden'].includes(c) || c.endsWith(':grid') || c.endsWith(':flex') || c.endsWith(':hidden'))) {
                return true;
            }
            return false;
        };

        // Climb up DOM tree until the element's parent and all ancestors are safe full-width block containers
        const resolveSafeSiblingTarget = (el) => {
            if (!el || !el.length) return null;
            let curr = el;
            let ancestor = curr.parent();
            while (ancestor && ancestor.length && ancestor[0] && ancestor[0].type !== 'root') {
                if (isInvalidAdParent(ancestor)) {
                    curr = ancestor;
                }
                ancestor = ancestor.parent();
            }
            return curr;
        };

        // Collect root-level block elements (> p, > div, > section, > h2, > h3)
        let rootContainer = $content.root();
        let rootBlocks = rootContainer.children('p, div, section, h2, h3').toArray();

        // Unwrap single outer wrapper div/section (including nested single wrappers)
        while (rootBlocks.length === 1 && ['div', 'section'].includes(rootBlocks[0].tagName.toLowerCase()) && !isInvalidAdParent($content(rootBlocks[0]))) {
            rootContainer = $content(rootBlocks[0]);
            rootBlocks = rootContainer.children('p, div, section, h2, h3').toArray();
        }

        // If the wrapper has a main body container (e.g. Hero + Body wrapper + Footer, or decorative bg + relative wrapper), expand safe multi-child block containers
        for (let pass = 0; pass < 2 && rootBlocks.length <= 3; pass++) {
            const expanded = [];
            rootBlocks.forEach(node => {
                const $node = $content(node);
                const cls = ($node.attr('class') || '').trim().split(/\s+/);
                // Skip purely decorative absolute background divs
                if (cls.includes('absolute') && $node.text().trim() === '') return;
                const subBlocks = $node.children('p, div, section, h2, h3').toArray();
                if (!isInvalidAdParent($node) && subBlocks.length >= 2) {
                    expanded.push(...subBlocks);
                } else {
                    expanded.push(node);
                }
            });
            if (expanded.length > 0) {
                rootBlocks = expanded;
            }
        }

        let topTargetNode = null;

        // 1. إعلان بداية المنشور تحت الصورة أو الفيديو الأول (إذا وجد) أو بعد أول عنصر جذري
        const mediaElements = $content('img, iframe, video');
        if (mediaElements.length > 0) {
            const firstMedia = $content(mediaElements[0]);
            const candidate = firstMedia.parent().length && firstMedia.parent()[0].type !== 'root' ? firstMedia.parent() : firstMedia;
            const safeTop = resolveSafeSiblingTarget(candidate);
            if (safeTop && safeTop.length) {
                topTargetNode = safeTop[0];
                safeTop.after(`
                <div class="ad-top-content mb-4 mt-2">
                   ${FIXED_AD_UNIT}
                </div>`);
            }
        } else if (rootBlocks.length > 0) {
            const safeTop = resolveSafeSiblingTarget($content(rootBlocks[0]));
            if (safeTop && safeTop.length) {
                topTargetNode = safeTop[0];
                safeTop.after(`
                <div class="ad-top-content mb-4 mt-2">
                   ${FIXED_AD_UNIT}
                </div>`);
            }
        }

        // 2. إعلان في وسط المنشور (يعتمد على عناصر المستوى الأول مع منع الحقن داخل grid/flex/ul/li)
        if (rootBlocks.length >= 2) {
            let midPoint = Math.floor(rootBlocks.length / 2);
            let safeMid = resolveSafeSiblingTarget($content(rootBlocks[midPoint]));

            // Avoid placing mid ad on the exact same element as top ad
            if (safeMid && safeMid.length && safeMid[0] === topTargetNode) {
                const altIndex = midPoint + 1 < rootBlocks.length ? midPoint + 1 : rootBlocks.length - 1;
                safeMid = resolveSafeSiblingTarget($content(rootBlocks[altIndex]));
            }

            if (safeMid && safeMid.length && safeMid[0] !== topTargetNode && !isInvalidAdParent(safeMid.parent())) {
                safeMid.after(`
                <div class="ad-mid-content mb-4 mt-4">
                   ${FIXED_AD_UNIT}
                </div>`);
            }
        } else if (rootBlocks.length === 1) {
            const onlyBlock = resolveSafeSiblingTarget($content(rootBlocks[0]));
            if (onlyBlock && onlyBlock.length && onlyBlock[0] !== topTargetNode && !isInvalidAdParent(onlyBlock.parent())) {
                onlyBlock.after(`
                <div class="ad-mid-content mb-4 mt-4">
                   ${FIXED_AD_UNIT}
                </div>`);
            }
        }

        $('article').html($content.html()); 

        // 3. إعلان ما قبل الخلاصة الذكية
        if (post.summary) {
            $('article').append(`
            <div class="ad-pre-summary mb-4 mt-4">
                ${AUTO_FORMAT_AD_UNIT}
            </div>`);
        }

        // --- AI SUMMARY CONTENT ---
        $('#ai-summary-container').remove();
        if (post.summary) {
            const summaryHTML = post.summary
              .split('\n')
              .map(line => parseMarkdown(line))
              .join('');

            const summaryContentHTML = `
            <div class="ai-summary-box hidden w-full max-w-2xl mx-auto my-6 transition-all duration-300 transform scale-95 opacity-0">
              <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                    <span class="text-blue-500 animate-pulse">
                        <i data-lucide="bot" class="w-4 h-4"></i>
                    </span>
                    <h3 class="font-bold text-sm text-gray-800 dark:text-gray-200">الخلاصة الذكية</h3>
                    <button class="ai-summary-close mr-auto text-gray-400 hover:text-red-500 transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
              </div>
              <div class="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  ${summaryHTML}
              </div>
            </div>`;
            $('article').append(summaryContentHTML);
        }

        const tags = [getCatLabel(post.category, categoriesData)];
        if(cleanTitle) {
            // Use cleanTitle which has HTML stripped, instead of post.title which might contain HTML tags
            const words = cleanTitle.split(' ').filter(w => w.length > 3 && !['كيف', 'ماذا', 'لماذا', 'هذا', 'التي', 'الذي'].includes(w));
            tags.push(...words.slice(0, 4));
        }
        const uniqueTags = [...new Set(tags)];
        const tagsHTML = `
        <div class="article-tags flex flex-wrap items-center gap-2 mt-8 mb-6 p-4 border-t border-gray-100 dark:border-gray-700">
            <span class="text-sm font-bold text-gray-500 dark:text-gray-400"><i data-lucide="tag" class="w-4 h-4 inline mr-1"></i> كلمات مفتاحية:</span>
            ${uniqueTags.map(tag => `<span class="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">#${tag}</span>`).join('')}
        </div>
        `;
        $('article').append(tagsHTML);

        // Updated Share Section using CANONICAL URL
        const shareSectionHTML = `
        <div class="share-buttons-container mt-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
            <h3 class="font-bold text-gray-800 dark:text-white mb-4 text-sm">شارك المعلومة</h3>
            <div class="flex flex-wrap justify-center gap-4" id="dynamic-share-buttons" data-title="${escapeXml(cleanTitle)}" data-url="${canonicalUrl}">
                <a href="#" class="share-btn whatsapp w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90 shadow-sm transition-transform hover:scale-110" aria-label="Share on WhatsApp">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                </a>
                <a href="#" class="share-btn telegram w-9 h-9 flex items-center justify-center rounded-full bg-[#229ED9] text-white hover:opacity-90 shadow-sm transition-transform hover:scale-110" aria-label="Share on Telegram">
                    <i data-lucide="send" class="w-4 h-4 ml-0.5"></i>
                </a>
                <a href="#" class="share-btn facebook w-9 h-9 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 shadow-sm transition-transform hover:scale-110" aria-label="Share on Facebook">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" class="share-btn instagram w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90 shadow-sm transition-transform hover:scale-110" aria-label="Share on Instagram">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
            </div>
        </div>
        `;
        $('article').append(shareSectionHTML);
        
        // --- STRICT RELATED POSTS LOGIC ---
        const otherPosts = allPosts.filter(p => p.slug !== post.slug);
        
        let sameCatPosts = otherPosts.filter(p => p.category === post.category)
            .sort((a,b) => b.effectiveDate - a.effectiveDate);
        
        let diffCatPosts = otherPosts.filter(p => p.category !== post.category)
            .sort((a,b) => b.effectiveDate - a.effectiveDate);
        
        let relatedPosts = sameCatPosts.concat(diffCatPosts);
        relatedPosts = relatedPosts.slice(0, 12);

        if (relatedPosts.length > 0) {
            const gridPosts = relatedPosts.slice(0, 6);
            const listPosts = relatedPosts.slice(6, 12);

            let relatedHTML = `
            <section class="related-posts mt-12 border-t border-gray-100 dark:border-gray-700 pt-8">
                <h3 class="text-lg font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2"><i data-lucide="layers" class="w-5 h-5 text-blue-600"></i> قد يعجبك أيضاً</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">`;
            
            gridPosts.forEach(r => {
                const rDate = r.effectiveDate.toISOString().split('T')[0];
                // Clean Link (No .html)
                relatedHTML += `
                <a href="/article-${r.slug}.html" class="flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group h-full">
                    <div class="h-28 overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                        <img src="${cleanPath(r.image)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" onerror="this.onerror=null;this.src='assets/images/me.jpg';" />
                    </div>
                    <div class="p-2 flex-1 flex flex-col">
                        <h4 class="font-bold text-gray-900 dark:text-white leading-relaxed group-hover:text-blue-600 transition-colors mb-2" style="font-size: 14px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${stripHtml(r.title || '')}</h4>
                        <div class="mt-auto pt-2 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-[10px] text-gray-400">
                             <span class="truncate text-blue-500/80">${getCatLabel(r.category, categoriesData)}</span>
                             <span dir="ltr" class="font-mono">${rDate}</span>
                        </div>
                    </div>
                </a>`;
            });
            relatedHTML += `</div>`;

            // 4. إعلان مخصص + إعلان تلقائي جوجل بين المقالات المقترحة (قد يعجبك أيضاً) مع فاصل واضح
            const adHTML = generateAdBannerHTML(aboutData);
            if (adHTML) {
                relatedHTML += `<div class="ad-mid-related mb-6 mt-4" style="margin-bottom: 24px; padding-bottom: 8px;">${adHTML}</div>`;
            }
            
            // إعلان جوجل المتجاوب قبل القائمة الجانبية (List)
            relatedHTML += `
            <div class="ad-mid-related-google mb-6 mt-4" style="margin-top: 24px; margin-bottom: 24px;">
                ${AUTO_FORMAT_AD_UNIT}
            </div>`;

            if (listPosts.length > 0) {
                relatedHTML += `<div class="flex flex-col gap-2">`;
                listPosts.forEach(r => {
                    const rDate = r.effectiveDate.toISOString().split('T')[0];
                    // Clean Link (No .html)
                    relatedHTML += `
                    <a href="/article-${r.slug}.html" class="flex items-start gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group">
                        <img src="${cleanPath(r.image)}" class="w-16 h-12 object-cover rounded-lg shrink-0 bg-gray-200 dark:bg-gray-700" loading="lazy" onerror="this.onerror=null;this.src='assets/images/me.jpg';" />
                        <div class="flex-1 min-w-0 self-center">
                            <h4 class="font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 transition-colors" style="font-size: 14px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${stripHtml(r.title || '')}</h4>
                            <div class="flex gap-2 mt-1">
                                <span class="text-[10px] text-gray-400 font-mono" dir="ltr">${rDate}</span>
                            </div>
                        </div>
                    </a>`;
                });
                relatedHTML += `</div>`;
            }

            relatedHTML += `</section>`;
            $('article').append(relatedHTML);
        }

        const safeJsonLd = { 
            "@context": "https://schema.org", 
            "@type": "Article", 
            "headline": cleanTitle, 
            "image": post.image ? [fullImageUrl] : [], 
            "datePublished": post.publishedAt.toISOString(), 
            "dateModified": post.updatedAt.toISOString(), 
            "author": { "@type": "Person", "name": aboutData.profileName || "TechTouch" }, 
            "publisher": { 
                "@type": "Organization", 
                "name": aboutData.siteName || "TechTouch", 
                "logo": { "@type": "ImageObject", "url": toAbsoluteUrl(aboutData.profileImage) } 
            }, 
            "description": cleanDesc, 
            "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl } 
        };
        
        $('script[type="application/ld+json"]').remove();
        $('head').append(`<script type="application/ld+json">${JSON.stringify(safeJsonLd, null, 2)}</script>`);
        
        // --- FORCE CANONICAL UPDATE ---
        $('link[rel="canonical"]').remove();
        $('head').append(`<link rel="canonical" href="${canonicalUrl}" />`);

        safeWrite(
            path.join(ROOT_DIR, pageSlug),
            updateGlobalElements($.html(), pageSlug, '', aboutData)
        );
    });
}
