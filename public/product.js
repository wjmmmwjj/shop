/* public/product.js */

document.addEventListener('DOMContentLoaded', async () => {
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

    let currentQuantity = 1;
    const conversionRate = 29.7; // Example conversion rate from USDT to NT$
    let currentProduct = null; // To store the fetched product details

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
                // For demonstration, let's hardcode stock or derive from somewhere
                stockLeft.textContent = '5'; // You might fetch this from product.stock in a real app
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
                        const thumbnailImg = document.createElement('img');
                        thumbnailImg.src = url;
                        thumbnailImg.alt = `Thumbnail for ${product.name}`;
                        thumbnailImg.classList.add('thumbnail-item'); // Add a class for styling
                        thumbnailImg.addEventListener('click', () => {
                            mainProductImage.src = url; // Change main image on thumbnail click
                        });
                        thumbnailPreviewsContainer.appendChild(thumbnailImg);
                    });
                } else {
                    // If no specific thumbnails, show a placeholder for each of the 3 initially hardcoded ones.
                    // Or just hide the container if no thumbnails are meant to be displayed.
                    thumbnailPreviewsContainer.innerHTML = ''; // Clear to ensure nothing shows if no urls
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
            alert('商品資訊尚未載入，請稍後再試。');
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
        alert(`已將 ${currentQuantity} 個 ${currentProduct.name} 加入購物車！`);
        
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
            alert('商品資訊尚未載入，請稍後再試。');
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
        alert(`已將 ${currentQuantity} 個 ${currentProduct.name} 加入購物車，並將導向結帳頁面！`);

        // Update cart count display on header
        if (typeof window.updateCartCountDisplay === 'function') {
            window.updateCartCountDisplay();
        }

        // Redirect to checkout page
        window.location.href = 'checkout.html';
    });

    fetchProductDetails();
}); 