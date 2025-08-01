// ميزة البحث في صفحة جميع المنشورات
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من أننا في صفحة جميع المنشورات
    if (!window.location.pathname.includes('/all-posts/') && !window.location.href.includes('all-posts')) {
        return;
    }

    // إنشاء عناصر البحث ديناميكيًا
    const searchContainer = document.createElement('div');
    searchContainer.id = 'search-container';
    searchContainer.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin: 20px;
        padding: 0 20px;
    `;

    // أيقونة البحث
    const searchIcon = document.createElement('div');
    searchIcon.id = 'search-icon';
    searchIcon.innerHTML = '🔍';
    searchIcon.style.cssText = `
        font-size: 24px;
        cursor: pointer;
        padding: 10px;
        border-radius: 50%;
        background-color: #f0f0f0;
        transition: background-color 0.3s ease;
        user-select: none;
    `;

    // مستطيل البحث
    const searchBox = document.createElement('div');
    searchBox.id = 'search-box';
    searchBox.style.cssText = `
        display: none;
        position: absolute;
        right: 0;
        top: 50px;
        background: white;
        border: 2px solid #ddd;
        border-radius: 25px;
        padding: 5px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        z-index: 1000;
        min-width: 300px;
    `;

    // حقل الإدخال
    const searchInput = document.createElement('input');
    searchInput.id = 'search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث عن عنوان المنشور...';
    searchInput.style.cssText = `
        border: none;
        outline: none;
        padding: 10px 15px;
        font-size: 16px;
        width: calc(100% - 50px);
        border-radius: 20px;
        direction: rtl;
        text-align: right;
    `;

    // أيقونة البحث داخل المستطيل
    const searchButtonIcon = document.createElement('div');
    searchButtonIcon.id = 'search-button';
    searchButtonIcon.innerHTML = '🔍';
    searchButtonIcon.style.cssText = `
        display: inline-block;
        padding: 10px;
        cursor: pointer;
        font-size: 18px;
        vertical-align: middle;
    `;

    // تجميع عناصر مستطيل البحث
    searchBox.appendChild(searchInput);
    searchBox.appendChild(searchButtonIcon);

    // تجميع عناصر البحث الرئيسية
    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchBox);

    // إنشاء منطقة النتائج
    const searchResults = document.createElement('div');
    searchResults.id = 'search-results';
    searchResults.style.cssText = `
        margin: 20px;
        padding: 20px;
        background: #f9f9f9;
        border-radius: 10px;
        display: none;
    `;

    // العثور على المكان المناسب لإدراج البحث
    const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
    const postsContainer = document.querySelector('.posts-grid-thin') || document.querySelector('.posts-grid') || document.querySelector('.posts-container');
    
    if (postsContainer) {
        // إدراج البحث قبل منطقة المنشورات
        postsContainer.parentNode.insertBefore(searchContainer, postsContainer);
        postsContainer.parentNode.insertBefore(searchResults, postsContainer);
    } else {
        // إدراج البحث في بداية المحتوى الرئيسي
        mainContent.insertBefore(searchContainer, mainContent.firstChild);
        mainContent.insertBefore(searchResults, mainContent.children[1]);
    }

    // وظائف البحث
    let allPosts = [];
    
    // جمع جميع المنشورات من الصفحة
    function collectPosts() {
        const postElements = document.querySelectorAll('.post-card-thin, .post-card, .post-item, article, .post');
        allPosts = Array.from(postElements).map(post => {
            const titleElement = post.querySelector('h2, h3, .post-title, .title, .post-info a') || post.querySelector('a');
            const linkElement = post.querySelector('a') || titleElement;
            
            return {
                element: post,
                title: titleElement ? titleElement.textContent.trim() : '',
                link: linkElement ? linkElement.href : '#'
            };
        }).filter(post => post.title);
    }

    // تنفيذ البحث
    function performSearch(query) {
        if (!query.trim()) {
            searchResults.style.display = 'none';
            // إظهار جميع المنشورات
            allPosts.forEach(post => post.element.style.display = 'flex');
            return;
        }

        const filteredPosts = allPosts.filter(post => 
            post.title.toLowerCase().includes(query.toLowerCase())
        );

        // إخفاء جميع المنشورات أولاً
        allPosts.forEach(post => post.element.style.display = 'none');
        
        // إظهار المنشورات المطابقة فقط
        filteredPosts.forEach(post => post.element.style.display = 'flex');

        displaySearchResults(filteredPosts, query);
    }

    // عرض نتائج البحث
    function displaySearchResults(posts, query) {
        searchResults.innerHTML = '';
        
        if (posts.length === 0) {
            searchResults.innerHTML = `<p style="text-align: center; color: #666;">لم يتم العثور على نتائج للبحث: "${query}"</p>`;
        } else {
            const resultsTitle = document.createElement('h3');
            resultsTitle.textContent = `نتائج البحث (${posts.length}):`;
            resultsTitle.style.cssText = 'margin-bottom: 15px; color: #333;';
            searchResults.appendChild(resultsTitle);
        }
        
        searchResults.style.display = 'block';
    }

    // أحداث التفاعل
    searchIcon.addEventListener('click', function() {
        if (searchBox.style.display === 'none' || !searchBox.style.display) {
            searchBox.style.display = 'block';
            searchInput.focus();
            collectPosts(); // جمع المنشورات عند فتح البحث
        } else {
            searchBox.style.display = 'none';
            searchResults.style.display = 'none';
            searchInput.value = '';
            // إظهار جميع المنشورات عند إغلاق البحث
            allPosts.forEach(post => post.element.style.display = 'flex');
        }
    });

    // البحث عند الكتابة
    searchInput.addEventListener('input', function() {
        performSearch(this.value);
    });

    // البحث عند الضغط على أيقونة البحث داخل المستطيل
    searchButtonIcon.addEventListener('click', function() {
        performSearch(searchInput.value);
    });

    // البحث عند الضغط على Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
        }
    });

    // إغلاق البحث عند الضغط خارجه
    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target) && !searchResults.contains(e.target)) {
            searchBox.style.display = 'none';
            searchResults.style.display = 'none';
        }
    });

    // تأثيرات بصرية
    searchIcon.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#e0e0e0';
    });

    searchIcon.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '#f0f0f0';
    });

    console.log('ميزة البحث تم تحميلها بنجاح');
});

