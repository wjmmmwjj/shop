// 載入標籤
window.addEventListener('DOMContentLoaded', async () => {
  const tagSelect = document.getElementById('search-tag');
  try {
    const res = await fetch('/api/tags');
    if (!res.ok) {
      throw new Error(`API 返回錯誤: ${res.status}`);
    }
    const tags = await res.json();
    
    // 清除預設選項
    tagSelect.innerHTML = '<option value="">--請選擇--</option>';
    
    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
      });
    } else {
      // 如果沒有標籤，顯示提示
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = '尚未建立任何標籤';
      tagSelect.appendChild(option);
    }
  } catch (e) {
    console.error('載入標籤失敗:', e);
    // 標籤載入失敗，顯示錯誤
    tagSelect.innerHTML = '<option value="">--請選擇--</option>';
    const option = document.createElement('option');
    option.disabled = true;
    option.textContent = '無法載入標籤';
    tagSelect.appendChild(option);
  }

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

// 搜尋功能
const form = document.getElementById('advanced-search-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('search-name').value.trim();
  const tag = document.getElementById('search-tag').value;
  
  const resultDiv = document.getElementById('search-results');
  resultDiv.innerHTML = '<div style="text-align:center;">搜尋中...</div>';
  
  if (!name && !tag) {
    resultDiv.innerHTML = '<div style="color:#d9534f;">請輸入產品名稱或選擇標籤</div>';
    return;
  }
  
  try {
    let url = '/api/products/search?';
    if (name) url += `name=${encodeURIComponent(name)}&`;
    if (tag) url += `tag=${encodeURIComponent(tag)}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API 返回錯誤: ${res.status}`);
    }
    
    const products = await res.json();
    resultDiv.innerHTML = '';
    
    if (products.length === 0) {
      resultDiv.innerHTML = '<div style="text-align:center;">查無產品</div>';
      return;
    }
    
    products.forEach(p => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `
        <strong>${p.name || '未命名產品'}</strong>
        <br>價格: $${p.price ? p.price.toFixed(2) : '未定價'}
        <br>標籤: ${(p.tags && p.tags.length > 0) ? p.tags.join(', ') : '無標籤'}
      `;
      resultDiv.appendChild(div);
    });
  } catch (error) {
    console.error('搜尋產品時發生錯誤:', error);
    resultDiv.innerHTML = `<div style="color:#d9534f;">搜尋失敗: ${error.message}</div>`;
  }
}); 