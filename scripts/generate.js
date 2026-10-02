import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { ROOT_DIR } from './utils/paths.js';
import { safeWrite } from './utils/fs.js';
import { cleanPath } from './utils/helpers.js';
import { loadSiteData } from './core/loader.js';
import { updateGlobalElements } from './core/global.js';
import { FIXED_AD_UNIT } from './core/renderer.js';
import { generateCategoryPages } from './pages/categories.js';
import { generateIndividualArticles } from './pages/articles.js';
import { updateToolsPage } from './pages/tools.js';
import { updateChannelsPage } from './pages/channels.js';
import { updateAboutPageDetails } from './pages/about.js';
import { generateSitemap } from './seo/sitemap.js';
import { generateRSS } from './seo/rss.js';

function updateAdditionalStaticPages(aboutData) {
    const extraPages = [
        'tools-phones.html',
        'tools-compare.html',
        'tool-analysis.html',
        'article-capcut.html',
        'article-iphone-16.html',
        'article-lightroom.html',
        'article-anthropic-agents.html',
        'articles.html',
        'site-map.html',
        'privacy.html'
    ];

    extraPages.forEach(fileName => {
        const filePath = path.join(ROOT_DIR, fileName);
        if (!fs.existsSync(filePath)) return;

        let html = fs.readFileSync(filePath, 'utf8');

        // For legacy standalone article pages, ensure ad units exist inside <article>
        if (fileName.startsWith('article-')) {
            const $ = cheerio.load(html, { decodeEntities: false });
            const article = $('article');
            if (article.length && article.find('ins.adsbygoogle').length === 0) {
                const firstBlock = article.children('p, div.video-container').first();
                if (firstBlock.length) {
                    firstBlock.after(`<div class="ad-top-content mb-4 mt-2">${FIXED_AD_UNIT}</div>`);
                }
                const blocks = article.children('p, div, section, h2, h3').not('.ad-top-content');
                if (blocks.length >= 2) {
                    const midBlock = blocks.eq(Math.floor(blocks.length / 2));
                    midBlock.after(`<div class="ad-mid-content mb-4 mt-4">${FIXED_AD_UNIT}</div>`);
                }
                html = $.html();
            }
        }

        safeWrite(filePath, updateGlobalElements(html, fileName, '', aboutData));
    });
}

async function updateSearchData(allPosts, channelsData) {
    const searchPath = path.join(ROOT_DIR, 'assets/js/search-data.js');
    const searchItems = [ 
        ...allPosts.map(p => ({ title: p.title, desc: p.description, url: `article-${p.slug}.html`, category: p.category.charAt(0).toUpperCase() + p.category.slice(1), image: cleanPath(p.image) })), 
        ...channelsData.map(c => ({ title: c.name, desc: c.desc, url: c.url, category: 'Channels', image: 'assets/images/me.jpg' })) 
    ];
    safeWrite(searchPath, `export const searchIndex = ${JSON.stringify(searchItems, null, 2)};`);
}

(async function main() {
    try {
        console.log('🚀 Starting Modular Build Process...');
        
        const { aboutData, channelsData, analyticsData, allPosts: posts, postsByCategory, categoriesData } = await loadSiteData();
        
        // --- 🔎 DEBUG: Profile Image Check ---
        console.log("========================================");
        console.log("🔍 [DEBUG] PROFILE IMAGE FROM JSON:", aboutData.profileImage);
        console.log("========================================");
        // -------------------------------------

        // Grouping is handled by loader.js

        // Run Page Generators
        updateAboutPageDetails(aboutData);
        updateChannelsPage(channelsData, aboutData);
        updateToolsPage(aboutData);
        updateAdditionalStaticPages(aboutData);
        await generateCategoryPages({ postsByCategory, aboutData, channelsData, categoriesData });
        await generateIndividualArticles({ allPosts: posts, postsByCategory, aboutData, channelsData, categoriesData, analyticsData });
        
        // Update Utilities
        await updateSearchData(posts, channelsData);
        
        // SEO
        generateRSS(posts, aboutData);
        generateSitemap(posts, aboutData);
        
        console.log('✅ Build Complete. Multi-Page Architecture Hardened.');
    } catch (err) {
        console.error('❌ Build error:', err);
        process.exit(1);
    }
})();
