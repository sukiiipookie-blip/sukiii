import { uid } from './utils.js';

/** Girly / neon theme presets — owner picks freely, admins can also switch themes */
export const THEMES = {
  lavenderGalaxy: {
    name: 'Lavender Galaxy',
    swatch: 'linear-gradient(135deg,#b57bff,#7c5cff,#e066ff)',
    bg: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,92,255,.4), transparent), radial-gradient(ellipse 60% 50% at 100% 80%, rgba(224,102,255,.15), transparent), linear-gradient(180deg,#08060f,#120a1f)',
    vars: {
      '--accent': '#b57bff',
      '--accent-2': '#e066ff',
      '--accent-glow': 'rgba(181,123,255,.55)',
      '--card-bg': 'rgba(14,10,28,.88)',
      '--card-border': 'rgba(181,123,255,.45)',
      '--text': '#f5f0ff',
      '--muted': '#a89bc4',
      '--name-grad': 'linear-gradient(90deg,#ede9fe,#d4a5ff,#e066ff)',
    },
  },
  pinkSolarStorm: {
    name: 'Pink Solar Storm',
    swatch: 'linear-gradient(135deg,#ff6bcb,#f472b6,#fda4af)',
    bg: 'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(255,107,203,.35), transparent), radial-gradient(ellipse 50% 40% at 90% 90%, rgba(244,114,182,.2), transparent), linear-gradient(180deg,#100810,#1a0a14)',
    vars: {
      '--accent': '#ff6bcb',
      '--accent-2': '#fda4af',
      '--accent-glow': 'rgba(255,107,203,.5)',
      '--card-bg': 'rgba(20,8,18,.9)',
      '--card-border': 'rgba(255,107,203,.4)',
      '--text': '#fff0f8',
      '--muted': '#c4a0b8',
      '--name-grad': 'linear-gradient(90deg,#fecdd3,#ff6bcb,#f472b6)',
    },
  },
  sunsetFade: {
    name: 'Sunset Fade',
    swatch: 'linear-gradient(135deg,#f97316,#a855f7,#7c3aed)',
    bg: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,.3), transparent), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(168,85,247,.25), transparent), linear-gradient(180deg,#0f0806,#150d12)',
    vars: {
      '--accent': '#f97316',
      '--accent-2': '#a855f7',
      '--accent-glow': 'rgba(249,115,22,.45)',
      '--card-bg': 'rgba(18,10,14,.9)',
      '--card-border': 'rgba(168,85,247,.38)',
      '--text': '#fff5f0',
      '--muted': '#b8a0a8',
      '--name-grad': 'linear-gradient(90deg,#fdba74,#f97316,#a855f7)',
    },
  },
  lavenderNeon: {
    name: 'Lavender Neon',
    swatch: 'linear-gradient(135deg,#c4b5fd,#b57bff,#e066ff)',
    bg: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(181,123,255,.35), transparent), linear-gradient(180deg,#08060f,#0f0a1a)',
    vars: {
      '--accent': '#b57bff',
      '--accent-2': '#e066ff',
      '--accent-glow': 'rgba(181,123,255,.5)',
      '--card-bg': 'rgba(12,8,24,.9)',
      '--card-border': 'rgba(196,181,253,.4)',
      '--text': '#f0ebff',
      '--muted': '#9d8fc4',
      '--name-grad': 'linear-gradient(90deg,#ede9fe,#c4b5fd,#e066ff)',
    },
  },
  coralDream: {
    name: 'Coral Dream',
    swatch: 'linear-gradient(135deg,#fb7185,#f97316,#fcd34d)',
    bg: 'radial-gradient(ellipse 70% 50% at 30% 0%, rgba(251,113,133,.3), transparent), linear-gradient(180deg,#0c0808,#160e10)',
    vars: {
      '--accent': '#fb7185',
      '--accent-2': '#fcd34d',
      '--accent-glow': 'rgba(251,113,133,.45)',
      '--card-bg': 'rgba(20,10,12,.9)',
      '--card-border': 'rgba(251,113,133,.35)',
      '--text': '#fff5f5',
      '--muted': '#c4a0a8',
      '--name-grad': 'linear-gradient(90deg,#fecdd3,#fb7185,#fcd34d)',
    },
  },
  violetHaze: {
    name: 'Violet Haze',
    swatch: 'linear-gradient(135deg,#8b5cf6,#6d28d9,#4c1d95)',
    bg: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(139,92,246,.35), transparent), linear-gradient(180deg,#050508,#0a0612)',
    vars: {
      '--accent': '#8b5cf6',
      '--accent-2': '#c4b5fd',
      '--accent-glow': 'rgba(139,92,246,.5)',
      '--card-bg': 'rgba(10,6,20,.92)',
      '--card-border': 'rgba(139,92,246,.4)',
      '--text': '#ede9fe',
      '--muted': '#8b7cb8',
      '--name-grad': 'linear-gradient(90deg,#c4b5fd,#8b5cf6,#6d28d9)',
    },
  },
  bubblegumNeon: {
    name: 'Bubblegum Neon',
    swatch: 'linear-gradient(135deg,#ff85c0,#ff6bcb,#c084fc)',
    bg: 'radial-gradient(ellipse 70% 55% at 40% 0%, rgba(255,133,192,.4), transparent), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(192,132,252,.25), transparent), linear-gradient(180deg,#0c0610,#140818)',
    vars: {
      '--accent': '#ff85c0',
      '--accent-2': '#c084fc',
      '--accent-glow': 'rgba(255,133,192,.55)',
      '--card-bg': 'rgba(16,8,20,.9)',
      '--card-border': 'rgba(255,133,192,.42)',
      '--text': '#fff0fa',
      '--muted': '#c4a0c8',
      '--name-grad': 'linear-gradient(90deg,#fecdd3,#ff85c0,#c084fc)',
    },
  },
  cherryBlossom: {
    name: 'Cherry Blossom',
    swatch: 'linear-gradient(135deg,#fda4af,#fb7185,#f472b6)',
    bg: 'radial-gradient(ellipse 75% 50% at 50% 0%, rgba(253,164,175,.35), transparent), linear-gradient(180deg,#10080a,#180c12)',
    vars: {
      '--accent': '#fb7185',
      '--accent-2': '#fda4af',
      '--accent-glow': 'rgba(251,113,133,.5)',
      '--card-bg': 'rgba(18,8,12,.9)',
      '--card-border': 'rgba(253,164,175,.38)',
      '--text': '#fff5f7',
      '--muted': '#c4a0a8',
      '--name-grad': 'linear-gradient(90deg,#fecdd3,#fb7185,#f472b6)',
    },
  },
  electricPink: {
    name: 'Electric Pink',
    swatch: 'linear-gradient(135deg,#ff00aa,#ff6bcb,#e066ff)',
    bg: 'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(255,0,170,.35), transparent), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(224,102,255,.2), transparent), linear-gradient(180deg,#08060f,#120818)',
    vars: {
      '--accent': '#ff00aa',
      '--accent-2': '#e066ff',
      '--accent-glow': 'rgba(255,0,170,.55)',
      '--card-bg': 'rgba(12,6,18,.92)',
      '--card-border': 'rgba(255,0,170,.4)',
      '--text': '#fff0ff',
      '--muted': '#b890c4',
      '--name-grad': 'linear-gradient(90deg,#ff9ecf,#ff00aa,#e066ff)',
    },
  },
  cyberLilac: {
    name: 'Cyber Lilac',
    swatch: 'linear-gradient(135deg,#a78bfa,#818cf8,#6366f1)',
    bg: 'radial-gradient(ellipse 80% 55% at 30% 0%, rgba(167,139,250,.35), transparent), linear-gradient(180deg,#06060f,#0c0a18)',
    vars: {
      '--accent': '#a78bfa',
      '--accent-2': '#818cf8',
      '--accent-glow': 'rgba(167,139,250,.5)',
      '--card-bg': 'rgba(8,8,20,.92)',
      '--card-border': 'rgba(167,139,250,.4)',
      '--text': '#eef2ff',
      '--muted': '#9498c4',
      '--name-grad': 'linear-gradient(90deg,#c4b5fd,#a78bfa,#6366f1)',
    },
  },
  neonPeach: {
    name: 'Neon Peach',
    swatch: 'linear-gradient(135deg,#fdba74,#fb923c,#f472b6)',
    bg: 'radial-gradient(ellipse 70% 50% at 60% 0%, rgba(253,186,116,.32), transparent), linear-gradient(180deg,#0c0806,#140e10)',
    vars: {
      '--accent': '#fb923c',
      '--accent-2': '#f472b6',
      '--accent-glow': 'rgba(251,146,60,.48)',
      '--card-bg': 'rgba(16,10,10,.9)',
      '--card-border': 'rgba(253,186,116,.38)',
      '--text': '#fff8f0',
      '--muted': '#c4a898',
      '--name-grad': 'linear-gradient(90deg,#fed7aa,#fb923c,#f472b6)',
    },
  },
  mintGlow: {
    name: 'Mint Glow',
    swatch: 'linear-gradient(135deg,#6ee7b7,#34d399,#a78bfa)',
    bg: 'radial-gradient(ellipse 70% 50% at 40% 0%, rgba(110,231,183,.28), transparent), radial-gradient(ellipse 50% 40% at 90% 90%, rgba(167,139,250,.2), transparent), linear-gradient(180deg,#060c0a,#0a100e)',
    vars: {
      '--accent': '#6ee7b7',
      '--accent-2': '#a78bfa',
      '--accent-glow': 'rgba(110,231,183,.45)',
      '--card-bg': 'rgba(8,14,12,.9)',
      '--card-border': 'rgba(110,231,183,.35)',
      '--text': '#ecfdf5',
      '--muted': '#94b8a8',
      '--name-grad': 'linear-gradient(90deg,#a7f3d0,#6ee7b7,#a78bfa)',
    },
  },
};

export const THEME_KEYS = Object.keys(THEMES);

/** Discord-style avatar frame presets — pure CSS, no perf hit */
export const AVATAR_FRAMES = {
  none: { name: 'None', class: '' },
  neonRing: { name: 'Neon Ring', class: 'frame-neon-ring' },
  pulseGlow: { name: 'Pulse Glow', class: 'frame-pulse-glow' },
  hearts: { name: 'Heart Aura', class: 'frame-hearts' },
  sparkle: { name: 'Sparkle', class: 'frame-sparkle' },
  nitro: { name: 'Nitro Wave', class: 'frame-nitro' },
  cherry: { name: 'Cherry Blossom', class: 'frame-cherry' },
  galaxy: { name: 'Galaxy Orbit', class: 'frame-galaxy' },
};

export const AVATAR_FRAME_KEYS = Object.keys(AVATAR_FRAMES);

export function createDefaultConfig() {
  return {
    site: {
      title: 'Suki | Creator Hub',
      enterText: 'click to unlock yourself',
      enterHint: 'tap anywhere · you\'re clear to enter',
      footerCredit: 'Suki',
    },
    theme: {
      preset: 'lavenderGalaxy',
      customBg: '',
      nameGradient: '',
    },
    profile: {
      displayName: 'NekiraBelle',
      username: 'suki',
      avatar: '',
      avatarFrame: 'none',
      infoLines: [
        'Creator · Gamer · Nyxia Staff',
        'Discord: zsukiii',
      ],
      nameGradientFrom: '#ede9fe',
      nameGradientTo: '#e066ff',
    },
    badges: [
      { id: uid(), icon: '🛡️', label: 'Nyxia Staff', tooltip: 'Official Nyxia team member', colorFrom: '#7c5cff', colorTo: '#9d6bff', visible: true },
      { id: uid(), icon: '🎬', label: 'Creator', tooltip: 'TikTok, YouTube & more', colorFrom: '#e066ff', colorTo: '#f472b6', visible: true },
      { id: uid(), icon: '💜', label: 'Suki', tooltip: 'Your favorite creator', colorFrom: '#b57bff', colorTo: '#d4a5ff', visible: true },
      { id: uid(), icon: '</>', label: 'Dev', tooltip: 'Built this site', colorFrom: '#6d28d9', colorTo: '#8b5cf6', visible: true },
    ],
    socials: [
      { id: uid(), platform: 'discord', url: 'https://discord.gg/nyxia', visible: true },
      { id: uid(), platform: 'tiktok', url: 'https://www.tiktok.com/@nekirabelle', visible: true },
      { id: uid(), platform: 'youtube', url: 'https://www.youtube.com/@nekirabelle', visible: true },
    ],
    about: {
      title: 'About',
      body: '<p>Hey — I\'m Suki! I stream, create content, and rep <strong>Nyxia</strong>. Mostly DBD and RE, cozy neon vibes, and hanging with my community.</p><p>Check <a href="#" class="tab-link" data-page="promotions">Promotions</a> for Nyxia links or leave a message in <a href="#" class="tab-link" data-page="comments">Comments</a>!</p>',
    },
    promotions: [
      {
        id: uid(),
        title: 'Nyxia.cc',
        description: 'HWID Spoofers, Game Unlockers & more — stay ahead with Nyxia. Premium tools for gamers who want the edge.',
        url: 'https://nyxia.cc/',
        buttonText: 'Visit Nyxia',
        accent: '#b57bff',
        logo: '',
        visible: true,
      },
      {
        id: uid(),
        title: 'Nyxia Discord',
        description: 'Join the Nyxia community — get support, updates, and connect with other users.',
        url: 'https://discord.gg/nyxia',
        buttonText: 'Join Discord',
        accent: '#5865F2',
        logo: '',
        visible: true,
      },
      {
        id: uid(),
        title: 'What Nyxia Offers',
        description: 'HWID spoofers to bypass hardware bans, game unlockers, and premium gaming utilities. Trusted by the community.',
        url: 'https://nyxia.cc/',
        buttonText: 'Learn More',
        accent: '#e066ff',
        logo: '',
        visible: true,
      },
    ],
    music: {
      autoplay: true,
      volume: 0.25,
      shuffle: true,
      tracks: [
        { id: uid(), title: 'Everlong', artist: 'Foo Fighters', src: 'Foo Fighters - Everlong (Lyrics).mp3' },
      ],
    },
    comments: {
      placeholder: 'Write a comment...',
      namePlaceholder: 'Username',
      maxLength: 500,
      badgeTemplates: [],
    },
    /** Owner-only goofy Nyxia / Syaz tribute — off by default until you enable it */
    syazTribute: {
      enabled: false,
      showNavTab: true,
      navLabel: 'Syaz',
      chipAvatar: '',
      chipName: 'Syaz',
      chipGradientFrom: '#fecdd3',
      chipGradientTo: '#ff6bcb',
      showBadge: true,
      badgeLabel: 'Property of Syaz',
      badgeTooltip: 'Nyxia owner 💜',
      boxTitle: 'Me & Syaz',
      boxLine: 'I love you daddy Syaz',
      boxImage: '',
    },
  };
}

export function normalizeSiteConfig(config) {
  if (!config || typeof config !== 'object') return createDefaultConfig();
  const defaults = createDefaultConfig();
  if (!config.site) config.site = defaults.site;
  else config.site = { ...defaults.site, ...config.site };
  if (!config.site.enterHint) config.site.enterHint = defaults.site.enterHint;
  if (!config.theme) config.theme = defaults.theme;
  if (!config.profile) config.profile = defaults.profile;
  if (!config.badges?.length) config.badges = defaults.badges;
  if (!config.socials?.length) config.socials = defaults.socials;
  if (!config.about) config.about = defaults.about;
  if (!config.promotions?.length) config.promotions = defaults.promotions;
  if (!config.music) config.music = defaults.music;
  if (!config.comments) config.comments = defaults.comments;
  if (!config.syazTribute) config.syazTribute = { ...defaults.syazTribute };
  else config.syazTribute = { ...defaults.syazTribute, ...config.syazTribute };
  config.promotions = (config.promotions?.length ? config.promotions : defaults.promotions).map(p => ({
    ...p,
    logo: p.logo ?? '',
  }));
  if (!THEMES[config.theme.preset]) config.theme.preset = 'lavenderGalaxy';
  if (!config.profile.avatarFrame) config.profile.avatarFrame = 'none';
  config.badges = (config.badges?.length ? config.badges : defaults.badges).map(b => ({
    ...b,
    iconUrl: b.iconUrl ?? '',
  }));

  // Migrate old saved configs
  if (config.socialLinks && !config.socials?.length) {
    config.socials = config.socialLinks.map(s => ({
      id: s.id || uid(), platform: s.platform || 'link', url: s.url, visible: s.visible !== false,
    }));
  }
  if (config.profile?.bio && (!config.about?.body || config.about.body === defaults.about.body)) {
    config.about.body = `<p>${config.profile.bio}</p>`;
  }
  if (config.profile?.tagline && !config.profile.infoLines?.length) {
    config.profile.infoLines = [config.profile.tagline, ...(config.profile.infoLines || [])];
  }
  if (config.tabs) {
    const aboutTab = config.tabs.find(t => t.type === 'about');
    if (aboutTab?.content?.body && config.about.body === defaults.about.body) {
      config.about.body = aboutTab.content.body;
    }
  }

  return config;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
