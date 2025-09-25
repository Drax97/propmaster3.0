import { supabase, supabaseAdmin, handleSupabaseError } from './supabase'

// Enhanced database client with automatic fallback handling
class DatabaseClient {
  constructor() {
    this.client = supabase
    this.adminClient = supabaseAdmin
    this.isHealthy = null
    this.lastHealthCheck = null
    this.healthCheckInterval = 30000 // 30 seconds
  }

  // Check if database is healthy and cache result
  async checkHealth() {
    const now = Date.now()
    if (this.lastHealthCheck && (now - this.lastHealthCheck) < this.healthCheckInterval && this.isHealthy !== null) {
      return this.isHealthy
    }

    try {
      const { error } = await this.client
        .from('users')
        .select('id')
        .limit(1)
      
      this.isHealthy = !error || error.code !== 'PGRST205'
      this.lastHealthCheck = now
      
      if (error && error.code === 'PGRST205') {
        console.warn('🔄 Schema cache error detected, attempting auto-fix...')
        await this.attemptSchemaFix()
      }
      
      return this.isHealthy
    } catch (err) {
      console.error('Database health check failed:', err)
      this.isHealthy = false
      this.lastHealthCheck = now
      return false
    }
  }

  // Attempt to fix schema cache issues automatically
  async attemptSchemaFix() {
    try {
      // Try NOTIFY command if admin client is available
      if (this.adminClient) {
        await this.adminClient.rpc('exec_sql', {
          sql: "NOTIFY pgrst, 'reload schema'"
        })
        console.log('📡 Schema cache refresh attempted')
      }
      
      // Wait a moment and retest
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { error } = await this.client
        .from('users')
        .select('id')
        .limit(1)
      
      if (!error || error.code !== 'PGRST205') {
        this.isHealthy = true
        console.log('✅ Schema cache fix successful')
        return true
      }
    } catch (err) {
      console.error('Schema fix attempt failed:', err)
    }
    
    return false
  }

  // Enhanced query method with automatic retry and error handling
  async query(table, operation, options = {}) {
    const { 
      retries = 2, 
      fallbackData = null, 
      requireHealthy = false,
      timeout = 10000 
    } = options

    // Check health if required
    if (requireHealthy) {
      const healthy = await this.checkHealth()
      if (!healthy && !fallbackData) {
        throw new Error('Database is not healthy and no fallback data provided')
      }
      if (!healthy && fallbackData) {
        console.warn(`Using fallback data for ${table} due to database issues`)
        return { data: fallbackData, error: null, source: 'fallback' }
      }
    }

    let lastError = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout to prevent hanging queries
        const queryPromise = this.executeQuery(table, operation)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
        
        const result = await Promise.race([queryPromise, timeoutPromise])
        
        if (result.error) {
          lastError = result.error
          
          // Handle specific error types
          if (result.error.code === 'PGRST205' && attempt < retries) {
            console.warn(`Schema cache error on attempt ${attempt + 1}, retrying...`)
            await this.attemptSchemaFix()
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
            continue
          }
          
          if (result.error.code === 'PGRST116') {
            throw new Error(`Table ${table} does not exist. Run database setup.`)
          }
          
          // If we have fallback data and this is the last attempt
          if (attempt === retries && fallbackData) {
            console.warn(`Using fallback data for ${table} after ${retries + 1} failed attempts`)
            return { data: fallbackData, error: result.error, source: 'fallback' }
          }
          
          if (attempt === retries) {
            throw result.error
          }
        } else {
          // Success
          this.isHealthy = true
          return { ...result, source: 'database' }
        }
      } catch (err) {
        lastError = err
        
        if (attempt < retries) {
          console.warn(`Query attempt ${attempt + 1} failed:`, err.message)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }
    
    // All attempts failed
    if (fallbackData) {
      console.error(`All query attempts failed for ${table}, using fallback data:`, lastError.message)
      return { data: fallbackData, error: lastError, source: 'fallback' }
    }
    
    throw lastError
  }

  // Execute the actual query based on operation type
  async executeQuery(table, operation) {
    const client = operation.useAdmin ? (this.adminClient || this.client) : this.client
    let query = client.from(table)

    // Build query based on operation
    if (operation.select) {
      query = query.select(operation.select)
    }
    
    if (operation.insert) {
      query = query.insert(operation.insert)
    }
    
    if (operation.update) {
      query = query.update(operation.update)
    }
    
    if (operation.delete) {
      query = query.delete()
    }
    
    if (operation.eq) {
      for (const [column, value] of Object.entries(operation.eq)) {
        query = query.eq(column, value)
      }
    }
    
    if (operation.in) {
      for (const [column, values] of Object.entries(operation.in)) {
        query = query.in(column, values)
      }
    }
    
    if (operation.gte) {
      for (const [column, value] of Object.entries(operation.gte)) {
        query = query.gte(column, value)
      }
    }
    
    if (operation.lte) {
      for (const [column, value] of Object.entries(operation.lte)) {
        query = query.lte(column, value)
      }
    }
    
    if (operation.ilike) {
      for (const [column, value] of Object.entries(operation.ilike)) {
        query = query.ilike(column, value)
      }
    }
    
    if (operation.or) {
      query = query.or(operation.or)
    }
    
    if (operation.order) {
      const { column, ascending = false } = operation.order
      query = query.order(column, { ascending })
    }
    
    if (operation.limit) {
      query = query.limit(operation.limit)
    }
    
    if (operation.single) {
      query = query.single()
    }
    
    if (operation.count) {
      query = query.select('*', { count: 'exact', head: operation.count === 'head' })
    }

    return await query
  }

  // Convenience methods for common operations
  async getUsers(options = {}) {
    const fallbackUsers = [
      {
        id: 'real-master-id',
        email: 'drax976797@gmail.com',
        name: 'Master User',
        role: 'master',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    return this.query('users', {
      select: '*',
      order: { column: 'created_at', ascending: false }
    }, {
      fallbackData: fallbackUsers,
      retries: 2,
      ...options
    })
  }

  async getUserByEmail(email, options = {}) {
    return this.query('users', {
      select: '*',
      eq: { email },
      single: true
    }, {
      fallbackData: email === 'drax976797@gmail.com' ? {
        id: 'real-master-id',
        email: 'drax976797@gmail.com',
        name: 'Master User',
        role: 'master',
        status: 'active'
      } : null,
      ...options
    })
  }

  async getProperties(filters = {}, options = {}) {
    const operation = {
      select: `
        *, 
        users:created_by (name, email)
      `,
      order: { column: 'updated_at', ascending: false }
    }

    // Apply filters
    if (filters.search) {
      operation.or = `name.ilike.%${filters.search}%,location.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    }
    
    if (filters.status && filters.status !== 'all') {
      operation.eq = { status: filters.status }
    }
    
    if (filters.minPrice) {
      operation.gte = { price: parseFloat(filters.minPrice) }
    }
    
    if (filters.maxPrice) {
      operation.lte = { price: parseFloat(filters.maxPrice) }
    }
    
    if (filters.location) {
      operation.ilike = { location: `%${filters.location}%` }
    }

    return this.query('properties', operation, {
      fallbackData: [],
      retries: 2,
      ...options
    })
  }

  async getFinances(userId = null, userRole = 'viewer', options = {}) {
    const operation = {
      select: `
        *,
        properties:property_id (name, location),
        users:created_by (name, email)
      `,
      order: { column: 'created_at', ascending: false }
    }

    // Apply role-based filtering
    if (userRole === 'editor' && userId) {
      operation.eq = { created_by: userId }
    }

    return this.query('finances', operation, {
      fallbackData: [],
      retries: 2,
      ...options
    })
  }

  async createUser(userData, options = {}) {
    return this.query('users', {
      insert: [userData],
      select: '*'
    }, {
      requireHealthy: true,
      ...options
    })
  }

  async updateUser(userId, updates, options = {}) {
    return this.query('users', {
      update: updates,
      eq: { id: userId },
      select: '*'
    }, {
      requireHealthy: true,
      ...options
    })
  }

  async createProperty(propertyData, options = {}) {
    return this.query('properties', {
      insert: [propertyData],
      select: '*'
    }, {
      requireHealthy: true,
      ...options
    })
  }

  async createFinance(financeData, options = {}) {
    return this.query('finances', {
      insert: [financeData],
      select: '*'
    }, {
      requireHealthy: true,
      ...options
    })
  }

  // Get dashboard statistics with fallback
  async getDashboardStats(options = {}) {
    try {
      const [usersResult, propertiesResult, financesResult] = await Promise.allSettled([
        this.query('users', { count: 'head' }),
        this.query('properties', { count: 'head' }),
        this.query('finances', { 
          select: 'amount',
          in: { status: ['pending', 'overdue'] }
        })
      ])

      const stats = {
        totalUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
        totalProperties: propertiesResult.status === 'fulfilled' ? (propertiesResult.value.count || 0) : 0,
        totalReceivables: 0
      }

      if (financesResult.status === 'fulfilled' && financesResult.value.data) {
        stats.totalReceivables = financesResult.value.data.reduce(
          (sum, finance) => sum + (finance.amount || 0), 0
        )
      }

      return { data: stats, error: null, source: 'database' }
    } catch (err) {
      console.error('Dashboard stats error:', err)
      return {
        data: {
          totalUsers: 1,
          totalProperties: 0,
          totalReceivables: 0
        },
        error: err,
        source: 'fallback'
      }
    }
  }
}

// Create singleton instance
const dbClient = new DatabaseClient()

// Export convenience functions
export const getUsers = (options) => dbClient.getUsers(options)
export const getUserByEmail = (email, options) => dbClient.getUserByEmail(email, options)
export const getProperties = (filters, options) => dbClient.getProperties(filters, options)
export const getFinances = (userId, userRole, options) => dbClient.getFinances(userId, userRole, options)
export const createUser = (userData, options) => dbClient.createUser(userData, options)
export const updateUser = (userId, updates, options) => dbClient.updateUser(userId, updates, options)
export const createProperty = (propertyData, options) => dbClient.createProperty(propertyData, options)
export const createFinance = (financeData, options) => dbClient.createFinance(financeData, options)
export const getDashboardStats = (options) => dbClient.getDashboardStats(options)
export const checkDatabaseHealth = () => dbClient.checkHealth()

export default dbClient
