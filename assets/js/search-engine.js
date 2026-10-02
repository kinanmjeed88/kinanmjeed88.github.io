
import { searchIndex } from './search-data.js';
// Import Fuse.js from CDN
import Fuse from '/assets/vendor/fuse-7.0.0.mjs';

class TechTouchSearch {
    constructor() {
        this.fuse = null;
        this.init();
    }

    init() {
        this.initFuse();
        this.bindTriggers();
        // Expose open function globally
        window.openSearchModal = () => this.openSearchModal();
    }

    initFuse() {
        if (!searchIndex) {
            console.error("Search index is empty or undefined.");
            return;
        }
        const options = {
            includeScore: true,
            threshold: 0.4,
            minMatchCharLength: 2,
            ignoreLocation: true,
            useExtendedSearch: false,
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'desc', weight: 0.2 },
                { name: 'category', weight: 0.1 }
            ]
        };
        this.fuse = new Fuse(searchIndex, options);
    }

    // Lazy injection logic
    injectSearchModal() {
        if (document.getElementById('search-modal')) return;

        const modalHTML = `
            <div id="search-modal" class="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300 flex items-start justify-center pt-20 px-4">
                <div id="search-modal-container" class="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-300 border border-gray-100 dark:border-gray-700 relative">
                    
                    <!-- Search Header -->
                    <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-400">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="search-input" placeholder="ابحث عن مقالات، هواتف (مثال: ايفون 16)..." 
                            class="flex-1 bg-transparent text-lg text-gray-900 dark:text-white placeholder-gray-400 outline-none h-10" autocomplete="off">
                        <button id="close-search" class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                            <span class="text-xs font-bold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">ESC</span>
                        </button>
                    </div>

                    <!-- Search Results -->
                    <div id="search-results" class="max-h-[60vh] overflow-y-auto p-2 scroll-smooth">
                        <div class="text-center py-10 text-gray-500 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 opacity-50">
                                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <p>اكتب للبحث في الموقع...</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="p-3 bg-gray-50 dark:bg-gray-800/50 text-center text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
                        نتائج البحث الذكي من TechTouch
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindTriggers() {
        const triggers = document.querySelectorAll('#nav-search-btn, #search-trigger, #search-trigger-desktop');
        triggers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openSearchModal();
            });
        });
        
        // Shortcut key (Ctrl+K or Cmd+K)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearchModal();
            }
        });
    }

    bindModalEvents() {
        const modal = document.getElementById('search-modal');
        const closeBtn = document.getElementById('close-search');
        const input = document.getElementById('search-input');
        const resultsContainer = document.getElementById('search-results');

        if (!modal) return;

        // Prevent double binding if called multiple times
        if(modal.dataset.bound) return;
        modal.dataset.bound = "true";

        const closeModal = () => {
            const modalContainer = document.getElementById('search-modal-container');
            modal.classList.add('opacity-0');
            if (modalContainer) modalContainer.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                if(input) input.value = '';
                if(resultsContainer) {
                    resultsContainer.innerHTML = `
                        <div class="text-center py-10 text-gray-500 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 opacity-50">
                                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <p>اكتب للبحث في الموقع...</p>
                        </div>
                    `;
                }
            }, 300);
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });

        if (input) {
            input.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                if (query.length === 0) {
                    resultsContainer.innerHTML = `
                        <div class="text-center py-10 text-gray-500 dark:text-gray-400">
                           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 opacity-50">
                                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <p>اكتب للبحث في الموقع...</p>
                        </div>
                    `;
                    return;
                }

                if (!this.fuse) return;

                const fuseResults = this.fuse.search(query);
                const results = fuseResults.map(r => r.item).slice(0, 10);

                this.renderResults(results, resultsContainer);
            });
        }
    }

    openSearchModal() {
        // Lazy Inject logic
        if (!document.getElementById('search-modal')) {
            this.injectSearchModal();
            this.bindModalEvents();
        }

        const modal = document.getElementById('search-modal');
        const modalContainer = document.getElementById('search-modal-container');
        const input = document.getElementById('search-input');
        
        if(modal && modalContainer) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalContainer.classList.remove('scale-95');
                if(input) input.focus();
            }, 10);
            document.body.style.overflow = 'hidden';
        }
    }

    renderResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 opacity-50 text-red-400">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>لم يتم العثور على نتائج.</p>
                </div>
            `;
        } else {
            container.innerHTML = results.map(item => `
                <a href="${item.url}" class="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group mb-1">
                    <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                        <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${item.title}">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors text-right">${item.title}</h4>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ml-2 whitespace-nowrap">${item.category}</span>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-snug text-right">${item.desc}</p>
                    </div>
                </a>
            `).join('');
        }
    }
}

// Initializer
const initSearch = () => {
    if (!window.techTouchSearchInitialized) {
        window.techTouchSearchInitialized = true;
        new TechTouchSearch();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}
