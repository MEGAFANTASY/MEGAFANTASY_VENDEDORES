const company = window.location.pathname.split('/')[1] || 'elitech';
const sessionKey = `session_${company}`;
const usernameKey = `username_${company}`;
const roleKey = `role_${company}`;
const vendedorKey = `vendedor_${company}`;

const role = localStorage.getItem(roleKey) || 'vendedor';
const vendedorName = localStorage.getItem(vendedorKey) || '';
const isAdmin = role === 'admin';

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

async function loadCartera() {
  const loading = document.getElementById('cartera-loading');
  const tableWrap = document.getElementById('cartera-table-wrap');
  const empty = document.getElementById('cartera-empty');
  const tbody = document.getElementById('cartera-body');

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

    const facturas = data.facturas || [];

    if (facturas.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    tbody.innerHTML = facturas.map(row => `
      <tr>
        <td data-label="Días">${escapeHtml(row.dias)}</td>
        <td data-label="Cliente">${escapeHtml(row.cliente)}</td>
        <td data-label="Dirección">${escapeHtml(row.direccion)}</td>
        <td data-label="Ciudad">${escapeHtml(row.ciudad)}</td>
        <td data-label="Factura">${escapeHtml(row.factura)}</td>
        <td data-label="Saldo">${formatCurrency(row.saldo)}</td>
        <td data-label="Docs" class="actions">
          ${row.url_factura ? `<a href="${escapeHtml(row.url_factura)}" target="_blank" rel="noopener" class="icon-link" title="Factura">📄</a>` : '<span class="icon-disabled">📄</span>'}
          ${row.url_guia ? `<a href="${escapeHtml(row.url_guia)}" target="_blank" rel="noopener" class="icon-link" title="Guía">🚚</a>` : '<span class="icon-disabled">🚚</span>'}
        </td>
      </tr>
    `).join('');

    tableWrap.classList.remove('hidden');
  } catch (err) {
    loading.textContent = 'Error de conexión';
    loading.classList.remove('hidden');
  }
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
      <div class="vendedor-card">
        <div class="vendedor-nombre">${escapeHtml(v.vendedor)}</div>
        <div class="vendedor-usuario">Usuario: ${escapeHtml(v.usuario)}</div>
      </div>
    `).join('');
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
  document.getElementById('modal-vendedor').classList.remove('hidden');
  document.getElementById('modal-error').textContent = '';
  document.getElementById('select-vendedor').value = '';
  document.getElementById('input-usuario').value = '';
  document.getElementById('input-contrasena').value = '';
  loadVendedoresDisponibles();
}

function closeModal() {
  document.getElementById('modal-vendedor').classList.add('hidden');
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
    const response = await fetch('/api/vendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodega: company, vendedor, usuario, contrasena })
    });
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

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  if (!isAdmin) {
    const btnVendedores = document.getElementById('btn-vendedores');
    if (btnVendedores) btnVendedores.classList.add('hidden');
  }

  document.getElementById('btn-cartera').addEventListener('click', () => showSection('cartera'));
  document.getElementById('btn-vendedores').addEventListener('click', () => showSection('vendedores'));
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(usernameKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(vendedorKey);
    window.location.href = `/${company}/`;
  });

  loadCartera();

  if (isAdmin) {
    loadVendedores();
    document.getElementById('btn-add-vendedor').addEventListener('click', openModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', closeModal);
    document.getElementById('btn-guardar-vendedor').addEventListener('click', saveVendedor);
  }
});

