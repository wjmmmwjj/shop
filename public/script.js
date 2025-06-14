document.addEventListener('DOMContentLoaded', () => {
    const newArrivalsGrid = document.querySelector('.new-arrivals .product-grid');
    const simonPunkGrid = document.querySelector('.simon-punk .product-grid');

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
        alert(`商品 ${productId} 已加入購物車！`);
        // Here you might update a cart icon, show a mini-cart, etc.
    };

    fetchProducts();
}); 