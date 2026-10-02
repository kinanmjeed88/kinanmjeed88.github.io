export function parseMarkdown(content, renderMode = 'markdown') {
    if (!content) return '';

    // 1️⃣ MODE: HTML (Professional/Raw)
    // Return exactly what was written. No processing, no wrapping, no regex.
    if (renderMode === 'html') {
        return content;
    }

    // 2️⃣ MODE: MARKDOWN (Hybrid)
    let html = content;

    // --- A. Process Shortcodes (Images, Youtube, Buttons) ---
    // YouTube
    html = html.replace(/@\[youtube\]\((.*?)\)/g, (match, url) => {
        let videoId = '';
        const matchId = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/);
        if (matchId) videoId = matchId[1];
        if (videoId) {
            return `<div class="video-container shadow-lg rounded-xl overflow-hidden border border-gray-800 w-full max-w-full"><iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
        }
        return '';
    });

    // Images (Standard Markdown Syntax) -> Custom Div Wrapper
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => 
        `<div class="article-image-container"><img src="${src}" alt="${alt}" onerror="this.onerror=null;this.src='assets/images/me.jpg';"></div>`
    );

    // Custom Button Link [Text](Url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, 
        `<div class="my-6 w-full flex justify-center px-2"><a href="$2" target="_blank" class="btn-wrapped-link w-full sm:w-auto"><i data-lucide="external-link" class="shrink-0 w-4 h-4"></i><span class="break-words whitespace-normal text-center">$1</span></a></div>`
    );

    // --- B. Process Markdown Syntax ---
    
    // Headers (H1 - H3)
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 mt-6 mb-3 break-words whitespace-normal w-full">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-blue-600 dark:text-blue-400 mt-8 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 break-words whitespace-normal w-full">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-gray-900 dark:text-white mt-8 mb-6 break-words whitespace-normal w-full">$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Lists (Basic handling for - item)
    // Wrap lists in UL structure if they aren't already (non-greedy and scoped to markdown list items)
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc marker:text-blue-500 break-words whitespace-normal">$1</li>');
    html = html.replace(/(<li class="ml-4 list-disc[^>]*>.*?<\/li>\n?)+/g, '<ul class="list-inside space-y-2 mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm w-full">$&</ul>');

    // --- C. Smart Paragraph Wrapping ---
    // Only wrap text blocks in <p> if they are NOT HTML block elements.
    
    const blocks = html.split(/\n\s*\n/); // Split by double newlines to find paragraphs
    
    const processedBlocks = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        // List of block-level HTML tags that should NOT be wrapped in <p>
        const blockTags = [
            'div', 'table', 'section', 'iframe', 'script', 'style', 'header', 'footer', 
            'nav', 'main', 'article', 'aside', 'pre', 'blockquote', 'form', 'fieldset', 
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd'
        ];

        // Regex to check if the block starts with <tag or </tag
        const startsWithBlockTag = new RegExp(`^<(\/)?(${blockTags.join('|')})`, 'i');

        if (startsWithBlockTag.test(trimmed) || trimmed.startsWith('<!--')) {
            return trimmed; // Return raw HTML block
        }

        // If it's just text or inline elements, wrap in <p> with Tailwind classes
        return `<p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 text-base break-words whitespace-normal w-full">${trimmed.replace(/\n/g, '<br>')}</p>`;
    });

    return processedBlocks.join('\n');
}