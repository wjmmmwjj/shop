/* public/admin.js */

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminPanelContainer = document.getElementById('admin-panel-container');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginMessage = document.getElementById('login-message');
    const logoutBtn = document.getElementById('logout-btn');

    const websiteStatusElement = document.getElementById('website-status');
    const toggleWebsiteStatusBtn = document.getElementById('toggle-website-status');
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productDescriptionInput = document.getElementById('product-description');
    const productPriceInput = document.getElementById('product-price');
    const productImageUrlInput = document.getElementById('product-image-url');
    const specificationsContainer = document.getElementById('specifications-container');
    const addSpecificationFieldBtn = document.getElementById('add-specification-field');
    const thumbnailUrlsContainer = document.getElementById('thumbnail-urls-container');
    const addThumbnailUrlFieldBtn = document.getElementById('add-thumbnail-url-field');
    const submitProductBtn = document.getElementById('submit-product-btn');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const productListTableBody = document.querySelector('#product-list-table tbody');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const checkAuthAndRender = () => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            // Optionally, verify token on client side (decode, check expiry)
            // For simplicity, we just check its presence here.
            loginContainer.style.display = 'none';
            adminPanelContainer.style.display = 'block';
            fetchWebsiteStatus();
            fetchProducts();
        } else {
            loginContainer.style.display = 'block';
            adminPanelContainer.style.display = 'none';
        }
    };

    // Handle login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('adminToken', data.token);
                loginMessage.textContent = '登入成功！'; // 顯式顯示成功訊息
                loginMessage.style.color = 'green'; // 成功訊息顯示為綠色
                setTimeout(() => {
                    loginMessage.textContent = ''; // 一秒後清除訊息
                    loginMessage.style.color = 'red'; // 恢復默認顏色
                    checkAuthAndRender();
                }, 1000); // 延遲 1 秒後切換界面
            } else {
                loginMessage.textContent = data.message || '登入失敗';
                loginMessage.style.color = 'red'; // 失敗訊息顯示為紅色
            }
        } catch (error) {
            console.error('Login error:', error);
            loginMessage.textContent = '連線錯誤，請稍後再試。';
            loginMessage.style.color = 'red';
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        checkAuthAndRender();
        alert('已登出。');
    });

    // Function to fetch and display website status
    const fetchWebsiteStatus = async () => {
        try {
            const response = await fetch('/api/settings/websiteStatus', {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (response.ok) {
                websiteStatusElement.textContent = data.websiteStatus === 'active' ? '啟用中' : '已暫停';
                toggleWebsiteStatusBtn.textContent = data.websiteStatus === 'active' ? '暫停網站' : '啟用網站';
                if (data.websiteStatus === 'paused') {
                    toggleWebsiteStatusBtn.classList.add('paused');
                } else {
                    toggleWebsiteStatusBtn.classList.remove('paused');
                }
            } else if (response.status === 401 || response.status === 403) {
                alert('權限不足或登入已過期，請重新登入。');
                localStorage.removeItem('adminToken');
                checkAuthAndRender();
            } else {
                websiteStatusElement.textContent = '錯誤: ' + data.message;
            }
        } catch (error) {
            console.error('Error fetching website status:', error);
            websiteStatusElement.textContent = '無法載入狀態';
        }
    };

    // Function to toggle website status
    toggleWebsiteStatusBtn.addEventListener('click', async () => {
        const currentStatus = websiteStatusElement.textContent === '啟用中' ? 'active' : 'paused';
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const response = await fetch('/api/settings/websiteStatus', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                fetchWebsiteStatus(); // Refresh status
            } else if (response.status === 401 || response.status === 403) {
                alert('權限不足或登入已過期，請重新登入。');
                localStorage.removeItem('adminToken');
                checkAuthAndRender();
            } else {
                alert('錯誤: ' + data.message);
            }
        } catch (error) {
            console.error('Error toggling website status:', error);
            alert('無法切換網站狀態。');
        }
    });

    // Function to fetch and display products
    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products', {
                headers: getAuthHeaders()
            });
            const products = await response.json();
            if (response.ok) {
                productListTableBody.innerHTML = ''; // Clear existing rows
                products.forEach(product => {
                    const row = productListTableBody.insertRow();
                    row.innerHTML = `
                        <td>${product.id}</td>
                        <td>${product.name}</td>
                        <td>${product.description || '-'}</td>
                        <td>$${product.price.toFixed(2)}</td>
                        <td>${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : '-'}</td>
                        <td>
                            <button class="edit-btn" data-id="${product.id}">編輯</button>
                            <button class="delete-btn" data-id="${product.id}">刪除</button>
                        </td>
                    `;
                });
            } else if (response.status === 401 || response.status === 403) {
                alert('權限不足或登入已過期，請重新登入。');
                localStorage.removeItem('adminToken');
                checkAuthAndRender();
            } else {
                productListTableBody.innerHTML = `<tr><td colspan="6">錯誤: ${data.message || '無法載入商品。'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            productListTableBody.innerHTML = '<tr><td colspan="6">無法載入商品。</td></tr>';
        }
    };

    // Helper function to add a specification input field
    const addSpecificationField = (key = '', value = '') => {
        const specDiv = document.createElement('div');
        specDiv.classList.add('specification-item');
        specDiv.innerHTML = `
            <input type="text" class="specification-key" placeholder="規格名稱" value="${key}">
            <input type="text" class="specification-value" placeholder="規格值" value="${value}">
            <button type="button" class="remove-field-btn">X</button>
        `;
        specificationsContainer.appendChild(specDiv);

        specDiv.querySelector('.remove-field-btn').addEventListener('click', () => {
            specificationsContainer.removeChild(specDiv);
        });
    };

    // Add initial specification field
    addSpecificationField();

    // Event listener for adding new specification fields
    addSpecificationFieldBtn.addEventListener('click', () => {
        addSpecificationField();
    });

    // Helper function to add a thumbnail URL input field
    const addThumbnailUrlField = (url = '') => {
        const urlDiv = document.createElement('div');
        urlDiv.classList.add('thumbnail-url-item');
        urlDiv.innerHTML = `
            <input type="url" class="thumbnail-url" placeholder="預覽圖 URL" value="${url}">
            <button type="button" class="remove-field-btn">X</button>
        `;
        thumbnailUrlsContainer.appendChild(urlDiv);

        urlDiv.querySelector('.remove-field-btn').addEventListener('click', () => {
            thumbnailUrlsContainer.removeChild(urlDiv);
        });
    };

    // Add initial thumbnail URL field
    addThumbnailUrlField();

    // Event listener for adding new thumbnail URL fields
    addThumbnailUrlFieldBtn.addEventListener('click', () => {
        addThumbnailUrlField();
    });

    // Handle product form submission (Add/Update)
    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = productIdInput.value;
        const name = productNameInput.value;
        const description = productDescriptionInput.value;
        const price = parseFloat(productPriceInput.value);
        const imageUrl = productImageUrlInput.value;

        if (!name || isNaN(price)) {
            alert('商品名稱和價格為必填項。');
            return;
        }

        const specifications = {};
        document.querySelectorAll('.specification-item').forEach(item => {
            const keyInput = item.querySelector('.specification-key');
            const valueInput = item.querySelector('.specification-value');
            if (keyInput.value.trim() !== '') {
                specifications[keyInput.value.trim()] = valueInput.value.trim();
            }
        });

        const thumbnailUrls = [];
        document.querySelectorAll('.thumbnail-url-item .thumbnail-url').forEach(input => {
            if (input.value.trim() !== '') {
                thumbnailUrls.push(input.value.trim());
            }
        });

        const productData = { name, description, price, imageUrl, specifications, thumbnailUrls };

        try {
            let response;
            if (id) {
                // Update existing product
                response = await fetch(`/api/products/${id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(productData)
                });
            } else {
                // Add new product
                response = await fetch('/api/products', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(productData)
                });
            }
            
            const data = await response.json();
            if (response.ok) {
                alert(data.message || (id ? '商品更新成功！' : '商品新增成功！'));
                productForm.reset();
                productIdInput.value = ''; // Clear hidden ID
                specificationsContainer.innerHTML = ''; // Clear dynamic specifications
                addSpecificationField(); // Add back one empty field
                thumbnailUrlsContainer.innerHTML = ''; // Clear dynamic thumbnail URLs
                addThumbnailUrlField(); // Add back one empty field
                submitProductBtn.textContent = '新增商品';
                fetchProducts(); // Refresh product list
            } else if (response.status === 401 || response.status === 403) {
                alert('權限不足或登入已過期，請重新登入。');
                localStorage.removeItem('adminToken');
                checkAuthAndRender();
            } else {
                alert('錯誤: ' + data.message);
            }
        } catch (error) {
            console.error('Error submitting product:', error);
            alert('提交商品時發生錯誤。');
        }
    });

    // Clear form button
    clearFormBtn.addEventListener('click', () => {
        productForm.reset();
        productIdInput.value = '';
        specificationsContainer.innerHTML = ''; // Clear dynamic specifications
        addSpecificationField(); // Add back one empty field
        thumbnailUrlsContainer.innerHTML = ''; // Clear dynamic thumbnail URLs
        addThumbnailUrlField(); // Add back one empty field
        submitProductBtn.textContent = '新增商品';
    });

    // Handle Edit/Delete buttons on product list
    productListTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-btn')) {
            const id = event.target.dataset.id;
            // Fetch product details and populate form for editing
            try {
                const response = await fetch(`/api/products/${id}`, {
                    headers: getAuthHeaders()
                }); // Fetch all products to find the one
                const productToEdit = await response.json();

                if (response.ok && productToEdit) {
                    productIdInput.value = productToEdit.id;
                    productNameInput.value = productToEdit.name;
                    productDescriptionInput.value = productToEdit.description;
                    productPriceInput.value = productToEdit.price;
                    productImageUrlInput.value = productToEdit.imageUrl;
                    
                    // Clear existing specifications and populate with fetched data
                    specificationsContainer.innerHTML = '';
                    if (productToEdit.specifications) {
                        for (const key in productToEdit.specifications) {
                            addSpecificationField(key, productToEdit.specifications[key]);
                        }
                    } else {
                        addSpecificationField(); // Add an empty field if no specs
                    }

                    // Clear existing thumbnail URLs and populate with fetched data
                    thumbnailUrlsContainer.innerHTML = '';
                    if (productToEdit.thumbnailUrls && productToEdit.thumbnailUrls.length > 0) {
                        productToEdit.thumbnailUrls.forEach(url => {
                            addThumbnailUrlField(url);
                        });
                    } else {
                        addThumbnailUrlField(); // Add an empty field if no thumbnail URLs
                    }

                    submitProductBtn.textContent = '更新商品';
                    window.scrollTo(0, 0); // Scroll to top to show the form
                } else if (response.status === 401 || response.status === 403) {
                    alert('權限不足或登入已過期，請重新登入。');
                    localStorage.removeItem('adminToken');
                    checkAuthAndRender();
                } else {
                    alert('找不到要編輯的商品。');
                }
            } catch (error) {
                console.error('Error fetching product for edit:', error);
                alert('載入商品資訊時發生錯誤。');
            }
        } else if (event.target.classList.contains('delete-btn')) {
            const id = event.target.dataset.id;
            if (confirm('確定要刪除這個商品嗎？')) {
                try {
                    const response = await fetch(`/api/products/${id}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        fetchProducts(); // Refresh product list
                    } else if (response.status === 401 || response.status === 403) {
                        alert('權限不足或登入已過期，請重新登入。');
                        localStorage.removeItem('adminToken');
                        checkAuthAndRender();
                    } else {
                        alert('錯誤: ' + data.message);
                    }
                } catch (error) {
                    console.error('Error deleting product:', error);
                    alert('刪除商品時發生錯誤。');
                }
            }
        }
    });

    // Initial check on page load
    checkAuthAndRender();
}); 