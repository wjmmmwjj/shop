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
    const productTagsContainer = document.getElementById('product-tags-container');
    const addSpecificationFieldBtn = document.getElementById('add-specification-field');
    const addProductTagFieldBtn = document.getElementById('add-product-tag-field');
    const thumbnailUrlsContainer = document.getElementById('thumbnail-urls-container');
    const addThumbnailUrlFieldBtn = document.getElementById('add-thumbnail-url-field');
    const submitProductBtn = document.getElementById('submit-product-btn');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const productListTableBody = document.querySelector('#product-list-table tbody');
    const productStockInput = document.getElementById('product-stock');

    // 通知元件相關元素
    const notificationOverlay = document.getElementById('notification-overlay');
    const customNotification = document.getElementById('custom-notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');
    const notificationConfirm = document.getElementById('notification-confirm');

    // 頁尾設定載入與儲存
    const footerContactInput = document.getElementById('footer-contact');
    const footerLegalInput = document.getElementById('footer-legal');
    const footerBusinessInput = document.getElementById('footer-business');
    const footerCompanyInput = document.getElementById('footer-company');
    const footerSettingsForm = document.getElementById('footer-settings-form');

    // 動態增刪查詢標籤欄位
    const searchTagsContainer = document.getElementById('search-tags-container');
    console.log('searchTagsContainer:', searchTagsContainer);
    const addSearchTagFieldBtn = document.getElementById('add-search-tag-field');
    function addSearchTagField(value = '') {
        const div = document.createElement('div');
        div.className = 'search-tag-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.marginBottom = '6px';
        div.innerHTML = `<input type="text" class="search-tag-input" placeholder="輸入查詢標籤" value="${value}">
            <button type="button" class="remove-field-btn" style="margin-left:6px;">X</button>`;
        div.querySelector('.remove-field-btn').onclick = () => searchTagsContainer.removeChild(div);
        searchTagsContainer.appendChild(div);
    }
    if (addSearchTagFieldBtn) addSearchTagFieldBtn.onclick = () => addSearchTagField();

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
        showNotification('已登出。', () => {
            document.getElementById('admin-panel-container').style.display = 'none';
            document.getElementById('login-container').style.display = 'block';
        });
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
                showNotification('權限不足或登入已過期，請重新登入。', () => {
                    localStorage.removeItem('adminToken');
                    checkAuthAndRender();
                });
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
                showNotification(data.message, null, true);
                fetchWebsiteStatus(); // Refresh status
            } else if (response.status === 401 || response.status === 403) {
                showNotification('權限不足或登入已過期，請重新登入。', () => {
                    localStorage.removeItem('adminToken');
                    checkAuthAndRender();
                }, false);
            } else {
                showNotification('錯誤: ' + data.message, null, false);
            }
        } catch (error) {
            console.error('Error toggling website status:', error);
            showNotification('無法切換網站狀態。', null, false);
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
                    const isActiveNum = Number(product.isActive);
                    const row = productListTableBody.insertRow();
                    row.innerHTML = `
                        <td>${product.id}</td>
                        <td>${product.name}</td>
                        <td>${product.description || '-'}</td>
                        <td>$${product.price.toFixed(2)}</td>
                        <td>${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : '-'}</td>
                        <td>
                            <span class="product-active-status" style="display:inline-block;padding:2px 10px;border-radius:6px;background:${isActiveNum === 1 ? '#e0ffe0' : '#ffe0e0'};color:${isActiveNum === 1 ? '#228B22' : '#b00'};font-weight:bold;">
                                ${isActiveNum === 1 ? '上架' : '下架'}
                            </span>
                            <button class="toggle-active-btn" data-id="${product.id}" style="margin-left:8px;">切換</button>
                        </td>
                        <td>
                            <button class="edit-btn" data-id="${product.id}">編輯</button>
                            <button class="delete-btn" data-id="${product.id}">刪除</button>
                        </td>
                    `;
                });
                // 綁定切換上架狀態按鈕
                productListTableBody.querySelectorAll('.toggle-active-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const id = this.dataset.id;
                        const product = products.find(p => String(p.id) === String(id));
                        const isActiveNum = Number(product.isActive);
                        const newActive = isActiveNum === 1 ? 0 : 1;
                        try {
                            const res = await fetch(`/api/products/${id}/active`, {
                                method: 'PATCH',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({ isActive: newActive })
                            });
                            const data = await res.json();
                            if (res.ok) {
                                showNotification('狀態已切換', null, true);
                                fetchProducts();
                            } else {
                                showNotification('切換失敗: ' + (data.message || ''));
                            }
                        } catch (e) {
                            showNotification('切換狀態時發生錯誤');
                        }
                    });
                });
            } else if (response.status === 401 || response.status === 403) {
                showNotification('權限不足或登入已過期，請重新登入。', () => {
                    localStorage.removeItem('adminToken');
                    checkAuthAndRender();
                });
            } else {
                productListTableBody.innerHTML = `<tr><td colspan="7">錯誤: ${data.message || '無法載入商品。'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            productListTableBody.innerHTML = '<tr><td colspan="7">無法載入商品。</td></tr>';
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
        console.log('searchTagsContainer submit:', searchTagsContainer);
        event.preventDefault();

        const id = productIdInput.value;
        const name = productNameInput.value;
        const description = productDescriptionInput.value;
        const price = parseFloat(productPriceInput.value);
        const imageUrl = productImageUrlInput.value;
        const stock = parseInt(productStockInput.value, 10);

        if (!name || isNaN(price)) {
            showNotification('商品名稱和價格為必填項。');
            return;
        }
        if (isNaN(stock) || stock < 0) {
            showNotification('請輸入正確的庫存數量');
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

        // 獲取輸入的標籤
        const tags = Array.from(document.querySelectorAll('.product-tag-checkbox:checked')).map(cb => cb.value);

        const searchTags = Array.from(document.querySelectorAll('.search-tag-input')).map(input => input.value.trim()).filter(Boolean);

        const productData = { name, description, price, imageUrl, stock, specifications, thumbnailUrls, tags, searchTags };

        console.log('送出商品資料:', productData);

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
                showNotification(data.message || (id ? '商品更新成功！' : '商品新增成功！'), null, true);
                productForm.reset();
                productIdInput.value = ''; // Clear hidden ID
                specificationsContainer.innerHTML = ''; // Clear dynamic specifications
                addSpecificationField(); // Add back one empty field
                thumbnailUrlsContainer.innerHTML = ''; // Clear dynamic thumbnail URLs
                addThumbnailUrlField(); // Add back one empty field
                productTagsContainer.innerHTML = ''; // Clear dynamic tags
                loadCategoriesAndRenderCheckboxes(); // Reset tags to empty
                submitProductBtn.textContent = '新增商品';
                fetchProducts(); // Refresh product list
                if (searchTagsContainer) {
                    searchTagsContainer.innerHTML = '';
                    addSearchTagField();
                }
            } else if (response.status === 401 || response.status === 403) {
                showNotification('權限不足或登入已過期，請重新登入。', () => {
                    localStorage.removeItem('adminToken');
                    checkAuthAndRender();
                }, false);
            } else {
                showNotification('錯誤: ' + data.message, null, false);
            }
        } catch (error) {
            console.error('Error submitting product:', error);
            showNotification('提交商品時發生錯誤。', null, false);
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
        productTagsContainer.innerHTML = ''; // Clear dynamic tags
        loadCategoriesAndRenderCheckboxes();
        submitProductBtn.textContent = '新增商品';
        if (searchTagsContainer) {
            searchTagsContainer.innerHTML = '';
            addSearchTagField();
        }
    });

    // Handle Edit/Delete buttons on product list
    productListTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-btn')) {
            const id = event.target.dataset.id;
            try {
                const response = await fetch(`/api/products/${id}`, {
                    headers: getAuthHeaders()
                });
                const product = await response.json();
                if (response.ok) {
                    productIdInput.value = product.id;
                    productNameInput.value = product.name;
                    productDescriptionInput.value = product.description || '';
                    productPriceInput.value = product.price;
                    productImageUrlInput.value = product.imageUrl || '';
                    productStockInput.value = (typeof product.stock === 'number') ? product.stock : 0;
                    // Clear existing specifications and populate with fetched data
                    specificationsContainer.innerHTML = '';
                    if (product.specifications) {
                        for (const key in product.specifications) {
                            addSpecificationField(key, product.specifications[key]);
                        }
                    } else {
                        addSpecificationField(); // Add an empty field if no specs
                    }
                    // Clear existing thumbnail URLs and populate with fetched data
                    thumbnailUrlsContainer.innerHTML = '';
                    if (product.thumbnailUrls && product.thumbnailUrls.length > 0) {
                        product.thumbnailUrls.forEach(url => {
                            addThumbnailUrlField(url);
                        });
                    } else {
                        addThumbnailUrlField(); // Add an empty field if no thumbnail URLs
                    }
                    // 設定標籤值
                    loadCategoriesAndRenderCheckboxes(product.tags || []);
                    submitProductBtn.textContent = '更新商品';
                    window.scrollTo(0, 0); // Scroll to top to show the form
                    if (searchTagsContainer) {
                        searchTagsContainer.innerHTML = '';
                        if (product.searchTags && product.searchTags.length > 0) {
                            product.searchTags.forEach(tag => addSearchTagField(tag));
                        } else {
                            addSearchTagField();
                        }
                    }
                } else if (response.status === 401 || response.status === 403) {
                    showNotification('權限不足或登入已過期，請重新登入。', () => {
                        localStorage.removeItem('adminToken');
                        checkAuthAndRender();
                    }, false);
                } else {
                    console.error('編輯商品時 API 回傳:', product);
                    showNotification('找不到要編輯的商品或資料異常。', null, false);
                }
            } catch (error) {
                console.error('Error fetching product for edit:', error);
                showNotification('載入商品資訊時發生錯誤，請檢查 Console。', null, false);
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

    // 優化 showNotification，中央顯示並自動消失
    function showNotification(message, callback, isSuccess = false) {
        notificationMessage.textContent = message;
        customNotification.classList.add('show');
        notificationOverlay.classList.add('show');
        // 成功時顯示綠色背景
        if (isSuccess) {
            customNotification.style.background = '#4caf50';
            customNotification.style.color = '#fff';
        } else {
            customNotification.style.background = '';
            customNotification.style.color = '';
        }
        // 自動 2 秒後消失
        setTimeout(() => {
            customNotification.classList.remove('show');
            notificationOverlay.classList.remove('show');
            customNotification.style.background = '';
            customNotification.style.color = '';
            if (typeof callback === 'function') callback();
        }, 2000);
    }

    async function loadFooterSettings() {
        try {
            const res = await fetch('/api/settings/footer', { headers: getAuthHeaders() });
            const data = await res.json();
            if (res.ok) {
                footerContactInput.value = data.contact || '';
                footerLegalInput.value = data.legal || '';
                footerBusinessInput.value = data.business || '';
                footerCompanyInput.value = data.company || '';
            }
        } catch (e) {
            // 可選：顯示錯誤通知
        }
    }
    if (footerSettingsForm) {
        loadFooterSettings();
        footerSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const res = await fetch('/api/settings/footer', {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        contact: footerContactInput.value,
                        legal: footerLegalInput.value,
                        business: footerBusinessInput.value,
                        company: footerCompanyInput.value
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showNotification('頁尾已更新', null, true);
                } else {
                    showNotification('儲存失敗: ' + (data.message || ''), null, false);
                }
            } catch (e) {
                showNotification('儲存頁尾時發生錯誤', null, false);
            }
        });
    }

    // 1. 動態載入分類並渲染多選 checkbox
    async function loadCategoriesAndRenderCheckboxes(selectedTags = []) {
        const res = await fetch('/api/tags');
        const tags = await res.json();
        const container = document.getElementById('product-tags-checkboxes');
        container.innerHTML = '';
        tags.forEach(tag => {
            const id = `tag-checkbox-${tag}`;
            const label = document.createElement('label');
            label.style.marginRight = '12px';
            label.innerHTML = `<input type="checkbox" id="${id}" value="${tag}" class="product-tag-checkbox"> ${tag}`;
            if (selectedTags.includes(tag)) label.querySelector('input').checked = true;
            container.appendChild(label);
        });
    }

    // 2. 分類管理區塊
    async function renderCategoryList() {
        const res = await fetch('/api/tags');
        const tags = await res.json();
        const listDiv = document.getElementById('category-list');
        listDiv.innerHTML = '';
        tags.forEach(tag => {
            const tagDiv = document.createElement('div');
            tagDiv.style.display = 'inline-block';
            tagDiv.style.marginRight = '10px';
            tagDiv.style.marginBottom = '6px';
            tagDiv.innerHTML = `${tag} <button data-tag="${tag}" class="delete-category-btn">刪除</button>`;
            listDiv.appendChild(tagDiv);
        });
        // 綁定刪除事件
        listDiv.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.onclick = async function() {
                if (confirm(`確定要刪除分類「${btn.dataset.tag}」？`)) {
                    const res = await fetch(`/api/tags/${encodeURIComponent(btn.dataset.tag)}`, { method: 'DELETE', headers: getAuthHeaders() });
                    if (res.ok) {
                        await renderCategoryList();
                        await loadCategoriesAndRenderCheckboxes();
                    } else {
                        const data = await res.json().catch(() => ({}));
                        alert('刪除分類失敗: ' + (data.message || res.status));
                    }
                }
            };
        });
    }

    document.getElementById('add-category-btn').onclick = async function() {
        const input = document.getElementById('new-category-input');
        const tag = input.value.trim();
        if (!tag) return;
        const res = await fetch('/api/tags', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ tag }) });
        if (res.ok) {
            input.value = '';
            await renderCategoryList();
            await loadCategoriesAndRenderCheckboxes();
        } else {
            const data = await res.json().catch(() => ({}));
            alert('新增分類失敗: ' + (data.message || res.status));
        }
    };

    // 4. 編輯商品時自動勾選分類
    async function fillProductForm(product) {
        // ... 其他欄位 ...
        await loadCategoriesAndRenderCheckboxes(product.tags || []);
        // ... existing code ...
    }

    // 初始化時載入分類
    renderCategoryList();
    loadCategoriesAndRenderCheckboxes();
}); 