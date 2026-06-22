import {
  initSupabase, loadConfigFromSupabase, loadConfigFromLocal, subscribe, getConfig,
} from './state.js';
import { applyTheme } from './theme-engine.js';
import { initBackgrounds, applyBackground } from './backgrounds.js';
import { renderSite } from './renderer.js';
import { initMusicPlayer } from './music-player.js';
import { initCursor } from './cursor.js';
import { initAuth, setAdminReadyCallback, openAdminPanel, showAuthGate, getIsAdmin } from './auth.js';
import { initAdmin, openAdminUI } from './admin.js';
import { ADMIN_LOGO_CLICKS, ADMIN_HASH, REGISTER_HASH } from './config.js';
import { $ } from './utils.js';

let logoClicks = 0;
let logoClickTimer = null;

async function bootstrap() {
  initBackgrounds();

  await initSupabase();
  await initAuth();

  const fromRemote = await loadConfigFromSupabase();
  if (!fromRemote) loadConfigFromLocal();

  const config = getConfig();
  applyAll(config);

  const loader = $('#skeleton-loader');
  if (loader) loader.classList.add('loaded');

  subscribe(applyAll);

  initAdmin(applyAll);

  setAdminReadyCallback(() => {
    openAdminUI(applyAll);
    openAdminPanel();
  });

  setupAdminAccess();
}

function applyAll(config) {
  applyTheme(config);
  applyBackground(config);
  renderSite(config);
  initMusicPlayer(config);
  initCursor(config);
  rebindLogo();
}

function rebindLogo() {
  const logo = $('#nav-logo');
  if (!logo || logo.dataset.bound) return;
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
      openAdminUI(applyAll);
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
