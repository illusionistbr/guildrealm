// Firestore Security Rules templates

export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helpers: cargos definidos via Custom Claims (Cloud Function setAdminClaims)
    function isSignedIn() {
      return request.auth != null;
    }

    function hasRole(roles) {
      return isSignedIn() && request.auth.token.role in roles;
    }

    function isAdmin() {
      return hasRole(['super_admin', 'admin']);
    }

    function isStaff() {
      return hasRole(['super_admin', 'admin', 'moderator', 'editor', 'support']);
    }

    // ============ USUÁRIOS ============
    match /users/{userId} {
      allow read: if isSignedIn(); // perfis podem exigir login
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() &&
        (request.auth.uid == userId || isStaff());
      allow delete: if isAdmin();
    }

    // ============ GUILDS ============
    match /guilds/{guildId} {
      allow read: if true; // listagem pública
      allow create: if isSignedIn() &&
        request.resource.data.ownerId == request.auth.uid;
      allow update: if isSignedIn() &&
        (request.resource.data.ownerId == request.auth.uid ||
         resource.data.ownerId == request.auth.uid ||
         isStaff());
      allow delete: if isSignedIn() &&
        (resource.data.ownerId == request.auth.uid || isAdmin());
    }

    // ============ CONTEÚDO PÚBLICO (leitura livre, escrita de staff) ============
    match /games/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin', 'editor']);
    }
    match /achievements/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin', 'editor']);
    }
    match /events/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin', 'editor']);
    }
    match /cms_sections/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin', 'editor']);
    }
    match /seo_settings/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin', 'editor']);
    }
    match /translations/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin', 'editor']);
    }
    match /banners/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /faq/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /premium_plans/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ============ MARKETPLACE ============
    match /marketplace_products/{id} {
      allow read: if true;
      allow write: if hasRole(['super_admin', 'admin']); // marketplace:manage
    }
    match /marketplace_coupons/{id} {
      allow read: if isStaff(); // cupons não são públicos
      allow write: if isAdmin();
    }

    // ============ NOTIFICAÇÕES (somente do próprio usuário) ============
    match /notifications/{notificationId} {
      allow read: if isSignedIn() &&
        (request.auth.uid == notificationId ||
         request.auth.token.uid == request.resource.data.uid ||
         isAdmin());
      allow create: if isSignedIn() &&
        request.resource.data.uid == request.auth.uid;
      allow update: if isSignedIn() &&
        (request.resource.data.uid == request.auth.uid ||
         resource.data.uid == request.auth.uid);
      allow delete: if isSignedIn() &&
        resource.data.uid == request.auth.uid;
    }

    // ============ MODERAÇÃO ============
    match /reports/{reportId} {
      allow create: if isSignedIn(); // qualquer usuário pode denunciar
      allow read: if hasRole(['super_admin', 'admin', 'moderator']);
      allow update: if hasRole(['super_admin', 'admin', 'moderator']);
      allow delete: if isAdmin();
    }

    // ============ ADMIN ============
    match /admin_roles/{userId} {
      // leitura do próprio doc para montar sessão (getAdminProfile)
      allow read: if isSignedIn() && request.auth.uid == userId;
      allow create, update: if isAdmin();
      allow delete: if hasRole(['super_admin']);
    }

    match /admin_permissions/{id} {
      allow read, write: if hasRole(['super_admin']);
    }

    match /admin_sessions/{sessionId} {
      allow read: if hasRole(['super_admin']);
      allow create: if isStaff(); // criação da sessão
      allow update: if hasRole(['super_admin', 'admin']);
      allow delete: if hasRole(['super_admin', 'admin']);
    }

    match /admin_settings/{id} {
      allow read: if isStaff();
      allow write: if isAdmin(); // settings:manage
    }

    match /admin_logs/{logId} {
      // logs são criados pelo client (createAuditLog/recordAdminLogin)
      allow create: if isStaff();
      allow read: if hasRole(['super_admin', 'admin', 'moderator']);
      allow update: if hasRole(['super_admin', 'admin']);
      allow delete: if hasRole(['super_admin']);
    }

    match /audit_log/{logId} {
      allow create: if isStaff();
      allow read: if hasRole(['super_admin', 'admin']);
      allow update, delete: if hasRole(['super_admin']);
    }

    match /platform_settings/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // ============ NEGA TODO O RESTO ============
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;
