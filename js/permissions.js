/** Admin permissions — admins get themes + comment mod only; owner gets everything */
export const PERMISSION_LABELS = {
  edit_theme: 'Switch Home Themes',
  moderate_comments: 'Moderate Comments',
  edit_profile: 'Profile & Name',
  edit_badges: 'Badges & Icons',
  edit_content: 'Home Box & Promotions',
  edit_music: 'Music Player',
  edit_media: 'Uploads & Backgrounds',
  manage_users: 'Manage Admins',
};

export const DEFAULT_ADMIN_PERMISSIONS = {
  edit_theme: true,
  moderate_comments: true,
  edit_profile: false,
  edit_badges: false,
  edit_content: false,
  edit_music: false,
  edit_media: false,
};

export const SECTION_PERMISSION = {
  theme: 'edit_theme',
  profile: 'edit_profile',
  badges: 'edit_badges',
  about: 'edit_content',
  home: 'edit_content',
  promotions: 'edit_content',
  music: 'edit_music',
  media: 'edit_media',
  comments: 'moderate_comments',
  users: 'manage_users',
  special: 'manage_users',
};

export const ADMIN_GROUPS = [
  { label: 'Design', sections: ['theme', 'media'] },
  { label: 'Content', sections: ['profile', 'home', 'badges', 'promotions', 'music'] },
  { label: 'Community', sections: ['comments'] },
  { label: 'Owner', sections: ['site', 'bans', 'special', 'users', 'audit'], ownerOnly: true },
];

export function isOwner(role) { return role === 'owner'; }

export function hasPermission(siteUser, permission) {
  if (!siteUser) return false;
  if (siteUser.role === 'owner') return true;
  if (permission === 'manage_users') return false;
  const perms = siteUser.permissions || {};
  return perms[permission] === true || (perms[permission] !== false && DEFAULT_ADMIN_PERMISSIONS[permission]);
}

export function canAccessSection(siteUser, sectionId) {
  if (!siteUser) return false;
  if (sectionId === 'users' || sectionId === 'audit' || sectionId === 'site' || sectionId === 'bans') return siteUser.role === 'owner';
  const perm = SECTION_PERMISSION[sectionId];
  if (!perm) return true;
  return hasPermission(siteUser, perm);
}

export function getVisibleSections(siteUser) {
  const visible = [];
  for (const group of ADMIN_GROUPS) {
    if (group.ownerOnly && siteUser?.role !== 'owner') continue;
    for (const s of group.sections) {
      if (canAccessSection(siteUser, s)) visible.push(s);
    }
  }
  return [...new Set(visible)];
}
