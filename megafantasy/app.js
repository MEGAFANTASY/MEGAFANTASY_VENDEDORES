const company = window.location.pathname.split('/')[1] || 'megafantasy';

document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('submit');
  const errorEl = document.getElementById('error');

  submitBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    errorEl.textContent = '';

    if (!username || !password) {
      errorEl.textContent = 'Ingresa usuario y contraseña';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, bodega: company })
      });
      const result = await response.json();

      if (response.ok && result.ok) {
        localStorage.setItem('company', company);
        window.location.href = 'admin.html';
      } else {
        errorEl.textContent = result.error || 'Credenciales incorrectas';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar sesión';
      }
    } catch (err) {
      errorEl.textContent = 'Error de conexion';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar sesión';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });
});