import { supabase, supabaseAdmin } from './supabase'

/**
 * Optimized query utilities for PropMaster 3.0
 * 
 * These utilities provide pre-optimized queries for common operations,
 * using the performance indexes and views created by the optimization system.
 */

// Enhanced database client with query optimization
class OptimizedQueryClient {
  constructor() {
    this.client = supabase
    this.adminClient = supabaseAdmin
  }

  /**
   * Optimized user authentication lookup
   * Uses btree index on email for fast authentication
   */
  async getUserByEmail(email, options = {}) {
    const { includePermissions = false, useAdmin = false } = options
    
    try {
      const client = useAdmin ? (this.adminClient || this.client) : this.client
      
      let selectFields = 'id, email, name, image, role, status, created_at, updated_at, last_login'
      if (includePermissions) {
        selectFields += ', permissions'
      }
      
      const { data, error } = await client
        .from('users')
        .select(selectFields)
        .eq('email', email)
        .single()
      
      if (error) {
        return { data: null, error, source: 'database' }
      }
      
      // Process permissions if included
      if (includePermissions && data.permissions) {
        data.permissions = typeof data.permissions === 'string' ? 
          JSON.parse(data.permissions) : data.permissions
      }
      
      return { data, error: null, source: 'database' }
    } catch (err) {
      return { data: null, error: err, source: 'database' }
    }
  }

  /**
   * Optimized property listing with advanced filtering
   * Uses composite indexes for efficient filtering and sorting
   */
  async getProperties(filters = {}, options = {}) {
    const {
      userId = null,
      userRole = 'viewer',
      limit = 50,
      offset = 0,
      useView = true
    } = options

    try {
      // Use optimized view if available and requested, with automatic fallback
      let tableName = 'properties'
      let selectFields = `
        *,
        users:created_by(name, email)
      `
      let usingOptimizedView = false
      
      if (useView) {
        // Try to use the optimized view first
        try {
          const testQuery = await this.client
            .from('property_summary_view')
            .select('id')
            .limit(1)
          
          if (!testQuery.error) {
            tableName = 'property_summary_view'
            selectFields = '*'
            usingOptimizedView = true
          }
        } catch (viewError) {
          console.log('Optimized view not available, using standard table')
        }
      }
      
      let query = this.client
        .from(tableName)
        .select(selectFields)
        .order('updated_at', { ascending: false })

      // Handle archived properties filtering
      if (!filters.includeArchived) {
        // By default, exclude archived properties unless explicitly requested
        query = query.neq('status', 'archived')
      }

      // Apply visibility rules
      if (userRole !== 'master') {
        if (userId) {
          query = query.or(`status.neq.private,created_by.eq.${userId}`)
        } else {
          query = query.neq('status', 'private')
        }
      }

      // Role-based filtering for editors
      if (userRole === 'editor' && userId) {
        query = query.or(`created_by.eq.${userId},status.eq.available,status.eq.pending`)
      }

      // Apply search filter (uses GIN index for full-text search)
      if (filters.search) {
        if (usingOptimizedView) {
          // Use the optimized search in the view
          query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        } else {
          // Use standard ilike search for compatibility
          query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }
      }

      // Status filter (uses composite index)
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Price range filters (uses btree index on price)
      if (filters.minPrice) {
        query = query.gte('price', parseFloat(filters.minPrice))
      }
      if (filters.maxPrice) {
        query = query.lte('price', parseFloat(filters.maxPrice))
      }

      // Location filter (uses GIN index for text search)
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%)`)
      }

      // Creator filter
      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy)
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error, count } = await query

      return {
        data: data || [],
        error,
        count,
        source: 'database',
        optimized: usingOptimizedView
      }
    } catch (err) {
      return {
        data: [],
        error: err,
        count: 0,
        source: 'database',
        optimized: false
      }
    }
  }

  /**
   * Optimized finance listing with role-based access
   * Uses composite indexes for efficient filtering
   */
  async getFinances(filters = {}, options = {}) {
    const {
      userId = null,
      userRole = 'viewer',
      limit = 50,
      offset = 0,
      useView = true,
      includePropertyInfo = true
    } = options

    try {
      // Use optimized view if available
      const tableName = useView ? 'finance_summary_view' : 'finances'
      
      let selectFields = '*'
      if (!useView && includePropertyInfo) {
        selectFields = `
          *,
          properties:property_id(id, name, location),
          users:created_by(name, email)
        `
      }

      let query = this.client
        .from(tableName)
        .select(selectFields)
        .order('updated_at', { ascending: false })

      // Role-based access control (uses composite index)
      if (userRole === 'editor' && userId) {
        query = query.eq('created_by', userId)
      }

      // Property filter
      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }

      // Status filter (uses composite index)
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Client name search (uses GIN index)
      if (filters.clientName) {
        query = query.ilike('client_name', `%${filters.clientName}%`)
      }

      // Date range filters (uses composite index)
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      // Amount range filters
      if (filters.minAmount) {
        query = query.gte('amount', parseFloat(filters.minAmount))
      }
      if (filters.maxAmount) {
        query = query.lte('amount', parseFloat(filters.maxAmount))
      }

      // Creator filter (for masters only)
      if (filters.createdBy && userRole === 'master') {
        query = query.eq('created_by', filters.createdBy)
      }

      // Due date filters
      if (filters.overdue) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0])
        query = query.eq('status', 'pending')
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error, count } = await query

      return {
        data: data || [],
        error,
        count,
        source: 'database',
        optimized: usingOptimizedView
      }
    } catch (err) {
      return {
        data: [],
        error: err,
        count: 0,
        source: 'database',
        optimized: false
      }
    }
  }

  /**
   * Optimized financial summary calculation
   * Uses indexes for efficient aggregation
   */
  async getFinancialSummary(filters = {}, options = {}) {
    const { userId = null, userRole = 'viewer' } = options

    try {
      let query = this.client
        .from('finances')
        .select('amount, status, created_by')

      // Apply role-based filtering
      if (userRole === 'editor' && userId) {
        query = query.eq('created_by', userId)
      }

      // Apply additional filters
      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }
      if (filters.createdBy && userRole === 'master') {
        query = query.eq('created_by', filters.createdBy)
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        return { data: null, error, source: 'database' }
      }

      // Calculate summary (done in JavaScript for flexibility)
      const summary = {
        totalRecords: data.length,
        totalReceivables: data.reduce((sum, f) => sum + (f.amount || 0), 0),
        totalReceived: data
          .filter(f => f.status === 'paid')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
        pendingAmount: data
          .filter(f => f.status === 'pending')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
        overdueAmount: data
          .filter(f => f.status === 'overdue')
          .reduce((sum, f) => sum + (f.amount || 0), 0),
        statusBreakdown: {
          paid: data.filter(f => f.status === 'paid').length,
          pending: data.filter(f => f.status === 'pending').length,
          overdue: data.filter(f => f.status === 'overdue').length,
          cancelled: data.filter(f => f.status === 'cancelled').length
        }
      }

      return { data: summary, error: null, source: 'database' }
    } catch (err) {
      return { data: null, error: err, source: 'database' }
    }
  }

  /**
   * Optimized user activity summary
   * Uses the user_activity_summary view for efficient calculation
   */
  async getUserActivitySummary(options = {}) {
    const { useView = true, userRole = 'viewer', requesterId = null } = options

    try {
      if (useView) {
        // Use optimized view
        let query = this.client
          .from('user_activity_summary')
          .select('*')
          .order('properties_created', { ascending: false })

        // Role-based access control
        if (userRole !== 'master') {
          return { 
            data: [], 
            error: { message: 'Insufficient permissions' }, 
            source: 'database' 
          }
        }

        const { data, error } = await query

        return { data: data || [], error, source: 'database', optimized: true }
      } else {
        // Fallback to manual calculation
        const { data: users, error: usersError } = await this.client
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (usersError) {
          return { data: [], error: usersError, source: 'database', optimized: false }
        }

        // This would be slower without the view, but provides fallback
        const summaries = await Promise.all(
          users.map(async (user) => {
            const [propertiesResult, financesResult] = await Promise.all([
              this.client.from('properties').select('id').eq('created_by', user.id),
              this.client.from('finances').select('amount, status').eq('created_by', user.id)
            ])

            const properties = propertiesResult.data || []
            const finances = financesResult.data || []

            return {
              ...user,
              properties_created: properties.length,
              finance_records_created: finances.length,
              total_payments_received: finances
                .filter(f => f.status === 'paid')
                .reduce((sum, f) => sum + (f.amount || 0), 0),
              total_pending_amount: finances
                .filter(f => f.status === 'pending')
                .reduce((sum, f) => sum + (f.amount || 0), 0)
            }
          })
        )

        return { data: summaries, error: null, source: 'database', optimized: false }
      }
    } catch (err) {
      return { data: [], error: err, source: 'database', optimized: false }
    }
  }

  /**
   * Optimized dashboard statistics
   * Uses efficient counting queries with indexes
   */
  async getDashboardStats(options = {}) {
    const { userId = null, userRole = 'viewer' } = options

    try {
      // Parallel execution of optimized count queries
      const [usersResult, propertiesResult, financesResult] = await Promise.all([
        // Total users count
        this.client
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // Properties count with role-based filtering
        userRole === 'editor' && userId ? 
          this.client
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId) :
          this.client
            .from('properties')
            .select('*', { count: 'exact', head: true }),
        
        // Financial summary with role-based filtering
        userRole === 'editor' && userId ?
          this.client
            .from('finances')
            .select('amount, status')
            .eq('created_by', userId) :
          this.client
            .from('finances')
            .select('amount, status')
      ])

      const stats = {
        totalUsers: usersResult.count || 0,
        totalProperties: propertiesResult.count || 0,
        availableProperties: 0, // Will be calculated separately if needed
        totalReceivables: 0,
        totalReceived: 0,
        pendingAmount: 0,
        overdueAmount: 0
      }

      // Calculate financial statistics
      if (financesResult.data) {
        stats.totalReceivables = financesResult.data.reduce(
          (sum, f) => sum + (f.amount || 0), 0
        )
        stats.totalReceived = financesResult.data
          .filter(f => f.status === 'paid')
          .reduce((sum, f) => sum + (f.amount || 0), 0)
        stats.pendingAmount = financesResult.data
          .filter(f => f.status === 'pending')
          .reduce((sum, f) => sum + (f.amount || 0), 0)
        stats.overdueAmount = financesResult.data
          .filter(f => f.status === 'overdue')
          .reduce((sum, f) => sum + (f.amount || 0), 0)
      }

      return { data: stats, error: null, source: 'database' }
    } catch (err) {
      return {
        data: {
          totalUsers: 0,
          totalProperties: 0,
          availableProperties: 0,
          totalReceivables: 0,
          totalReceived: 0,
          pendingAmount: 0,
          overdueAmount: 0
        },
        error: err,
        source: 'database'
      }
    }
  }

  /**
   * Check if optimized views and indexes are available
   */
  async checkOptimizations() {
    try {
      const client = this.adminClient || this.client
      
      // Check for key indexes
      const { data: indexData, error: indexError } = await client.rpc('exec_sql', {
        sql: `
          SELECT indexname 
          FROM pg_indexes 
          WHERE indexname LIKE 'idx_%' 
          AND tablename IN ('users', 'properties', 'finances')
        `
      })

      // Check for optimized views
      const { data: viewData, error: viewError } = await client.rpc('exec_sql', {
        sql: `
          SELECT viewname 
          FROM pg_views 
          WHERE viewname LIKE '%_summary%' 
          OR viewname LIKE '%_view'
        `
      })

      return {
        indexes: indexData || [],
        views: viewData || [],
        optimized: (indexData?.length || 0) > 5 && (viewData?.length || 0) > 0,
        indexError,
        viewError
      }
    } catch (err) {
      return {
        indexes: [],
        views: [],
        optimized: false,
        error: err.message
      }
    }
  }
}

// Create singleton instance
const optimizedQueries = new OptimizedQueryClient()

// Export convenience functions
export const getUserByEmail = (email, options) => optimizedQueries.getUserByEmail(email, options)
export const getOptimizedProperties = (filters, options) => optimizedQueries.getProperties(filters, options)
export const getOptimizedFinances = (filters, options) => optimizedQueries.getFinances(filters, options)
export const getFinancialSummary = (filters, options) => optimizedQueries.getFinancialSummary(filters, options)
export const getUserActivitySummary = (options) => optimizedQueries.getUserActivitySummary(options)
export const getOptimizedDashboardStats = (options) => optimizedQueries.getDashboardStats(options)
export const checkQueryOptimizations = () => optimizedQueries.checkOptimizations()

export default optimizedQueries
