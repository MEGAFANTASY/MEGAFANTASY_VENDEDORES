const company = window.location.pathname.split('/')[1] || 'megaworld';

document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('submit');
  const errorEl = document.getElementById('error');

  submitBtn.addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    errorEl.textContent = '';

    if (!username || !password) {
      errorEl.textContent = 'Ingresa usuario y contraseña';
      return;
    }

    console.log(`Login attempt for ${company}:`, { username, password });
    localStorage.setItem('company', company);
    window.location.href = 'facturas.html';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });
});