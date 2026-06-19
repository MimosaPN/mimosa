// ============================================================
// cart.js — ミモザショップ 共通カートロジック
//
// 使い方:
//   <script src="../cart.js"></script>  ← shobo/mimosadoから
//   <script src="cart.js"></script>     ← shop/index.htmlから
// ============================================================

const CART_KEY = 'mimosa_cart'; // localStorage のキー
const GAS_URL  = 'https://script.google.com/macros/s/AKfycbws-OekNnVWaaDKjOgpFqf06RgB4mgE__zDD7jE1X4I7BBGktCVxO2tXjRMghLGLjP-UA/exec';

// ============================================================
// カートの読み書き（localStorage）
// cart = { [productId]: { p: ProductObject, q: number } }
// ============================================================
function cartLoad() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
  } catch { return {}; }
}

function cartSave(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartArray(cart) {
  return Object.values(cart).filter(item => item && item.p && item.q > 0);
}

function cartCount(cart) {
  return cartArray(cart).reduce((s, { q }) => s + q, 0);
}

function cartSubtotal(cart) {
  return cartArray(cart).reduce((s, { p, q }) => s + p.price * q, 0);
}

function cartShipping(cart) {
  const arr = cartArray(cart);
  if (arr.length === 0) return 0;
  return Math.max(...arr.map(({ p }) => p.shipFee || 0));
}

// ============================================================
// 商品追加・数量変更・削除
// ============================================================
function cartAdd(productId, product) {
  const cart = cartLoad();
  const cur  = cart[productId] ? cart[productId].q : 0;
  if (cur >= product.stock) return { ok: false, msg: '在庫数の上限です' };
  cart[productId] = { p: product, q: cur + 1 };
  cartSave(cart);
  return { ok: true };
}

function cartSetQty(productId, delta, products) {
  const cart = cartLoad();
  const item = cart[productId];
  if (!item) return;
  const p    = products ? products.find(x => x.id === productId) : item.p;
  const next = item.q + delta;
  if (next <= 0) {
    delete cart[productId];
  } else if (p && next > p.stock) {
    return { ok: false, msg: '在庫数の上限です' };
  } else {
    cart[productId] = { p: item.p, q: next };
  }
  cartSave(cart);
  return { ok: true };
}

function cartRemove(productId) {
  const cart = cartLoad();
  delete cart[productId];
  cartSave(cart);
}

// ============================================================
// カートバッジ更新（ヘッダーの件数表示）
// ============================================================
function updateCartBadge() {
  const el = document.getElementById('cc');
  if (el) el.textContent = cartCount(cartLoad());
}

// ============================================================
// カートドロワー描画
// ============================================================
const bookSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#5A6B3B" stroke-width="1.4"><path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2z"/><path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2"/></svg>`;
const yen     = n => '¥' + Number(n).toLocaleString('ja-JP');

function renderCartDrawer() {
  const cart = cartLoad();
  const arr  = cartArray(cart);
  const items = document.getElementById('items');
  if (!items) return;

  if (arr.length === 0) {
    items.innerHTML = `<div class="empty">カートは空です。<br>気になる１冊を選んでみてください。</div>`;
  } else {
    items.innerHTML = arr.map(({ p, q }) => `
      <div class="ci">
        <div class="ci-thumb">${p.image
          ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
          : bookSvg}</div>
        <div class="ci-info">
          <div class="ci-name">${p.name}</div>
          <div class="ci-seller">${p.label ? p.label + '・' : ''}${p.cat}</div>
          <div class="ci-bottom">
            <div class="qty">
              <button onclick="onQty('${p.id}',-1)">−</button>
              <span>${q}</span>
              <button onclick="onQty('${p.id}',1)">＋</button>
            </div>
            <div class="ci-price">${yen(p.price * q)}</div>
          </div>
          <button class="remove" onclick="onRemove('${p.id}')">削除</button>
        </div>
      </div>`).join('');
  }

  const st = cartSubtotal(cart);
  const sh = cartShipping(cart);
  const el = id => document.getElementById(id);
  if (el('subtotal')) el('subtotal').textContent = yen(st);
  if (el('shipfee'))  el('shipfee').textContent  = arr.length ? yen(sh) : '—';
  if (el('total'))    el('total').textContent    = yen(st + sh);
  if (el('checkout')) el('checkout').disabled    = arr.length === 0;
  updateCartBadge();
}

// ============================================================
// カート操作のイベントハンドラ（各ページから呼ばれる）
// ============================================================
function onQty(productId, delta) {
  cartSetQty(productId, delta);
  renderCartDrawer();
  if (typeof renderGrid === 'function') renderGrid(); // 商品グリッドの在庫表示を更新
}

function onRemove(productId) {
  cartRemove(productId);
  renderCartDrawer();
  if (typeof renderGrid === 'function') renderGrid();
}

function openCart()  {
  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  renderCartDrawer();
}

function closeCart() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

// ============================================================
// Square決済（GASへPOST）
// ============================================================
async function checkout() {
  const cart = cartLoad();
  const arr  = cartArray(cart);
  if (arr.length === 0) return;

  const btn = document.getElementById('checkout');
  btn.disabled    = true;
  btn.textContent = 'お会計を準備しています…';

  try {
    const res  = await fetch(GAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        items:       arr.map(({ p, q }) => ({ id: p.id, name: p.name, price: p.price, qty: q })),
        shippingFee: cartShipping(cart)
      })
    });
    const data = await res.json();

    if (data.ok && data.url) {
      // 決済完了後にカートをクリアするためセッションに記録
      sessionStorage.setItem('mimosa_checkout_pending', '1');
      window.location.href = data.url;
    } else {
      alert('お会計に進めませんでした。\n' + (data.error || '時間をおいて再度お試しください。'));
      btn.disabled    = false;
      btn.textContent = 'レジに進む';
    }
  } catch {
    alert('通信エラーが発生しました。時間をおいて再度お試しください。');
    btn.disabled    = false;
    btn.textContent = 'レジに進む';
  }
}

// ============================================================
// トースト通知
// ============================================================
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ページ読み込み時にバッジを更新
document.addEventListener('DOMContentLoaded', updateCartBadge);
