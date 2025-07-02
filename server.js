const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const bcrypt = require('bcrypt'); // Import bcrypt
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME;
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined. Please set it in your .env file.');
    process.exit(1);
}

// Initialize SQLite database
const db = new Database('database.db', { verbose: console.log });

// Create products table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    imageUrl TEXT
  )
`);

// Create users table if it doesn't exist (for admin accounts)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin' -- Can be 'admin', 'editor', etc.
  )
`);

// Add default admin user if no users exist
(async () => {
    try {
        const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
        if (userCount.count === 0) {
            if (!DEFAULT_ADMIN_USERNAME || !DEFAULT_ADMIN_PASSWORD) {
                console.warn('WARNING: DEFAULT_ADMIN_USERNAME or DEFAULT_ADMIN_PASSWORD not set in .env. No default admin user created.');
            } else {
                const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10); // Hash password with salt rounds = 10
                db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(DEFAULT_ADMIN_USERNAME, hashedPassword, 'admin');
                console.log(`Default admin user '${DEFAULT_ADMIN_USERNAME}' created.`);
            }
        }
    } catch (error) {
        console.error('Error initializing default admin user:', error);
    }
})();

// Add 'specifications' column if it doesn't exist
try {
    const columns = db.prepare("PRAGMA table_info(products)").all();
    let hasSpecificationsColumn = false;
    let hasThumbnailUrlsColumn = false;
    let hasStockColumn = false;
    let hasIsActiveColumn = false;
    let hasSearchTagsColumn = false;
    for (const column of columns) {
        if (column.name === 'specifications') {
            hasSpecificationsColumn = true;
        }
        if (column.name === 'thumbnailUrls') {
            hasThumbnailUrlsColumn = true;
        }
        if (column.name === 'stock') {
            hasStockColumn = true;
        }
        if (column.name === 'isActive') {
            hasIsActiveColumn = true;
        }
        if (column.name === 'searchTags') {
            hasSearchTagsColumn = true;
        }
    }

    if (!hasSpecificationsColumn) {
        db.exec(`ALTER TABLE products ADD COLUMN specifications TEXT;`);
        console.log('Added specifications column to products table.');
    }
    if (!hasThumbnailUrlsColumn) {
        db.exec(`ALTER TABLE products ADD COLUMN thumbnailUrls TEXT;`);
        console.log('Added thumbnailUrls column to products table.');
    }
    if (!hasStockColumn) {
        db.exec(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 5;`);
        console.log('Added stock column to products table.');
    }
    if (!hasIsActiveColumn) {
        db.exec(`ALTER TABLE products ADD COLUMN isActive INTEGER DEFAULT 1;`);
        console.log('Added isActive column to products table.');
    }
    if (!hasSearchTagsColumn) {
        db.exec(`ALTER TABLE products ADD COLUMN searchTags TEXT;`);
        console.log('Added searchTags column to products table.');
    }
} catch (error) {
    console.error('Error checking or adding columns to products table:', error);
}

// Create settings table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Set default website status to 'active' if not already set
const websiteStatus = db.prepare("SELECT value FROM settings WHERE key = 'websiteStatus'").get();
if (!websiteStatus) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('websiteStatus', ?)").run('active');
}

// 初始化產品標籤設置（如果不存在）
const productTags = db.prepare("SELECT value FROM settings WHERE key = 'productTags'").get();
if (!productTags) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('productTags', ?)").run('[]');
  console.log('Initialized empty product tags array in settings.');
}

// Middleware to parse JSON bodies
app.use(express.json());

// Simple authentication middleware for admin routes (now uses JWT)
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Expects 'Bearer TOKEN'

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Token format is incorrect' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden: Invalid token', error: error.message });
  }
};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Define a route for the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Define a route for a single product page
app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

// Define a route for the checkout page
app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// API Endpoints
// 搜尋產品（依名稱或標籤） - 移到前面避免被 /api/products/:id 攔截
app.get('/api/products/search', (req, res) => {
    try {
        const { name, tag } = req.query;
        console.log(`搜尋產品 - 名稱: ${name || '無'}, 標籤: ${tag || '無'}`);
        
        if (!name && !tag) {
            return res.status(400).json({ 
                message: '請提供名稱或標籤進行搜尋' 
            });
        }
        
        let products = db.prepare('SELECT * FROM products').all();
        console.log(`資料庫中找到 ${products.length} 個產品`);
        
        // 確保所有產品的標籤都正確解析
        products = products.map(p => {
            let parsedTags = [];
            let parsedSearchTags = [];
            if (p.tags) {
                try { parsedTags = JSON.parse(p.tags); } catch (e) { console.error(`產品 ${p.id} 的標籤解析錯誤:`, e); }
            }
            if (p.searchTags) {
                try { parsedSearchTags = JSON.parse(p.searchTags); } catch (e) { console.error(`產品 ${p.id} 的查詢標籤解析錯誤:`, e); }
            }
            return { ...p, tags: parsedTags, searchTags: parsedSearchTags };
        });
        
        // 改用「或」邏輯：使用兩個獨立的篩選器，然後合併結果
        let nameFilteredProducts = [];
        let tagFilteredProducts = [];
        
        // 依名稱搜尋
        if (name) {
            nameFilteredProducts = products.filter(p => 
                p.name && p.name.toLowerCase().includes(name.toLowerCase())
            );
            console.log(`名稱過濾後找到 ${nameFilteredProducts.length} 個產品`);
        }
        
        // 依標籤搜尋
        if (tag) {
            tagFilteredProducts = products.filter(p => {
                // 確保標籤是陣列
                const allTags = [ ...(Array.isArray(p.tags) ? p.tags : []), ...(Array.isArray(p.searchTags) ? p.searchTags : []) ];
                return allTags.some(t => typeof t === 'string' && t.toLowerCase().includes(tag.toLowerCase()));
            });
            console.log(`標籤過濾後找到 ${tagFilteredProducts.length} 個產品`);
        }
        
        // 合併結果（名稱或標籤符合其中一個就包含）
        let combinedResults = [];
        
        // 如果只搜尋名稱，直接使用名稱結果
        if (name && !tag) {
            combinedResults = nameFilteredProducts;
        } 
        // 如果只搜尋標籤，直接使用標籤結果
        else if (!name && tag) {
            combinedResults = tagFilteredProducts;
        } 
        // 如果兩個都搜尋，合併結果並去重
        else {
            // 合併兩個陣列並去重
            const allIds = new Set();
            nameFilteredProducts.forEach(p => allIds.add(p.id));
            tagFilteredProducts.forEach(p => allIds.add(p.id));
            
            // 根據ID列表獲取完整產品
            combinedResults = products.filter(p => allIds.has(p.id));
        }
        
        console.log(`合併後總共找到 ${combinedResults.length} 個產品`);
        res.json(combinedResults);
    } catch (error) {
        console.error('搜尋產品時發生錯誤:', error);
        res.status(500).json({ message: '搜尋產品時發生錯誤', error: error.message });
    }
});

// Product API Endpoints
app.post('/api/products', authenticateAdmin, (req, res) => {
  const { name, description, price, imageUrl, stock, isActive, specifications, thumbnailUrls, tags, searchTags } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required.' });
  }
  try {
    const stockNumber = (typeof stock === 'number') ? stock : parseInt(stock, 10);
    const isActiveValue = (typeof isActive === 'number') ? isActive : (isActive === undefined ? 1 : parseInt(isActive, 10));
    const stmt = db.prepare('INSERT INTO products (name, description, price, imageUrl, stock, isActive, specifications, thumbnailUrls, tags, searchTags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, description, price, imageUrl, stockNumber, isActiveValue,
        specifications ? JSON.stringify(specifications) : null,
        thumbnailUrls ? JSON.stringify(thumbnailUrls) : null,
        tags ? JSON.stringify(tags) : null,
        searchTags ? JSON.stringify(searchTags) : null
    );
    console.log('後端收到商品資料:', req.body);
    res.status(201).json({ id: info.lastInsertRowid, name, description, price, imageUrl, stock: stockNumber, isActive: isActiveValue, specifications, thumbnailUrls, tags, searchTags });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all().map(product => {
        // 處理規格 (specifications)
        if (product.specifications) {
            try {
                product.specifications = JSON.parse(product.specifications);
            } catch (e) {
                console.error('Failed to parse specifications for product', product.id, e);
                product.specifications = {}; // Default to empty object on parse error
            }
        } else {
            product.specifications = {};
        }
        
        // 處理預覽圖 (thumbnailUrls)
        if (product.thumbnailUrls) {
            try {
                product.thumbnailUrls = JSON.parse(product.thumbnailUrls);
            } catch (e) {
                console.error('Failed to parse thumbnailUrls for product', product.id, e);
                product.thumbnailUrls = []; // Default to empty array on parse error
            }
        } else {
            product.thumbnailUrls = [];
        }
        
        // 處理標籤 (tags)
        if (product.tags) {
            try {
                product.tags = JSON.parse(product.tags);
            } catch (e) {
                console.error('Failed to parse tags for product', product.id, e);
                product.tags = []; // Default to empty array on parse error
            }
        } else {
            product.tags = [];
        }
        
        // 處理查詢標籤 (searchTags)
        if (product.searchTags) {
            try {
                product.searchTags = JSON.parse(product.searchTags);
            } catch (e) {
                product.searchTags = [];
            }
        } else {
            product.searchTags = [];
        }
        
        return product;
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get a single product by ID
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (product) {
      // 處理規格 (specifications)
      if (product.specifications) {
          try {
              product.specifications = JSON.parse(product.specifications);
          } catch (e) {
              console.error('Failed to parse specifications for product', product.id, e);
              product.specifications = {}; // Default to empty object on parse error
          }
      } else {
          product.specifications = {};
      }
      
      // 處理預覽圖 (thumbnailUrls)
      if (product.thumbnailUrls) {
          try {
              product.thumbnailUrls = JSON.parse(product.thumbnailUrls);
          } catch (e) {
              console.error('Failed to parse thumbnailUrls for product', product.id, e);
              product.thumbnailUrls = []; // Default to empty array on parse error
          }
      } else {
          product.thumbnailUrls = [];
      }
      
      // 處理標籤 (tags)
      if (product.tags) {
          try {
              product.tags = JSON.parse(product.tags);
          } catch (e) {
              console.error('Failed to parse tags for product', product.id, e);
              product.tags = []; // Default to empty array on parse error
          }
      } else {
          product.tags = [];
      }
      
      // 處理查詢標籤 (searchTags)
      if (product.searchTags) {
          try {
              product.searchTags = JSON.parse(product.searchTags);
          } catch (e) {
              product.searchTags = [];
          }
      } else {
          product.searchTags = [];
      }
      
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

app.put('/api/products/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, price, imageUrl, stock, isActive, specifications, thumbnailUrls, tags, searchTags } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required.' });
  }
  try {
    const stockNumber = (typeof stock === 'number') ? stock : parseInt(stock, 10);
    const isActiveValue = 1; // 永遠預設為 1
    const stmt = db.prepare('UPDATE products SET name = ?, description = ?, price = ?, imageUrl = ?, stock = ?, isActive = ?, specifications = ?, thumbnailUrls = ?, tags = ?, searchTags = ? WHERE id = ?');
    const info = stmt.run(name, description, price, imageUrl, stockNumber, isActiveValue,
        specifications ? JSON.stringify(specifications) : null,
        thumbnailUrls ? JSON.stringify(thumbnailUrls) : null,
        tags ? JSON.stringify(tags) : null,
        searchTags ? JSON.stringify(searchTags) : null,
        id
    );
    if (info.changes === 0) {
      return res.status(404).json({ message: 'Product not found or no changes made.' });
    }
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

app.delete('/api/products/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// Website Settings API Endpoints
app.get('/api/settings/websiteStatus', (req, res) => {
  try {
    const status = db.prepare("SELECT value FROM settings WHERE key = 'websiteStatus'").get();
    if (status) {
      res.json({ websiteStatus: status.value });
    } else {
      res.status(404).json({ message: 'Website status not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching website status', error: error.message });
  }
});

app.put('/api/settings/websiteStatus', authenticateAdmin, (req, res) => {
  const { status } = req.body;
  if (!status || (status !== 'active' && status !== 'paused')) {
    return res.status(400).json({ message: 'Invalid status. Must be \'active\' or \'paused\'.' });
  }
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const info = stmt.run('websiteStatus', status);
    res.json({ message: 'Website status updated successfully', websiteStatus: status });
  } catch (error) {
    res.status(500).json({ message: 'Error updating website status', error: error.message });
  }
});

// 取得 footer 設定
app.get('/api/settings/footer', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'footer' ").get();
    if (!row) {
      // 預設內容
      return res.json({
        contact: 'EMAIL: txt\n桃園店:雙子大樓',
        legal: 'txt',
        business: 'txt',
        company: 'txt'
      });
    }
    res.json(JSON.parse(row.value));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching footer settings', error: error.message });
  }
});

// 更新 footer 設定（僅限管理者）
app.put('/api/settings/footer', authenticateAdmin, (req, res) => {
  const { contact, legal, business, company } = req.body;
  try {
    const value = JSON.stringify({ contact, legal, business, company });
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('footer', ?)").run(value);
    res.json({ message: 'Footer updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating footer settings', error: error.message });
  }
});

// Admin login route
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  // Check if username and password are provided
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Find the user in the database
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // If credentials are valid, generate a JWT token
    // You might include user role in the token payload if needed for authorization
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login successful', token: token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login.' });
  }
});

// New route to create admin users (only accessible by existing admins)
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Ensure the creating user has 'admin' role if you want to restrict this
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only administrators can create new users.' });
    }

    try {
        // Check if username already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        // Hash the new user's password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const info = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role || 'admin');

        res.status(201).json({ message: 'User created successfully', userId: info.lastInsertRowid });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({ message: 'An error occurred while creating the user.' });
    }
});

// 檢查並新增 tags 欄位
try {
    const columns = db.prepare("PRAGMA table_info(products)").all();
    let hasTagsColumn = columns.some(col => col.name === 'tags');
    if (!hasTagsColumn) {
        db.exec(`ALTER TABLE products ADD COLUMN tags TEXT;`);
        console.log('Added tags column to products table.');
    }
} catch (error) {
    console.error('Error checking or adding tags column:', error);
}

// 標籤儲存於 settings 表（key: productTags, value: JSON array）
function getAllTags() {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'productTags'").get();
    if (!row) return [];
    try { return JSON.parse(row.value); } catch { return []; }
}
function saveAllTags(tags) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('productTags', JSON.stringify(tags));
}

// 取得所有標籤
app.get('/api/tags', (req, res) => {
    res.json(getAllTags());
});
// 新增標籤
app.post('/api/tags', authenticateAdmin, (req, res) => {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ message: 'Tag is required.' });
    let tags = getAllTags();
    if (tags.includes(tag)) return res.status(409).json({ message: 'Tag already exists.' });
    tags.push(tag);
    saveAllTags(tags);
    res.status(201).json(tags);
});
// 刪除標籤
app.delete('/api/tags/:tag', authenticateAdmin, (req, res) => {
    const tag = req.params.tag;
    let tags = getAllTags();
    tags = tags.filter(t => t !== tag);
    saveAllTags(tags);
    res.json(tags);
});

// 更新商品庫存（僅限管理者）
app.patch('/api/products/:id/stock', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ message: '請提供正確的庫存數量（非負整數）' });
  }
  try {
    const stmt = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
    const info = stmt.run(stock, id);
    if (info.changes === 0) {
      return res.status(404).json({ message: '找不到商品或未變更' });
    }
    res.json({ message: '庫存已更新', stock });
  } catch (error) {
    res.status(500).json({ message: '更新庫存時發生錯誤', error: error.message });
  }
});

// 切換商品上架/下架狀態
app.patch('/api/products/:id/active', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  let { isActive } = req.body;
  isActive = (typeof isActive === 'number') ? isActive : parseInt(isActive, 10);
  if (isNaN(isActive) || (isActive !== 0 && isActive !== 1)) {
    return res.status(400).json({ message: 'isActive 必須為 0 或 1' });
  }
  try {
    const stmt = db.prepare('UPDATE products SET isActive = ? WHERE id = ?');
    const info = stmt.run(isActive, id);
    if (info.changes === 0) {
      return res.status(404).json({ message: '找不到商品或未變更' });
    }
    res.json({ message: '商品狀態已更新', isActive });
  } catch (error) {
    res.status(500).json({ message: '更新商品狀態時發生錯誤', error: error.message });
  }
});

// 網站維護攔截（維護時所有前台頁面都無法使用）
app.use((req, res, next) => {
  const websiteStatus = db.prepare("SELECT value FROM settings WHERE key = 'websiteStatus'").get();
  // 只允許 /admin、/api/、靜態資源（.css, .js, .png, .jpg, .ico, .svg, .woff, .ttf, .map）
  const isAdmin = req.path.startsWith('/admin');
  const isApi = req.path.startsWith('/api/');
  const isStatic = /\.(css|js|png|jpg|jpeg|ico|svg|woff|woff2|ttf|map)$/i.test(req.path);
  if (websiteStatus && websiteStatus.value === 'paused' && !isAdmin && !isApi && !isStatic) {
    return res.send('<div style="text-align:center;padding:80px;font-size:2em;">網站維護中，請稍後再訪。</div>');
  }
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 