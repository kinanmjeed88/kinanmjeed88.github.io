import { escapeHtml, cleanPath, stripHtml } from '../utils/helpers.js';

export const GA_SCRIPT = (id) => `
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;

export const AD_SCRIPT = (clientId) => `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}" crossorigin="anonymous"></script>`;

export const ONESIGNAL_SCRIPT = (appId) => `
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(function(OneSignal) {
    if (!OneSignal.initialized) {
        OneSignal.init({
          appId: "${appId}",
          safari_web_id: "web.onesignal.auto.xxxxx",
          notifyButton: { enable: true },
        });
        OneSignal.initialized = true;
    }
  });
</script>
`;

export const IMG_ERROR_SCRIPT = `
<script>
document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Active State for Nav Tabs
    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-tab, .cat-tab").forEach(tab => {
      const href = tab.getAttribute("href");
      if (href && (href === current || (current === 'index.html' && href === 'index.html'))) {
        tab.classList.add("active");
      }
    });
});
</script>
`;

export const TICKER_HTML_TEMPLATE = `
<div id="news-ticker-bar" class="w-full bg-gray-900 text-white flex items-center overflow-hidden border-b border-gray-800 relative z-40">
    <div class="h-full flex items-center justify-center px-0 relative z-10 shrink-0">
        <div id="ticker-label" class="border-l border-white/10 text-blue-500 px-1 py-0.5 font-bold text-xs">
          جديد
        </div>
    </div>
    <div class="flex-1 overflow-hidden relative h-full flex items-center bg-gray-900">
      <div id="ticker-content" class="animate-marquee whitespace-nowrap absolute left-0 flex items-center">
      </div>
    </div>
</div>
`;

// Function to generate dynamic category nav
export const generateCategoryNavHTML = (categoriesData) => {
    let tabs = '';
    categoriesData.forEach((cat, index) => {
        // First category maps to index.html as homepage
        const url = index === 0 ? 'index.html' : `${cat.id}.html`;
        tabs += `
        <a href="${url}" class="cat-tab">
            <span>${cat.name}</span>
        </a>`;
    });
    
    return `
<div class="w-full py-2 bg-gray-950 border-b border-gray-800">
    <div class="w-full px-3 overflow-x-auto no-scrollbar">
      <div class="flex items-center gap-2 min-w-max">
        ${tabs}
      </div>
    </div>
</div>`;
};


export const renderIconHTML = (iconData, defaultIconName, defaultSize = 20) => {
    if (typeof iconData === 'string') {
        return `<i data-lucide="${iconData || defaultIconName}" style="width:${defaultSize}px; height:${defaultSize}px;"></i>`;
    }
    if (iconData && typeof iconData === 'object') {
        const size = iconData.size || defaultSize;
        if (iconData.type === 'image') {
            return `<img src="${cleanPath(iconData.value)}" style="width:${size}px; height:${size}px; object-fit:contain; display:block;" alt="icon" onerror="this.src='assets/images/me.jpg'">`;
        } else if (iconData.type === 'svg') {
            return `<svg viewBox="${iconData.viewBox || '0 0 24 24'}" fill="${iconData.fill || 'none'}" stroke="${iconData.stroke || 'currentColor'}" stroke-width="${iconData.strokeWidth || '2'}" style="width:${size}px; height:${size}px;">${iconData.value}</svg>`;
        } else {
            return `<i data-lucide="${iconData.value || defaultIconName}" style="width:${size}px; height:${size}px;"></i>`;
        }
    }
    return `<i data-lucide="${defaultIconName}" style="width:${defaultSize}px; height:${defaultSize}px;"></i>`;
};

// --- IN-ARTICLE AD UNIT (SAFE & OPTIMIZED FOR ARTICLE BODY) ---
export const FIXED_AD_UNIT = `
<div class="ad-placement-wrapper" style="text-align: center; margin: 2rem auto; clear: both; width: 100%; min-width: 250px;">
    <span class="text-[10px] text-gray-400 block mb-2 tracking-widest font-mono">ADVERTISEMENT</span>
    <ins class="adsbygoogle"
         style="display:block; text-align:center;"
         data-ad-layout="in-article"
         data-ad-format="fluid"
         data-ad-client="ca-pub-7355327732066930"
         data-ad-slot="1057566101"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
</div>
`;

// --- HORIZONTAL/RECTANGLE AD UNIT (FOR PLACEMENTS OUTSIDE ARTICLE TEXT) ---
export const HORIZONTAL_RECTANGLE_AD_UNIT = `
<div class="ad-placement-wrapper" style="text-align: center; margin: 2rem auto; clear: both; width: 100%; min-width: 250px;">
    <span class="text-[10px] text-gray-400 block mb-2 tracking-widest font-mono">ADVERTISEMENT</span>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-7355327732066930"
         data-ad-slot="1057566101"
         data-ad-format="horizontal, rectangle"
         data-full-width-responsive="true"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
</div>
`;

// --- UPDATED: Use .ad-centered-card for custom manual ads ---
export const generateAdBannerHTML = (aboutData) => {
    // Only return custom manual ad banner when explicitly enabled in settings.
    // Avoid returning FIXED_AD_UNIT here so Google ads are never duplicated back-to-back.
    if (aboutData.adBanner && aboutData.adBanner.enabled === true) {
        const ad = aboutData.adBanner;
        let innerContent = '';

        if (ad.type === 'image' && ad.imageUrl) {
            innerContent = `
                <a href="${ad.url || '#'}" target="_blank" class="block w-full">
                    <img src="${cleanPath(ad.imageUrl)}" 
                         alt="Advertisement" 
                         class="rounded-xl shadow-md max-w-full h-auto border border-gray-200 dark:border-gray-700 mx-auto"
                         onerror="this.style.display='none'">
                </a>`;
        } else {
            innerContent = `
            <a href="${ad.url || '#'}"
               target="_blank"
               class="px-6 py-3 rounded-xl shadow-md font-bold transition-all text-center block max-w-full"
               style="background:${ad.bgColor || 'rgba(37,99,235,0.1)'}; color:${ad.textColor || '#2563eb'};">
               ${escapeHtml(ad.text || 'أعلن هنا')}
            </a>`;
        }
        return `<div class="ad-centered-card">${innerContent}</div>`;
    }
    
    return '';
};

export const generateSocialFooter = (aboutData) => {
    const socialKeys = ['facebook', 'instagram', 'tiktok', 'youtube', 'telegram'];
    const brandColors = {
        facebook: 'hover:bg-[#1877F2]',
        instagram: 'hover:bg-[#E4405F]',
        tiktok: 'hover:bg-black hover:border-gray-600',
        youtube: 'hover:bg-[#FF0000]',
        telegram: 'hover:bg-[#229ED9]'
    };
    const defaultIcons = {
        facebook: 'facebook', instagram: 'instagram', tiktok: 'video', youtube: 'youtube', telegram: 'send'
    };

    let iconsHTML = '';
    socialKeys.forEach(key => {
        const url = aboutData.social?.[key];
        if (url && url !== '#') {
            let iconData = aboutData.socialIcons?.[key];
            if (!iconData) iconData = defaultIcons[key];
            const iconHTML = renderIconHTML(iconData, defaultIcons[key], 20);
            const hoverClass = brandColors[key] || 'hover:bg-blue-600';
            iconsHTML += `<a href="${url}" target="_blank" class="social-icon-btn ${hoverClass} text-gray-300 hover:text-white shadow-lg transition-colors" aria-label="${key}">${iconHTML}</a>`;
        }
    });

    return `
    <footer class="bg-gray-900 text-gray-300 py-10 mt-auto border-t border-gray-800 footer-dynamic">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div class="flex items-center justify-center gap-4 mb-4 social-links-container">
                ${iconsHTML}
            </div>
            <p class="text-sm text-gray-500 font-medium">© 2026 ${aboutData.siteName || "TechTouch"}. جميع الحقوق محفوظة.</p>
        </div>
    </footer>
    `;
};

export const getCatLabel = (cat, categoriesData = []) => {
    const found = categoriesData.find(c => c.id === cat);
    return found ? found.name : 'عام';
};

export const createCardHTML = (post, aboutData, categoriesData = [], isFirst = false) => {
    const loadingAttr = isFirst ? 'loading="eager"' : 'loading="lazy"';

    // Dynamic badge colors and icons based on category index or id
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600'];
    const icons = ['file-text', 'smartphone', 'gamepad-2', 'trophy', 'cpu', 'globe', 'hash', 'star'];
    let badgeColor = 'bg-blue-600';
    let icon = 'file-text';
    
    const catIndex = categoriesData.findIndex(c => c.id === post.category);
    if (catIndex !== -1) {
        badgeColor = colors[catIndex % colors.length];
        icon = icons[catIndex % icons.length];
    }
    
    
    const dateStr = post.effectiveDate.toLocaleString('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    return `
    <a href="/article-${post.slug}.html" class="group block w-full h-full animate-fade-in post-card-wrapper">
        <div class="post-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col relative w-full">
            <div class="h-40 sm:h-48 w-full overflow-hidden relative bg-gray-100 dark:bg-gray-700">
                <img src="${cleanPath(post.image)}" width="400" height="300" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="${escapeHtml(stripHtml(post.title))}" ${loadingAttr} decoding="async" onerror="this.onerror=null;this.src='assets/images/me.jpg';" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                <div class="absolute top-2 right-2 ${badgeColor} text-white font-bold rounded-full flex items-center gap-1 shadow-lg z-10 custom-badge-size" style="padding: 0.3em 0.6em;">
                    <i data-lucide="${icon}" style="width: 1.2em; height: 1.2em;"></i><span>${getCatLabel(post.category, categoriesData)}</span>
                </div>
            </div>
            <div class="p-4 flex-1 flex flex-col w-full">
                <div class="flex items-center gap-2 text-gray-400 mb-2 custom-meta-size">
                    <i data-lucide="clock" style="width: 1.2em; height: 1.2em;"></i><span dir="ltr" class="text-xs font-bold">${dateStr}</span>
                </div>
                <h3 class="font-bold text-gray-900 dark:text-white mb-2 leading-snug group-hover:text-blue-600 transition-colors break-words whitespace-normal w-full" title="${escapeHtml(stripHtml(post.title))}" style="font-size: 14px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${stripHtml(post.title)}</h3>
                <p class="text-gray-500 dark:text-gray-400 line-clamp-2 mb-0 flex-1 leading-relaxed break-words whitespace-normal w-full custom-desc-size">${post.description}</p>
            </div>
        </div>
    </a>`;
};
