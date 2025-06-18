/* public/checkout.js */

document.addEventListener('DOMContentLoaded', () => {
    const cartItemsBody = document.getElementById('cart-items-body');
    const cartItemCount = document.getElementById('cart-item-count');
    const itemSubtotalSpan = document.getElementById('item-subtotal');
    const orderTotalSpan = document.getElementById('order-total');
    const proceedToCheckoutBtn = document.querySelector('.proceed-to-checkout-btn');

    const conversionRate = 29.7; // Ensure this is consistent with product.js

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
            if (confirm('確定要從購物車中移除此商品嗎？')) {
                removeItem(id);
            }
        }
    });

    // Proceed to Checkout button
    proceedToCheckoutBtn.addEventListener('click', () => {
        alert('即將前往結帳頁面！ (此處將導向填寫資料頁面)');
        // In a real application, you would navigate to the next step of the checkout process
    });

    // Initial render
    renderCartItems();
}); 