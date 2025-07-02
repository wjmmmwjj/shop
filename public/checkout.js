/* public/checkout.js */

document.addEventListener('DOMContentLoaded', () => {
    const cartItemsBody = document.getElementById('cart-items-body');
    const cartItemCount = document.getElementById('cart-item-count');
    const itemSubtotalSpan = document.getElementById('item-subtotal');
    const orderTotalSpan = document.getElementById('order-total');
    const proceedToCheckoutBtn = document.querySelector('.proceed-to-checkout-btn');

    // 通知元件相關元素
    const notificationOverlay = document.getElementById('notification-overlay');
    const customNotification = document.getElementById('custom-notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');
    const notificationConfirm = document.getElementById('notification-confirm');

    const conversionRate = 29.7; // Ensure this is consistent with product.js

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

    // Function to get cart items from localStorage
    const getCartItems = () => {
        return JSON.parse(localStorage.getItem('cartItems') || '[]');
    };

    // Function to save cart items to localStorage
    const saveCartItems = (cart) => {
        localStorage.setItem('cartItems', JSON.stringify(cart));
        // Also update the global cart count display if the function exists
        if (typeof window.updateCartCountDisplay === 'function') {
            window.updateCartCountDisplay();
        }
    };

    const renderCartItems = () => {
        let cart = getCartItems(); // Get current cart items
        cartItemsBody.innerHTML = ''; // Clear existing items
        let currentSubtotal = 0;

        if (cart.length === 0) {
            cartItemsBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 50px;">您的購物車是空的。</td></tr>';
            cartItemCount.textContent = '0';
            itemSubtotalSpan.textContent = 'NT$0';
            orderTotalSpan.textContent = 'NT$0';
            proceedToCheckoutBtn.disabled = true; // Disable checkout if cart is empty
            return;
        }

        proceedToCheckoutBtn.disabled = false; // Enable checkout if cart has items

        cart.forEach(item => {
            const row = cartItemsBody.insertRow();
            const subtotal = item.price * item.quantity;
            currentSubtotal += subtotal;

            row.innerHTML = `
                <td class="product-info-cell">
                    <img src="${item.imageUrl || 'https://via.placeholder.com/80'}" alt="${item.name}">
                    <div>
                        <p>${item.name}</p>
                        ${item.description ? `<p>${item.description}</p>` : ''}
                        <!-- Assuming size is not passed from product.js yet -->
                    </div>
                </td>
                <td>${item.promotions ? '適用' : '-'}</td>
                <td>USDT ${item.price.toFixed(2)} / NT$${(item.price * conversionRate).toFixed(2)}</td>
                <td class="quantity-control" data-id="${item.id}">
                    <button class="decrease-qty" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span>${item.quantity}</span>
                    <button class="increase-qty">+</button>
                </td>
                <td>USDT ${(subtotal).toFixed(2)} / NT$${(subtotal * conversionRate).toFixed(2)}</td>
                <td><i class="fas fa-times remove-item" data-id="${item.id}"></i></td>
            `;
        });

        cartItemCount.textContent = cart.length; // Display number of unique items
        itemSubtotalSpan.textContent = `NT$${(currentSubtotal * conversionRate).toLocaleString()}`;
        orderTotalSpan.textContent = `NT$${(currentSubtotal * conversionRate).toLocaleString()}`;
    };

    const updateQuantity = (id, change) => {
        let cart = getCartItems();
        const itemIndex = cart.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            cart[itemIndex].quantity += change;
            if (cart[itemIndex].quantity < 1) {
                cart[itemIndex].quantity = 1; // Prevent quantity from going below 1
            }
            saveCartItems(cart); // Save updated cart
            renderCartItems(); // Re-render to reflect changes
        }
    };

    const removeItem = (id) => {
        let cart = getCartItems();
        cart = cart.filter(item => item.id !== id);
        saveCartItems(cart); // Save updated cart
        renderCartItems(); // Re-render to reflect changes
    };

    // Event listeners for quantity control and remove item
    cartItemsBody.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('decrease-qty')) {
            const id = parseInt(target.closest('.quantity-control').dataset.id);
            updateQuantity(id, -1);
        } else if (target.classList.contains('increase-qty')) {
            const id = parseInt(target.closest('.quantity-control').dataset.id);
            updateQuantity(id, 1);
        } else if (target.classList.contains('remove-item')) {
            const id = parseInt(target.dataset.id);
            showNotification('確定要從購物車中移除此商品嗎？', () => {
                removeItem(id);
            });
        }
    });

    // Proceed to Checkout button
    proceedToCheckoutBtn.addEventListener('click', () => {
        showNotification('即將前往結帳頁面！ (此處將導向填寫資料頁面)');
        // In a real application, you would navigate to the next step of the checkout process
    });

    // Initial render
    renderCartItems();
});

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