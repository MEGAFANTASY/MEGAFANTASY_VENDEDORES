const company = window.location.pathname.split('/')[1] || 'elitech';
const sessionKey = `session_${company}`;
const usernameKey = `username_${company}`;
const roleKey = `role_${company}`;
const vendedorKey = `vendedor_${company}`;

const role = localStorage.getItem(roleKey) || 'vendedor';
const vendedorName = localStorage.getItem(vendedorKey) || '';
const isAdmin = role === 'admin';

let allFacturas = [];
let currentStatus = 'todas';
let currentSearch = '';
let selectedCiudades = [];
let editingVendedorId = null;
const cartKey = `carrito_${company}`;
let manifiestoSearch = '';
let manifiestosAbort = null;
let allTransportadoras = [];
let confirmarSearch = '';

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

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`btn-${name}`).classList.add('active');
}

function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
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
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCartModal();
}

function clearCart(e) {
  if (e) e.preventDefault();
  saveCart([]);
  applyFilters();
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

function renderCartera(facturas) {
  const tableWrap = document.getElementById('cartera-table-wrap');
  const empty = document.getElementById('cartera-empty');
  const tbody = document.getElementById('cartera-body');
  const totalEl = document.getElementById('cartera-total-saldo');
  const cart = getCart();
  const inCart = new Set(cart.map(i => i.factura));

  const total = facturas.reduce((sum, row) => sum + (parseFloat(row.saldo) || 0), 0);
  if (totalEl) totalEl.textContent = formatCurrency(total);

  if (facturas.length === 0) {
    tableWrap.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = facturas.map(row => `
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

function applyFilters() {
  const term = currentSearch.toLowerCase().trim();
  const statusNorm = currentStatus.toLowerCase().trim();

  let filtered = allFacturas;

  if (statusNorm && statusNorm !== 'todas') {
    filtered = filtered.filter(row => {
      const rowStatus = (row.estatus || '').toString().toLowerCase().trim();
      return rowStatus === statusNorm;
    });
  }

  if (selectedCiudades.length > 0) {
    filtered = filtered.filter(row => {
      const ciudad = (row.ciudad || '').toString().trim().toLowerCase();
      return selectedCiudades.includes(ciudad);
    });
  }

  if (term) {
    filtered = filtered.filter(row => {
      const cliente = (row.cliente || '').toString().toLowerCase();
      const factura = (row.factura || '').toString().toLowerCase();
      const ciudad = (row.ciudad || '').toString().toLowerCase();
      return cliente.includes(term) || factura.includes(term) || ciudad.includes(term);
    });
  }

  renderCartera(filtered);
}

function populateCiudades() {
  const panel = document.getElementById('ciudades-options');
  if (!panel) return;

  const ciudades = Array.from(new Set(
    allFacturas
      .map(row => (row.ciudad || '').toString().trim())
      .filter(c => c)
      .sort((a, b) => a.localeCompare(b))
  ));

  panel.innerHTML = ciudades.map(ciudad => {
    const value = ciudad.toLowerCase();
    const checked = selectedCiudades.includes(value) ? 'checked' : '';
    return `
      <label class="ciudad-option">
        <input type="checkbox" value="${escapeHtml(value)}" ${checked} />
        <span>${escapeHtml(ciudad)}</span>
      </label>
    `;
  }).join('');

  panel.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => {
      selectedCiudades = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
      updateCiudadesTrigger();
      applyFilters();
    });
  });

  updateCiudadesTrigger();
}

function updateCiudadesTrigger() {
  const trigger = document.getElementById('ciudades-trigger');
  const limpiarBtn = document.getElementById('btn-limpiar-ciudades');
  if (!trigger) return;
  if (selectedCiudades.length === 0) {
    trigger.textContent = 'Ciudades';
    trigger.classList.remove('has-selection');
    if (limpiarBtn) limpiarBtn.classList.add('hidden');
  } else {
    trigger.textContent = `${selectedCiudades.length} ciudad${selectedCiudades.length > 1 ? 'es' : ''}`;
    trigger.classList.add('has-selection');
    if (limpiarBtn) limpiarBtn.classList.remove('hidden');
  }
}

function setupCiudadesFilter() {
  const dropdown = document.getElementById('ciudades-dropdown');
  const trigger = document.getElementById('ciudades-trigger');
  const panel = document.getElementById('ciudades-panel');
  const limpiarBtn = document.getElementById('btn-limpiar-ciudades');
  if (!dropdown || !trigger || !panel) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  if (limpiarBtn) {
    limpiarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedCiudades = [];
      document.querySelectorAll('#ciudades-options input[type="checkbox"]').forEach(c => c.checked = false);
      updateCiudadesTrigger();
      applyFilters();
    });
  }

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });
}

async function loadCartera() {
  const loading = document.getElementById('cartera-loading');

  const url = isAdmin
    ? `/api/cartera?bodega=${company}`
    : `/api/cartera?bodega=${company}&vendedor=${encodeURIComponent(vendedorName)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    loading.classList.add('hidden');

    if (!response.ok || data.error) {
      loading.textContent = data.error || 'Error cargando cartera';
      loading.classList.remove('hidden');
      return;
    }

    allFacturas = data.facturas || [];
    populateCiudades();
    applyFilters();
  } catch (err) {
    loading.textContent = 'Error de conexión';
    loading.classList.remove('hidden');
  }
}

function setupFilters() {
  const searchInput = document.getElementById('search-cartera');
  const statusButtons = document.querySelectorAll('.status-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      applyFilters();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchInput.blur();
      }
    });
  }

  statusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      statusButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status;
      applyFilters();
    });
  });

  setupCiudadesFilter();
}

async function loadManifiestos() {
  const loading = document.getElementById('manifiestos-loading');
  const term = encodeURIComponent(manifiestoSearch);

  if (manifiestosAbort) manifiestosAbort.abort();
  manifiestosAbort = new AbortController();

  try {
    if (loading) loading.classList.remove('hidden');
    const response = await fetch(`/api/manifiestos?bodega=${company}&q=${term}`, {
      signal: manifiestosAbort.signal
    });
    const data = await response.json();
    if (loading) loading.classList.add('hidden');

    if (!response.ok || data.error) {
      if (loading) {
        loading.textContent = data.error || 'Error cargando manifiestos';
        loading.classList.remove('hidden');
      }
      return;
    }

    renderManifiestos(data.manifiestos || []);
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (loading) {
      loading.textContent = 'Error de conexión';
      loading.classList.remove('hidden');
    }
  }
}

const debouncedLoadManifiestos = debounce(loadManifiestos, 350);

function renderManifiestos(list) {
  const wrap = document.getElementById('manifiestos-table-wrap');
  const empty = document.getElementById('manifiestos-empty');
  const tbody = document.getElementById('manifiestos-body');

  if (!wrap || !empty || !tbody) return;

  if (list.length === 0) {
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = list.map(m => `
    <tr>
      <td data-label="Referencia">${escapeHtml(m.referencia || '')}</td>
      <td data-label="Descripción">${escapeHtml(m.descripcion || '')}</td>
      <td data-label="Manifiesto" class="actions">
        ${m.url_manifiesto ? `<a href="${escapeHtml(m.url_manifiesto)}" target="_blank" rel="noopener" class="icon-link" title="Ver manifiesto">📄</a>` : '<span class="icon-disabled">📄</span>'}
      </td>
    </tr>
  `).join('');

  wrap.classList.remove('hidden');
}

function setupManifiestosFilter() {
  const input = document.getElementById('search-manifiestos');
  if (!input) return;
  input.addEventListener('input', (e) => {
    manifiestoSearch = e.target.value;
    debouncedLoadManifiestos();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
  });
}

/* ===== Transportadoras / Confirmar despachos ===== */

async function loadTransportadoras() {
  const loading = document.getElementById('confirmar-loading');
  const empty = document.getElementById('confirmar-empty');
  const cards = document.getElementById('confirmar-cards');

  const url = isAdmin
    ? `/api/transportadoras?bodega=${company}`
    : `/api/transportadoras?bodega=${company}&vendedor=${encodeURIComponent(vendedorName)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    loading.classList.add('hidden');

    if (!response.ok || data.error) {
      loading.textContent = data.error || 'Error cargando despachos';
      loading.classList.remove('hidden');
      return;
    }

    allTransportadoras = data.transportadoras || [];
    renderConfirmar();
  } catch (err) {
    loading.textContent = 'Error de conexión';
    loading.classList.remove('hidden');
  }
}

function renderConfirmar() {
  const wrap = document.getElementById('confirmar-cards');
  const empty = document.getElementById('confirmar-empty');
  if (!wrap || !empty) return;

  const term = confirmarSearch.toLowerCase().trim();

  let filtered = allTransportadoras.filter(row => {
    const confirmadoG = (row.confirmado || '').toString().trim();
    const confirmadoH = (row.confirmado_app_vendedor || '').toString().trim();
    return confirmadoG === '' && confirmadoH === '';
  });
  if (term) {
    filtered = filtered.filter(row => {
      const f = (row.factura || '').toString().toLowerCase();
      const c = (row.cliente || '').toString().toLowerCase();
      const ci = (row.ciudad || '').toString().toLowerCase();
      return f.includes(term) || c.includes(term) || ci.includes(term);
    });
  }

  if (filtered.length === 0) {
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  wrap.innerHTML = filtered.map(row => {
    const confirmado = (row.confirmado_app_vendedor || '').toString().trim();
    const isConfirmed = confirmado !== '';
    return `
      <div class="confirmar-card${isConfirmed ? ' confirmed' : ''}" data-factura="${escapeHtml(row.factura)}">
        <div class="confirmar-card-header">
          <span class="confirmar-factura">${escapeHtml(row.factura)}</span>
          ${isConfirmed ? '<span class="confirmar-badge">✓ ' + escapeHtml(confirmado) + '</span>' : ''}
        </div>
        <div class="confirmar-card-body">
          <div><strong>Cliente:</strong> ${escapeHtml(row.cliente)}</div>
          <div><strong>Ciudad:</strong> ${escapeHtml(row.ciudad)}</div>
          <div><strong>Dirección:</strong> ${escapeHtml(row.direccion)}</div>
          <div><strong>Despacho:</strong> ${escapeHtml(row.fechadespacho)}</div>
          <div><strong>Vendedor:</strong> ${escapeHtml(row.vendedor)}</div>
        </div>
        <button class="confirmar-btn" data-factura="${escapeHtml(row.factura)}"
                ${isConfirmed ? 'disabled' : ''}>
          ${isConfirmed ? 'Confirmado' : 'Confirmar despacho'}
        </button>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('.confirmar-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => confirmarTransportadora(btn.dataset.factura));
  });

  wrap.classList.remove('hidden');
}

let pendingConfirmarFactura = null;

function openConfirmarFechaModal(factura) {
  pendingConfirmarFactura = factura;
  const modal = document.getElementById('confirmar-fecha-modal');
  const facturaEl = document.getElementById('confirmar-fecha-factura');
  const input = document.getElementById('confirmar-fecha-input');
  const errorEl = document.getElementById('confirmar-fecha-error');

  facturaEl.textContent = `Factura: ${factura}`;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  input.value = `${yyyy}-${mm}-${dd}`;
  errorEl.textContent = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
}

function closeConfirmarFechaModal() {
  const modal = document.getElementById('confirmar-fecha-modal');
  if (modal) modal.classList.add('hidden');
  pendingConfirmarFactura = null;
}

async function submitConfirmarFecha() {
  const input = document.getElementById('confirmar-fecha-input');
  const errorEl = document.getElementById('confirmar-fecha-error');
  const btnConfirmar = document.getElementById('btn-confirmar-fecha');
  const btnCancelar = document.getElementById('btn-cancelar-fecha');
  const value = (input.value || '').trim();

  if (!value) {
    errorEl.textContent = 'Selecciona una fecha';
    return;
  }

  const parts = value.split('-');
  if (parts.length !== 3) {
    errorEl.textContent = 'Fecha inválida';
    return;
  }
  const fechaTrim = `${parts[2]}/${parts[1]}/${parts[0]}`;
  const factura = pendingConfirmarFactura;
  if (!factura) return;

  // Bloquear botones y mostrar estado de carga
  btnConfirmar.disabled = true;
  btnCancelar.disabled = true;
  btnConfirmar.textContent = 'Confirmando...';
  errorEl.textContent = '';

  // Marcar la tarjeta como confirmando inmediatamente
  const card = document.querySelector(`.confirmar-card[data-factura="${CSS.escape(factura)}"]`);
  if (card) {
    const btn = card.querySelector('.confirmar-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Confirmando...';
    }
  }

  // Cerrar el modal inmediatamente
  closeConfirmarFechaModal();

  try {
    const response = await fetch('/api/confirmar-transportadora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bodega: company,
        factura: factura,
        vendedor: isAdmin ? '' : vendedorName,
        fecha: fechaTrim
      })
    });
    const result = await response.json();

    if (response.ok && result.ok) {
      showToast(`Factura ${factura} confirmada con fecha ${fechaTrim}`, 'success');
      loadTransportadoras();
    } else {
      showToast(result.error || 'Error al confirmar', 'error');
      // Restaurar la tarjeta si falla
      if (card) {
        const btn = card.querySelector('.confirmar-btn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Confirmar despacho';
        }
      }
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
    if (card) {
      const btn = card.querySelector('.confirmar-btn');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar despacho';
      }
    }
  } finally {
    btnConfirmar.disabled = false;
    btnCancelar.disabled = false;
    btnConfirmar.textContent = 'Confirmar';
  }
}

async function confirmarTransportadora(factura) {
  openConfirmarFechaModal(factura);
}

function setupConfirmarFilter() {
  const input = document.getElementById('search-confirmar');
  if (!input) return;
  input.addEventListener('input', (e) => {
    confirmarSearch = e.target.value;
    renderConfirmar();
  });
}

async function loadVendedores() {
  const loading = document.getElementById('vendedores-loading');
  const empty = document.getElementById('vendedores-empty');
  const cards = document.getElementById('vendedores-cards');

  try {
    const response = await fetch(`/api/vendedores?bodega=${company}`);
    const data = await response.json();

    loading.classList.add('hidden');

    if (!response.ok || data.error) {
      loading.textContent = data.error || 'Error cargando vendedores';
      loading.classList.remove('hidden');
      return;
    }

    const vendedores = data.vendedores || [];

    if (vendedores.length === 0) {
      empty.classList.remove('hidden');
      cards.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    cards.innerHTML = vendedores.map(v => `
      <div class="vendedor-card" data-id="${escapeHtml(v.id)}">
        <div class="vendedor-nombre">${escapeHtml(v.vendedor)}</div>
        <div class="vendedor-usuario">Usuario: ${escapeHtml(v.usuario)}</div>
        <div class="vendedor-contrasena">Contraseña: ${escapeHtml(v.contrasena)}</div>
        <div class="vendedor-actions">
          <button class="vendedor-btn edit" data-id="${escapeHtml(v.id)}" data-vendedor="${escapeHtml(v.vendedor)}" data-usuario="${escapeHtml(v.usuario)}" data-contrasena="${escapeHtml(v.contrasena)}">Editar</button>
          <button class="vendedor-btn delete" data-id="${escapeHtml(v.id)}">Eliminar</button>
        </div>
      </div>
    `).join('');

    cards.querySelectorAll('.vendedor-btn.edit').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset));
    });
    cards.querySelectorAll('.vendedor-btn.delete').forEach(btn => {
      btn.addEventListener('click', () => deleteVendedor(btn.dataset.id));
    });

    cards.classList.remove('hidden');
  } catch (err) {
    loading.textContent = 'Error de conexión';
    loading.classList.remove('hidden');
  }
}

async function loadVendedoresDisponibles() {
  const select = document.getElementById('select-vendedor');
  select.innerHTML = '<option value="">Selecciona un vendedor</option>';
  try {
    const response = await fetch(`/api/vendedores-disponibles?bodega=${company}`);
    const data = await response.json();
    if (!response.ok || data.error) return;
    const vendedores = data.vendedores || [];
    vendedores.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error cargando vendedores disponibles', err);
  }
}

function openModal() {
  editingVendedorId = null;
  document.getElementById('modal-titulo').textContent = 'Crear usuario vendedor';
  document.getElementById('input-id').value = '';
  document.getElementById('modal-vendedor').classList.remove('hidden');
  document.getElementById('modal-error').textContent = '';
  document.getElementById('select-vendedor').value = '';
  document.getElementById('input-usuario').value = '';
  document.getElementById('input-contrasena').value = '';
  document.getElementById('select-vendedor').disabled = false;
  loadVendedoresDisponibles();
}

function openEditModal(data) {
  editingVendedorId = data.id;
  document.getElementById('modal-titulo').textContent = 'Editar usuario vendedor';
  document.getElementById('input-id').value = data.id;
  document.getElementById('modal-vendedor').classList.remove('hidden');
  document.getElementById('modal-error').textContent = '';

  const select = document.getElementById('select-vendedor');
  select.innerHTML = `<option value="${escapeHtml(data.vendedor)}" selected>${escapeHtml(data.vendedor)}</option>`;
  select.value = data.vendedor;
  select.disabled = true;

  document.getElementById('input-usuario').value = data.usuario;
  document.getElementById('input-contrasena').value = data.contrasena;
}

function closeModal() {
  document.getElementById('modal-vendedor').classList.add('hidden');
  editingVendedorId = null;
}

async function saveVendedor() {
  const vendedor = document.getElementById('select-vendedor').value.trim();
  const usuario = document.getElementById('input-usuario').value.trim();
  const contrasena = document.getElementById('input-contrasena').value;
  const errorEl = document.getElementById('modal-error');
  errorEl.textContent = '';

  if (!vendedor || !usuario || !contrasena) {
    errorEl.textContent = 'Completa todos los campos';
    return;
  }
  if (contrasena.length < 4) {
    errorEl.textContent = 'La contraseña debe tener mínimo 4 caracteres';
    return;
  }

  try {
    let response;
    if (editingVendedorId) {
      response = await fetch('/api/vendedores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodega: company, id: editingVendedorId, vendedor, usuario, contrasena })
      });
    } else {
      response = await fetch('/api/vendedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodega: company, vendedor, usuario, contrasena })
      });
    }
    const result = await response.json();

    if (response.ok && result.ok) {
      closeModal();
      await loadVendedores();
    } else {
      errorEl.textContent = result.error || 'Error guardando vendedor';
    }
  } catch (err) {
    errorEl.textContent = 'Error de conexión';
  }
}

async function deleteVendedor(id) {
  if (!confirm('¿Eliminar este usuario vendedor?')) return;
  try {
    const response = await fetch(`/api/vendedores?bodega=${company}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (response.ok && result.ok) {
      await loadVendedores();
    } else {
      alert(result.error || 'Error eliminando vendedor');
    }
  } catch (err) {
    alert('Error de conexión');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  if (!isAdmin) {
    const btnVendedores = document.getElementById('btn-vendedores');
    if (btnVendedores) btnVendedores.classList.add('hidden');
  }

  document.getElementById('btn-cartera').addEventListener('click', () => showSection('cartera'));
  document.getElementById('btn-vendedores').addEventListener('click', () => showSection('vendedores'));
  document.getElementById('btn-manifiestos').addEventListener('click', () => showSection('manifiestos'));
  document.getElementById('btn-confirmar').addEventListener('click', () => showSection('confirmar'));
  document.getElementById('btn-empresas').addEventListener('click', () => {
    window.location.href = '/';
  });
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(usernameKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(vendedorKey);
    localStorage.removeItem(cartKey);
    window.location.href = `/${company}/`;
  });

  loadCartera();
  setupFilters();
  loadManifiestos();
  setupManifiestosFilter();
  loadTransportadoras();
  setupConfirmarFilter();
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

  const fechaBackdrop = document.querySelector('#confirmar-fecha-modal .modal-backdrop');
  if (fechaBackdrop) fechaBackdrop.addEventListener('click', closeConfirmarFechaModal);
  const btnCancelarFecha = document.getElementById('btn-cancelar-fecha');
  if (btnCancelarFecha) btnCancelarFecha.addEventListener('click', closeConfirmarFechaModal);
  const btnConfirmarFecha = document.getElementById('btn-confirmar-fecha');
  if (btnConfirmarFecha) btnConfirmarFecha.addEventListener('click', submitConfirmarFecha);
  const fechaInput = document.getElementById('confirmar-fecha-input');
  if (fechaInput) fechaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitConfirmarFecha();
    }
  });

  if (isAdmin) {
    loadVendedores();
    document.getElementById('btn-add-vendedor').addEventListener('click', openModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', closeModal);
    document.getElementById('btn-guardar-vendedor').addEventListener('click', saveVendedor);
  }
});
