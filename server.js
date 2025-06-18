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
    for (const column of columns) {
        if (column.name === 'specifications') {
            hasSpecificationsColumn = true;
        }
        if (column.name === 'thumbnailUrls') {
            hasThumbnailUrlsColumn = true;
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

// Product API Endpoints
app.post('/api/products', authenticateAdmin, (req, res) => {
  const { name, description, price, imageUrl, specifications, thumbnailUrls } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required.' });
  }
  try {
    const stmt = db.prepare('INSERT INTO products (name, description, price, imageUrl, specifications, thumbnailUrls) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, description, price, imageUrl, 
        specifications ? JSON.stringify(specifications) : null,
        thumbnailUrls ? JSON.stringify(thumbnailUrls) : null
    );
    res.status(201).json({ id: info.lastInsertRowid, name, description, price, imageUrl, specifications, thumbnailUrls });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all().map(product => {
        if (product.specifications) {
            try {
                product.specifications = JSON.parse(product.specifications);
            } catch (e) {
                console.error('Failed to parse specifications for product', product.id, e);
                product.specifications = {}; // Default to empty object on parse error
            }
        }
        if (product.thumbnailUrls) {
            try {
                product.thumbnailUrls = JSON.parse(product.thumbnailUrls);
            } catch (e) {
                console.error('Failed to parse thumbnailUrls for product', product.id, e);
                product.thumbnailUrls = []; // Default to empty array on parse error
            }
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
      if (product.specifications) {
          try {
              product.specifications = JSON.parse(product.specifications);
          } catch (e) {
              console.error('Failed to parse specifications for product', product.id, e);
              product.specifications = {}; // Default to empty object on parse error
          }
      }
      if (product.thumbnailUrls) {
          try {
              product.thumbnailUrls = JSON.parse(product.thumbnailUrls);
          } catch (e) {
              console.error('Failed to parse thumbnailUrls for product', product.id, e);
              product.thumbnailUrls = []; // Default to empty array on parse error
          }
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
  const { name, description, price, imageUrl, specifications, thumbnailUrls } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required.' });
  }
  try {
    const stmt = db.prepare('UPDATE products SET name = ?, description = ?, price = ?, imageUrl = ?, specifications = ?, thumbnailUrls = ? WHERE id = ?');
    const info = stmt.run(name, description, price, imageUrl, 
        specifications ? JSON.stringify(specifications) : null,
        thumbnailUrls ? JSON.stringify(thumbnailUrls) : null,
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 