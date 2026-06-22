import {
  initSupabase, loadConfigFromSupabase, loadConfigFromLocal, subscribe, getConfig, replaceConfig,
} from './state.js';
import { createDefaultConfig, normalizeSiteConfig } from './defaults.js';
import { applyTheme } from './theme-engine.js';
import { initBackgrounds, applyBackground } from './backgrounds.js';
import { renderSite } from './renderer.js';
import { initMusicPlayer, updateMusicPlayerTheme } from './music-player.js';
import { initCursor } from './cursor.js';
import { initAuth, setAdminReadyCallback, openAdminPanel, showAuthGate, getIsAdmin } from './auth.js';
import { initAdmin, openAdminUI } from './admin.js';
import { initVisitors } from './visitors.js';
import { ADMIN_LOGO_CLICKS, ADMIN_HASH, REGISTER_HASH } from './config.js';
import { $, debounce } from './utils.js';

let logoClicks = 0;
let logoClickTimer = null;
let lastMusicKey = '';
let lastCursor = '';

async function bootstrap() {
  initBackgrounds();

  await initSupabase();
  await initAuth();

  const fromRemote = await loadConfigFromSupabase();
  if (!fromRemote) loadConfigFromLocal();

  const config = normalizeSiteConfig(getConfig());
  replaceConfig(config);
  applyAll(config, true);

  $('#skeleton-loader')?.classList.add('loaded');

  initVisitors();

  subscribe(debounce((c) => applyAll(normalizeSiteConfig(c)), 120));

  initAdmin((c) => applyAll(normalizeSiteConfig(c), false));

  setAdminReadyCallback(() => {
    openAdminUI((c) => applyAll(normalizeSiteConfig(c), false));
    openAdminPanel();
  });

  setupAdminAccess();
}

function applyAll(config, full = false) {
  applyTheme(config);
  applyBackground(config);
  renderSite(config);

  const musicKey = JSON.stringify(config.music) + config.site?.showMusicPlayer;
  if (full || musicKey !== lastMusicKey) {
    initMusicPlayer(config);
    lastMusicKey = musicKey;
  } else {
    updateMusicPlayerTheme();
  }

  const cur = config.site?.cursor || 'default';
  if (full || cur !== lastCursor) {
    initCursor(config);
    lastCursor = cur;
  }

  rebindLogo();
}

function rebindLogo() {
  const logo = $('#nav-logo');
  if (!logo) return;
  if (logo.dataset.bound) return;
  logo.dataset.bound = '1';
  logo.addEventListener('click', onLogoClick);
}

function onLogoClick() {
  logoClicks += 1;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => { logoClicks = 0; }, 2000);

  if (logoClicks >= ADMIN_LOGO_CLICKS) {
    logoClicks = 0;
    if (getIsAdmin()) {
      openAdminUI((c) => applyAll(normalizeSiteConfig(c), false));
      openAdminPanel();
    } else {
      showAuthGate();
    }
  }
}

function setupAdminAccess() {
  if (window.location.hash === `#${ADMIN_HASH}`) {
    showAuthGate('login');
    history.replaceState(null, '', window.location.pathname);
  }
  if (window.location.hash === `#${REGISTER_HASH}`) {
    showAuthGate('register');
    history.replaceState(null, '', window.location.pathname);
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === `#${ADMIN_HASH}`) showAuthGate('login');
    if (window.location.hash === `#${REGISTER_HASH}`) showAuthGate('register');
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
