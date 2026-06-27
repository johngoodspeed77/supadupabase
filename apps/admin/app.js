const AUTH_URL = (window.__SDB_AUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const state = {
  accessToken: sessionStorage.getItem('sdb_access_token'),
  refreshToken: sessionStorage.getItem('sdb_refresh_token'),
  user: null,
};

const els = {
  views: document.querySelectorAll('.sdb-view'),
  navLinks: document.querySelectorAll('.sdb-nav__link'),
  userEmail: document.getElementById('user-email'),
  logoutBtn: document.getElementById('logout-btn'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  googleBtn: document.getElementById('google-btn'),
  usersContent: document.getElementById('users-content'),
};

function showView(name) {
  els.views.forEach((v) => {
    v.hidden = v.id !== `view-${name}`;
  });
  els.navLinks.forEach((link) => {
    link.classList.toggle('is-active', link.dataset.view === name);
  });
}

function setSession(session) {
  state.accessToken = session.access_token;
  state.refreshToken = session.refresh_token;
  state.user = session.user;
  sessionStorage.setItem('sdb_access_token', session.access_token);
  sessionStorage.setItem('sdb_refresh_token', session.refresh_token);
  updateUserUi();
}

function clearSession() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  sessionStorage.removeItem('sdb_access_token');
  sessionStorage.removeItem('sdb_refresh_token');
  updateUserUi();
}

function updateUserUi() {
  if (state.user) {
    els.userEmail.textContent = state.user.email;
    els.logoutBtn.hidden = false;
  } else {
    els.userEmail.textContent = 'Not signed in';
    els.logoutBtn.hidden = true;
  }
}

async function fetchMe() {
  if (!state.accessToken) return;
  const res = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });
  if (!res.ok) {
    clearSession();
    return;
  }
  const body = await res.json();
  state.user = body.user;
  updateUserUi();
}

els.navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showView(link.dataset.view);
  });
});

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.hidden = true;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    els.loginError.textContent = body.message ?? 'Login failed';
    els.loginError.hidden = false;
    return;
  }
  setSession(body);
  showView('users');
  renderUsers();
});

els.logoutBtn.addEventListener('click', async () => {
  if (state.refreshToken) {
    await fetch(`${AUTH_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: state.refreshToken }),
    });
  }
  clearSession();
  showView('login');
});

els.googleBtn.addEventListener('click', () => {
  window.location.href = `${AUTH_URL}/auth/signin/google?redirect_to=${encodeURIComponent(window.location.origin + '/#login')}`;
});

function renderUsers() {
  if (!state.user) {
    els.usersContent.innerHTML = '<p class="sdb-muted">Sign in to view your account.</p>';
    return;
  }
  els.usersContent.innerHTML = `
    <table class="sdb-table">
      <thead><tr><th>Email</th><th>User ID</th><th>Created</th></tr></thead>
      <tbody>
        <tr>
          <td>${state.user.email}</td>
          <td><code>${state.user.id}</code></td>
          <td>${new Date(state.user.created_at).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  `;
}

const hash = window.location.hash.replace('#', '') || 'projects';
showView(['projects', 'users', 'keys', 'login'].includes(hash) ? hash : 'projects');
fetchMe().then(renderUsers);

const params = new URLSearchParams(window.location.search);
if (params.get('access_token')) {
  setSession({
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    user: null,
  });
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  fetchMe().then(() => {
    showView('users');
    renderUsers();
  });
}
