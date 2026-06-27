import { createClient } from '/sdk/index.js';

const AUTH_URL = (window.__SDB_AUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const DATA_URL = (window.__SDB_DATA_URL ?? 'http://localhost:3002').replace(/\/$/, '');

const client = createClient({
  url: DATA_URL,
  authUrl: AUTH_URL,
  accessToken: sessionStorage.getItem('sdb_access_token') ?? undefined,
});

const els = {
  status: document.getElementById('status'),
  authPanel: document.getElementById('auth-panel'),
  profilePanel: document.getElementById('profile-panel'),
  authError: document.getElementById('auth-error'),
  profileJson: document.getElementById('profile-json'),
  displayName: document.getElementById('display-name'),
};

function showError(msg) {
  els.authError.textContent = msg;
  els.authError.hidden = !msg;
}

function persistSession(session) {
  sessionStorage.setItem('sdb_access_token', session.access_token);
  sessionStorage.setItem('sdb_refresh_token', session.refresh_token);
  client.setAccessToken(session.access_token);
}

function clearSession() {
  sessionStorage.removeItem('sdb_access_token');
  sessionStorage.removeItem('sdb_refresh_token');
  client.setAccessToken(null);
}

async function loadProfile() {
  const { data: me } = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${client.getAccessToken()}` },
  }).then((r) => r.json()).then((user) => ({ data: user }));

  if (me?.user) {
    els.status.textContent = me.user.email;
  }

  const { data, error } = await client.from('profiles').select('*');
  if (error) {
    showError(error.message);
    return;
  }
  els.profileJson.textContent = JSON.stringify(data, null, 2);
  const row = data?.[0];
  if (row?.display_name) els.displayName.value = row.display_name;
  els.authPanel.hidden = true;
  els.profilePanel.hidden = false;
}

async function ensureAuthed() {
  if (!client.getAccessToken()) return;
  const res = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${client.getAccessToken()}` },
  });
  if (res.ok) await loadProfile();
  else clearSession();
}

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const email = document.getElementById('su-email').value;
  const password = document.getElementById('su-password').value;
  const res = await fetch(`${AUTH_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) return showError(body.message ?? 'Sign up failed');
  persistSession(body);
  await loadProfile();
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const { data, error } = await client.auth.signInWithPassword({
    email: document.getElementById('li-email').value,
    password: document.getElementById('li-password').value,
  });
  if (error) return showError(error.message);
  persistSession(data);
  await loadProfile();
});

document.getElementById('google-btn').addEventListener('click', () => {
  window.location.href = `${AUTH_URL}/auth/signin/google?redirect_to=${encodeURIComponent(window.location.origin)}`;
});

document.getElementById('save-profile').addEventListener('click', async () => {
  const meRes = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${client.getAccessToken()}` },
  });
  const me = await meRes.json();
  if (!me.user) return showError('Not authenticated');
  const { error } = await client.from('profiles').eq('id', me.user.id).update({
    display_name: els.displayName.value,
  });
  if (error) showError(error.message);
  else await loadProfile();
});

document.getElementById('refresh-session').addEventListener('click', async () => {
  const rt = sessionStorage.getItem('sdb_refresh_token');
  if (!rt) return showError('No refresh token');
  const { data, error } = await client.auth.refreshSession(rt);
  if (error) return showError(error.message);
  persistSession(data);
  showError('');
  els.status.textContent = 'Session refreshed';
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await client.auth.signOut(sessionStorage.getItem('sdb_refresh_token') ?? undefined);
  clearSession();
  els.authPanel.hidden = false;
  els.profilePanel.hidden = true;
  els.status.textContent = 'Signed out';
});

const params = new URLSearchParams(window.location.search);
if (params.get('access_token')) {
  persistSession({
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  });
  window.history.replaceState({}, '', window.location.pathname);
  loadProfile();
} else {
  ensureAuthed();
}
