const company = window.location.pathname.split('/')[1] || 'bluestar';

function checkAuth() {
  const stored = localStorage.getItem('company');
  const sessionActive = localStorage.getItem('session_active');
  if (!stored || stored !== company || sessionActive !== 'true') {
    localStorage.removeItem('session_active');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
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

  try {
    const response = await fetch(`/api/cartera?bodega=${company}`);
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

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('btn-cartera').addEventListener('click', () => showSection('cartera'));
  document.getElementById('btn-vendedores').addEventListener('click', () => showSection('vendedores'));
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('company');
    localStorage.removeItem('session_active');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
  });

  loadCartera();
});

