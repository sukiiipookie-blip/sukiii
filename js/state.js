import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createDefaultConfig, deepClone, normalizeSiteConfig } from './defaults.js';
import { mergeDeep } from './utils.js';

let supabase = null;
let config = createDefaultConfig();
let lastSaved = deepClone(config);
let listeners = [];

export function getConfig() {
  return config;
}

export function getLastSaved() {
  return lastSaved;
}

export function setConfig(partial) {
  config = mergeDeep(config, partial);
  notify();
}

export function replaceConfig(newConfig) {
  config = newConfig;
  notify();
}

export function markSaved() {
  lastSaved = deepClone(config);
}

export function revertToLastSaved() {
  config = deepClone(lastSaved);
  notify();
  return config;
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() {
  listeners.forEach(fn => fn(config));
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function initSupabase() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  } catch (err) {
    console.warn('Supabase client failed to load:', err);
    return null;
  }
}

export function getSupabase() {
  return supabase;
}

export async function loadConfigFromSupabase() {
  if (!supabase) return null;
  try {
    const query = supabase
      .from('site_config')
      .select('config')
      .eq('id', 1)
      .maybeSingle();

    const timeout = new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 6000));
    const result = await Promise.race([query, timeout]);

    if (result?.timedOut) {
      console.warn('Supabase config load timed out');
      return null;
    }

    const { data, error } = result;
    if (error) {
      console.warn('Supabase load error:', error.message);
      return null;
    }
    if (data?.config) {
      const defaults = createDefaultConfig();
      config = normalizeSiteConfig(mergeDeep(defaults, data.config));
      lastSaved = deepClone(config);
      notify();
      return config;
    }
    return null;
  } catch (err) {
    console.warn('Supabase load failed:', err.message);
    return null;
  }
}

export async function saveConfigToSupabase() {
  if (!supabase) {
    localStorage.setItem('suki-hub-config', JSON.stringify(config));
    markSaved();
    return true;
  }
  const { error } = await supabase
    .from('site_config')
    .upsert({ id: 1, config, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
  markSaved();
  return true;
}

export function loadConfigFromLocal() {
  try {
    const raw = localStorage.getItem('suki-hub-config');
    if (raw) {
      const parsed = JSON.parse(raw);
      const defaults = createDefaultConfig();
      config = normalizeSiteConfig(mergeDeep(defaults, parsed));
      lastSaved = deepClone(config);
      notify();
      return config;
    }
  } catch (e) {
    console.warn('Local config parse error', e);
  }
  return null;
}

export async function uploadFile(bucket, path, file) {
  if (!supabase) {
    return URL.createObjectURL(file);
  }
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
