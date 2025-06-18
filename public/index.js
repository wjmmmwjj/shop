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
        // If there's an error fetching status, we can't determine, so default to showing maintenance
        // or a generic error, or just show the site and log the error.
        // For now, let's display a message if status cannot be loaded
        if (maintenanceMessageDiv) {
            maintenanceMessageDiv.style.display = 'flex';
            maintenanceMessageDiv.textContent = '無法載入網站狀態，請稍後再試。';
            mainHeader.style.display = 'none';
            productListDiv.style.display = 'none';
            footerElement.style.display = 'none';
        }
        return;
    }

    // If website is active, fetch and display products
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        if (products.length === 0) {
            productListDiv.innerHTML = '<div class="info-message" style="text-align: center; padding: 50px; font-size: 1.2em;">目前沒有可顯示的商品。</div>';
            return;
        }

        productListDiv.innerHTML = ''; // Clear any placeholder content
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
                    <p>USDT ${product.price.toFixed(2)} / NT$${(product.price * 29.7).toFixed(2)}</p> <!-- Example conversion rate -->
                </a>
            `;
            productListDiv.appendChild(productItem);
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        productListDiv.innerHTML = '<div class="info-message" style="text-align: center; padding: 50px; font-size: 1.2em;">無法載入商品，請稍後再試。</div>';
    }

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
}); 