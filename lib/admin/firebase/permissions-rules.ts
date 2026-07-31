// Firestore Security Rules templates

export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin roles collection - only admins can read/write
    match /admin_roles/{userId} {
      allow read: if request.auth != null && request.auth.token.role in ['super_admin', 'admin'];
      allow write: if request.auth != null && request.auth.token.role == 'super_admin';
    }

    // Admin logs - only admins can read
    match /admin_logs/{logId} {
      allow read: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'moderator'];
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin'];
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && (request.auth.uid == userId || request.auth.token.role in ['super_admin', 'admin', 'moderator']);
      allow delete: if request.auth != null && request.auth.token.role in ['super_admin', 'admin'];
    }

    // Guilds collection
    match /guilds/{guildId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'moderator'];
    }

    // Games collection
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // Achievements collection
    match /achievements/{achievementId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // Events collection
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // CMS sections
    match /cms_sections/{sectionId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // Platform settings
    match /platform_settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin'];
    }

    // Reports (moderation)
    match /reports/{reportId} {
      allow read: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'moderator'];
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'moderator'];
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // SEO settings
    match /seo_settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // Translations
    match /translations/{langId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['super_admin', 'admin', 'editor'];
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;
