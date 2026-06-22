import { THEME_PRESETS } from './defaults.js';
import { loadGoogleFont } from './utils.js';

export function applyTheme(config) {
  const root = document.documentElement;
  const { theme, typography } = config;

  const preset = THEME_PRESETS[theme.preset] || THEME_PRESETS.lavenderDream;
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  Object.entries(theme.custom || {}).forEach(([k, v]) => {
    if (v) root.style.setProperty(k, v);
  });

  const glowMult = theme.glowIntensity ?? 1;
  root.style.setProperty('--glow-intensity', glowMult);

  loadGoogleFont(typography.displayFont);
  loadGoogleFont(typography.bodyFont);

  root.style.setProperty('--font-display', `'${typography.displayFont}', Georgia, serif`);
  root.style.setProperty('--font-body', `'${typography.bodyFont}', system-ui, sans-serif`);
  root.style.setProperty('--font-size-base', `${typography.baseSize}px`);
  root.style.setProperty('--heading-weight', typography.headingWeight);
  root.style.setProperty('--body-weight', typography.bodyWeight);
  root.style.setProperty('--letter-spacing', `${typography.letterSpacing}em`);
  root.style.setProperty('--line-height', typography.lineHeight);
  root.style.setProperty('--heading-effect', typography.headingEffect);

  document.body.classList.remove('overlay-frost', 'glow-boost', 'overlay-particles');
  (theme.overlays || []).forEach(o => {
    if (o === 'frost') document.body.classList.add('overlay-frost');
    if (o === 'glow') document.body.classList.add('glow-boost');
    if (o === 'particles') document.body.classList.add('overlay-particles');
  });

  document.body.classList.remove('page-transition-fade', 'page-transition-slide', 'page-transition-scale');
  const pt = config.site?.pageTransition || 'fade';
  document.body.classList.add(`page-transition-${pt}`);

  document.body.classList.remove('card-hover-lift', 'card-hover-glow', 'card-hover-tilt');
  const ch = config.site?.cardHover || 'lift';
  document.body.classList.add(`card-hover-${ch}`);

  if (config.site?.favicon) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = config.site.favicon;
  }

  document.title = config.site?.title || 'Creator Hub';
}

export function headingClass(effect) {
  if (effect === 'glow') return 'heading-glow';
  if (effect === 'none') return '';
  return 'heading-gradient';
}
