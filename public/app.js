const state = { products: [], cart: new Map() };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error();
    state.products = await response.json();
    $('#status').textContent = `${state.products.length} produtos · API conectada`;
    renderProducts();
  } catch { $('#status').textContent = 'API indisponível'; $('#status').className = 'error'; }
}
function renderProducts() {
  $('#product-grid').innerHTML = state.products.map((p) => `<article class="product"><div class="product-visual"><img src="${encodeURI(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy"></div><div class="product-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p><div class="product-bottom"><strong>${money.format(p.price)}</strong><button data-add="${p.id}">Adicionar</button></div></div></article>`).join('');
}
function renderCart() {
  const entries = [...state.cart.entries()];
  $('#cart-count').textContent = entries.reduce((sum, [, qty]) => sum + qty, 0);
  $('#cart-items').innerHTML = entries.length ? entries.map(([id, qty]) => { const p = state.products.find((item) => item.id === id); return `<div class="cart-row"><span>${p.name}<br><small>${money.format(p.price)}</small></span><strong>${qty}</strong><button data-remove="${id}" aria-label="Remover">−</button></div>`; }).join('') : '<p>Seu carrinho está vazio.</p>';
  const total = entries.reduce((sum, [id, qty]) => sum + state.products.find((p) => p.id === id).price * qty, 0);
  $('#cart-total').textContent = money.format(total);
}
function toggleCart(open) { $('#cart').classList.toggle('open', open); $('#overlay').classList.toggle('open', open); $('#cart').setAttribute('aria-hidden', String(!open)); }
document.addEventListener('click', (event) => {
  if (event.target.dataset.add) { const id = Number(event.target.dataset.add); state.cart.set(id, (state.cart.get(id) || 0) + 1); renderCart(); toggleCart(true); }
  if (event.target.dataset.remove) { const id = Number(event.target.dataset.remove); const qty = state.cart.get(id); qty > 1 ? state.cart.set(id, qty - 1) : state.cart.delete(id); renderCart(); }
});
$('#cart-button').addEventListener('click', () => toggleCart(true));
$('#close-cart').addEventListener('click', () => toggleCart(false));
$('#overlay').addEventListener('click', () => toggleCart(false));
$('#checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#checkout-message');
  if (!state.cart.size) { message.textContent = 'Adicione um produto antes de finalizar.'; message.className = 'error'; return; }
  const data = Object.fromEntries(new FormData(event.target));
  const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, items: [...state.cart].map(([productId, quantity]) => ({ productId, quantity })) }) });
  const result = await response.json();
  if (!response.ok) { message.textContent = result.error; message.className = 'error'; return; }
  message.textContent = `Pedido #${result.id} recebido! Total: ${money.format(result.total)}.`; message.className = 'success'; state.cart.clear(); event.target.reset(); renderCart(); await loadProducts();
});
renderCart(); loadProducts();

const aiForm = $('#ai-form');
if (aiForm) {
  aiForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const box = $('#ai-result');
    const btn = $('#ai-submit');
    const interest = $('#ai-interest').value.trim();
    box.className = 'ai-result';
    box.textContent = '⏳ Consultando a IA…';
    btn.disabled = true;
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest })
      });
      const result = await response.json();
      if (!response.ok) { box.textContent = result.error || 'Não foi possível obter recomendação.'; box.classList.add('error'); return; }
      box.innerHTML = `<div class="ai-answer">${result.recommendation.replace(/\n/g, '<br>')}</div><small class="ai-model">Modelo: ${result.model} · Azure OpenAI</small>`;
      box.classList.add('success');
    } catch {
      box.textContent = 'Falha ao contatar a IA.'; box.classList.add('error');
    } finally {
      btn.disabled = false;
    }
  });
}
