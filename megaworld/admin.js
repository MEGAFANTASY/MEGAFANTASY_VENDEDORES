const company = window.location.pathname.split('/')[1] || 'megafantasy';
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`btn-${name}`).classList.add('active');
}

function renderCartera(facturas) {
  const tableWrap = document.getElementById('cartera-table-wrap');
  const empty = document.getElementById('cartera-empty');
  const tbody = document.getElementById('cartera-body');
  const totalEl = document.getElementById('cartera-total-saldo');

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
      </td>
    </tr>
  `).join('');

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
  document.getElementById('btn-empresas').addEventListener('click', () => {
    window.location.href = '/';
  });
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(usernameKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(vendedorKey);
    window.location.href = `/${company}/`;
  });

  loadCartera();
  setupFilters();

  if (isAdmin) {
    loadVendedores();
    document.getElementById('btn-add-vendedor').addEventListener('click', openModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', closeModal);
    document.getElementById('btn-guardar-vendedor').addEventListener('click', saveVendedor);
  }
});
