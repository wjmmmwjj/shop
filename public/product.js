/* public/product.js */

document.addEventListener('DOMContentLoaded', async () => {
    // Global function to update cart count display (Copied from index.js)
    const updateCartCountDisplay = () => {
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
            const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            cartCountElement.textContent = totalItems;
            cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none'; 
        }
    };

    const mainProductImage = document.getElementById('main-product-image');
    const productTitle = document.getElementById('product-title');
    const stockLeft = document.getElementById('stock-left');
    const usdtPrice = document.getElementById('usdt-price');
    const ntPrice = document.getElementById('nt-price');
    const productQuantity = document.getElementById('product-quantity');
    const decreaseQuantityBtn = document.getElementById('decrease-quantity');
    const increaseQuantityBtn = document.getElementById('increase-quantity');
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const buyNowBtn = document.querySelector('.buy-now-btn');
    const specificationsList = document.getElementById('specifications-list'); // New element to populate specifications
    const thumbnailPreviewsContainer = document.getElementById('thumbnail-previews'); // New element to populate thumbnails
    
    // 自定義通知元件
    const customNotification = document.getElementById('custom-notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');
    const continueShopping = document.getElementById('continue-shopping');
    const goToCart = document.getElementById('go-to-cart');
    const notificationOverlay = document.getElementById('notification-overlay');

    let currentQuantity = 1;
    const conversionRate = 29.7; // Example conversion rate from USDT to NT$
    let currentProduct = null; // To store the fetched product details
    
    // 顯示自定義通知的函數
    function showNotification(message, isRedirect = false) {
        notificationMessage.textContent = message;
        customNotification.classList.add('show');
        notificationOverlay.classList.add('show');
        
        // 如果是立即購買，自動跳轉
        if (isRedirect) {
            setTimeout(() => {
                window.location.href = 'checkout.html';
            }, 2000);
        }
    }
    
    // 關閉通知的函數
    function closeNotification() {
        customNotification.classList.remove('show');
        notificationOverlay.classList.remove('show');
    }
    
    // 綁定關閉通知按鈕事件
    notificationClose.addEventListener('click', closeNotification);
    notificationOverlay.addEventListener('click', closeNotification);
    continueShopping.addEventListener('click', closeNotification);
    
    // 前往購物車按鈕
    goToCart.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });

    const fetchProductDetails = async () => {
        // Get product ID from URL (e.g., /product?id=1 or /product/1)
        const urlParams = new URLSearchParams(window.location.search);
        const productId = window.location.pathname.split('/').pop(); // For /product/1

        let idToFetch = urlParams.get('id') || productId;

        if (!idToFetch) {
            console.error('Product ID not found in URL.');
            productTitle.textContent = '錯誤：未提供商品ID';
            return;
        }

        try {
            const response = await fetch(`/api/products/${idToFetch}`);
            const product = await response.json();

            if (response.ok) {
                currentProduct = product; // Store product details globally within this scope
                
                // Set main image source, prioritize product.imageUrl, then first thumbnail, then placeholder
                if (product.imageUrl) {
                    mainProductImage.src = product.imageUrl;
                } else if (product.thumbnailUrls && product.thumbnailUrls.length > 0) {
                    mainProductImage.src = product.thumbnailUrls[0];
                } else {
                    mainProductImage.src = 'https://via.placeholder.com/600x400?text=No+Image';
                }
                mainProductImage.alt = product.name;

                productTitle.textContent = product.name;
                
                // 顯示查詢標籤
                const productSearchTagsContainer = document.getElementById('product-search-tags');
                if (productSearchTagsContainer) {
                    productSearchTagsContainer.innerHTML = ''; // 清空現有標籤
                    if (product.searchTags && Array.isArray(product.searchTags) && product.searchTags.length > 0) {
                        product.searchTags.forEach(tag => {
                            const tagSpan = document.createElement('span');
                            tagSpan.classList.add('product-search-tag');
                            tagSpan.textContent = tag;
                            productSearchTagsContainer.appendChild(tagSpan);
                        });
                    }
                }

                // 移除舊的商品標籤顯示邏輯 (因為 HTML 中已移除相關元素)
                const oldTagsDiv = document.getElementById('product-tags');
                if (oldTagsDiv) {
                    oldTagsDiv.remove();
                }

                // 顯示分類標籤
                const productClassificationTagsContainer = document.getElementById('product-classification-tags');
                if (productClassificationTagsContainer) {
                    productClassificationTagsContainer.innerHTML = ''; // 清空現有標籤
                    if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
                        product.tags.forEach(tag => {
                            const tagSpan = document.createElement('span');
                            tagSpan.classList.add('product-classification-tag');
                            tagSpan.textContent = `標籤: ${tag}`;
                            productClassificationTagsContainer.appendChild(tagSpan);
                        });
                    }
                }

                // 顯示正確庫存
                console.log('API 回傳庫存:', product.stock, typeof product.stock);
                if (typeof product.stock === 'number' && !isNaN(product.stock)) {
                    stockLeft.textContent = product.stock;
                } else if (typeof product.stock === 'string' && !isNaN(parseInt(product.stock, 10))) {
                    stockLeft.textContent = parseInt(product.stock, 10);
                } else {
                    stockLeft.textContent = '無庫存資訊';
                }
                usdtPrice.textContent = `USDT ${product.price.toFixed(2)}`;
                ntPrice.textContent = `NT$${(product.price * conversionRate).toFixed(2)}`;

                // Display product specifications
                specificationsList.innerHTML = ''; // Clear existing content
                if (product.specifications && Object.keys(product.specifications).length > 0) {
                    for (const key in product.specifications) {
                        const specItem = document.createElement('div');
                        specItem.classList.add('specification-item');
                        specItem.innerHTML = `
                            <span class="spec-key">${key}:</span>
                            <span class="spec-value">${product.specifications[key]}</span>
                        `;
                        specificationsList.appendChild(specItem);
                    }
                } else {
                    specificationsList.innerHTML = '<p>無其他商品規格。</p>';
                }

                // Display thumbnail images
                thumbnailPreviewsContainer.innerHTML = ''; // Clear existing content
                if (product.thumbnailUrls && product.thumbnailUrls.length > 0) {
                    product.thumbnailUrls.forEach(url => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'thumbnail-wrapper';
                        const thumbnailImg = document.createElement('img');
                        thumbnailImg.src = url;
                        thumbnailImg.alt = `Thumbnail for ${product.name}`;
                        thumbnailImg.classList.add('thumbnail-item');
                        wrapper.appendChild(thumbnailImg);
                        thumbnailPreviewsContainer.appendChild(wrapper);
                    });
                } else {
                    // If no specific thumbnails, show a placeholder for each of the 3 initially hardcoded ones.
                    // Or just hide the container if no thumbnails are meant to be displayed.
                    thumbnailPreviewsContainer.innerHTML = '';
                }

                // 若商品已下架，顯示提示並隱藏購買區塊
                if (product.isActive === 0) {
                    const infoDiv = document.querySelector('.product-info');
                    const notice = document.createElement('div');
                    notice.textContent = '此商品已下架';
                    notice.style.background = '#eee';
                    notice.style.color = '#b00';
                    notice.style.padding = '10px';
                    notice.style.margin = '10px 0';
                    notice.style.borderRadius = '6px';
                    notice.style.fontWeight = 'bold';
                    infoDiv.insertBefore(notice, infoDiv.firstChild.nextSibling);
                    document.querySelector('.quantity-selector').style.display = 'none';
                    document.querySelector('.action-buttons').style.display = 'none';
                }

            } else {
                productTitle.textContent = `錯誤：${product.message || '找不到商品'}`; 
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            productTitle.textContent = '載入商品詳細資訊時發生錯誤。';
        }
    };

    // Quantity selector logic
    decreaseQuantityBtn.addEventListener('click', () => {
        if (currentQuantity > 1) {
            currentQuantity--;
            productQuantity.textContent = currentQuantity;
        }
    });

    increaseQuantityBtn.addEventListener('click', () => {
        currentQuantity++;
        productQuantity.textContent = currentQuantity;
    });

    // Add to cart logic
    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) {
            showNotification('商品資訊尚未載入，請稍後再試。');
            return;
        }

        let cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
        const existingItemIndex = cartItems.findIndex(item => item.id === currentProduct.id);

        if (existingItemIndex > -1) {
            // Update quantity if item already exists
            cartItems[existingItemIndex].quantity += currentQuantity;
        } else {
            // Add new item to cart
            cartItems.push({
                id: currentProduct.id,
                name: currentProduct.name,
                price: currentProduct.price,
                imageUrl: currentProduct.imageUrl,
                quantity: currentQuantity
            });
        }

        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        
        // 使用自定義通知替代 alert
        showNotification(`已將 ${currentQuantity} 個 ${currentProduct.name} 加入購物車！`);
        
        // Update cart count display on header (assuming updateCartCountDisplay is global)
        if (typeof window.updateCartCountDisplay === 'function') {
            window.updateCartCountDisplay();
        } else {
            console.warn('updateCartCountDisplay function not found globally.');
        }
        
        // Reset quantity selector after adding to cart
        currentQuantity = 1;
        productQuantity.textContent = currentQuantity;
    });

    buyNowBtn.addEventListener('click', () => {
        if (!currentProduct) {
            showNotification('商品資訊尚未載入，請稍後再試。');
            return;
        }

        let cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
        const existingItemIndex = cartItems.findIndex(item => item.id === currentProduct.id);

        if (existingItemIndex > -1) {
            // Update quantity if item already exists
            cartItems[existingItemIndex].quantity += currentQuantity;
        } else {
            // Add new item to cart
            cartItems.push({
                id: currentProduct.id,
                name: currentProduct.name,
                price: currentProduct.price,
                imageUrl: currentProduct.imageUrl,
                quantity: currentQuantity
            });
        }

        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        
        // 使用自定義通知替代 alert，並設置自動跳轉
        showNotification(`已將 ${currentQuantity} 個 ${currentProduct.name} 加入購物車，即將導向結帳頁面！`, true);
    });

    // Initial product load
    fetchProductDetails();

    // 初始更新購物車數量顯示
    updateCartCountDisplay();

    // 動態載入分類並渲染於 #category-nav (簡化版，僅顯示)
    async function renderCategoryNav() {
        const res = await fetch('/api/tags');
        const tags = await res.json();
        const nav = document.getElementById('category-nav');
        if (nav) { // 檢查 nav 是否存在
            nav.innerHTML = '';
            tags.forEach(tag => {
                const li = document.createElement('li');
                li.style.display = 'inline-block';
                li.style.marginRight = '12px';
                const a = document.createElement('a');
                a.href = '#'; // 連結保持為 #，因為商品頁面不需要篩選功能
                a.textContent = tag;
                a.className = 'category-link';
                li.appendChild(a);
                nav.appendChild(li);
            });
        }
    }

    // 頁面初始化時載入分類導航
    renderCategoryNav();
});

// === 即時搜尋功能 ===
(function() {
    const input = document.getElementById('instant-search-input');
    const suggestions = document.getElementById('search-suggestions');
    if (!input || !suggestions) return;

    let timer = null;
    input.addEventListener('input', function() {
        clearTimeout(timer);
        const keyword = input.value.trim();
        if (!keyword) {
            suggestions.innerHTML = '';
            suggestions.style.display = 'none';
            return;
        }
        timer = setTimeout(async () => {
            suggestions.innerHTML = '<div style="padding:8px;">搜尋中...</div>';
            suggestions.style.display = 'block';
            try {
                const res = await fetch(`/api/products/search?name=${encodeURIComponent(keyword)}`);
                if (!res.ok) throw new Error('搜尋失敗');
                const products = await res.json();
                if (!products.length) {
                    suggestions.innerHTML = '<div style="padding:8px;">查無商品</div>';
                    return;
                }
                suggestions.innerHTML = products.map(p =>
                    `<div class="suggestion-item" style="padding:8px;cursor:pointer;border-bottom:1px solid #eee;" data-id="${p.id}">
                        <strong>${p.name}</strong><br><span style='font-size:12px;color:#888;'>$${p.price ? p.price.toFixed(2) : ''}</span>
                    </div>`
                ).join('');
                // 點擊建議項目跳轉
                Array.from(suggestions.querySelectorAll('.suggestion-item')).forEach(item => {
                    item.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const id = this.dataset.id;
                        if (id) {
                            window.location.href = `product.html?id=${encodeURIComponent(id)}`;
                        }
                    });
                });
            } catch (e) {
                suggestions.innerHTML = '<div style="padding:8px;color:#d9534f;">搜尋失敗</div>';
            }
        }, 300); // debounce 300ms
    });
    // 點擊外部隱藏建議
    document.addEventListener('click', function(e) {
        if (!suggestions.contains(e.target) && e.target !== input) {
            suggestions.style.display = 'none';
        }
    });
    // 聚焦時顯示建議
    input.addEventListener('focus', function() {
        if (suggestions.innerHTML) suggestions.style.display = 'block';
    });
})();

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