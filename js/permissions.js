/** All permissions an owner can grant to admins */
export const PERMISSION_LABELS = {
  edit_theme: 'Theme & Colors',
  edit_background: 'Backgrounds',
  edit_profile: 'Profile',
  edit_badges: 'Profile Badges',
  edit_tabs: 'Tabs & Navigation',
  edit_promotions: 'Promotions',
  edit_music: 'Music Player',
  edit_typography: 'Typography',
  edit_site: 'Site Settings',
  moderate_comments: 'Delete Comments',
  edit_comments_settings: 'Comment Badges & Highlights',
};

export const DEFAULT_ADMIN_PERMISSIONS = {
  edit_theme: true,
  edit_background: true,
  edit_profile: true,
  edit_badges: true,
  edit_tabs: true,
  edit_promotions: true,
  edit_music: true,
  edit_typography: true,
  edit_site: false,
  moderate_comments: true,
  edit_comments_settings: false,
};

/** Maps admin panel section id → required permission */
export const SECTION_PERMISSION = {
  theme: 'edit_theme',
  background: 'edit_background',
  profile: 'edit_profile',
  badges: 'edit_badges',
  tabs: 'edit_tabs',
  promotions: 'edit_promotions',
  music: 'edit_music',
  typography: 'edit_typography',
  site: 'edit_site',
  comments: 'moderate_comments',
  users: 'manage_users',
};

export const ADMIN_GROUPS = [
  { label: 'Design', sections: ['theme', 'background', 'typography'] },
  { label: 'Content', sections: ['profile', 'badges', 'tabs', 'promotions', 'music'] },
  { label: 'Community', sections: ['comments'] },
  { label: 'Owner', sections: ['users'], ownerOnly: true },
  { label: 'Settings', sections: ['site'] },
];

export function isOwner(role) {
  return role === 'owner';
}

export function hasPermission(siteUser, permission) {
  if (!siteUser) return false;
  if (siteUser.role === 'owner') return true;
  if (permission === 'manage_users') return false;
  const perms = siteUser.permissions || {};
  return perms[permission] !== false && (perms[permission] === true || DEFAULT_ADMIN_PERMISSIONS[permission]);
}

export function canAccessSection(siteUser, sectionId) {
  if (!siteUser) return false;
  if (sectionId === 'users') return siteUser.role === 'owner';
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
  return visible;
}
