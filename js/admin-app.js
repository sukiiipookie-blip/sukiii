/**
 * Admin control panel — full-page entry
 */
import {
  initSupabase, loadConfigFromSupabase, loadConfigFromLocal,
  getConfig, replaceConfig,
} from './state.js';
import { normalizeSiteConfig, createDefaultConfig } from './defaults.js';
import { initAuth, getIsAdmin, showAuthGate, setAdminReadyCallback } from './auth.js';
import { initAdminPage } from './admin.js?v=31';
import { ADMIN_HASH, REGISTER_HASH } from './config.js';
import { initSharedMusic, renderMusicBar } from './shared-music.js';

let siteConfig = null;

function refreshMusicBar() {
  if (siteConfig) renderMusicBar(siteConfig);
}

async function boot() {
  try {
    await initSupabase();
    await initAuth();

    if (!(await loadConfigFromSupabase())) loadConfigFromLocal();
    siteConfig = normalizeSiteConfig(getConfig() || createDefaultConfig());
    initSharedMusic(siteConfig, refreshMusicBar);
    renderMusicBar(siteConfig);

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
  siteConfig = normalizeSiteConfig(getConfig());
  replaceConfig(siteConfig);
  initSharedMusic(siteConfig, refreshMusicBar);
  renderMusicBar(siteConfig);
  $('#admin-shell')?.classList.remove('hidden');
  initAdminPage();
}

function $(sel) { return document.querySelector(sel); }

boot();
