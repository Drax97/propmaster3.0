import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin, handleSupabaseError, testDatabaseConnection } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🏥 Starting comprehensive database health check...')
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      overallStatus: 'unknown',
      connection: {},
      tables: {},
      performance: {},
      issues: [],
      recommendations: [],
      summary: {}
    }

    // 1. Test basic connection
    console.log('🔌 Testing database connection...')
    const connectionTest = await testDatabaseConnection()
    healthReport.connection = {
      status: connectionTest.success ? 'connected' : 'failed',
      error: connectionTest.error?.message,
      latency: null
    }

    // Measure connection latency
    const startTime = Date.now()
    try {
      await supabase.from('users').select('count', { count: 'exact', head: true })
      healthReport.connection.latency = Date.now() - startTime
    } catch (err) {
      healthReport.connection.latency = null
    }

    // 2. Test all tables
    console.log('📋 Testing table accessibility...')
    const tables = [
      { name: 'users', critical: true },
      { name: 'properties', critical: true },
      { name: 'finances', critical: true },
      { name: 'client_profiles', critical: false } // Gmail integration table
    ]

    for (const table of tables) {
      const tableHealth = {
        accessible: false,
        rowCount: 0,
        hasData: false,
        error: null,
        errorCode: null,
        schemaError: false,
        performanceMs: null
      }

      try {
        const tableStartTime = Date.now()
        
        // Test basic access
        const { count, error: countError } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true })
        
        tableHealth.performanceMs = Date.now() - tableStartTime
        
        if (countError) {
          tableHealth.error = countError.message
          tableHealth.errorCode = countError.code
          tableHealth.schemaError = countError.code === 'PGRST205'
          
          if (countError.code === 'PGRST205') {
            healthReport.issues.push(`${table.name}: Schema cache error (PGRST205)`)
          } else if (countError.code === 'PGRST116') {
            healthReport.issues.push(`${table.name}: Table not found (PGRST116)`)
          } else {
            healthReport.issues.push(`${table.name}: ${countError.message}`)
          }
        } else {
          tableHealth.accessible = true
          tableHealth.rowCount = count || 0
          tableHealth.hasData = (count || 0) > 0
        }
        
        // Test write permissions (for critical tables)
        if (table.critical && tableHealth.accessible) {
          try {
            // Test insert permission (will fail due to constraints but shows permission level)
            const { error: insertError } = await supabase
              .from(table.name)
              .insert([{ id: '00000000-0000-0000-0000-000000000000' }]) // Invalid UUID to trigger constraint error
            
            // If we get a constraint error, permissions are OK
            // If we get a permission error, RLS is blocking us
            if (insertError && insertError.code === '23505') {
              // Constraint error - permissions OK
              tableHealth.writePermissions = 'ok'
            } else if (insertError && (insertError.code === 'PGRST301' || insertError.message.includes('permission'))) {
              tableHealth.writePermissions = 'blocked'
              healthReport.issues.push(`${table.name}: Write permissions blocked`)
            } else {
              tableHealth.writePermissions = 'unknown'
            }
          } catch (err) {
            tableHealth.writePermissions = 'error'
          }
        }

      } catch (err) {
        tableHealth.error = err.message
        healthReport.issues.push(`${table.name}: ${err.message}`)
      }

      healthReport.tables[table.name] = tableHealth
    }

    // 3. Test specific operations that commonly fail
    console.log('🧪 Testing critical operations...')
    const operationTests = [
      {
        name: 'user_lookup',
        description: 'User authentication lookup',
        test: async () => {
          const { data, error } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('email', 'drax976797@gmail.com')
            .single()
          return { success: !error, error: error?.message, hasData: !!data }
        }
      },
      {
        name: 'property_listing',
        description: 'Property listing with joins',
        test: async () => {
          const { data, error } = await supabase
            .from('properties')
            .select(`
              id, name, status, created_at,
              users:created_by (name, email)
            `)
            .limit(5)
          return { success: !error, error: error?.message, count: data?.length || 0 }
        }
      },
      {
        name: 'finance_aggregation',
        description: 'Financial data aggregation',
        test: async () => {
          const { data, error } = await supabase
            .from('finances')
            .select('amount, status')
            .in('status', ['pending', 'overdue'])
          return { success: !error, error: error?.message, count: data?.length || 0 }
        }
      }
    ]

    healthReport.operations = {}
    for (const op of operationTests) {
      try {
        const result = await op.test()
        healthReport.operations[op.name] = {
          description: op.description,
          ...result
        }
        
        if (!result.success) {
          healthReport.issues.push(`${op.name}: ${result.error}`)
        }
      } catch (err) {
        healthReport.operations[op.name] = {
          description: op.description,
          success: false,
          error: err.message
        }
        healthReport.issues.push(`${op.name}: ${err.message}`)
      }
    }

    // 4. Performance metrics
    console.log('⚡ Gathering performance metrics...')
    try {
      // Test query performance with a more complex query
      const perfStartTime = Date.now()
      const { data: perfData, error: perfError } = await supabase
        .from('properties')
        .select(`
          id, name, price, status,
          users:created_by (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      const queryTime = Date.now() - perfStartTime
      
      healthReport.performance = {
        complexQueryMs: queryTime,
        connectionLatencyMs: healthReport.connection.latency,
        avgResponseTime: Math.round((queryTime + (healthReport.connection.latency || 0)) / 2),
        status: queryTime < 1000 ? 'good' : queryTime < 3000 ? 'acceptable' : 'slow'
      }
      
      if (queryTime > 3000) {
        healthReport.issues.push('Database queries are running slowly (>3s)')
      }
    } catch (err) {
      healthReport.performance = {
        error: err.message,
        status: 'error'
      }
    }

    // 5. Generate overall status and recommendations
    const criticalTables = Object.entries(healthReport.tables)
      .filter(([name]) => tables.find(t => t.name === name)?.critical)
    
    const accessibleCriticalTables = criticalTables.filter(([_, table]) => table.accessible).length
    const schemaErrors = Object.values(healthReport.tables).filter(t => t.schemaError).length
    const successfulOperations = Object.values(healthReport.operations).filter(op => op.success).length
    
    // Determine overall status
    if (accessibleCriticalTables === criticalTables.length && schemaErrors === 0 && successfulOperations === operationTests.length) {
      healthReport.overallStatus = 'healthy'
      healthReport.recommendations.push('✅ Database is operating normally')
    } else if (schemaErrors > 0) {
      healthReport.overallStatus = 'schema_cache_error'
      healthReport.recommendations.push(
        '❌ Schema cache errors detected',
        'Run POST /api/database/fix-schema-cache to attempt repair',
        'Or manually refresh PostgREST in Supabase dashboard'
      )
    } else if (accessibleCriticalTables < criticalTables.length) {
      healthReport.overallStatus = 'critical_tables_unavailable'
      healthReport.recommendations.push(
        '❌ Critical database tables are not accessible',
        'Run POST /api/setup-database to create missing tables',
        'Check RLS policies and permissions'
      )
    } else {
      healthReport.overallStatus = 'degraded'
      healthReport.recommendations.push(
        '⚠️ Database is partially functional but has issues',
        'Review individual table and operation errors',
        'Consider running database maintenance'
      )
    }

    // Add performance recommendations
    if (healthReport.performance.status === 'slow') {
      healthReport.recommendations.push(
        '🐌 Database performance is slow',
        'Consider adding database indexes',
        'Review and optimize complex queries',
        'Check Supabase project resources'
      )
    }

    // Summary statistics
    healthReport.summary = {
      totalTables: Object.keys(healthReport.tables).length,
      accessibleTables: Object.values(healthReport.tables).filter(t => t.accessible).length,
      tablesWithData: Object.values(healthReport.tables).filter(t => t.hasData).length,
      schemaErrors: schemaErrors,
      totalOperations: operationTests.length,
      successfulOperations: successfulOperations,
      issueCount: healthReport.issues.length,
      overallLatency: healthReport.performance.avgResponseTime || null
    }

    console.log(`🏥 Health check complete: ${healthReport.overallStatus}`)
    
    const statusCode = healthReport.overallStatus === 'healthy' ? 200 : 
                      healthReport.overallStatus === 'degraded' ? 206 : 503

    return NextResponse.json(healthReport, { status: statusCode })

  } catch (error) {
    console.error('❌ Database health check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallStatus: 'error',
      error: error.message,
      issues: ['Health check system failed'],
      recommendations: [
        'Check Supabase connection settings',
        'Verify environment variables',
        'Check network connectivity',
        'Review Supabase project status'
      ]
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action = 'full_check', fix_issues = false } = body
    
    if (action === 'quick_check') {
      // Quick health check - just test table accessibility
      const tables = ['users', 'properties', 'finances']
      const results = {}
      
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('id')
            .limit(1)
          
          results[table] = {
            accessible: !error,
            error: error?.message,
            schemaError: error?.code === 'PGRST205'
          }
        } catch (err) {
          results[table] = {
            accessible: false,
            error: err.message,
            schemaError: false
          }
        }
      }
      
      const allAccessible = Object.values(results).every(r => r.accessible)
      const hasSchemaErrors = Object.values(results).some(r => r.schemaError)
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        status: allAccessible ? 'healthy' : hasSchemaErrors ? 'schema_cache_error' : 'error',
        tables: results,
        message: allAccessible ? 'All tables accessible' : 'Some tables have issues'
      })
    }
    
    if (action === 'fix_issues' || fix_issues) {
      // Attempt to fix common issues
      const fixes = []
      
      // Try schema cache fix
      try {
        const response = await fetch('/api/database/fix-schema-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'auto' })
        })
        
        const result = await response.json()
        fixes.push({
          action: 'schema_cache_fix',
          success: result.success,
          details: result.attempts
        })
      } catch (err) {
        fixes.push({
          action: 'schema_cache_fix',
          success: false,
          error: err.message
        })
      }
      
      // Re-run health check to see if issues are resolved
      const healthResponse = await fetch('/api/database/health', { method: 'GET' })
      const healthResult = await healthResponse.json()
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        fixes_attempted: fixes,
        current_health: healthResult,
        message: 'Attempted to fix database issues'
      })
    }
    
    // Default: run full health check (same as GET)
    return GET()
    
  } catch (error) {
    console.error('❌ Database health POST error:', error)
    return NextResponse.json({
      error: 'Health check action failed',
      details: error.message
    }, { status: 500 })
  }
}
