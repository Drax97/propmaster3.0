import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseKey
  })
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with enhanced configuration (for client-side operations)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'propmaster-app'
    }
  }
})

// Create Supabase admin client for server-side operations that need to bypass RLS
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'propmaster-app-admin'
    }
  }
}) : null

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

// Fetch comprehensive dashboard statistics
export const fetchDashboardStatistics = async () => {
  try {
    console.log('Starting dashboard statistics fetch...')
    
    // Fetch total number of users (all accounts)
    const { count: totalUsers, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    console.log('Total Users Query:', { 
      totalUsers, 
      userError,
      userErrorDetails: userError ? JSON.stringify(userError) : 'No error' 
    })

    // Fetch total properties (all types)
    const { count: totalProperties, error: propertiesError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
    console.log('Total Properties Query:', { 
      totalProperties, 
      propertiesError,
      propertiesErrorDetails: propertiesError ? JSON.stringify(propertiesError) : 'No error' 
    })

    // Fetch available properties (with 'available' status)
    const { count: availableProperties, error: availablePropertiesError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
    console.log('Available Properties Query:', { 
      availableProperties, 
      availablePropertiesError,
      availablePropertiesErrorDetails: availablePropertiesError ? JSON.stringify(availablePropertiesError) : 'No error' 
    })

    // Fetch total unpaid money (pending and overdue statuses)
    const { data: unpaidFinances, error: unpaidError } = await supabase
      .from('finances')
      .select('amount')
      .in('status', ['pending', 'overdue'])
    console.log('Unpaid Finances Query:', { 
      unpaidFinances, 
      unpaidError,
      unpaidErrorDetails: unpaidError ? JSON.stringify(unpaidError) : 'No error',
      unpaidFinancesCount: unpaidFinances ? unpaidFinances.length : 0
    })

    const totalUnpaidMoney = unpaidFinances && unpaidFinances.length > 0
      ? unpaidFinances.reduce((sum, finance) => sum + (finance.amount || 0), 0)
      : 0
    console.log('Total Unpaid Money Calculation:', { 
      totalUnpaidMoney,
      unpaidFinancesDetails: unpaidFinances ? unpaidFinances.map(f => f.amount) : 'No finances'
    })

    // Comprehensive error handling
    const errors = [
      userError && { type: 'Users', error: userError },
      propertiesError && { type: 'Properties', error: propertiesError },
      availablePropertiesError && { type: 'Available Properties', error: availablePropertiesError },
      unpaidError && { type: 'Unpaid Finances', error: unpaidError }
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error('Dashboard stats fetch errors:', errors)
      return {
        totalUsers: 0,
        totalProperties: 0,
        availableProperties: 0,
        totalReceivables: 0,
        errors: errors
      }
    }

    const result = {
      totalUsers: totalUsers || 0,
      totalProperties: totalProperties || 0,
      availableProperties: availableProperties || 0,
      totalReceivables: totalUnpaidMoney
    }
    
    console.log('Final Dashboard Statistics:', result)
    return result
  } catch (error) {
    console.error('Unexpected error fetching dashboard statistics:', error)
    return {
      totalUsers: 0,
      totalProperties: 0,
      availableProperties: 0,
      totalReceivables: 0,
      errors: [{ type: 'Unexpected', error: error.message }]
    }
  }
}

// Database utility functions
export const handleSupabaseError = (error, operation = 'database operation') => {
  console.error(`Supabase ${operation} error:`, error)
  
  // Handle specific error codes
  switch (error?.code) {
    case 'PGRST116':
      return {
        type: 'TABLE_NOT_FOUND',
        message: 'Database table not found. Please set up the database first.',
        shouldCreateTables: true
      }
    case 'PGRST205':
      return {
        type: 'SCHEMA_CACHE_ERROR',
        message: 'Schema cache error. The table exists but is not in cache.',
        shouldRefreshCache: true
      }
    case 'PGRST301':
      return {
        type: 'PERMISSION_DENIED',
        message: 'Permission denied. Check your database policies.',
        shouldCheckPolicies: true
      }
    default:
      return {
        type: 'UNKNOWN_ERROR',
        message: error?.message || 'An unknown database error occurred',
        originalError: error
      }
  }
}

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      return {
        success: false,
        error: handleSupabaseError(error, 'connection test')
      }
    }
    
    return {
      success: true,
      message: 'Database connection successful'
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'CONNECTION_ERROR',
        message: 'Failed to connect to database',
        originalError: err
      }
    }
  }
}

// Create user with error handling
export const createOrUpdateUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      const errorInfo = handleSupabaseError(error, 'user creation')
      return { success: false, error: errorInfo }
    }

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'UNEXPECTED_ERROR',
        message: 'Unexpected error during user creation',
        originalError: err
      }
    }
  }
}