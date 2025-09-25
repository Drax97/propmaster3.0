import { NextResponse } from 'next/server'
import { supabase, testDatabaseConnection, handleSupabaseError } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Database health check initiated')
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      connection_status: 'unknown',
      tables: {
        users: { exists: false, accessible: false, record_count: 0 },
        properties: { exists: false, accessible: false, record_count: 0 },
        finances: { exists: false, accessible: false, record_count: 0 }
      },
      errors: [],
      recommendations: []
    }

    // Test basic database connection
    const connectionTest = await testDatabaseConnection()
    healthCheck.connection_status = connectionTest.success ? 'connected' : 'failed'
    
    if (!connectionTest.success) {
      healthCheck.errors.push({
        type: 'CONNECTION_ERROR',
        message: connectionTest.error.message,
        code: connectionTest.error.type
      })
    }

    // Test each table individually
    const tables = ['users', 'properties', 'finances']
    
    for (const tableName of tables) {
      try {
        // Check if table exists and is accessible
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          const errorInfo = handleSupabaseError(error, `${tableName} table check`)
          
          healthCheck.tables[tableName] = {
            exists: error.code !== 'PGRST116',
            accessible: false,
            record_count: 0,
            error: errorInfo
          }

          healthCheck.errors.push({
            table: tableName,
            type: errorInfo.type,
            message: errorInfo.message,
            code: error.code
          })

          // Add specific recommendations
          if (errorInfo.shouldCreateTables) {
            healthCheck.recommendations.push(`Create ${tableName} table using the database setup endpoint`)
          }
          if (errorInfo.shouldRefreshCache) {
            healthCheck.recommendations.push(`Refresh schema cache for ${tableName} table in Supabase dashboard`)
          }
        } else {
          healthCheck.tables[tableName] = {
            exists: true,
            accessible: true,
            record_count: count || 0
          }
        }
      } catch (tableError) {
        healthCheck.tables[tableName] = {
          exists: false,
          accessible: false,
          record_count: 0,
          error: {
            type: 'UNEXPECTED_ERROR',
            message: tableError.message
          }
        }

        healthCheck.errors.push({
          table: tableName,
          type: 'UNEXPECTED_ERROR',
          message: tableError.message
        })
      }
    }

    // Determine overall status
    const allTablesAccessible = Object.values(healthCheck.tables).every(table => table.accessible)
    const anyTableExists = Object.values(healthCheck.tables).some(table => table.exists)
    
    if (allTablesAccessible) {
      healthCheck.overall_status = 'healthy'
    } else if (anyTableExists) {
      healthCheck.overall_status = 'degraded'
    } else {
      healthCheck.overall_status = 'critical'
      healthCheck.recommendations.push('Run database setup to create all required tables')
    }

    // Add general recommendations
    if (healthCheck.errors.some(e => e.type === 'SCHEMA_CACHE_ERROR')) {
      healthCheck.recommendations.push('Go to Supabase Dashboard → Settings → API → Schema Cache → Refresh')
    }

    console.log(`Database health check completed - Status: ${healthCheck.overall_status}`)

    return NextResponse.json(healthCheck, {
      status: healthCheck.overall_status === 'healthy' ? 200 : 
              healthCheck.overall_status === 'degraded' ? 206 : 503
    })

  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall_status: 'critical',
      connection_status: 'failed',
      error: {
        type: 'HEALTH_CHECK_FAILED',
        message: 'Database health check could not be completed',
        details: error.message
      }
    }, { status: 503 })
  }
}
