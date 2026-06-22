import { uid } from './utils.js';

export const THEME_PRESETS = {
  lavenderNeon: {
    name: 'Lavender Neon',
    swatch: 'linear-gradient(135deg, #b57bff, #7c5cff, #e066ff)',
    vars: {
      '--bg-primary': '#08060f',
      '--bg-secondary': '#0f0a1a',
      '--bg-elevated': 'rgba(18, 12, 32, 0.88)',
      '--glass-bg': 'rgba(14, 10, 28, 0.82)',
      '--glass-border': 'rgba(181, 123, 255, 0.35)',
      '--glass-blur': '10px',
      '--accent-primary': '#b57bff',
      '--accent-secondary': '#d4a5ff',
      '--accent-rose': '#e066ff',
      '--accent-rose-gold': '#c9a0ff',
      '--accent-glow': 'rgba(181, 123, 255, 0.5)',
      '--accent-glow-strong': 'rgba(224, 102, 255, 0.65)',
      '--gradient-heading': 'linear-gradient(90deg, #d4a5ff, #b57bff, #e066ff)',
      '--gradient-accent': 'linear-gradient(135deg, #7c5cff, #b57bff, #e066ff)',
    },
  },
  electricLilac: {
    name: 'Electric Lilac',
    swatch: 'linear-gradient(135deg, #9d6bff, #c084fc, #f472b6)',
    vars: {
      '--bg-primary': '#06050c',
      '--bg-secondary': '#0c0816',
      '--bg-elevated': 'rgba(16, 10, 28, 0.9)',
      '--glass-bg': 'rgba(12, 8, 24, 0.85)',
      '--glass-border': 'rgba(192, 132, 252, 0.38)',
      '--glass-blur': '10px',
      '--accent-primary': '#c084fc',
      '--accent-secondary': '#e9d5ff',
      '--accent-rose': '#f472b6',
      '--accent-rose-gold': '#a78bfa',
      '--accent-glow': 'rgba(192, 132, 252, 0.55)',
      '--accent-glow-strong': 'rgba(244, 114, 182, 0.6)',
      '--gradient-heading': 'linear-gradient(90deg, #e9d5ff, #c084fc, #f472b6)',
      '--gradient-accent': 'linear-gradient(135deg, #9d6bff, #c084fc, #f472b6)',
    },
  },
  violetPulse: {
    name: 'Violet Pulse',
    swatch: 'linear-gradient(135deg, #6d28d9, #8b5cf6, #a855f7)',
    vars: {
      '--bg-primary': '#050508',
      '--bg-secondary': '#0a0812',
      '--bg-elevated': 'rgba(12, 8, 22, 0.92)',
      '--glass-bg': 'rgba(10, 6, 20, 0.88)',
      '--glass-border': 'rgba(139, 92, 246, 0.4)',
      '--glass-blur': '8px',
      '--accent-primary': '#8b5cf6',
      '--accent-secondary': '#a78bfa',
      '--accent-rose': '#c4b5fd',
      '--accent-rose-gold': '#7c3aed',
      '--accent-glow': 'rgba(139, 92, 246, 0.55)',
      '--accent-glow-strong': 'rgba(167, 139, 250, 0.7)',
      '--gradient-heading': 'linear-gradient(90deg, #a78bfa, #8b5cf6, #c4b5fd)',
      '--gradient-accent': 'linear-gradient(135deg, #6d28d9, #8b5cf6, #a855f7)',
    },
  },
  neonDusk: {
    name: 'Neon Dusk',
    swatch: 'linear-gradient(135deg, #4c1d95, #7e22ce, #db2777)',
    vars: {
      '--bg-primary': '#070510',
      '--bg-secondary': '#110a18',
      '--bg-elevated': 'rgba(20, 10, 32, 0.9)',
      '--glass-bg': 'rgba(16, 8, 28, 0.86)',
      '--glass-border': 'rgba(219, 39, 119, 0.28)',
      '--glass-blur': '10px',
      '--accent-primary': '#a855f7',
      '--accent-secondary': '#e879f9',
      '--accent-rose': '#db2777',
      '--accent-rose-gold': '#9333ea',
      '--accent-glow': 'rgba(168, 85, 247, 0.5)',
      '--accent-glow-strong': 'rgba(219, 39, 119, 0.55)',
      '--gradient-heading': 'linear-gradient(90deg, #e879f9, #a855f7, #db2777)',
      '--gradient-accent': 'linear-gradient(135deg, #7e22ce, #a855f7, #db2777)',
    },
  },
  softNeon: {
    name: 'Soft Neon',
    swatch: 'linear-gradient(135deg, #c4b5fd, #ddd6fe, #f0abfc)',
    vars: {
      '--bg-primary': '#0a0814',
      '--bg-secondary': '#12101f',
      '--bg-elevated': 'rgba(22, 18, 36, 0.88)',
      '--glass-bg': 'rgba(18, 14, 30, 0.8)',
      '--glass-border': 'rgba(196, 181, 253, 0.32)',
      '--glass-blur': '12px',
      '--accent-primary': '#c4b5fd',
      '--accent-secondary': '#ede9fe',
      '--accent-rose': '#f0abfc',
      '--accent-rose-gold': '#a78bfa',
      '--accent-glow': 'rgba(196, 181, 253, 0.45)',
      '--accent-glow-strong': 'rgba(240, 171, 252, 0.55)',
      '--gradient-heading': 'linear-gradient(90deg, #ede9fe, #c4b5fd, #f0abfc)',
      '--gradient-accent': 'linear-gradient(135deg, #a78bfa, #c4b5fd, #f0abfc)',
    },
  },
};

/** Owner-only sunset / warm neon presets */
export const SUNSET_THEME_PRESETS = {
  sunsetGlow: {
    name: 'Sunset Glow',
    swatch: 'linear-gradient(135deg, #ff6b6b, #ff8e53, #ffd166)',
    vars: {
      '--bg-primary': '#0f0806',
      '--bg-secondary': '#1a0f0c',
      '--glass-bg': 'rgba(22, 12, 10, 0.85)',
      '--glass-border': 'rgba(255, 142, 83, 0.4)',
      '--accent-primary': '#ff8e53',
      '--accent-secondary': '#ffd166',
      '--accent-rose': '#ff6b6b',
      '--accent-rose-gold': '#ffb347',
      '--accent-glow': 'rgba(255, 142, 83, 0.55)',
      '--accent-glow-strong': 'rgba(255, 107, 107, 0.6)',
      '--gradient-heading': 'linear-gradient(90deg, #ffd166, #ff8e53, #ff6b6b)',
      '--gradient-accent': 'linear-gradient(135deg, #ff6b6b, #ff8e53, #ffd166)',
    },
  },
  goldenHour: {
    name: 'Golden Hour',
    swatch: 'linear-gradient(135deg, #f59e0b, #fbbf24, #fde68a)',
    vars: {
      '--bg-primary': '#0c0a06',
      '--bg-secondary': '#161108',
      '--glass-bg': 'rgba(20, 14, 6, 0.88)',
      '--glass-border': 'rgba(251, 191, 36, 0.38)',
      '--accent-primary': '#fbbf24',
      '--accent-secondary': '#fde68a',
      '--accent-rose': '#f59e0b',
      '--accent-rose-gold': '#fcd34d',
      '--accent-glow': 'rgba(251, 191, 36, 0.5)',
      '--accent-glow-strong': 'rgba(245, 158, 11, 0.55)',
      '--gradient-heading': 'linear-gradient(90deg, #fde68a, #fbbf24, #f59e0b)',
      '--gradient-accent': 'linear-gradient(135deg, #f59e0b, #fbbf24, #fde68a)',
    },
  },
  peachNeon: {
    name: 'Peach Neon',
    swatch: 'linear-gradient(135deg, #fb7185, #fda4af, #fecdd3)',
    vars: {
      '--bg-primary': '#100809',
      '--bg-secondary': '#1a0e10',
      '--glass-bg': 'rgba(24, 10, 14, 0.86)',
      '--glass-border': 'rgba(251, 113, 133, 0.38)',
      '--accent-primary': '#fb7185',
      '--accent-secondary': '#fda4af',
      '--accent-rose': '#fecdd3',
      '--accent-rose-gold': '#f43f5e',
      '--accent-glow': 'rgba(251, 113, 133, 0.5)',
      '--accent-glow-strong': 'rgba(254, 205, 211, 0.55)',
      '--gradient-heading': 'linear-gradient(90deg, #fecdd3, #fb7185, #fda4af)',
      '--gradient-accent': 'linear-gradient(135deg, #fb7185, #fda4af, #fecdd3)',
    },
  },
  emberDusk: {
    name: 'Ember Dusk',
    swatch: 'linear-gradient(135deg, #dc2626, #ea580c, #9333ea)',
    vars: {
      '--bg-primary': '#0a0608',
      '--bg-secondary': '#140a0e',
      '--glass-bg': 'rgba(18, 8, 12, 0.88)',
      '--glass-border': 'rgba(234, 88, 12, 0.35)',
      '--accent-primary': '#ea580c',
      '--accent-secondary': '#fb923c',
      '--accent-rose': '#dc2626',
      '--accent-rose-gold': '#9333ea',
      '--accent-glow': 'rgba(234, 88, 12, 0.5)',
      '--accent-glow-strong': 'rgba(220, 38, 38, 0.55)',
      '--gradient-heading': 'linear-gradient(90deg, #fb923c, #ea580c, #dc2626)',
      '--gradient-accent': 'linear-gradient(135deg, #dc2626, #ea580c, #9333ea)',
    },
  },
  coralSunset: {
    name: 'Coral Sunset',
    swatch: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
    vars: {
      '--bg-primary': '#0b0709',
      '--bg-secondary': '#150d12',
      '--glass-bg': 'rgba(18, 10, 16, 0.86)',
      '--glass-border': 'rgba(236, 72, 153, 0.35)',
      '--accent-primary': '#f97316',
      '--accent-secondary': '#ec4899',
      '--accent-rose': '#fb7185',
      '--accent-rose-gold': '#a855f7',
      '--accent-glow': 'rgba(249, 115, 22, 0.48)',
      '--accent-glow-strong': 'rgba(236, 72, 153, 0.55)',
      '--gradient-heading': 'linear-gradient(90deg, #f97316, #ec4899, #a855f7)',
      '--gradient-accent': 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
    },
  },
};

export const NEON_THEME_KEYS = Object.keys(THEME_PRESETS);
export const SUNSET_THEME_KEYS = Object.keys(SUNSET_THEME_PRESETS);

/** Combined lookup for theme engine */
export const ALL_THEME_PRESETS = { ...THEME_PRESETS, ...SUNSET_THEME_PRESETS };

/** Map old saved preset names → new ones */
export const PRESET_ALIASES = {
  lavenderDream: 'lavenderNeon',
  neonPink: 'electricLilac',
  midnightRose: 'neonDusk',
  cyberLilac: 'violetPulse',
};

export const BG_ANIMATIONS = [
  'none', 'stars', 'grid', 'aurora', 'bokeh',
];

export const SOCIAL_PLATFORMS = {
  discord: { icon: '💬', label: 'Discord' },
  tiktok: { icon: '🎵', label: 'TikTok' },
  youtube: { icon: '▶️', label: 'YouTube' },
  twitter: { icon: '🐦', label: 'Twitter/X' },
  instagram: { icon: '📸', label: 'Instagram' },
  twitch: { icon: '🎮', label: 'Twitch' },
  github: { icon: '💻', label: 'GitHub' },
  link: { icon: '🔗', label: 'Link' },
};

export function detectPlatform(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('discord')) return 'discord';
  if (u.includes('tiktok')) return 'tiktok';
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('twitter') || u.includes('x.com')) return 'twitter';
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('twitch')) return 'twitch';
  if (u.includes('github')) return 'github';
  return 'link';
}

export function createDefaultConfig() {
  return {
    site: {
      title: 'Suki | Personal Site',
      favicon: '',
      enterScreen: true,
      enterTitle: 'Hey, I\'m Suki',
      enterSubtitle: 'click to enter',
      maintenanceMode: false,
      maintenanceMessage: 'Be right back — updating my site!',
      cursor: 'neon',
      cursorCustomUrl: '',
      pageTransition: 'fade',
      cardHover: 'lift',
      showMusicPlayer: true,
      showVisitorPill: true,
    },
    theme: {
      preset: 'lavenderNeon',
      custom: {},
      overlays: [],
      glowIntensity: 1,
    },
    background: {
      type: 'gradient',
      solid: '#08060f',
      gradient: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124, 92, 255, 0.35), transparent), radial-gradient(ellipse 60% 50% at 100% 50%, rgba(224, 102, 255, 0.12), transparent), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(181, 123, 255, 0.1), transparent), linear-gradient(180deg, #08060f 0%, #0f0a1a 50%, #08060f 100%)',
      image: '',
      video: '',
      animation: 'none',
      speed: 0.6,
      opacity: 1,
    },
    typography: {
      displayFont: 'Outfit',
      bodyFont: 'Inter',
      baseSize: 16,
      headingEffect: 'gradient',
      headingWeight: 600,
      bodyWeight: 400,
      letterSpacing: 0.01,
      lineHeight: 1.6,
    },
    profile: {
      displayName: 'NekiraBelle (Suki)',
      username: '@nekirabelle',
      nickname: 'Suki',
      tagline: 'Creator · Gamer · Nyxia Staff',
      bio: '21 // Female // DBD + RE // Nyxia Staff & Content Creator // Discord: zsukiii',
      avatar: '',
      avatarBorder: 'glow',
      avatarHover: 'float',
      banner: '',
    },
    socialLinks: [
      { id: uid(), url: 'https://www.tiktok.com/@nekirabelle', platform: 'tiktok', visible: true },
      { id: uid(), url: 'https://discord.gg/nyxia', platform: 'discord', visible: true },
      { id: uid(), url: 'https://www.youtube.com/@nekirabelle', platform: 'youtube', visible: true },
    ],
    badges: [
      {
        id: uid(),
        label: 'Developer',
        icon: '',
        badgeType: 'developer',
        useGradient: true,
        gradientFrom: '#b57bff',
        gradientTo: '#e066ff',
        textColor: '#ffffff',
        bgColor: 'transparent',
        borderColor: 'transparent',
        tooltip: 'Built this site — lavender neon vibes only',
        style: 'glow',
        visible: true,
      },
      {
        id: uid(),
        label: 'Suki',
        icon: '♡',
        badgeType: 'custom',
        useGradient: true,
        gradientFrom: '#b57bff',
        gradientTo: '#d4a5ff',
        tooltip: 'Your favorite creator — streaming & gaming content',
        bgColor: 'rgba(181, 123, 255, 0.15)',
        textColor: '#d4a5ff',
        borderColor: 'rgba(181, 123, 255, 0.4)',
        style: 'glow',
        visible: true,
      },
      {
        id: uid(),
        label: 'Nyxia Staff',
        icon: '🛡️',
        badgeType: 'custom',
        useGradient: true,
        gradientFrom: '#7c5cff',
        gradientTo: '#9d6bff',
        tooltip: 'Official Nyxia team member',
        bgColor: 'rgba(124, 92, 255, 0.15)',
        textColor: '#c4b5fd',
        borderColor: 'rgba(139, 92, 246, 0.4)',
        style: 'glow',
        visible: true,
      },
      {
        id: uid(),
        label: 'Creator',
        icon: '🎬',
        badgeType: 'custom',
        useGradient: true,
        gradientFrom: '#e066ff',
        gradientTo: '#f472b6',
        tooltip: 'TikTok, YouTube & more — DBD, RE, and beyond',
        bgColor: 'rgba(224, 102, 255, 0.12)',
        textColor: '#f0abfc',
        borderColor: 'rgba(224, 102, 255, 0.35)',
        style: 'glow',
        visible: true,
      },
    ],
    navigation: { style: 'pill' },
    tabs: [
      {
        id: uid(),
        label: 'About',
        type: 'about',
        visible: true,
        content: {
          heading: 'About me',
          subtitle: 'A little corner of the internet that\'s all mine.',
          body: '<p>Hey — I\'m Suki! I stream, create content, and rep Nyxia. Mostly DBD and RE, cozy neon vibes, and hanging with my community.</p><p>Use the links tab for my socials, or check promos if you\'re curious about Nyxia.</p>',
        },
      },
      {
        id: uid(),
        label: 'Links',
        type: 'links',
        visible: true,
        content: {
          heading: 'Quick Links',
          subtitle: 'Find me everywhere.',
          links: [
            { id: uid(), title: 'TikTok', description: '@nekirabelle', url: 'https://www.tiktok.com/@nekirabelle', icon: '🎵' },
            { id: uid(), title: 'YouTube', description: 'Streams & videos', url: 'https://www.youtube.com/@nekirabelle', icon: '▶️' },
            { id: uid(), title: 'Discord', description: 'zsukiii', url: 'https://discord.gg/nyxia', icon: '💬' },
            { id: uid(), title: 'Nyxia', description: 'nyxia.cc', url: 'https://nyxia.cc/', icon: '🛡️' },
          ],
        },
      },
      {
        id: uid(),
        label: 'Promos',
        type: 'promotions',
        visible: true,
        content: {
          heading: 'Promotions',
          subtitle: 'Stuff I genuinely recommend.',
        },
      },
      {
        id: uid(),
        label: 'Guestbook',
        type: 'comments',
        visible: true,
        content: {
          heading: 'Guestbook',
          subtitle: 'Leave a message — updates live.',
        },
      },
    ],
    comments: {
      enabled: true,
      placeholder: 'Say something...',
      namePlaceholder: 'Your name',
      maxLength: 500,
      badgeTemplates: [
        { id: uid(), label: 'VIP', icon: '💜', gradientFrom: '#b57bff', gradientTo: '#e066ff' },
        { id: uid(), label: 'Regular', icon: '★', gradientFrom: '#7c5cff', gradientTo: '#b57bff' },
      ],
    },
    promotions: [
      {
        id: uid(),
        title: 'Nyxia.cc',
        description: 'HWID Spoofers, Game Unlockers & more — stay ahead with Nyxia.',
        image: '',
        url: 'https://nyxia.cc/',
        buttonText: 'Visit Nyxia',
        accentColor: '#b57bff',
        badge: 'FEATURED',
        badgeColor: '#e066ff',
        style: 'glow',
        visible: true,
      },
      {
        id: uid(),
        title: 'Nyxia Discord',
        description: 'Join the community, get support, stay updated.',
        image: '',
        url: 'https://discord.gg/nyxia',
        buttonText: 'Join Server',
        accentColor: '#5865F2',
        badge: '',
        badgeColor: '',
        style: 'default',
        visible: true,
      },
    ],
    music: {
      position: 'bottom-right',
      style: 'minimal',
      autoplay: false,
      loop: true,
      shuffle: false,
      tracks: [
        {
          id: uid(),
          title: 'Everlong',
          artist: 'Foo Fighters',
          src: 'Foo Fighters - Everlong (Lyrics).mp3',
          cover: '',
        },
      ],
    },
    gallery: [],
  };
}

/** Fix saved configs that still use heavy/sparkle settings */
export function normalizeSiteConfig(config) {
  if (!config.site) config.site = {};
  if (!config.background) config.background = {};
  if (!config.theme) config.theme = {};

  if (['sparkle', 'petal', 'dot'].includes(config.site.cursor)) {
    config.site.cursor = 'neon';
  }

  const heavyAnims = ['petals', 'hearts', 'snow', 'shimmer'];
  if (heavyAnims.includes(config.background.animation)) config.background.animation = 'none';

  if (PRESET_ALIASES[config.theme.preset]) {
    config.theme.preset = PRESET_ALIASES[config.theme.preset];
  }
  if (!ALL_THEME_PRESETS[config.theme.preset] && !THEME_PRESETS[config.theme.preset]) {
    config.theme.preset = 'lavenderNeon';
  }

  if (config.typography?.displayFont === 'Playfair Display') {
    config.typography.displayFont = 'Outfit';
    config.typography.bodyFont = 'Inter';
  }

  if (config.site.showVisitorPill == null) {
    config.site.showVisitorPill = true;
  }

  return config;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
