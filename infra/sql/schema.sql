-- Esquema idempotente do Azure SQL para a Imersao Arquiteto Azure — Cloud & AI.
-- Pode ser aplicado mais de uma vez sem apagar pedidos existentes (nao usa DROP TABLE).

IF OBJECT_ID('products', 'U') IS NULL
BEGIN
  CREATE TABLE products (
    id          INT IDENTITY PRIMARY KEY,
    name        NVARCHAR(120) NOT NULL,
    description NVARCHAR(500) NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    image       NVARCHAR(255) NOT NULL,
    stock       INT NOT NULL DEFAULT 0,
    catalog_visible BIT NOT NULL DEFAULT 1
  );
END;

IF OBJECT_ID('orders', 'U') IS NULL
BEGIN
  CREATE TABLE orders (
    id             INT IDENTITY PRIMARY KEY,
    customer_name  NVARCHAR(120) NOT NULL,
    customer_email NVARCHAR(200) NOT NULL,
    total          DECIMAL(10,2) NOT NULL,
    status         NVARCHAR(30)  NOT NULL DEFAULT N'Recebido',
    created_at     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('order_items', 'U') IS NULL
BEGIN
  CREATE TABLE order_items (
    id         INT IDENTITY PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
  );
END;

IF COL_LENGTH('products', 'catalog_visible') IS NULL
  ALTER TABLE products ADD catalog_visible BIT NOT NULL CONSTRAINT DF_products_catalog_visible DEFAULT 1 WITH VALUES;

IF COL_LENGTH('products', 'image') < 510
  ALTER TABLE products ALTER COLUMN image NVARCHAR(255) NOT NULL;

DECLARE @catalog TABLE (
  name NVARCHAR(120) NOT NULL,
  legacy_name NVARCHAR(120) NULL,
  description NVARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image NVARCHAR(255) NOT NULL,
  stock INT NOT NULL
);

INSERT INTO @catalog (name, legacy_name, description, price, image, stock) VALUES
  (N'Mochila Azure Architect', N'Mochila Cloud', N'Mochila para acompanhar a jornada do Arquiteto Azure.', 249.90, N'/products/Mochila_Azure_Architect.png', 20),
  (N'Caneca Arquiteto Azure & AI', N'Caneca Arquiteto', N'Caneca para acompanhar estudos de Azure e Inteligencia Artificial.', 79.90, N'/products/Caneca_Arquiteto_Azure_AI.png', 35),
  (N'Caneca Azure Expert', NULL, N'Caneca da comunidade Azure Expert.', 79.90, N'/products/Caneca_Azure_Expert.png', 35),
  (N'Caderno Azure Architect & AI', N'Caderno AI', N'Caderno para ideias, prompts e diagramas de arquitetura.', 54.90, N'/products/Caderno_Azure_Architect_AI.png', 50),
  (N'Camiseta Azure Expert', NULL, N'Camiseta Azure Expert para a comunidade Cloud.', 119.90, N'/products/Camiseta_Azure_Expert.png', 25),
  (N'Camiseta Azure Architect', N'Camiseta Azure', N'Camiseta da Imersao Arquiteto Azure.', 119.90, N'/products/Camiseta_Azure_Architect.png', 25),
  (N'Camiseta Microsoft Certified Expert', NULL, N'Camiseta Microsoft Certified Expert.', 119.90, N'/products/Camiseta_Microsoft_Certified_Expert.png', 25);

UPDATE products SET catalog_visible = 0;

UPDATE p SET
  name = c.name,
  description = c.description,
  price = c.price,
  image = c.image,
  catalog_visible = 1
FROM products p
JOIN @catalog c ON p.name = c.name OR p.name = c.legacy_name;

INSERT INTO products (name, description, price, image, stock, catalog_visible)
SELECT c.name, c.description, c.price, c.image, c.stock, 1
FROM @catalog c
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = c.name);
