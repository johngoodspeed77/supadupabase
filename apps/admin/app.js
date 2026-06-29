import {
  loadTokens,
  saveTokens,
  clearTokens,
  refreshAuthSession,
  restoreAuthSession,
} from './ui/session.js';

const AUTH_URL = (window.__SDB_AUTH_URL ?? window.location.origin).replace(/\/$/, '');

const initialTokens = loadTokens();
const state = {
  accessToken: initialTokens.accessToken,
  refreshToken: initialTokens.refreshToken,
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
  userDetailDialog: document.getElementById('user-detail-dialog'),
  userDetailTitle: document.getElementById('user-detail-title'),
  userDetailBody: document.getElementById('user-detail-body'),
  userDetailClose: document.getElementById('user-detail-close'),
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function userStatusBadges(u) {
  const badges = [];
  if (u.banned_at) badges.push('<span class="sdb-badge sdb-badge--danger">suspended</span>');
  else if (u.email_verified) badges.push('<span class="sdb-badge sdb-badge--success">verified</span>');
  else badges.push('<span class="sdb-badge sdb-badge--warning">unverified</span>');
  if (u.google_id) badges.push('<span class="sdb-badge">google</span>');
  return badges.join(' ');
}

function authHeaders() {
  return {
    Authorization: `Bearer ${state.accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function refreshSession() {
  const session = await refreshAuthSession(AUTH_URL, state.refreshToken);
  if (!session) return false;
  setSession(session);
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
  state.user = session.user ?? state.user;
  saveTokens(session.access_token, session.refresh_token);
  updateUserUi();
}

function clearSession() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  clearTokens();
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
  const restored = await restoreAuthSession(AUTH_URL);
  if (!restored) {
    clearSession();
    return;
  }
  state.accessToken = restored.accessToken;
  state.refreshToken = restored.refreshToken;
  state.user = restored.user;
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
    const [{ users }, { invites }] = await Promise.all([
      adminFetch('/admin/users'),
      adminFetch('/admin/invites'),
    ]);

    const inviteRows =
      invites.length === 0
        ? '<p class="sdb-muted">No pending invites.</p>'
        : `<table class="sdb-table">
        <thead><tr><th>Email</th><th>Project</th><th>Expires</th><th></th></tr></thead>
        <tbody>${invites
          .map(
            (inv) => `<tr>
          <td>${esc(inv.email)}</td>
          <td>${esc(inv.project_name ?? '—')}</td>
          <td>${new Date(inv.expires_at).toLocaleString()}</td>
          <td><button type="button" class="sdb-btn sdb-btn--ghost sdb-btn--sm" data-invite-revoke="${inv.id}">Revoke</button></td>
        </tr>`,
          )
          .join('')}</tbody></table>`;

    els.usersContent.innerHTML = `
      <h3 class="sdb-card__title">Invite user</h3>
      <form id="invite-user-form" class="sdb-form-row" style="align-items: flex-end">
        <div style="flex:1;min-width:200px">
          <label class="sdb-label" for="invite-email">Email</label>
          <input class="sdb-input" id="invite-email" type="email" placeholder="user@example.com" required />
        </div>
        <button class="sdb-btn sdb-btn--primary" type="submit">Send invite</button>
      </form>
      <div id="invite-result" class="sdb-alert" hidden style="margin-bottom:1rem"></div>

      <h3 class="sdb-section-title">Pending invites</h3>
      ${inviteRows}

      <h3 class="sdb-section-title">All users (${users.length})</h3>
      <table class="sdb-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Projects</th>
            <th>Sessions</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map((u) => {
              const projects = (u.project_slugs ?? []).map((s) => `<code>${esc(s)}</code>`).join(', ') || '—';
              const isSelf = state.user?.id === u.id;
              return `<tr>
            <td>${esc(u.email)}</td>
            <td>${userStatusBadges(u)}</td>
            <td>${projects}</td>
            <td>${u.active_sessions ?? 0}</td>
            <td>${new Date(u.created_at).toLocaleString()}</td>
            <td>
              <div class="sdb-actions">
                <button type="button" class="sdb-btn sdb-btn--ghost sdb-btn--sm" data-user-action="detail" data-user-id="${u.id}">Details</button>
                ${
                  u.email_verified
                    ? `<button type="button" class="sdb-btn sdb-btn--ghost sdb-btn--sm" data-user-action="unverify" data-user-id="${u.id}">Unverify</button>`
                    : `<button type="button" class="sdb-btn sdb-btn--primary sdb-btn--sm" data-user-action="verify" data-user-id="${u.id}">Verify</button>`
                }
                ${
                  u.banned_at
                    ? `<button type="button" class="sdb-btn sdb-btn--ghost sdb-btn--sm" data-user-action="unsuspend" data-user-id="${u.id}">Unsuspend</button>`
                    : `<button type="button" class="sdb-btn sdb-btn--ghost sdb-btn--sm" data-user-action="suspend" data-user-id="${u.id}" ${isSelf ? 'disabled title="Cannot suspend yourself"' : ''}>Suspend</button>`
                }
                <button type="button" class="sdb-btn sdb-btn--danger sdb-btn--sm" data-user-action="delete" data-user-id="${u.id}" data-user-email="${esc(u.email)}" ${isSelf ? 'disabled title="Cannot delete yourself"' : ''}>Delete</button>
              </div>
            </td>
          </tr>`;
            })
            .join('')}
        </tbody>
      </table>`;

    document.getElementById('invite-user-form').addEventListener('submit', onInviteSubmit);
    els.usersContent.querySelectorAll('[data-invite-revoke]').forEach((btn) => {
      btn.addEventListener('click', () => revokeInvite(btn.dataset.inviteRevoke));
    });
    els.usersContent.querySelectorAll('[data-user-action]').forEach((btn) => {
      btn.addEventListener('click', () => onUserAction(btn));
    });
  } catch (err) {
    els.usersContent.innerHTML = `<p class="sdb-dim">${esc(err.message)}</p>`;
  }
}

async function onInviteSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('invite-email').value.trim();
  const resultEl = document.getElementById('invite-result');
  resultEl.hidden = true;
  try {
    const body = await adminFetch('/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    resultEl.className = 'sdb-alert sdb-alert--success';
    resultEl.textContent = body.email_sent
      ? `Invite sent to ${body.invite.email}.`
      : `Invite created for ${body.invite.email} (SMTP not configured — copy link: ${body.invite_url})`;
    resultEl.hidden = false;
    await renderUsers();
  } catch (err) {
    resultEl.className = 'sdb-alert sdb-alert--error';
    resultEl.textContent = err.message;
    resultEl.hidden = false;
  }
}

async function revokeInvite(inviteId) {
  if (!confirm('Revoke this invite?')) return;
  try {
    await adminFetch(`/admin/invites/${inviteId}`, { method: 'DELETE' });
    await renderUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function onUserAction(btn) {
  const { userAction: action, userId, userEmail } = btn.dataset;
  try {
    if (action === 'detail') {
      await showUserDetail(userId);
      return;
    }
    if (action === 'verify') {
      await adminFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ email_verified: true }),
      });
    } else if (action === 'unverify') {
      await adminFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ email_verified: false }),
      });
    } else if (action === 'suspend') {
      const reason = prompt('Suspension reason (optional):') ?? '';
      await adminFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended: true, banned_reason: reason || null }),
      });
    } else if (action === 'unsuspend') {
      await adminFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended: false }),
      });
    } else if (action === 'delete') {
      if (!confirm(`Permanently delete ${userEmail}? This removes their timesheet data.`)) return;
      await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
    }
    await renderUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function showUserDetail(userId) {
  const detail = await adminFetch(`/admin/users/${userId}`);
  const u = detail.user;
  const counts = detail.counts ?? {};
  const settings = detail.settings;
  const profiles = detail.profiles ?? [];

  els.userDetailTitle.textContent = u.email;
  els.userDetailBody.innerHTML = `
    <dl class="sdb-kv">
      <dt>User ID</dt><dd><code>${esc(u.id)}</code></dd>
      <dt>Email</dt><dd>${esc(u.email)}</dd>
      <dt>Verified</dt><dd>${u.email_verified ? 'Yes' : 'No'}</dd>
      <dt>Google</dt><dd>${u.google_id ? 'Linked' : '—'}</dd>
      <dt>Status</dt><dd>${u.banned_at ? `Suspended since ${new Date(u.banned_at).toLocaleString()}${u.banned_reason ? ` — ${esc(u.banned_reason)}` : ''}` : 'Active'}</dd>
      <dt>Created</dt><dd>${new Date(u.created_at).toLocaleString()}</dd>
      <dt>Updated</dt><dd>${new Date(u.updated_at).toLocaleString()}</dd>
      <dt>Last session</dt><dd>${detail.last_session_at ? new Date(detail.last_session_at).toLocaleString() : '—'}</dd>
    </dl>

    <h3 class="sdb-section-title">Stored data counts</h3>
    <dl class="sdb-kv">
      <dt>Time entries</dt><dd>${counts.time_entries ?? 0}</dd>
      <dt>Week submissions</dt><dd>${counts.week_submissions ?? 0}</dd>
      <dt>Push subscriptions</dt><dd>${counts.push_subscriptions ?? 0}</dd>
      <dt>Active sessions</dt><dd>${counts.active_sessions ?? 0}</dd>
    </dl>

    <h3 class="sdb-section-title">Project profiles</h3>
    ${
      profiles.length
        ? `<table class="sdb-table"><thead><tr><th>Project</th><th>Display name</th><th>Created</th></tr></thead><tbody>${profiles
            .map(
              (p) => `<tr>
            <td><code>${esc(p.project_slug)}</code></td>
            <td>${esc(p.display_name ?? '—')}</td>
            <td>${new Date(p.created_at).toLocaleString()}</td>
          </tr>`,
            )
            .join('')}</tbody></table>`
        : '<p class="sdb-muted">No project profiles.</p>'
    }

    <h3 class="sdb-section-title">Timesheet settings</h3>
    ${
      settings
        ? `<dl class="sdb-kv">
      <dt>Boss email</dt><dd>${esc(settings.boss_email || '—')}</dd>
      <dt>Employee name</dt><dd>${esc(settings.employee_name || '—')}</dd>
      <dt>Weekly reminder</dt><dd>${settings.weekly_reminder_enabled ? 'On' : 'Off'}</dd>
      <dt>Default start</dt><dd>${esc(settings.default_start_time ?? '—')}</dd>
    </dl>`
        : '<p class="sdb-muted">No timesheet settings saved yet.</p>'
    }`;

  els.userDetailDialog.showModal();
}

if (els.userDetailClose) {
  els.userDetailClose.addEventListener('click', () => els.userDetailDialog.close());
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
