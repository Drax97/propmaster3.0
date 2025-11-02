# 📋 Real Estate Management App — **Simplified Role Gates Plan**

## 🧭 Overview

This updated plan uses **fixed role gates** for three access levels: `master`, `editor`, and `viewer`. It’s the **safest, easiest approach** for Cursor to implement without breaking existing code.

---

## ✅ Phase 0 — Preparation

1. **Ensure Supabase `users` table has a `role` field** with default `viewer`.

   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';
   ```
2. **Verify existing RLS policies remain intact**. Add new policies only, do not overwrite old ones.

---

## 🔑 Phase 1 — User Roles & Permissions Helper

1. Create `/lib/permissions.js`:

   ```js
   export const PERMISSIONS = {
     master: ['delete', 'manage_users', 'finance_all', 'property_all'],
     editor: ['finance_own', 'property_manage'],
     viewer: ['property_view_available'],
   };

   export const can = (role, action) =>
     PERMISSIONS[role]?.includes(action) || PERMISSIONS[role]?.includes('*');
   ```
2. Update NextAuth callbacks to include `role` in the session:

   ```js
   callbacks: {
     async session({ session, token }) {
       session.user.role = token.role ?? 'viewer';
       return session;
     },
     async jwt({ token, user }) {
       if (user?.role) token.role = user.role;
       return token;
     }
   }
   ```
3. Use guards in API routes and UI components without altering existing logic.

---

## 🏠 Phase 2 — Property Tab Enhancements

1. **Track property creators** (non-breaking):

   ```sql
   ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
   ```

   Update API to include `created_by` when adding properties, falling back to `null` if missing.
2. **Filter by creator**:

   * Extend `/api/properties` with optional `?creator=<id>` param.
   * Keep default fetching unchanged.
3. **Restrict Viewers** to `Available` properties using:

   ```js
   if (can(user.role, 'property_view_available')) {
     // filter properties where status = 'Available'
   }
   ```
4. **Delete Property**:

   * Add Delete button with confirmation `<Dialog>`.
   * API route checks `can(role, 'delete')` before removing property.

---

## 💰 Phase 3 — Finance Section

1. **Visibility rules**:

   * Master: see all.
   * Editor: see only their own records.
   * Viewer: none.
2. **Lock entries after creation** for Editors (frontend disables edits, backend enforces `UPDATE` allowed only for `master`).
3. Add optional RLS policies for extra safety without replacing current ones.

---

## ✅ Phase 4 — User Management (Master Only) - COMPLETED

**Implementation Details:**

1. **Updated User Management Page** (`/app/admin/users/page.js`):
   - ✅ Replaced `isMaster` checks with `canManageUsers()` from permissions system
   - ✅ Updated role selection to use new `ROLES` constants (master, editor, viewer)
   - ✅ Fixed badge colors and status handling for new role system
   - ✅ Integrated with new permissions helper functions

2. **Created RoleSelect Component** (`/components/RoleSelect.jsx`):
   - ✅ Reusable component for role selection with proper permission checks
   - ✅ Shows role badges when user can't manage users
   - ✅ Uses new ROLES and ROLE_DISPLAY_NAMES from permissions system

3. **Updated API Routes** with permission checks:
   - ✅ `/api/admin/users/route.js` - Added authentication and `canManageUsers()` check
   - ✅ `/api/admin/users/[userId]/route.js` - Added permission checks for PUT and DELETE operations
   - ✅ Returns 401 for unauthenticated users, 403 for insufficient permissions

4. **Navigation Integration**:
   - ✅ Updated dashboard to use new permissions system (`canManageUsers()`)
   - ✅ QuickActions component shows User Management card for users with manage_users permission
   - ✅ Displays pending user count badge when applicable

5. **Permission-Based Access Control**:
   - ✅ Only users with `manage_users` permission can access user management
   - ✅ Proper role hierarchy: Master > Editor > Viewer
   - ✅ Default new sign-ups remain `viewer` as specified

6. **Fixed Role Persistence Issue**:
   - ✅ Updated NextAuth JWT callback to preserve existing user roles
   - ✅ Only sets default role for truly new users
   - ✅ Prevents role reset on login for existing users with assigned roles

---

## 🛠 Phase 5 — Extra Features

1. **Property Sharing**: Add new `/share/[token]` page with OG tags.
2. **Notifications**: Use Supabase Functions or cron jobs.
3. **Finance Exports**: Add Excel/PDF exports as new routes.
4. **Google Drive Backup**: Implement as a separate cron or serverless function.

---

## 📂 Folder Structure

```
/app
  /properties
    page.jsx
    PropertyCard.jsx
    PropertyFilter.jsx
  /finance
    page.jsx
  /users
    page.jsx
/lib
  permissions.js
  supabase.js
  backup.js
/api
  /properties
    route.js
  /finance
    route.js
  /admin/users
    [id].js
/components
  ConfirmDeleteDialog.jsx
  RoleSelect.jsx
```

---

## ⚡ Tips for Cursor Execution

* Use **feature branches** (e.g., `feature/roles`) to isolate changes.
* Commit small changes per step and run tests after each.
* Use `can(role, action)` everywhere instead of refactoring multiple places.
* Default unknown roles to `viewer` to prevent crashes.

---

## ✅ Done

This fixed-role gates approach ensures **Master**, **Editor**, and **Viewer** access levels are enforced **without breaking existing code** while remaining easy for Cursor to implement across frontend and backend.
