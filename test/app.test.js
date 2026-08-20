const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');
const { PRODUCT_CATALOG } = require('../src/catalog');
const { createSqliteRepository } = require('../src/db/sqlite');

function repository() {
  return { provider: 'test', async health(){ return true; }, async listProducts(){ return [{ id: 1, name: 'Caderno AI', price: 10, stock: 3 }]; }, async createOrder(){ return { id: 42, total: 10, status: 'Recebido' }; } };
}
async function withServer(fn) { const server = createApp(repository()).listen(0); await once(server, 'listening'); try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); } }
test('health informa o estado da aplicação', () => withServer(async (url) => { const res = await fetch(`${url}/api/health`); assert.equal(res.status, 200); assert.equal((await res.json()).status, 'ok'); }));
test('catálogo retorna produtos', () => withServer(async (url) => { const res = await fetch(`${url}/api/products`); assert.equal((await res.json())[0].name, 'Caderno AI'); }));
test('pedido inválido é rejeitado', () => withServer(async (url) => { const res = await fetch(`${url}/api/orders`, { method:'POST', headers:{'content-type':'application/json'}, body:'{}' }); assert.equal(res.status, 400); }));
test('pedido válido é criado', () => withServer(async (url) => { const res = await fetch(`${url}/api/orders`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({customerName:'Aluno',customerEmail:'aluno@example.com',items:[{productId:1,quantity:1}]}) }); assert.equal(res.status, 201); assert.equal((await res.json()).id, 42); }));
test('catálogo oficial contém exatamente sete produtos com imagens locais', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-shop-'));
  const repository = createSqliteRepository(path.join(directory, 'loja.db'));
  try {
    const products = await repository.listProducts();
    assert.equal(products.length, 7);
    assert.deepEqual(products.map((product) => product.name), PRODUCT_CATALOG.map((product) => product.name));
    assert.deepEqual(products.map((product) => product.image), PRODUCT_CATALOG.map((product) => product.image));
  } finally {
    await repository.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('imagens do catálogo são servidas sem 404', () => withServer(async (url) => {
  for (const product of PRODUCT_CATALOG) {
    const response = await fetch(`${url}${product.image}`);
    assert.equal(response.status, 200, product.image);
    assert.match(response.headers.get('content-type'), /^image\/png/);
  }
}));
