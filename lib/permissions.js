// Simplified Role Gates System for Real Estate Management App
// This implements the fixed role gates as specified in the plan

export const PERMISSIONS = {
  master: ['delete', 'manage_users', 'finance_all', 'property_all'],
  editor: ['finance_own', 'property_manage'],
  viewer: ['property_view_available'],
};

// Check if a role has a specific permission
export const can = (role, action) =>
  PERMISSIONS[role]?.includes(action) || PERMISSIONS[role]?.includes('*');

// Role hierarchy for easy checking
export const ROLES = {
  MASTER: 'master',
  EDITOR: 'editor', 
  VIEWER: 'viewer'
};

// Helper functions for common permission checks
export const canDeleteProperty = (role) => can(role, 'delete');
export const canManageUsers = (role) => can(role, 'manage_users');
export const canViewAllFinances = (role) => can(role, 'finance_all');
export const canManageOwnFinances = (role) => can(role, 'finance_own') || can(role, 'finance_all');
export const canManageProperties = (role) => can(role, 'property_manage') || can(role, 'property_all');
export const canViewAvailableProperties = (role) => can(role, 'property_view_available') || can(role, 'property_manage') || can(role, 'property_all');
export const canAccessArchive = (role) => role === ROLES.MASTER; // Archive is master-only

// Default role for new users
export const DEFAULT_ROLE = ROLES.VIEWER;

// Master user identification (from existing setup)
export const MASTER_EMAIL = 'drax976797@gmail.com';

export const isMasterUser = (email) => {
  return email === MASTER_EMAIL;
};

// Get user role with fallback
export const getUserRole = (user) => {
  if (!user) return DEFAULT_ROLE;
  
  // Check if user is master by email
  if (isMasterUser(user.email)) {
    return ROLES.MASTER;
  }
  
  // Use the role from the user object or default to viewer
  return user.role || DEFAULT_ROLE;
};

// Validate role
export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

// Role display names
export const ROLE_DISPLAY_NAMES = {
  [ROLES.MASTER]: 'Master',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.VIEWER]: 'Viewer'
};

export const getRoleDisplayName = (role) => {
  return ROLE_DISPLAY_NAMES[role] || 'Unknown';
};
