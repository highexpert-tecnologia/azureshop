const sql = require('mssql');
const { PRODUCT_CATALOG } = require('../catalog');
const { calculateOrderSummary } = require('../../public/checkout-utils');

async function synchronizeCatalog(pool) {
  await pool.request().query(`
    IF COL_LENGTH('products', 'catalog_visible') IS NULL
      ALTER TABLE products ADD catalog_visible BIT NOT NULL CONSTRAINT DF_products_catalog_visible DEFAULT 1 WITH VALUES;
    IF COL_LENGTH('products', 'image') < 510
      ALTER TABLE products ALTER COLUMN image NVARCHAR(255) NOT NULL;
    IF COL_LENGTH('orders', 'cep') IS NULL
      ALTER TABLE orders ADD cep NVARCHAR(8) NULL;
    IF COL_LENGTH('orders', 'shipping') IS NULL
      ALTER TABLE orders ADD shipping DECIMAL(10,2) NOT NULL CONSTRAINT DF_orders_shipping DEFAULT 0 WITH VALUES;
    IF COL_LENGTH('orders', 'coupon_code') IS NULL
      ALTER TABLE orders ADD coupon_code NVARCHAR(40) NULL;
    IF COL_LENGTH('orders', 'discount_amount') IS NULL
      ALTER TABLE orders ADD discount_amount DECIMAL(10,2) NOT NULL CONSTRAINT DF_orders_discount_amount DEFAULT 0 WITH VALUES;
  `);

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await new sql.Request(transaction).query('UPDATE products SET catalog_visible = 0');
    for (const product of PRODUCT_CATALOG) {
      const existing = await new sql.Request(transaction)
        .input('name', sql.NVarChar(120), product.name)
        .input('legacyName', sql.NVarChar(120), product.legacyName || product.name)
        .query(`
          SELECT TOP 1 id FROM products
          WHERE name = @name OR name = @legacyName
          ORDER BY CASE WHEN name = @name THEN 0 ELSE 1 END, id
        `);
      const productId = existing.recordset[0]?.id;
      if (productId) {
        await new sql.Request(transaction)
          .input('id', sql.Int, productId)
          .input('name', sql.NVarChar(120), product.name)
          .input('description', sql.NVarChar(500), product.description)
          .input('price', sql.Decimal(10, 2), product.price)
          .input('image', sql.NVarChar(255), product.image)
          .query(`
            UPDATE products
            SET name = @name, description = @description, price = @price,
                image = @image, catalog_visible = 1
            WHERE id = @id
          `);
      } else {
        await new sql.Request(transaction)
          .input('name', sql.NVarChar(120), product.name)
          .input('description', sql.NVarChar(500), product.description)
          .input('price', sql.Decimal(10, 2), product.price)
          .input('image', sql.NVarChar(255), product.image)
          .input('stock', sql.Int, product.stock)
          .query(`
            INSERT INTO products (name, description, price, image, stock, catalog_visible)
            VALUES (@name, @description, @price, @image, @stock, 1)
          `);
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function createSqlServerRepository(config) {
  const authentication = config.auth === 'managedIdentity'
    ? { type: 'azure-active-directory-default' }
    : undefined;
  const pool = await sql.connect({
    server: config.server,
    database: config.database,
    user: authentication ? undefined : config.user,
    password: authentication ? undefined : config.password,
    authentication,
    options: { encrypt: true, trustServerCertificate: false }
  });
  await synchronizeCatalog(pool);

  return {
    provider: 'sqlserver',
    async listProducts() { return (await pool.request().query('SELECT id, name, description, price, image, stock FROM products WHERE catalog_visible = 1 ORDER BY id')).recordset; },
    async getProduct(id) { return (await pool.request().input('id', sql.Int, id).query('SELECT id, name, description, price, image, stock FROM products WHERE id=@id')).recordset[0]; },
    async createOrder({ customerName, customerEmail, items, cep, couponCode }) {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        let subtotal = 0;
        const resolved = [];
        for (const item of items) {
          const result = await new sql.Request(transaction).input('id', sql.Int, item.productId)
            .query('SELECT id, name, price, stock FROM products WITH (UPDLOCK) WHERE id=@id');
          const product = result.recordset[0];
          if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) {
            throw Object.assign(new Error('Produto ou quantidade inválida.'), { status: 400 });
          }
          subtotal += Number(product.price) * item.quantity;
          resolved.push({ product, quantity: item.quantity });
        }
        const summary = calculateOrderSummary(subtotal, couponCode, cep);
        if (summary.shipping === null) throw Object.assign(new Error('Informe um CEP válido para calcular o frete.'), { status: 400 });
        const created = await new sql.Request(transaction)
          .input('name', sql.NVarChar, customerName).input('email', sql.NVarChar, customerEmail)
          .input('total', sql.Decimal(10, 2), summary.total)
          .input('cep', sql.NVarChar(8), cep)
          .input('shipping', sql.Decimal(10, 2), summary.shipping)
          .input('couponCode', sql.NVarChar(40), summary.coupon?.code || null)
          .input('discount', sql.Decimal(10, 2), summary.discount)
          .query("INSERT INTO orders (customer_name,customer_email,total,cep,shipping,coupon_code,discount_amount,status) OUTPUT INSERTED.id VALUES (@name,@email,@total,@cep,@shipping,@couponCode,@discount,N'Recebido')");
        const orderId = created.recordset[0].id;
        for (const { product, quantity } of resolved) {
          await new sql.Request(transaction).input('orderId', sql.Int, orderId).input('productId', sql.Int, product.id)
            .input('quantity', sql.Int, quantity).input('price', sql.Decimal(10, 2), product.price)
            .query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(@orderId,@productId,@quantity,@price); UPDATE products SET stock=stock-@quantity WHERE id=@productId');
        }
        await transaction.commit();
        return {
          id: orderId,
          subtotal: summary.products,
          discount: summary.discount,
          shipping: summary.shipping,
          couponCode: summary.coupon?.code || null,
          total: summary.total,
          status: 'Recebido'
        };
      } catch (error) { await transaction.rollback(); throw error; }
    },
    async health() { await pool.request().query('SELECT 1 AS ok'); return true; },
    async close() { await pool.close(); }
  };
}

module.exports = { createSqlServerRepository };
