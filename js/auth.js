import { getSupabase } from './state.js';
import { OWNER_EMAIL } from './config.js';
import { $, showToast } from './utils.js';
import { provisionSiteUser } from './users.js';

let isAdmin = false;
let currentUser = null;
let siteUser = null;
let onAdminReady = null;
let authMode = 'login';

export function setAdminReadyCallback(fn) {
  onAdminReady = fn;
}

export function getIsAdmin() {
  return isAdmin;
}

export function getCurrentUser() {
  return currentUser;
}

export function getSiteUser() {
  return siteUser;
}

export function isOwnerUser() {
  return siteUser?.role === 'owner';
}

export async function initAuth() {
  const supabase = getSupabase();
  if (!supabase) {
    siteUser = { role: 'owner', permissions: {} };
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await verifyAdmin(session.user);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) await verifyAdmin(session.user);
    else {
      isAdmin = false;
      currentUser = null;
      siteUser = null;
    }
  });
}

async function verifyAdmin(user) {
  siteUser = await provisionSiteUser(user);

  if (siteUser) {
    isAdmin = true;
    currentUser = user;
    return true;
  }

  isAdmin = false;
  currentUser = null;
  siteUser = null;
  return false;
}

export function showAuthGate(mode = 'login') {
  authMode = mode;
  let gate = $('#admin-auth-gate');
  if (gate) {
    gate.classList.remove('hidden');
    renderAuthForm(gate);
    return;
  }

  gate = document.createElement('div');
  gate.id = 'admin-auth-gate';
  document.body.appendChild(gate);
  renderAuthForm(gate);
}

function renderAuthForm(gate) {
  const isRegister = authMode === 'register';
  gate.innerHTML = `
    <div class="auth-card">
      <h2 class="heading-gradient">${isRegister ? 'Create Account' : 'Admin Access'}</h2>
      <p>${isRegister
    ? 'Register with the email your owner invited you with. You\'ll get admin access automatically.'
    : 'Sign in to manage the creator hub.'}</p>
      <div class="auth-tabs">
        <button type="button" class="auth-tab ${!isRegister ? 'active' : ''}" data-mode="login">Sign In</button>
        <button type="button" class="auth-tab ${isRegister ? 'active' : ''}" data-mode="register">Register</button>
      </div>
      <form id="admin-login-form" class="auth-form">
        <div class="form-group">
          <label for="admin-email">Email</label>
          <input class="form-input" type="email" id="admin-email" autocomplete="email" required placeholder="you@example.com" />
        </div>
        ${isRegister ? `<div class="form-group"><label for="admin-display">Display Name</label><input class="form-input" id="admin-display" placeholder="Your name" /></div>` : ''}
        <div class="form-group">
          <label for="admin-password">Password</label>
          <input class="form-input" type="password" id="admin-password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required placeholder="••••••••" />
        </div>
        <p class="auth-error hidden" id="auth-error"></p>
        <button type="submit" class="auth-submit-btn" id="admin-login-btn">${isRegister ? 'Create Account' : 'Sign In'}</button>
      </form>
      <button type="button" class="auth-close" id="auth-close-btn">Cancel</button>
    </div>
  `;

  $$('.auth-tab', gate).forEach(tab => {
    tab.addEventListener('click', () => showAuthGate(tab.dataset.mode));
  });
  $('#admin-login-form', gate)?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (authMode === 'register') registerAccount();
    else signInWithEmail();
  });
  $('#auth-close-btn', gate)?.addEventListener('click', () => {
    if (document.body.classList.contains('admin-page')) window.location.href = 'index.html';
    else hideAuthGate();
  });
}

export function hideAuthGate() {
  $('#admin-auth-gate')?.classList.add('hidden');
  const err = $('#auth-error');
  if (err) { err.classList.add('hidden'); err.textContent = ''; }
}

async function signInWithEmail() {
  const supabase = getSupabase();
  const email = $('#admin-email')?.value?.trim();
  const password = $('#admin-password')?.value;
  const errEl = $('#auth-error');
  const btn = $('#admin-login-btn');

  if (!supabase) {
    siteUser = { role: 'owner', permissions: {} };
    isAdmin = true;
    hideAuthGate();
    onAdminReady?.();
    showToast('Dev mode — owner access (add Supabase keys for production)');
    return;
  }

  if (!email || !password) return;
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Sign In';

  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }

  const ok = await verifyAdmin(data.user);
  if (ok) {
    hideAuthGate();
    onAdminReady?.();
    const role = siteUser?.role === 'owner' ? 'Owner' : 'Admin';
    showToast(`Welcome back — ${role}!`);
  } else {
    await signOut();
    if (errEl) {
      errEl.textContent = OWNER_EMAIL && email.toLowerCase() === OWNER_EMAIL.toLowerCase()
        ? 'Could not set up owner account. Run the updated schema.sql in Supabase first.'
        : 'Not authorized. Ask the owner to add you from the Owner dashboard, or register with an invited email.';
      errEl.classList.remove('hidden');
    }
  }
}

async function registerAccount() {
  const supabase = getSupabase();
  const email = $('#admin-email')?.value?.trim();
  const password = $('#admin-password')?.value;
  const displayName = $('#admin-display')?.value?.trim();
  const errEl = $('#auth-error');
  const btn = $('#admin-login-btn');

  if (!supabase || !email || !password) return;
  btn.disabled = true;
  btn.textContent = 'Creating…';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  btn.disabled = false;
  btn.textContent = 'Create Account';

  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
    return;
  }

  if (data.user) {
    const ok = await verifyAdmin(data.user);
    if (ok) {
      hideAuthGate();
      onAdminReady?.();
      showToast('Account created — welcome!');
    } else {
      await signOut();
      if (errEl) {
        errEl.textContent = 'No invite found for this email. Ask the owner to add you first.';
        errEl.classList.remove('hidden');
      }
    }
  }
}

export async function signOut() {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
  isAdmin = false;
  currentUser = null;
  siteUser = null;
  closeAdminPanel();
  document.dispatchEvent(new CustomEvent('suki:auth-change'));
  showToast('Signed out');
}

export function openAdminPanel() {
  if (!isAdmin) { showAuthGate(); return; }
  $('#admin-overlay')?.classList.add('open');
  $('#admin-panel')?.classList.add('open');
}

export function closeAdminPanel() {
  $('#admin-overlay')?.classList.remove('open');
  $('#admin-panel')?.classList.remove('open');
}

function $$(sel, root) {
  return [...(root || document).querySelectorAll(sel)];
}
