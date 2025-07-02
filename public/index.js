/* public/index.js */

// Global function to update cart count display
window.updateCartCountDisplay = () => {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        // Show the cart count only if there are items, otherwise hide it
        cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none'; 
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const productListDiv = document.getElementById('product-list');
    const maintenanceMessageDiv = document.getElementById('maintenance-message');
    const mainHeader = document.querySelector('.main-header');
    const footerElement = document.querySelector('footer');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    // Function to show/hide content based on website status
    const updateWebsiteDisplay = (isPaused) => {
        if (isPaused) {
            mainHeader.style.display = 'none';
            productListDiv.style.display = 'none'; // Ensure product list is hidden
            footerElement.style.display = 'none';
            if (maintenanceMessageDiv) {
                maintenanceMessageDiv.style.display = 'flex'; // Show maintenance message
            }
        } else {
            mainHeader.style.display = 'block'; // Or 'flex' or default display for header
            productListDiv.style.display = 'grid'; // Assuming product-grid uses grid display
            footerElement.style.display = 'block'; // Or default display for footer
            if (maintenanceMessageDiv) {
                maintenanceMessageDiv.style.display = 'none'; // Hide maintenance message
            }
        }
    };

    // 搜尋功能
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchQuery = searchInput.value.trim();
        
        if (!searchQuery) {
            // 如果搜尋欄位為空，顯示所有產品
            await loadProducts();
            return;
        }
        
        try {
            // 顯示搜尋中狀態
            productListDiv.innerHTML = '<div style="text-align:center; padding:20px;">搜尋中，請稍候...</div>';
            
            // 依名稱或標籤搜尋產品（只要符合其中一個條件即可）
            console.log(`開始搜尋: ${searchQuery}`);
            
            // 分別搜尋名稱和標籤，提高搜尋命中率
            const response = await fetch(`/api/products/search?name=${encodeURIComponent(searchQuery)}&tag=${encodeURIComponent(searchQuery)}`);
            
            // 檢查回應狀態
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `伺服器返回錯誤: ${response.status}`);
            }
            
            let products = await response.json();
            console.log(`搜尋結果: 找到 ${products.length} 個產品`);
            
            // 過濾只顯示上架商品
            products = products.filter(product => product.isActive === 1 || product.isActive === undefined);
            
            displayProducts(products, `搜尋「${searchQuery}」的結果 (名稱或標籤)`);
            
            // 滾動到產品顯示區
            productListDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('搜尋產品時發生錯誤:', error);
            productListDiv.innerHTML = `
                <div class="info-message" style="text-align: center; padding: 50px; font-size: 1.2em;">
                    搜尋時發生錯誤: ${error.message || '未知錯誤'}
                    <br><br>
                    <button id="retry-search" style="padding:8px 15px; background:#4285F4; color:white; border:none; border-radius:4px; cursor:pointer;">
                        重試
                    </button>
                    <button id="show-all" style="padding:8px 15px; margin-left:10px; background:#f1f1f1; border:1px solid #ddd; border-radius:4px; cursor:pointer;">
                        顯示所有產品
                    </button>
                </div>`;
            
            // 添加重試按鈕事件處理
            document.getElementById('retry-search')?.addEventListener('click', () => {
                searchForm.dispatchEvent(new Event('submit'));
            });
            
            // 添加顯示所有產品按鈕事件處理
            document.getElementById('show-all')?.addEventListener('click', () => {
                loadProducts();
            });
        }
    });

    // 加載並顯示所有產品
    async function loadProducts() {
        try {
            console.log('開始載入產品...');
            const response = await fetch('/api/products');
            
            if (!response.ok) {
                throw new Error(`API 返回錯誤狀態碼: ${response.status}`);
            }
            
            let products = await response.json();
            console.log(`載入了 ${products.length} 個產品`);
            
            // 確保處理 JSON 解析的標籤
            products.forEach(p => {
                if (p.tags && typeof p.tags === 'string') {
                    try {
                        p.tags = JSON.parse(p.tags);
                    } catch (e) {
                        p.tags = [];
                    }
                }
            });
            
            // 過濾只顯示上架商品
            products = products.filter(product => product.isActive === 1 || product.isActive === undefined);
            
            displayProducts(products);
        } catch (error) {
            console.error('載入產品時發生錯誤:', error);
            productListDiv.innerHTML = `<div class="info-message" style="text-align: center; padding: 50px; font-size: 1.2em;">
                無法載入商品，請稍後再試。<br>
                <small>錯誤詳情: ${error.message}</small>
            </div>`;
        }
    }

    // 顯示產品列表
    function displayProducts(products, headerText = null) {
        console.log(`顯示 ${products.length} 個產品`);
        
        if (products.length === 0) {
            productListDiv.innerHTML = '<div class="info-message" style="text-align: center; padding: 50px; font-size: 1.2em;">沒有符合的商品。</div>';
            return;
        }

        productListDiv.innerHTML = ''; // 清除現有內容
        
        // 如果有標題文字，先顯示
        if (headerText) {
            const header = document.createElement('div');
            header.className = 'search-results-header';
            header.style.width = '100%';
            header.style.marginBottom = '20px';
            header.style.fontSize = '1.2em';
            header.style.fontWeight = 'bold';
            header.textContent = `${headerText} (${products.length}筆結果)`;
            productListDiv.appendChild(header);
        }

        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.classList.add('product-item');

            // Simulate sold out for demonstration (you can remove this in a real scenario)
            const isSoldOut = product.name.toLowerCase().includes('sold out'); // Example condition

            productItem.innerHTML = `
                <a href="product.html?id=${product.id}" class="product-link">
                    ${isSoldOut ? '<div class="sold-out-overlay">SOLD OUT</div>' : ''}
                    <img src="${product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p>USDT ${product.price.toFixed(2)} / NT$${(product.price * 29.7).toFixed(2)}</p>
                    ${product.tags && product.tags.length > 0 ? 
                        `<div class="product-tags" style="font-size:0.8em; color:#666;">標籤: ${product.tags.join(', ')}</div>` 
                        : ''}
                </a>
            `;
            
            productListDiv.appendChild(productItem);
        });
    }

    // Check website status first
    try {
        const statusResponse = await fetch('/api/settings/websiteStatus');
        const statusData = await statusResponse.json();

        if (statusResponse.ok && statusData.websiteStatus === 'paused') {
            updateWebsiteDisplay(true);
            return; // Stop further execution if paused
        } else {
            updateWebsiteDisplay(false);
        }
    } catch (error) {
        console.error('Error fetching website status:', error);
        // 如果無法獲取網站狀態，顯示錯誤訊息
        if (maintenanceMessageDiv) {
            maintenanceMessageDiv.style.display = 'flex';
            maintenanceMessageDiv.textContent = '無法載入網站狀態，請稍後再試。';
            mainHeader.style.display = 'none';
            productListDiv.style.display = 'none';
            footerElement.style.display = 'none';
        }
        return;
    }

    // 如果網站狀態正常，載入所有產品
    await loadProducts();

    // Initial update of cart count when the page loads
    updateCartCountDisplay();

    // Handle footer visibility on scroll
    const handleScroll = () => {
        // Check if user has scrolled near the bottom of the page
        const scrollY = window.scrollY || window.pageYOffset; // Current scroll position
        const viewportHeight = window.innerHeight; // Height of the visible window
        const documentHeight = document.documentElement.scrollHeight; // Total height of the document

        // Define a threshold (e.g., 200px from bottom)
        const scrollThreshold = 200;

        if (scrollY + viewportHeight >= documentHeight - scrollThreshold) {
            // User is near the bottom, show footer
            footerElement.classList.add('show-footer');
        } else {
            // User is not near the bottom, hide footer (optional, based on desired behavior)
            // If you want it to stay visible once shown, remove this else block.
            footerElement.classList.remove('show-footer');
        }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);

    // Also call handleScroll once on load to check initial position (e.g., if page is short)
    handleScroll();

    // 動態載入 footer 設定
    async function loadFooter() {
        try {
            const res = await fetch('/api/settings/footer');
            const data = await res.json();
            if (res.ok) {
                renderFooter(data);
            } else {
                renderFooter();
                console.error('footer API error:', data.message);
            }
        } catch (e) {
            renderFooter();
            console.error('footer API exception:', e);
        }
    }
    function renderFooter(data = {
        contact: 'EMAIL: txt\n桃園店:雙子大樓',
        legal: 'txt',
        business: 'txt',
        company: 'txt'
    }) {
        const footerDiv = document.getElementById('footer-dynamic');
        footerDiv.innerHTML = `
            <div class="footer-links">
                <div class="footer-column">
                    <h3>CONTACT US</h3>
                    <div>${(data.contact || '').replace(/\n/g, '<br>')}</div>
                </div>
                <div class="footer-column">
                    <h3>法律聲明</h3>
                    <div>${(data.legal || '').replace(/\n/g, '<br>')}</div>
                </div>
                <div class="footer-column">
                    <h3>商家資訊</h3>
                    <div>${(data.business || '').replace(/\n/g, '<br>')}</div>
                </div>
                <div class="footer-column">
                    <h3>公司資訊</h3>
                    <div>${(data.company || '').replace(/\n/g, '<br>')}</div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>Powered by SHOPLINE</p>
                <div class="social-links"></div>
            </div>
        `;
    }
    loadFooter();

    // 每10秒自動檢查網站狀態
    setInterval(async () => {
        try {
            const res = await fetch('/api/settings/websiteStatus');
            const data = await res.json();
            if (res.ok && data.websiteStatus === 'paused') {
                document.body.innerHTML = '<div style="text-align:center;padding:80px;font-size:2em;">網站維護中，請稍後再訪。</div>';
            }
        } catch (e) {}
    }, 10000);

    // 頁面載入時立即檢查網站狀態
    (async () => {
        try {
            const res = await fetch('/api/settings/websiteStatus');
            const data = await res.json();
            if (res.ok && data.websiteStatus === 'paused') {
                document.body.innerHTML = '<div style="text-align:center;padding:80px;font-size:2em;">網站維護中，請稍後再訪。</div>';
            }
        } catch (e) {}
    })();
}); 