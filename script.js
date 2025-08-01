// تأثيرات تفاعلية إضافية
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // إضافة تأثير النقر للبطاقات
    const cards = document.querySelectorAll('.card, .featured-card');
    const subCards = document.querySelectorAll('.sub-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // إضافة تأثير النقر
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // إضافة تأثير النقر للبطاقات الفرعية مع فتح الروابط
    subCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // إضافة تأثير النقر
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // فتح الرابط
            const url = this.getAttribute('data-url');
            if (url) {
                window.open(url, '_blank');
            }
        });
    });
    
    // إضافة تأثير التمرير السلس
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // مراقبة العناصر للتأثيرات
    const elementsToObserve = document.querySelectorAll('.card, .sub-card, .sub-section');
    elementsToObserve.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // إضافة تأثير الجسيمات في الخلفية
    createParticles();

    // Pop-up Modal functionality
    const modal = document.getElementById('popupModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const closeButton = document.querySelector('#popupModal .close-button');

    console.log('Modal elements:', { modal, modalTitle, modalContent, closeButton });

    // Ensure modal functionality is properly initialized
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Data for dropdowns to be used in modal
    const dropdownData = {
        'movies-dropdown': [
            { icon: '🎬', text: 'تـ Cinemana X ايرثلنك', url: 'https://t.me/techtouch7/173' },
            { icon: '🎭', text: 'تـ CEE أفلام', url: 'https://t.me/techtouch7/174' },
            { icon: '📽️', text: 'تـ Monveibox أفلام', url: 'https://t.me/techtouch7/2070' },
            { icon: '🎪', text: 'سينمانا', url: 'https://t.me/techtouch7/1668' },
            { icon: '🍿', text: 'نتفلكس محاني', url: 'https://t.me/techtouch7/2676' },
            { icon: '📺', text: 'سيمو دراما', url: 'https://t.me/techtouch7/211?single' }
        ],
        'sports-dropdown': [
            { icon: '📺', text: 'MixFlix tv', url: 'https://t.me/techtouch7/1450' },
            { icon: '📺', text: 'دراما لايف tv', url: 'https://t.me/techtouch7/1686' },
            { icon: '⚽', text: 'الأسطورة tv', url: 'https://t.me/techtouch7/2367?single' },
            { icon: '🏀', text: 'ياسين tv', url: 'https://t.me/techtouch7/136' },
            { icon: '🏈', text: 'تـ BlackUltra', url: 'https://t.me/techtouch7/2719' },
            { icon: '🎾', text: 'تـ ZAIN LIVE', url: 'https://t.me/techtouch7/1992' }
        ],
        'video-dropdown': [
            { icon: '✂️', text: 'تـ Viva cut بديل كاب كات', url: 'https://t.me/techtouch7/2975?single' },
            { icon: '🎨', text: 'CapCut اصدار 2', url: 'https://t.me/techtouch7/3250' },
            { icon: '🎬', text: 'CapCut اصدار 1', url: 'https://t.me/techtouch7/3287' }
        ],
        'misc-dropdown': [
            { icon: '📱', text: 'تـ MYTV الأندرويد', url: 'https://t.me/techtouch7/204' },
            { icon: '📲', text: 'تـ MYTV الآيفـــون', url: 'https://t.me/techtouch7/1041' },
            { icon: '📺', text: 'شبكتي tv للشاشات', url: 'https://t.me/techtouch7/1556' },
            { icon: '📱', text: 'شبكتي tv للهاتف', url: 'https://t.me/techtouch7/1818' },
            { icon: '🖥️', text: 'المنصة X للشاشات', url: 'https://t.me/techtouch7/1639' },
            { icon: '📲', text: 'المنصة X للهاتف', url: 'https://t.me/techtouch7/1533' }
        ]
    };

    // Function to open dropdown modal - إصلاح المشكلة هنا
    window.openDropdownModal = function(dropdownId, title) {
        console.log('Opening modal for:', dropdownId, title);
        
        if (!modal || !modalTitle || !modalContent) {
            console.error('Modal elements not found');
            return;
        }
        
        modalTitle.textContent = title;
        modalContent.innerHTML = ''; // Clear previous content

        const items = dropdownData[dropdownId];
        if (items) {
            console.log('Creating modal items:', items.length);
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'modal-item';
                
                // إصلاح المشكلة: استخدام addEventListener بدلاً من onclick
                itemDiv.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Opening URL:', item.url);
                    window.open(item.url, '_blank');
                    modal.style.display = 'none';
                });
                
                itemDiv.innerHTML = `
                    <span class='modal-item-icon'>${item.icon}</span>
                    <span class='modal-item-text'>${item.text}</span>
                `;
                modalContent.appendChild(itemDiv);
            });
        } else {
            console.error('No items found for dropdown:', dropdownId);
        }
        modal.style.display = 'block';
        console.log('Modal displayed');
    };

    // Handle dropdown card clicks properly - إصلاح المشكلة الرئيسية هنا
    const dropdownCards = document.querySelectorAll('.dropdown-card');
    console.log('Found dropdown cards:', dropdownCards.length);
    
    dropdownCards.forEach((card, index) => {
        console.log('Setting up card', index, card);
        
        // إزالة onclick attribute إذا كان موجوداً لتجنب التداخل
        card.removeAttribute('onclick');
        
        card.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Dropdown card clicked:', index);
            
            // Add click effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // تحديد نوع القائمة المنسدلة بناءً على محتوى البطاقة
            const headerElement = this.querySelector('.dropdown-header');
            if (!headerElement) {
                console.error('Header element not found');
                return;
            }
            
            const headerText = headerElement.textContent.trim();
            console.log('Header text:', headerText);
            
            let dropdownId = '';
            let title = '';
            
            if (headerText.includes('تطبيقات افـلام')) {
                dropdownId = 'movies-dropdown';
                title = 'تطبيقات افـلام';
            } else if (headerText.includes('تطبيقات رياضيه')) {
                dropdownId = 'sports-dropdown';
                title = 'تطبيقات رياضيه';
            } else if (headerText.includes('تصميم الفيديو')) {
                dropdownId = 'video-dropdown';
                title = 'تصميم الفيديو';
            } else if (headerText.includes('قسم المتفرقـات')) {
                dropdownId = 'misc-dropdown';
                title = 'قسم المتفرقـات';
            }
            
            console.log('Determined dropdown:', dropdownId, title);
            
            if (dropdownId && title) {
                openDropdownModal(dropdownId, title);
            } else {
                console.error('Could not determine dropdown type for:', headerText);
            }
        });
    });
    
    console.log('Initialization complete');
});

// دالة إنشاء الجسيمات
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles-container';
    particlesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        overflow: hidden;
    `;
    
    document.body.appendChild(particlesContainer);
    
    // إنشاء الجسيمات
    for (let i = 0; i < 50; i++) {
        createParticle(particlesContainer);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 4 + 2;
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const duration = Math.random() * 20 + 10;
    
    particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        left: ${x}px;
        top: ${y}px;
        animation: float ${duration}s infinite linear;
    `;
    
    container.appendChild(particle);
    
    // إزالة الجسيم بعد انتهاء الحركة وإنشاء واحد جديد
    setTimeout(() => {
        particle.remove();
        createParticle(container);
    }, duration * 1000);
}

// إضافة CSS للحركات
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
        }
    }
    
    .card, .sub-card {
        will-change: transform;
    }

    /* Modal Styles */
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
    }

    .modal-content {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        margin: 5% auto;
        padding: 30px;
        border-radius: 20px;
        width: 90%;
        max-width: 800px;
        position: relative;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .close-button {
        color: white;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        position: absolute;
        top: 15px;
        right: 25px;
        transition: color 0.3s ease;
    }

    .close-button:hover {
        color: #ffeb3b;
    }

    .modal h2 {
        color: white;
        text-align: center;
        margin-bottom: 30px;
        font-size: 2rem;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    .modal-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
    }

    .modal-item {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 15px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .modal-item:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        background: rgba(255, 255, 255, 1);
    }

    .modal-item-icon {
        font-size: 2rem;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        color: white;
        flex-shrink: 0;
    }

    .modal-item-text {
        font-size: 1.1rem;
        font-weight: 600;
        color: #2c3e50;
        flex: 1;
    }

    /* Social Icons Styles */
    .social-icons {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin: 20px 0;
    }

    .social-icons a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        font-size: 1.5rem;
        text-decoration: none;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .social-icons a:hover {
        transform: translateY(-5px) scale(1.1);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }

    .social-icons a.facebook:hover {
        background: #1877f2;
    }

    .social-icons a.instagram:hover {
        background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
    }

    .social-icons a.youtube:hover {
        background: #ff0000;
    }

    .social-icons a.tiktok:hover {
        background: #000000;
    }

    @media (max-width: 768px) {
        .modal-content {
            width: 95%;
            margin: 10% auto;
            padding: 20px;
        }

        .modal-grid {
            grid-template-columns: 1fr;
        }

        .social-icons {
            gap: 15px;
        }

        .social-icons a {
            width: 45px;
            height: 45px;
            font-size: 1.3rem;
        }
    }
`;
document.head.appendChild(style);

