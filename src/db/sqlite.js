const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { PRODUCT_CATALOG } = require('../catalog');

function synchronizeCatalog(db) {
  const columns = db.prepare('PRAGMA table_info(products)').all();
  if (!columns.some((column) => column.name === 'catalog_visible')) {
    db.exec('ALTER TABLE products ADD COLUMN catalog_visible INTEGER NOT NULL DEFAULT 1');
  }

  const deactivateAll = db.prepare('UPDATE products SET catalog_visible = 0');
  const findExisting = db.prepare(`
    SELECT id FROM products
    WHERE name = ? OR name = ?
    ORDER BY CASE WHEN name = ? THEN 0 ELSE 1 END, id
    LIMIT 1
  `);
  const updateProduct = db.prepare(`
    UPDATE products
    SET name = ?, description = ?, price = ?, image = ?, catalog_visible = 1
    WHERE id = ?
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, image, stock, catalog_visible)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  db.transaction(() => {
    deactivateAll.run();
    for (const product of PRODUCT_CATALOG) {
      const existing = findExisting.get(product.name, product.legacyName || product.name, product.name);
      if (existing) {
        updateProduct.run(product.name, product.description, product.price, product.image, existing.id);
      } else {
        insertProduct.run(product.name, product.description, product.price, product.image, product.stock);
      }
    }
  })();
}

function createSqliteRepository(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      catalog_visible INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Recebido',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
  `);

  synchronizeCatalog(db);

  return {
    provider: 'sqlite',
    async listProducts() { return db.prepare('SELECT * FROM products WHERE catalog_visible = 1 ORDER BY id').all(); },
    async getProduct(id) { return db.prepare('SELECT * FROM products WHERE id = ?').get(id); },
    async createOrder({ customerName, customerEmail, items }) {
      return db.transaction(() => {
        let total = 0;
        const resolved = items.map(({ productId, quantity }) => {
          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
          if (!product) throw Object.assign(new Error(`Produto ${productId} não encontrado.`), { status: 400 });
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
            throw Object.assign(new Error(`Quantidade inválida para ${product.name}.`), { status: 400 });
          }
          total += product.price * quantity;
          return { product, quantity };
        });
        const order = db.prepare('INSERT INTO orders (customer_name, customer_email, total) VALUES (?, ?, ?)')
          .run(customerName, customerEmail, Number(total.toFixed(2)));
        const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
        const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        resolved.forEach(({ product, quantity }) => {
          addItem.run(order.lastInsertRowid, product.id, quantity, product.price);
          reduceStock.run(quantity, product.id);
        });
        return { id: Number(order.lastInsertRowid), total: Number(total.toFixed(2)), status: 'Recebido' };
      })();
    },
    async health() { db.prepare('SELECT 1').get(); return true; },
    async close() { db.close(); }
  };
}

module.exports = { createSqliteRepository };
