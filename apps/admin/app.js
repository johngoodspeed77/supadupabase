const AUTH_URL = (window.__SDB_AUTH_URL ?? window.location.origin).replace(/\/$/, '');

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
  emailsContent: document.getElementById('emails-content'),
  smtpStatus: document.getElementById('smtp-status'),
  testEmailForm: document.getElementById('test-email-form'),
  testEmailResult: document.getElementById('test-email-result'),
};

function authHeaders() {
  return {
    Authorization: `Bearer ${state.accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function refreshSession() {
  if (!state.refreshToken) return false;
  const res = await fetch(`${AUTH_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.refreshToken }),
  });
  if (!res.ok) return false;
  const body = await res.json();
  setSession(body);
  return true;
}

async function adminFetch(path, options = {}) {
  const doFetch = () =>
    fetch(`${AUTH_URL}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...options.headers },
    });

  let res = await doFetch();
  let body = await res.json();
  if (res.status === 401 && (await refreshSession())) {
    res = await doFetch();
    body = await res.json();
  }
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
  if (name === 'emails') renderEmails();
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
  if (!state.accessToken && !state.refreshToken) return;
  if (!state.accessToken && state.refreshToken) {
    const ok = await refreshSession();
    if (!ok) {
      clearSession();
      return;
    }
  }

  let res = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });
  if (res.status === 401 && (await refreshSession())) {
    res = await fetch(`${AUTH_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${state.accessToken}` },
    });
  }
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

async function renderEmails() {
  els.testEmailResult.hidden = true;
  if (!state.accessToken) {
    els.smtpStatus.innerHTML = '<p class="sdb-muted">Sign in to test email.</p>';
    els.testEmailForm.querySelector('button').disabled = true;
    return;
  }
  els.testEmailForm.querySelector('button').disabled = false;
  try {
    const status = await adminFetch('/admin/mail/status');
    if (status.configured) {
      els.smtpStatus.innerHTML = `
        <p><span class="sdb-badge">configured</span></p>
        <p class="sdb-muted" style="margin-top: 0.5rem">
          From <code>${status.smtp_from}</code> via <code>${status.smtp_host}:${status.smtp_port}</code>
        </p>`;
    } else {
      els.smtpStatus.innerHTML = `
        <p><span class="sdb-badge" style="opacity:0.7">not configured</span></p>
        <p class="sdb-dim" style="margin-top: 0.5rem">
          Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in the server <code>.env</code>, then restart mail-service.
        </p>`;
      els.testEmailForm.querySelector('button').disabled = true;
    }
  } catch (err) {
    const msg =
      err.message === 'Invalid or expired access token'
        ? 'Your admin session expired. Use Logout, then sign in again. (This is not your Google app password.)'
        : err.message;
    els.smtpStatus.innerHTML = `<p class="sdb-dim">${msg}</p>`;
    els.testEmailForm.querySelector('button').disabled = true;
  }
}

if (els.testEmailForm) {
  els.testEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.testEmailResult.hidden = true;
    const to = document.getElementById('test-email-to').value;
    const btn = els.testEmailForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const body = await adminFetch('/admin/mail/test', {
        method: 'POST',
        body: JSON.stringify({ to }),
      });
      els.testEmailResult.textContent = `Test email sent to ${body.sent_to}. Check the inbox (and spam folder).`;
      els.testEmailResult.className = 'sdb-alert sdb-alert--success';
      els.testEmailResult.hidden = false;
    } catch (err) {
      els.testEmailResult.textContent = err.message;
      els.testEmailResult.className = 'sdb-alert sdb-alert--error';
      els.testEmailResult.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send test email';
    }
  });
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
const initialView = ['projects', 'users', 'keys', 'emails', 'login'].includes(hash) ? hash : 'projects';

const params = new URLSearchParams(window.location.search);
if (params.get('access_token')) {
  setSession({
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    user: null,
  });
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
}

fetchMe().then(() => {
  if (initialView !== 'login' && !state.accessToken) {
    showView('login');
    return;
  }
  showView(initialView);
});
