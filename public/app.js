const checkout = window.CheckoutUtils;
const state = { products: [], cart: new Map(), cep: '', couponCode: '' };
const STORAGE_KEY = 'azureShopCheckout';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function saveCheckoutState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart: [...state.cart], cep: state.cep, couponCode: state.couponCode }));
  } catch {}
}

function restoreCheckoutState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored?.cart)) {
      state.cart = new Map(stored.cart.filter(([id, quantity]) => Number.isInteger(Number(id)) && Number.isInteger(quantity) && quantity > 0).map(([id, quantity]) => [Number(id), quantity]));
    }
    state.cep = checkout.normalizeCep(stored?.cep);
    state.couponCode = checkout.getCoupon(stored?.couponCode)?.code || '';
  } catch {}
}

function setFeedback(selector, message, type = '') {
  const element = $(selector);
  element.textContent = message;
  element.className = type ? `checkout-feedback ${type}` : 'checkout-feedback';
}

function cartEntries() {
  if (!state.products.length) return [];
  const entries = [...state.cart.entries()]
    .map(([id, quantity]) => ({ product: state.products.find((item) => item.id === id), quantity }))
    .filter(({ product }) => product);
  if (entries.length !== state.cart.size) {
    state.cart = new Map(entries.map(({ product, quantity }) => [product.id, quantity]));
    saveCheckoutState();
  }
  return entries;
}

function orderSummary(entries) {
  const subtotal = entries.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  return checkout.calculateOrderSummary(subtotal, state.couponCode, state.cep);
}

function renderSummary(entries, summary) {
  const hasItems = entries.length > 0;
  const shipping = hasItems ? summary.shipping : null;
  const coupon = summary.coupon;

  $('#summary-subtotal').textContent = money.format(summary.products);
  $('#discount-row').hidden = !coupon;
  $('#discount-label').textContent = coupon ? `Desconto ${coupon.discountPercent}%` : 'Desconto';
  $('#discount-value').textContent = `- ${money.format(summary.discount)}`;
  $('#applied-coupon').hidden = !coupon;
  $('#applied-coupon-code').textContent = coupon ? `Cupom ${coupon.code}` : '';
  $('#shipping-label').textContent = shipping === null ? 'Frete' : `Frete para ${checkout.formatCep(state.cep)}`;
  $('#shipping-value').textContent = shipping === null ? 'Calcular' : money.format(shipping);
  $('#change-cep').hidden = shipping === null;
  $('#cart-total').textContent = money.format(summary.products - summary.discount + (shipping || 0));
  $('#postal-code').value = checkout.formatCep(state.cep);
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error();
    state.products = await response.json();
    $('#status').textContent = `${state.products.length} produtos · API conectada`;
    renderProducts();
    renderCart();
  } catch {
    $('#status').textContent = 'API indisponível';
    $('#status').className = 'error';
  }
}

function renderProducts() {
  $('#product-grid').innerHTML = state.products.map((product) => `<article class="product"><div class="product-visual"><img src="${encodeURI(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy"></div><div class="product-info"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><div class="product-bottom"><strong>${money.format(product.price)}</strong><button data-add="${product.id}">Adicionar</button></div></div></article>`).join('');
}

function renderCart() {
  const entries = cartEntries();
  const itemCount = entries.reduce((sum, { quantity }) => sum + quantity, 0);
  const summary = orderSummary(entries);

  $('#cart-count').textContent = itemCount;
  $('#cart-items').innerHTML = entries.length
    ? entries.map(({ product, quantity }) => `<div class="cart-row"><span>${escapeHtml(product.name)}<br><small>${money.format(product.price)}</small></span><strong>${quantity}</strong><button data-remove="${product.id}" aria-label="Remover ${escapeHtml(product.name)}">−</button></div>`).join('')
    : '<p>Seu carrinho está vazio.</p>';
  renderSummary(entries, summary);
}

function toggleCart(open) {
  $('#cart').classList.toggle('open', open);
  $('#overlay').classList.toggle('open', open);
  $('#cart').setAttribute('aria-hidden', String(!open));
}

document.addEventListener('click', (event) => {
  if (event.target.dataset.add) {
    const id = Number(event.target.dataset.add);
    state.cart.set(id, (state.cart.get(id) || 0) + 1);
    saveCheckoutState();
    renderCart();
    toggleCart(true);
  }
  if (event.target.dataset.remove) {
    const id = Number(event.target.dataset.remove);
    const quantity = state.cart.get(id);
    quantity > 1 ? state.cart.set(id, quantity - 1) : state.cart.delete(id);
    saveCheckoutState();
    renderCart();
  }
});

$('#cart-button').addEventListener('click', () => toggleCart(true));
$('#close-cart').addEventListener('click', () => toggleCart(false));
$('#overlay').addEventListener('click', () => toggleCart(false));

$('#coupon-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.cart.size) {
    setFeedback('#coupon-message', 'Adicione um produto ao carrinho para usar um cupom.', 'error');
    return;
  }
  const coupon = checkout.getCoupon($('#coupon-code').value);
  if (!coupon) {
    setFeedback('#coupon-message', 'Cupom inválido ou expirado.', 'error');
    return;
  }
  state.couponCode = coupon.code;
  saveCheckoutState();
  renderCart();
  setFeedback('#coupon-message', `✓ Cupom ${coupon.code} aplicado! Você ganhou ${coupon.discountPercent}% de desconto.`, 'success');
});

$('#remove-coupon').addEventListener('click', () => {
  state.couponCode = '';
  $('#coupon-code').value = '';
  saveCheckoutState();
  renderCart();
  setFeedback('#coupon-message', 'Cupom removido.', 'success');
});

$('#postal-code').addEventListener('input', (event) => {
  state.cep = checkout.normalizeCep(event.target.value);
  event.target.value = checkout.formatCep(state.cep);
  saveCheckoutState();
  renderCart();
  if (state.cep && state.cep.length < 8) setFeedback('#cep-message', 'Informe um CEP com 8 dígitos.', 'error');
  else setFeedback('#cep-message', '');
});

$('#change-cep').addEventListener('click', () => {
  const input = $('#postal-code');
  input.focus();
  input.select();
});

$('#checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#checkout-message');
  if (!state.cart.size) {
    message.textContent = 'Adicione um produto antes de finalizar.';
    message.className = 'error';
    return;
  }
  if (!checkout.calculateShipping(state.cep)) {
    message.textContent = 'Informe um CEP válido para calcular o frete.';
    message.className = 'error';
    $('#postal-code').focus();
    return;
  }

  const data = Object.fromEntries(new FormData(event.target));
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, cep: state.cep, couponCode: state.couponCode, items: [...state.cart].map(([productId, quantity]) => ({ productId, quantity })) })
  });
  const result = await response.json();
  if (!response.ok) {
    message.textContent = result.error;
    message.className = 'error';
    return;
  }
  message.textContent = `Pedido #${result.id} recebido! Total: ${money.format(result.total)}.`;
  message.className = 'success';
  state.cart.clear();
  state.cep = '';
  state.couponCode = '';
  saveCheckoutState();
  $('#coupon-code').value = '';
  event.target.reset();
  setFeedback('#coupon-message', '');
  setFeedback('#cep-message', '');
  renderCart();
  await loadProducts();
});

restoreCheckoutState();
renderCart();
loadProducts();

const aiForm = $('#ai-form');
if (aiForm) {
  aiForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const box = $('#ai-result');
    const button = $('#ai-submit');
    const interest = $('#ai-interest').value.trim();
    box.className = 'ai-result';
    box.textContent = '⏳ Consultando a IA…';
    button.disabled = true;
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest })
      });
      const result = await response.json();
      if (!response.ok) {
        box.textContent = result.error || 'Não foi possível obter recomendação.';
        box.classList.add('error');
        return;
      }
      box.innerHTML = `<div class="ai-answer">${result.recommendation.replace(/\n/g, '<br>')}</div><small class="ai-model">Modelo: ${result.model} · Azure OpenAI</small>`;
      box.classList.add('success');
    } catch {
      box.textContent = 'Falha ao contatar a IA.';
      box.classList.add('error');
    } finally {
      button.disabled = false;
    }
  });
}
