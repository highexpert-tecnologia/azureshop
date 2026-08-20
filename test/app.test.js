const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');
const { PRODUCT_CATALOG } = require('../src/catalog');
const { createSqliteRepository } = require('../src/db/sqlite');

const EXPECTED_CATALOG = [
  ['Mochila Arquiteto Azure', 'Mochila premium para profissionais de Cloud, Azure e arquitetura.', 249.9, '/products/mochila_tech_azure_arquiteto.png'],
  ['Caneca Mentoria Arquiteto Azure', 'Caneca exclusiva da Mentoria Arquiteto Azure.', 79.9, '/products/caneca_preta_mentoria_arquiteto_azure.png'],
  ['Caneca Pós-Graduação Arquitetura de Azure com AI', 'Caneca exclusiva da Pós-Graduação Arquitetura de Azure com AI.', 79.9, '/products/caneca_azure_ai_pós_graduação_em_azul_neon.png'],
  ['Caderno Pós-Graduação Arquitetura de Azure com AI', 'Caderno premium para projetos, diagramas, estudos e Arquiteturas Azure com AI.', 54.9, '/products/caderno_azure_com_ai_e_caneta_premium.png'],
  ['Camiseta Azure Expert', 'Camiseta exclusiva Azure Expert para profissionais que vivem Cloud e Azure.', 119.9, '/products/camiseta_azure_expert_tech.png'],
  ['Camiseta Mentoria Arquiteto Azure', 'Camiseta exclusiva da Mentoria Arquiteto Azure.', 119.9, '/products/mockup_de_camiseta_arquiteto_azure.png'],
  ['Camiseta Pós-Graduação Arquitetura de Azure com AI', 'Camiseta exclusiva da Pós-Graduação Arquitetura de Azure com AI.', 119.9, '/products/camiseta_tech_azure_com_design_futurista.png'],
  ['Camiseta Microsoft Certified Expert', 'Camiseta Microsoft Certified Expert.', 119.9, '/products/Camiseta_Microsoft_Certified_Expert.png']
];

function repository() {
  return { provider: 'test', async health(){ return true; }, async listProducts(){ return [{ id: 1, name: 'Caderno AI', price: 10, stock: 3 }]; }, async createOrder(){ return { id: 42, total: 10, status: 'Recebido' }; } };
}
async function withServer(fn) { const server = createApp(repository()).listen(0); await once(server, 'listening'); try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); } }
test('health informa o estado da aplicação', () => withServer(async (url) => { const res = await fetch(`${url}/api/health`); assert.equal(res.status, 200); assert.equal((await res.json()).status, 'ok'); }));
test('catálogo retorna produtos', () => withServer(async (url) => { const res = await fetch(`${url}/api/products`); assert.equal((await res.json())[0].name, 'Caderno AI'); }));
test('pedido inválido é rejeitado', () => withServer(async (url) => { const res = await fetch(`${url}/api/orders`, { method:'POST', headers:{'content-type':'application/json'}, body:'{}' }); assert.equal(res.status, 400); }));
test('pedido válido é criado', () => withServer(async (url) => { const res = await fetch(`${url}/api/orders`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({customerName:'Aluno',customerEmail:'aluno@example.com',cep:'01310-100',couponCode:'arquitetoazure10',items:[{productId:1,quantity:1}]}) }); assert.equal(res.status, 201); assert.equal((await res.json()).id, 42); }));
test('pedido rejeita CEP ou cupom inválido', () => withServer(async (url) => {
  const invalidCep = await fetch(`${url}/api/orders`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({customerName:'Aluno',customerEmail:'aluno@example.com',cep:'123',items:[{productId:1,quantity:1}]}) });
  assert.equal(invalidCep.status, 400);
  const invalidCoupon = await fetch(`${url}/api/orders`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({customerName:'Aluno',customerEmail:'aluno@example.com',cep:'01310-100',couponCode:'CUPOMINVALIDO',items:[{productId:1,quantity:1}]}) });
  assert.equal(invalidCoupon.status, 400);
}));
test('catálogo oficial contém exatamente oito produtos com imagens locais', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-shop-'));
  const repository = createSqliteRepository(path.join(directory, 'loja.db'));
  try {
    const products = await repository.listProducts();
    assert.equal(products.length, 8);
    assert.deepEqual(
      products.map((product) => [product.name, product.description, product.price, product.image]),
      EXPECTED_CATALOG
    );
    assert.deepEqual(
      PRODUCT_CATALOG.map((product) => [product.name, product.description, product.price, product.image]),
      EXPECTED_CATALOG
    );
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

test('pedido persiste subtotal, desconto e frete calculados no servidor', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-shop-order-'));
  const repository = createSqliteRepository(path.join(directory, 'loja.db'));
  try {
    const [product] = await repository.listProducts();
    const order = await repository.createOrder({
      customerName: 'Aluno',
      customerEmail: 'aluno@example.com',
      cep: '01310100',
      couponCode: 'arquitetoazureexpert30',
      items: [{ productId: product.id, quantity: 2 }]
    });
    assert.deepEqual(order, {
      id: 1,
      subtotal: 499.8,
      discount: 149.94,
      shipping: 13.9,
      couponCode: 'ARQUITETOAZUREEXPERT30',
      total: 363.76,
      status: 'Recebido'
    });
    assert.equal((await repository.getProduct(product.id)).stock, product.stock - 2);
  } finally {
    await repository.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
