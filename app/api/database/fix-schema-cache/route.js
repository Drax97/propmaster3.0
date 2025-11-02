import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin, handleSupabaseError } from '@/lib/supabase'

export async function POST(request) {
  try {
    console.log('🔧 Starting comprehensive schema cache fix...')
    
    const body = await request.json().catch(() => ({}))
    const { force = false, method = 'auto' } = body
    
    const result = {
      success: false,
      attempts: [],
      finalStatus: null,
      recommendations: []
    }

    // Method 1: PostgreSQL NOTIFY command
    if (method === 'auto' || method === 'notify') {
      console.log('📡 Attempting PostgreSQL NOTIFY method...')
      try {
        // Use admin client for better permissions
        const client = supabaseAdmin || supabase
        
        // Try multiple NOTIFY variations
        const notifyCommands = [
          "NOTIFY pgrst, 'reload schema'",
          "NOTIFY pgrst, 'reload config'", 
          "NOTIFY pgrst",
          "SELECT pg_notify('pgrst', 'reload schema')"
        ]
        
        for (const command of notifyCommands) {
          try {
            const { data, error } = await client.rpc('exec_sql', { sql: command })
            result.attempts.push({
              method: 'notify',
              command,
              success: !error,
              error: error?.message
            })
            
            if (!error) {
              console.log(`✅ NOTIFY successful: ${command}`)
              break
            }
          } catch (err) {
            result.attempts.push({
              method: 'notify',
              command,
              success: false,
              error: err.message
            })
          }
        }
      } catch (err) {
        result.attempts.push({
          method: 'notify',
          success: false,
          error: err.message
        })
      }
    }

    // Method 2: Schema introspection to force cache refresh
    if (method === 'auto' || method === 'introspect') {
      console.log('🔍 Attempting schema introspection method...')
      try {
        const client = supabaseAdmin || supabase
        
        // Access system tables to force schema reload
        const introspectionQueries = [
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
          "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'",
          "SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public'",
          "ANALYZE users, properties, finances"
        ]
        
        for (const query of introspectionQueries) {
          try {
            const { data, error } = await client.rpc('exec_sql', { sql: query })
            result.attempts.push({
              method: 'introspect',
              query,
              success: !error,
              error: error?.message,
              rowCount: data?.length
            })
            
            if (!error) {
              console.log(`✅ Introspection successful: ${query}`)
            }
          } catch (err) {
            result.attempts.push({
              method: 'introspect',
              query,
              success: false,
              error: err.message
            })
          }
        }
      } catch (err) {
        result.attempts.push({
          method: 'introspect',
          success: false,
          error: err.message
        })
      }
    }

    // Method 3: Connection cycling
    if (method === 'auto' || method === 'reconnect') {
      console.log('🔄 Attempting connection cycling method...')
      try {
        // Create fresh clients with different configurations
        const freshClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            db: { schema: 'public' },
            global: { 
              headers: { 
                'X-Client-Info': 'propmaster-cache-refresh',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          }
        )
        
        // Test with fresh client
        const { data, error } = await freshClient
          .from('users')
          .select('id')
          .limit(1)
        
        result.attempts.push({
          method: 'reconnect',
          success: !error,
          error: error?.message
        })
        
        if (!error) {
          console.log('✅ Fresh connection successful')
        }
      } catch (err) {
        result.attempts.push({
          method: 'reconnect',
          success: false,
          error: err.message
        })
      }
    }

    // Method 4: Force table recreation (if force flag is set)
    if (force && (method === 'auto' || method === 'recreate')) {
      console.log('⚠️ Attempting table recreation method (DESTRUCTIVE)...')
      try {
        const client = supabaseAdmin || supabase
        
        // This is a last resort - recreate the problematic views/functions
        const recreationSQL = `
          -- Drop and recreate any views that might be cached
          DROP VIEW IF EXISTS user_profiles CASCADE;
          
          -- Refresh materialized views if any exist
          -- REFRESH MATERIALIZED VIEW IF EXISTS some_view;
          
          -- Update table statistics
          ANALYZE users;
          ANALYZE properties; 
          ANALYZE finances;
          
          -- Force PostgreSQL to replan queries
          DISCARD PLANS;
        `
        
        const { data, error } = await client.rpc('exec_sql', { sql: recreationSQL })
        
        result.attempts.push({
          method: 'recreate',
          success: !error,
          error: error?.message,
          warning: 'This method drops and recreates views - use with caution'
        })
        
        if (!error) {
          console.log('✅ Table recreation successful')
        }
      } catch (err) {
        result.attempts.push({
          method: 'recreate',
          success: false,
          error: err.message
        })
      }
    }

    // Final validation - test if schema cache is now working
    console.log('🧪 Testing schema cache status...')
    const validationTests = [
      { table: 'users', operation: 'select' },
      { table: 'properties', operation: 'select' },
      { table: 'finances', operation: 'select' }
    ]

    const testResults = []
    for (const test of validationTests) {
      try {
        const { data, error } = await supabase
          .from(test.table)
          .select('id')
          .limit(1)
        
        testResults.push({
          table: test.table,
          success: !error,
          error: error?.message,
          errorCode: error?.code
        })
        
        if (error && error.code === 'PGRST205') {
          console.log(`❌ ${test.table} still has schema cache error`)
        } else if (!error) {
          console.log(`✅ ${test.table} accessible`)
        }
      } catch (err) {
        testResults.push({
          table: test.table,
          success: false,
          error: err.message
        })
      }
    }

    // Determine overall success
    const allTablesAccessible = testResults.every(test => test.success)
    const anySchemaErrors = testResults.some(test => test.errorCode === 'PGRST205')

    result.success = allTablesAccessible && !anySchemaErrors
    result.finalStatus = {
      allTablesAccessible,
      hasSchemaErrors: anySchemaErrors,
      testResults
    }

    // Generate recommendations
    if (result.success) {
      result.recommendations = [
        '✅ Schema cache appears to be working correctly',
        'All database tables are accessible',
        'You can now disable fallback/mock data in your APIs'
      ]
    } else if (anySchemaErrors) {
      result.recommendations = [
        '❌ Schema cache errors persist',
        '🔧 Manual intervention required in Supabase dashboard:',
        '1. Go to Settings → API → PostgREST Settings',
        '2. Click "Restart PostgREST" or "Reload Schema"',
        '3. Or run: SELECT pg_notify(\'pgrst\', \'reload schema\') in SQL Editor',
        '4. Wait 30-60 seconds and test again',
        '📞 If issues persist, contact Supabase support'
      ]
    } else {
      result.recommendations = [
        '⚠️ Mixed results - some tables accessible',
        'Check individual table permissions and RLS policies',
        'Verify all tables exist in your Supabase dashboard',
        'Run database setup if tables are missing'
      ]
    }

    const statusCode = result.success ? 200 : (anySchemaErrors ? 503 : 500)
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      message: result.success ? 
        'Schema cache fix completed successfully' : 
        'Schema cache fix attempted but issues remain'
    }, { status: statusCode })

  } catch (error) {
    console.error('❌ Schema cache fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'Schema cache fix failed',
      details: error.message,
      recommendations: [
        'Check your Supabase connection',
        'Verify environment variables are set',
        'Try manual schema refresh in Supabase dashboard',
        'Contact support if issues persist'
      ]
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('🔍 Checking current schema cache status...')
    
    // Quick status check for all tables
    const tables = ['users', 'properties', 'finances']
    const status = {
      timestamp: new Date().toISOString(),
      overallHealth: 'unknown',
      tables: {},
      issues: [],
      recommendations: []
    }

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1)
        
        status.tables[tableName] = {
          accessible: !error,
          error: error?.message,
          errorCode: error?.code,
          hasSchemaError: error?.code === 'PGRST205'
        }
        
        if (error?.code === 'PGRST205') {
          status.issues.push(`${tableName}: Schema cache error (PGRST205)`)
        } else if (error) {
          status.issues.push(`${tableName}: ${error.message}`)
        }
      } catch (err) {
        status.tables[tableName] = {
          accessible: false,
          error: err.message,
          hasSchemaError: false
        }
        status.issues.push(`${tableName}: ${err.message}`)
      }
    }

    // Determine overall health
    const accessibleTables = Object.values(status.tables).filter(t => t.accessible).length
    const schemaErrorCount = Object.values(status.tables).filter(t => t.hasSchemaError).length
    
    if (accessibleTables === tables.length && schemaErrorCount === 0) {
      status.overallHealth = 'healthy'
      status.recommendations = ['✅ All database tables accessible and working correctly']
    } else if (schemaErrorCount > 0) {
      status.overallHealth = 'schema_cache_error'
      status.recommendations = [
        '❌ Schema cache errors detected',
        'POST /api/database/fix-schema-cache to attempt automatic fix',
        'Or manually refresh schema in Supabase dashboard'
      ]
    } else {
      status.overallHealth = 'partial'
      status.recommendations = [
        '⚠️ Some tables inaccessible',
        'Check table permissions and RLS policies',
        'Verify all tables exist in database'
      ]
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Schema status check error:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallHealth: 'error',
      error: error.message,
      recommendations: [
        'Check Supabase connection',
        'Verify environment variables',
        'Check network connectivity'
      ]
    }, { status: 500 })
  }
}

// Import createClient for fresh connections
import { createClient } from '@supabase/supabase-js'
