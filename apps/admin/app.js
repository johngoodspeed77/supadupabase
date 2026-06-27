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
  projectsBody: document.getElementById('projects-body'),
  usersContent: document.getElementById('users-content'),
  keysContent: document.getElementById('keys-content'),
  createKeyForm: document.getElementById('create-key-form'),
  newKeyResult: document.getElementById('new-key-result'),
};

function authHeaders() {
  return {
    Authorization: `Bearer ${state.accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function adminFetch(path) {
  const res = await fetch(`${AUTH_URL}${path}`, { headers: authHeaders() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? 'Request failed');
  return body;
}

function showView(name) {
  els.views.forEach((v) => {
    v.hidden = v.id !== `view-${name}`;
  });
  els.navLinks.forEach((link) => {
    link.classList.toggle('is-active', link.dataset.view === name);
  });
  if (name === 'projects') renderProjects();
  if (name === 'users') renderUsers();
  if (name === 'keys') renderKeys();
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
  showView('projects');
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

async function renderProjects() {
  if (!state.accessToken) {
    els.projectsBody.innerHTML = '<tr><td colspan="3">Sign in as admin</td></tr>';
    return;
  }
  try {
    const { projects } = await adminFetch('/admin/projects');
    els.projectsBody.innerHTML = projects
      .map(
        (p) => `
      <tr>
        <td>${p.name}</td>
        <td><code>${p.slug}</code></td>
        <td><span class="sdb-badge">active</span></td>
      </tr>`,
      )
      .join('');
  } catch (err) {
    els.projectsBody.innerHTML = `<tr><td colspan="3" class="sdb-dim">${err.message}</td></tr>`;
  }
}

async function renderUsers() {
  if (!state.accessToken) {
    els.usersContent.innerHTML = '<p class="sdb-muted">Sign in to view users.</p>';
    return;
  }
  try {
    const { users } = await adminFetch('/admin/users');
    els.usersContent.innerHTML = `
      <table class="sdb-table">
        <thead><tr><th>Email</th><th>Verified</th><th>Google</th><th>Created</th></tr></thead>
        <tbody>
          ${users
            .map(
              (u) => `<tr>
            <td>${u.email}</td>
            <td>${u.email_verified ? 'yes' : 'no'}</td>
            <td>${u.google_id ? 'linked' : '—'}</td>
            <td>${new Date(u.created_at).toLocaleString()}</td>
          </tr>`,
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (err) {
    els.usersContent.innerHTML = `<p class="sdb-dim">${err.message}</p>`;
  }
}

async function renderKeys() {
  if (!state.accessToken) {
    els.keysContent.innerHTML = '<p class="sdb-muted">Sign in to manage keys.</p>';
    return;
  }
  try {
    const { keys } = await adminFetch('/admin/api-keys');
    const list =
      keys.length === 0
        ? '<p class="sdb-muted">No API keys yet.</p>'
        : `<table class="sdb-table">
        <thead><tr><th>Name</th><th>Project</th><th>Role</th><th>Prefix</th><th>Created</th></tr></thead>
        <tbody>${keys
          .map(
            (k) => `<tr>
          <td>${k.name}</td>
          <td>${k.project_name}</td>
          <td><code>${k.role}</code></td>
          <td><code>${k.key_prefix}…</code></td>
          <td>${new Date(k.created_at).toLocaleString()}</td>
        </tr>`,
          )
          .join('')}</tbody></table>`;
    els.keysContent.querySelector('[data-keys-list]').innerHTML = list;
  } catch (err) {
    els.keysContent.querySelector('[data-keys-list]').innerHTML = `<p class="sdb-dim">${err.message}</p>`;
  }
}

if (els.createKeyForm) {
  els.createKeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.newKeyResult.hidden = true;
    const name = document.getElementById('key-name').value;
    const role = document.getElementById('key-role').value;
    try {
      const res = await fetch(`${AUTH_URL}/auth/api-keys`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          role,
          project_id: '00000000-0000-0000-0000-000000000001',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Failed');
      els.newKeyResult.textContent = `Copy now — shown once: ${body.key}`;
      els.newKeyResult.hidden = false;
      renderKeys();
    } catch (err) {
      els.newKeyResult.textContent = err.message;
      els.newKeyResult.hidden = false;
    }
  });
}

const hash = window.location.hash.replace('#', '') || 'projects';
showView(['projects', 'users', 'keys', 'login'].includes(hash) ? hash : 'projects');
fetchMe();

const params = new URLSearchParams(window.location.search);
if (params.get('access_token')) {
  setSession({
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    user: null,
  });
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  fetchMe().then(() => showView('projects'));
}
