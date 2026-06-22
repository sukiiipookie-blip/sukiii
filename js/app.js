import {
  initSupabase, loadConfigFromSupabase, loadConfigFromLocal, subscribe, getConfig, replaceConfig,
} from './state.js';
import { createDefaultConfig, normalizeSiteConfig } from './defaults.js';
import { applyTheme } from './theme-engine.js';
import { initBackgrounds, applyBackground } from './backgrounds.js';
import { renderSite, setNavAdminLoggedIn } from './renderer.js';
import { initMusicPlayer, updateMusicPlayerTheme } from './music-player.js';
import { initCursor } from './cursor.js';
import { initAuth, setAdminReadyCallback, openAdminPanel, showAuthGate, getIsAdmin } from './auth.js';
import { initAdmin, openAdminUI } from './admin.js';
import { initVisitors } from './visitors.js';
import { ADMIN_HASH, REGISTER_HASH } from './config.js';
import { $, debounce } from './utils.js';

let lastMusicKey = '';
let lastCursor = '';

async function bootstrap() {
  try {
    initBackgrounds();

    await initSupabase();
    await initAuth();
    setNavAdminLoggedIn(getIsAdmin());

    const fromRemote = await loadConfigFromSupabase();
    if (!fromRemote) loadConfigFromLocal();

    const config = normalizeSiteConfig(getConfig());
    replaceConfig(config);
    applyAll(config, true);

    initVisitors();

    subscribe(debounce((c) => applyAll(normalizeSiteConfig(c)), 120));

    initAdmin((c) => applyAll(normalizeSiteConfig(c), false));

    setAdminReadyCallback(() => {
      setNavAdminLoggedIn(true);
      applyAll(normalizeSiteConfig(getConfig()), false);
      openAdminUI((c) => applyAll(normalizeSiteConfig(c), false));
      openAdminPanel();
    });

    setupAdminAccess();
    setupAdminNavButton();
    document.addEventListener('suki:auth-change', () => {
      setNavAdminLoggedIn(getIsAdmin());
      applyAll(normalizeSiteConfig(getConfig()), false);
    });
  } catch (err) {
    console.error('Site bootstrap failed:', err);
    try {
      const fallback = normalizeSiteConfig(createDefaultConfig());
      replaceConfig(fallback);
      applyAll(fallback, true);
    } catch (fallbackErr) {
      console.error('Fallback render failed:', fallbackErr);
    }
  } finally {
    $('#skeleton-loader')?.classList.add('loaded');
  }
}

function setupAdminNavButton() {
  document.addEventListener('suki:admin-open', () => {
    if (getIsAdmin()) {
      openAdminUI((c) => applyAll(normalizeSiteConfig(c), false));
      openAdminPanel();
    } else {
      showAuthGate();
    }
  });
}

function applyAll(config, full = false) {
  try {
    applyTheme(config);
    applyBackground(config);
    renderSite(config);
  } catch (err) {
    console.error('Render error:', err);
  }

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
