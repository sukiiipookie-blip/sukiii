/**
 * Admin control panel — full-page entry
 */
import {
  initSupabase, loadConfigFromSupabase, loadConfigFromLocal,
  getConfig, replaceConfig,
} from './state.js';
import { normalizeSiteConfig } from './defaults.js';
import { initAuth, getIsAdmin, showAuthGate, setAdminReadyCallback } from './auth.js';
import { initAdminPage } from './admin.js';
import { ADMIN_HASH, REGISTER_HASH } from './config.js';

async function boot() {
  try {
    await initSupabase();
    await initAuth();

    setAdminReadyCallback(() => {
      if (getIsAdmin()) startPanel();
    });

    if (location.hash === `#${REGISTER_HASH}`) {
      showAuthGate('register');
      return;
    }

    if (getIsAdmin()) {
      await startPanel();
      return;
    }

    showAuthGate('login');
  } catch (err) {
    console.error('Admin boot failed:', err);
    document.body.innerHTML = `<p style="color:#f5f0ff;padding:40px;font-family:sans-serif">Failed to load panel: ${err.message}</p>`;
  }
}

async function startPanel() {
  if (!(await loadConfigFromSupabase())) loadConfigFromLocal();
  replaceConfig(normalizeSiteConfig(getConfig()));
  $('#admin-shell')?.classList.remove('hidden');
  initAdminPage();
}

function $(sel) { return document.querySelector(sel); }

boot();
