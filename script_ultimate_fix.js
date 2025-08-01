// تأثيرات تفاعلية محدثة
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded, initializing...");
    
    // إضافة تأثير النقر للبطاقات
    const cards = document.querySelectorAll(".card, .featured-card");
    
    cards.forEach(card => {
        card.addEventListener("click", function(e) {
            // إضافة تأثير النقر
            this.style.transform = "scale(0.95)";
            setTimeout(() => {
                this.style.transform = "";
            }, 150);
        });
    });
    
    // إضافة تأثير التمرير السلس
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, observerOptions);
    
    // مراقبة العناصر للتأثيرات
    const elementsToObserve = document.querySelectorAll(".card, .featured-card, .dropdown-card");
    elementsToObserve.forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.observe(el);
    });
    
    // إضافة تأثير الجسيمات في الخلفية
    createParticles();

    // Pop-up Modal functionality
    const modal = document.getElementById("popupModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalContent = document.getElementById("modalContent");
    const closeButton = document.querySelector("#popupModal .close-button");

    console.log("Modal elements:", { modal, modalTitle, modalContent, closeButton });

    // Ensure modal functionality is properly initialized
    if (closeButton) {
        closeButton.addEventListener("click", function() {
            modal.style.display = "none";
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener("click", function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Data for dropdowns to be used in modal
    const dropdownData = {
        "movies-dropdown": [
            { icon: "🎬", text: "تـ Cinemana X ايرثلنك", url: "https://t.me/techtouch7/173" },
            { icon: "🎭", text: "تـ CEE أفلام", url: "https://t.me/techtouch7/174" },
            { icon: "📽️", text: "تـ Monveibox أفلام", url: "https://t.me/techtouch7/2070" },
            { icon: "🎪", text: "سينمانا", url: "https://t.me/techtouch7/1668" },
            { icon: "🍿", text: "نتفلكس محاني", url: "https://t.me/techtouch7/2676" },
            { icon: "📺", text: "سيمو دراما", url: "https://t.me/techtouch7/211?single" }
        ],
        "sports-dropdown": [
            { icon: "📺", text: "MixFlix tv", url: "https://t.me/techtouch7/1450" },
            { icon: "📺", text: "دراما لايف tv", url: "https://t.me/techtouch7/1686" },
            { icon: "⚽", text: "الأسطورة tv", url: "https://t.me/techtouch7/2367?single" },
            { icon: "🏀", text: "ياسين tv", url: "https://t.me/techtouch7/136" },
            { icon: "🏈", text: "تـ BlackUltra", url: "https://t.me/techtouch7/2719" },
            { icon: "🎾", text: "تـ ZAIN LIVE", url: "https://t.me/techtouch7/1992" }
        ],
        "video-dropdown": [
            { icon: "✂️", text: "تـ Viva cut بديل كاب كات", url: "https://t.me/techtouch7/2975?single" },
            { icon: "🎨", text: "CapCut اصدار 2", url: "https://t.me/techtouch7/3250" },
            { icon: "🎬", text: "CapCut اصدار 1", url: "https://t.me/techtouch7/3287" }
        ],
        "misc-dropdown": [
            { icon: "📱", text: "تـ MYTV الأندرويد", url: "https://t.me/techtouch7/204" },
            { icon: "📲", text: "تـ MYTV الآيفـــون", url: "https://t.me/techtouch7/1041" },
            { icon: "📺", text: "شبكتي tv للشاشات", url: "https://t.me/techtouch7/1556" },
            { icon: "📱", text: "شبكتي tv للهاتف", url: "https://t.me/techtouch7/1818" },
            { icon: "🖥️", text: "المنصة X للشاشات", url: "https://t.me/techtouch7/1639" },
            { icon: "📲", text: "المنصة X للهاتف", url: "https://t.me/techtouch7/1533" }
        ]
    };

    // Function to open dropdown modal
    function openDropdownModal(dropdownId, title) {
        console.log("Opening modal for:", dropdownId, title);
        
        if (!modal || !modalTitle || !modalContent) {
            console.error("Modal elements not found");
            return;
        }
        
        modalTitle.textContent = title;
        modalContent.innerHTML = ""; // Clear previous content

        const items = dropdownData[dropdownId];
        if (items && items.length > 0) {
            console.log("Creating modal items:", items.length);
            items.forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.className = "modal-item";
                
                itemDiv.addEventListener("click", function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Opening URL:", item.url);
                    window.open(item.url, "_blank");
                    modal.style.display = "none";
                });
                
                itemDiv.innerHTML = `
                    <span class="modal-item-icon">${item.icon}</span>
                    <span class="modal-item-text">${item.text}</span>
                `;
                modalContent.appendChild(itemDiv);
            });
        } else {
            console.error("No items found for dropdown:", dropdownId);
            modalContent.innerHTML = "<p>لا توجد عناصر متاحة حالياً</p>";
        }
        modal.style.display = "block";
        console.log("Modal displayed");
    }

    // Make function globally available
    window.openDropdownModal = openDropdownModal;

    // Handle dropdown card clicks with both event listeners and onclick attributes
    const dropdownCards = document.querySelectorAll(".dropdown-card");
    console.log("Found dropdown cards:", dropdownCards.length);
    
    dropdownCards.forEach((card, index) => {
        console.log("Setting up card", index, card);
        
        // Add event listener for backup
        card.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Dropdown card clicked via event listener:", index);
            
            // Add click effect
            this.style.transform = "scale(0.95)";
            setTimeout(() => {
                this.style.transform = "";
            }, 150);
            
            // تحديد نوع القائمة المنسدلة بناءً على محتوى البطاقة
            const headerElement = this.querySelector(".dropdown-header");
            if (!headerElement) {
                console.error("Header element not found");
                return;
            }
            
            const headerText = headerElement.textContent.trim();
            console.log("Header text:", headerText);
            
            let dropdownId = "";
            let title = "";
            
            // Use exact matching and includes for more robust matching
            if (headerText === "تطبيقات افلام" || headerText.includes("افلام")) {
                dropdownId = "movies-dropdown";
                title = "تطبيقات افلام";
            } else if (headerText === "تطبيقات رياضيه" || headerText.includes("رياضيه")) {
                dropdownId = "sports-dropdown";
                title = "تطبيقات رياضيه";
            } else if (headerText === "تصميم الفيديو" || headerText.includes("الفيديو")) {
                dropdownId = "video-dropdown";
                title = "تصميم الفيديو";
            } else if (headerText === "قسم المتفرقات" || headerText.includes("المتفرقات") || headerText.includes("المتفرقـات")) {
                dropdownId = "misc-dropdown";
                title = "قسم المتفرقات";
            }
            
            console.log("Determined dropdown:", dropdownId, title);
            
            if (dropdownId && title) {
                openDropdownModal(dropdownId, title);
            } else {
                console.error("Could not determine dropdown type for:", headerText);
                // Fallback: try to open misc dropdown if it's the last card
                if (index === 3) {
                    console.log("Fallback: Opening misc dropdown for last card");
                    openDropdownModal("misc-dropdown", "قسم المتفرقات");
                }
            }
        });
    });
    
    console.log("Initialization complete");
});

// دالة إنشاء الجسيمات
function createParticles() {
    const particlesContainer = document.createElement("div");
    particlesContainer.className = "particles-container";
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
    const particle = document.createElement("div");
    particle.className = "particle";
    
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
const style = document.createElement("style");
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
    
    .card, .featured-card, .dropdown-card {
        will-change: transform;
    }
`;
document.head.appendChild(style);

