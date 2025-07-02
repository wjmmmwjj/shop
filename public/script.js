document.addEventListener('DOMContentLoaded', () => {
    const newArrivalsGrid = document.querySelector('.new-arrivals .product-grid');
    const simonPunkGrid = document.querySelector('.simon-punk .product-grid');
    const notificationOverlay = document.getElementById('notification-overlay');
    const customNotification = document.getElementById('custom-notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');
    const notificationConfirm = document.getElementById('notification-confirm');

    // 顯示通知的函數
    const showNotification = (message, callback = null) => {
        notificationMessage.textContent = message;
        notificationOverlay.style.display = 'block';
        customNotification.style.display = 'block';

        const closeNotification = () => {
            notificationOverlay.style.display = 'none';
            customNotification.style.display = 'none';
            if (callback) callback();
        };

        notificationClose.onclick = closeNotification;
        notificationConfirm.onclick = closeNotification;
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch('products.json');
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const renderProducts = (products) => {
        // Clear existing placeholder content
        newArrivalsGrid.innerHTML = '';
        simonPunkGrid.innerHTML = '';

        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.classList.add('product-item');
            productItem.dataset.id = product.id; // Store product ID for easy access

            productItem.innerHTML = `
                ${product.category === 'new-arrival' ? '<div class="new-arrival-badge">新品上市</div>' : ''}
                <div class="heart-icon">&#x2764;</div>
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>NT$${product.price}</p>
                <button class="add-to-cart" data-product-id="${product.id}">加入購物車</button>
            `;

            if (product.category === 'new-arrival') {
                newArrivalsGrid.appendChild(productItem);
            } else if (product.category === 'simon-punk') {
                simonPunkGrid.appendChild(productItem);
            }
        });

        attachAddToCartListeners();
    };

    const attachAddToCartListeners = () => {
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = event.target.dataset.productId;
                addToCart(productId);
            });
        });
    };

    const addToCart = (productId) => {
        // In a real application, you would add the product to a shopping cart state
        // and potentially send it to a backend API.
        console.log(`Product ${productId} added to cart!`);
        showNotification(`商品 ${productId} 已加入購物車！`);
        // Here you might update a cart icon, show a mini-cart, etc.
    };

    fetchProducts();

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
}); 