const company = window.location.pathname.split('/')[1] || 'bluestar';
const sessionKey = `session_${company}`;
const usernameKey = `username_${company}`;
const roleKey = `role_${company}`;
const vendedorKey = `vendedor_${company}`;
const cartKey = `carrito_${company}`;

const vendedorName = localStorage.getItem(vendedorKey) || '';

let allFacturas = [];
let currentSearch = '';

function checkAuth() {
  if (localStorage.getItem(sessionKey) !== 'true') {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(usernameKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(vendedorKey);
    window.location.href = `/${company}/`;
  }
}

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add('show'));

  if (toast._hideTimeout) clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateCartButton();
}

function updateCartButton() {
  const cart = getCart();
  const btn = document.getElementById('cart-fab');
  const count = document.getElementById('cart-count');
  if (!btn) return;
  if (cart.length === 0) {
    btn.classList.add('hidden');
  } else {
    btn.classList.remove('hidden');
    if (count) count.textContent = cart.length;
  }
}

function canAddToCart(factura) {
  const cart = getCart();
  if (cart.length === 0) return { ok: true };
  const first = cart[0];
  const same =
    (factura.cliente || '').toString().trim().toLowerCase() === (first.cliente || '').toString().trim().toLowerCase() &&
    (factura.ciudad || '').toString().trim().toLowerCase() === (first.ciudad || '').toString().trim().toLowerCase() &&
    (factura.direccion || '').toString().trim().toLowerCase() === (first.direccion || '').toString().trim().toLowerCase();
  if (same) return { ok: true };
  return { ok: false, first };
}

function addToCart(row) {
  const cart = getCart();
  const exists = cart.some(item => item.factura === row.factura);
  if (exists) {
    showToast('Esta factura ya está en el carrito', 'warning');
    return;
  }
  const check = canAddToCart(row);
  if (!check.ok) {
    const f = check.first;
    showToast(`Solo puedes agregar facturas del mismo cliente, ciudad y dirección. Actual: ${f.cliente} | ${f.ciudad} | ${f.direccion}`, 'error');
    return;
  }
  const item = {
    bodega: company,
    vendedor: row.vendedor || '',
    cliente: row.cliente || '',
    ciudad: row.ciudad || '',
    direccion: row.direccion || '',
    fecha: row.fecha || '',
    factura: row.factura || '',
    total: parseFloat(row.total) || 0,
    saldo: parseFloat(row.saldo) || 0,
    flete: parseFloat(row.flete) || 0
  };
  cart.push(item);
  saveCart(cart);
  showToast('Factura agregada al carrito', 'success');
  renderFacturas();
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderFacturas();
  renderCartModal();
}

function clearCart(e) {
  if (e) e.preventDefault();
  saveCart([]);
  renderFacturas();
  renderCartModal();
  showToast('Carrito vaciado', 'success');
}

function sumField(cart, field) {
  return cart.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
}

function renderCartModal() {
  const cart = getCart();
  const modal = document.getElementById('cart-modal');
  if (!modal) return;
  if (cart.length === 0) {
    modal.classList.add('hidden');
    return;
  }

  const first = cart[0];
  const fechas = cart.map(i => formatDate(i.fecha)).filter(Boolean).join(' - ');
  const facturas = cart.map(i => i.factura).filter(Boolean).join(' - ');
  const total = sumField(cart, 'total');
  const saldo = sumField(cart, 'saldo');
  const flete = sumField(cart, 'flete');
  const abono = total - saldo;

  document.getElementById('cart-bodega').textContent = company.toUpperCase();
  document.getElementById('cart-vendedor').textContent = first.vendedor || '-';
  document.getElementById('cart-cliente').textContent = first.cliente || '-';
  document.getElementById('cart-ciudad').textContent = first.ciudad || '-';
  document.getElementById('cart-direccion').textContent = first.direccion || '-';
  document.getElementById('cart-fecha').textContent = fechas || '-';
  document.getElementById('cart-factura').textContent = facturas || '-';
  document.getElementById('cart-total').textContent = formatCurrency(total);
  document.getElementById('cart-flete').textContent = formatCurrency(flete);
  document.getElementById('cart-abono').textContent = formatCurrency(abono);
  document.getElementById('cart-saldo').textContent = formatCurrency(saldo);

  const list = document.getElementById('cart-items-list');
  if (list) {
    list.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <span class="cart-item-factura">${escapeHtml(item.factura)}</span>
        <button class="cart-item-remove" data-idx="${idx}" title="Eliminar">✕</button>
      </div>
    `).join('');
    list.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.idx, 10)));
    });
  }

  modal.classList.remove('hidden');
}

function openCartModal() {
  renderCartModal();
}

function closeCartModal() {
  const modal = document.getElementById('cart-modal');
  if (modal) modal.classList.add('hidden');
}

async function loadFacturas() {
  const loading = document.getElementById('facturas-loading');
  const url = `/api/cartera?bodega=${company}&vendedor=${encodeURIComponent(vendedorName)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    loading.classList.add('hidden');

    if (!response.ok || data.error) {
      loading.textContent = data.error || 'Error cargando facturas';
      loading.classList.remove('hidden');
      return;
    }

    allFacturas = data.facturas || [];
    renderFacturas();
  } catch (err) {
    loading.textContent = 'Error de conexión';
    loading.classList.remove('hidden');
  }
}

function renderFacturas() {
  const tableWrap = document.getElementById('facturas-table-wrap');
  const empty = document.getElementById('facturas-empty');
  const tbody = document.getElementById('facturas-body');
  const cart = getCart();
  const inCart = new Set(cart.map(i => i.factura));

  const term = currentSearch.toLowerCase().trim();
  let filtered = allFacturas;
  if (term) {
    filtered = filtered.filter(row => {
      const cliente = (row.cliente || '').toString().toLowerCase();
      const factura = (row.factura || '').toString().toLowerCase();
      const ciudad = (row.ciudad || '').toString().toLowerCase();
      return cliente.includes(term) || factura.includes(term) || ciudad.includes(term);
    });
  }

  if (filtered.length === 0) {
    tableWrap.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td data-label="Días">${escapeHtml(row.dias)}</td>
      <td data-label="Cliente">${escapeHtml(row.cliente)}</td>
      <td data-label="Dirección">${escapeHtml(row.direccion)}</td>
      <td data-label="Ciudad">${escapeHtml(row.ciudad)}</td>
      <td data-label="Factura">${escapeHtml(row.factura)}</td>
      <td data-label="Saldo">${formatCurrency(row.saldo)}</td>
      <td data-label="Estatus" class="estatus-cell ${escapeHtml((row.estatus || '').toString().toLowerCase().replace(/\s/g, '-'))}">${escapeHtml(row.estatus || '')}</td>
      <td data-label="Docs" class="actions">
        ${row.url_factura ? `<a href="${escapeHtml(row.url_factura)}" target="_blank" rel="noopener" class="icon-link" title="Factura">📄</a>` : '<span class="icon-disabled">📄</span>'}
        ${row.url_guia ? `<a href="${escapeHtml(row.url_guia)}" target="_blank" rel="noopener" class="icon-link" title="Guía">🚚</a>` : '<span class="icon-disabled">🚚</span>'}
        <button class="cart-add-btn icon-link" title="Agregar al carrito" data-factura="${escapeHtml(row.factura)}">🛒</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.cart-add-btn').forEach(btn => {
    const factura = btn.dataset.factura;
    const row = allFacturas.find(r => r.factura === factura);
    btn.addEventListener('click', () => {
      if (row) addToCart(row);
    });
    if (inCart.has(factura)) {
      btn.classList.add('in-cart');
      btn.title = 'Ya está en el carrito';
      btn.textContent = '✓';
      btn.disabled = true;
    }
  });

  tableWrap.classList.remove('hidden');
}

function setupFilters() {
  const searchInput = document.getElementById('search-facturas');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderFacturas();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadFacturas();
  setupFilters();
  updateCartButton();

  const cartFab = document.getElementById('cart-fab');
  if (cartFab) cartFab.addEventListener('click', openCartModal);

  const cartBackdrop = document.querySelector('#cart-modal .modal-backdrop');
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCartModal);

  const btnCerrarCart = document.getElementById('btn-cerrar-cart');
  if (btnCerrarCart) btnCerrarCart.addEventListener('click', closeCartModal);

  const btnVaciarCart = document.getElementById('btn-vaciar-cart');
  if (btnVaciarCart) btnVaciarCart.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearCart();
  });

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem(sessionKey);
      localStorage.removeItem(usernameKey);
      localStorage.removeItem(roleKey);
      localStorage.removeItem(vendedorKey);
      localStorage.removeItem(cartKey);
      window.location.href = `/${company}/`;
    });
  }
});
