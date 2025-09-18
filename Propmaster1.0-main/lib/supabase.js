import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Master user email
export const MASTER_EMAIL = 'drax976797@gmail.com'

// User roles and status enum
export const USER_ROLES = {
  MASTER: 'master',
  ADMIN: 'admin', 
  VIEWER: 'viewer',
  CLIENT: 'client',
  PENDING: 'pending'  // New users start here
}

export const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
}

// Granular permissions system
export const PERMISSIONS = {
  // Properties
  PROPERTIES_VIEW: 'properties_view',
  PROPERTIES_CREATE: 'properties_create',
  PROPERTIES_EDIT: 'properties_edit',
  PROPERTIES_DELETE: 'properties_delete',
  PROPERTIES_SHARE: 'properties_share',
  
  // Finance
  FINANCE_VIEW: 'finance_view',
  FINANCE_CREATE: 'finance_create',
  FINANCE_EDIT: 'finance_edit',
  FINANCE_DELETE: 'finance_delete',
  FINANCE_REPORTS: 'finance_reports',
  
  // Users
  USERS_VIEW: 'users_view',
  USERS_MANAGE: 'users_manage',
  USERS_PERMISSIONS: 'users_permissions',
  
  // Settings
  SETTINGS_VIEW: 'settings_view',
  SETTINGS_EDIT: 'settings_edit',
  
  // Dashboard
  DASHBOARD_VIEW: 'dashboard_view',
  DASHBOARD_ANALYTICS: 'dashboard_analytics'
}

// Default role permissions (can be overridden per user)
export const DEFAULT_ROLE_PERMISSIONS = {
  [USER_ROLES.MASTER]: Object.values(PERMISSIONS), // All permissions
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.PROPERTIES_CREATE,
    PERMISSIONS.PROPERTIES_EDIT,
    PERMISSIONS.PROPERTIES_DELETE,
    PERMISSIONS.PROPERTIES_SHARE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_CREATE,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_DELETE,
    PERMISSIONS.FINANCE_REPORTS,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_ANALYTICS
  ],
  [USER_ROLES.VIEWER]: [
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.DASHBOARD_VIEW
  ],
  [USER_ROLES.CLIENT]: [
    PERMISSIONS.PROPERTIES_VIEW, // Only via shared links
    PERMISSIONS.DASHBOARD_VIEW
  ],
  [USER_ROLES.PENDING]: [] // No permissions
}

// Helper functions
export const isMasterUser = (email) => {
  return email === MASTER_EMAIL
}

export const hasPermission = (userPermissions, permission) => {
  return Array.isArray(userPermissions) && userPermissions.includes(permission)
}

export const getUserPermissions = (role, customPermissions = null) => {
  // Custom permissions override default role permissions
  if (customPermissions && Array.isArray(customPermissions)) {
    return customPermissions
  }
  
  return DEFAULT_ROLE_PERMISSIONS[role] || []
}

export const canAccessDashboard = (userPermissions) => {
  return hasPermission(userPermissions, PERMISSIONS.DASHBOARD_VIEW)
}