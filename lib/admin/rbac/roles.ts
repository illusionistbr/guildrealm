export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'editor' | 'support';

export type Permission =
  | 'dashboard:view'
  | 'cms:manage'
  | 'cms:view'
  | 'games:create'
  | 'games:edit'
  | 'games:delete'
  | 'games:view'
  | 'guilds:view'
  | 'guilds:edit'
  | 'guilds:delete'
  | 'guilds:ban'
  | 'users:view'
  | 'users:edit'
  | 'users:delete'
  | 'users:ban'
  | 'users:premium'
  | 'achievements:manage'
  | 'events:create'
  | 'events:edit'
  | 'events:delete'
  | 'events:view'
  | 'marketplace:manage'
  | 'marketplace:view'
  | 'premium:manage'
  | 'premium:view'
  | 'moderation:view'
  | 'moderation:act'
  | 'seo:manage'
  | 'translations:manage'
  | 'notifications:send'
  | 'notifications:manage'
  | 'permissions:manage'
  | 'logs:view'
  | 'logs:export'
  | 'settings:view'
  | 'settings:manage'
  | 'security:manage'
  | 'analytics:view'
  | 'finance:view'
  | 'support:manage';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'dashboard:view', 'cms:manage', 'cms:view',
    'games:create', 'games:edit', 'games:delete', 'games:view',
    'guilds:view', 'guilds:edit', 'guilds:delete', 'guilds:ban',
    'users:view', 'users:edit', 'users:delete', 'users:ban', 'users:premium',
    'achievements:manage', 'events:create', 'events:edit', 'events:delete', 'events:view',
    'marketplace:manage', 'marketplace:view', 'premium:manage', 'premium:view',
    'moderation:view', 'moderation:act', 'seo:manage', 'translations:manage',
    'notifications:send', 'notifications:manage', 'permissions:manage',
    'logs:view', 'logs:export', 'settings:view', 'settings:manage',
    'security:manage', 'analytics:view', 'finance:view', 'support:manage',
  ],
  admin: [
    'dashboard:view', 'cms:manage', 'cms:view',
    'games:create', 'games:edit', 'games:delete', 'games:view',
    'guilds:view', 'guilds:edit', 'guilds:delete',
    'users:view', 'users:edit', 'users:premium',
    'achievements:manage', 'events:create', 'events:edit', 'events:delete', 'events:view',
    'marketplace:manage', 'marketplace:view', 'premium:manage', 'premium:view',
    'moderation:view', 'moderation:act', 'seo:manage', 'translations:manage',
    'notifications:send', 'notifications:manage',
    'logs:view', 'settings:view', 'settings:manage',
    'analytics:view', 'finance:view', 'support:manage',
  ],
  moderator: [
    'dashboard:view', 'cms:view',
    'games:view', 'guilds:view', 'guilds:edit',
    'users:view', 'users:edit',
    'events:view',
    'moderation:view', 'moderation:act',
    'logs:view', 'support:manage',
  ],
  editor: [
    'dashboard:view', 'cms:manage',
    'games:view', 'games:edit',
    'guilds:view',
    'users:view',
    'achievements:manage',
    'events:create', 'events:edit', 'events:view',
    'seo:manage', 'translations:manage',
    'logs:view',
  ],
  support: [
    'dashboard:view',
    'guilds:view',
    'users:view', 'users:edit',
    'events:view',
    'moderation:view',
    'logs:view',
    'support:manage',
  ],
};

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 5,
  admin: 4,
  moderator: 3,
  editor: 2,
  support: 1,
};
