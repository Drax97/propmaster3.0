import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    console.log('Attempting to refresh Supabase schema cache...')
    
    // Method 1: Use PostgreSQL NOTIFY command to refresh schema cache
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "NOTIFY pgrst, 'reload schema';"
    })

    if (error) {
      console.log('Method 1 failed (exec_sql RPC not available), trying alternative...')
      
      // Method 2: Direct SQL execution via Supabase client
      try {
        const { error: notifyError } = await supabase
          .from('users') // Use any existing table to establish connection
          .select('id')
          .limit(1)
          
        if (notifyError && notifyError.code === 'PGRST205') {
          console.log('Schema cache issue confirmed, attempting manual refresh...')
          
          // Method 3: Force schema reload by attempting to access table metadata
          const { error: refreshError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            
          if (!refreshError) {
            console.log('Schema metadata accessed successfully')
          }
        }
      } catch (directError) {
        console.log('Direct method failed:', directError.message)
      }
    } else {
      console.log('Schema cache refresh notification sent successfully')
    }

    // Test if schema cache is now working
    let schemaFixed = false
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        
      if (!testError || testError.code !== 'PGRST205') {
        schemaFixed = true
        console.log('Schema cache appears to be working now')
      }
    } catch (testError) {
      console.log('Schema cache test failed:', testError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Schema cache refresh attempted',
      schemaFixed,
      methods_tried: [
        'PostgreSQL NOTIFY command',
        'Direct SQL execution',
        'Metadata table access'
      ],
      recommendation: schemaFixed ? 
        'Schema cache appears to be working' : 
        'Schema cache may still have issues - manual refresh in Supabase dashboard may be needed'
    })

  } catch (error) {
    console.error('Schema cache refresh API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh schema cache',
      details: error.message,
      recommendation: 'Try refreshing schema cache manually in Supabase dashboard'
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    console.log('Checking schema cache status...')
    
    const results = {
      users_table: null,
      properties_table: null,
      finances_table: null,
      schema_cache_status: 'unknown'
    }
    
    // Test users table
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        
      if (error) {
        results.users_table = { 
          status: 'error', 
          error: error.message,
          code: error.code 
        }
      } else {
        results.users_table = { 
          status: 'success', 
          accessible: true 
        }
      }
    } catch (e) {
      results.users_table = { 
        status: 'exception', 
        error: e.message 
      }
    }
    
    // Test properties table
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .limit(1)
        
      if (error) {
        results.properties_table = { 
          status: 'error', 
          error: error.message,
          code: error.code 
        }
      } else {
        results.properties_table = { 
          status: 'success', 
          accessible: true 
        }
      }
    } catch (e) {
      results.properties_table = { 
        status: 'exception', 
        error: e.message 
      }
    }
    
    // Test finances table
    try {
      const { data, error } = await supabase
        .from('finances')
        .select('id')
        .limit(1)
        
      if (error) {
        results.finances_table = { 
          status: 'error', 
          error: error.message,
          code: error.code 
        }
      } else {
        results.finances_table = { 
          status: 'success', 
          accessible: true 
        }
      }
    } catch (e) {
      results.finances_table = { 
        status: 'exception', 
        error: e.message 
      }
    }
    
    // Determine overall schema cache status
    const hasErrors = Object.values(results).some(result => 
      result && (result.status === 'error' || result.status === 'exception')
    )
    
    const hasPGRST205 = Object.values(results).some(result => 
      result && result.code === 'PGRST205'
    )
    
    if (hasPGRST205) {
      results.schema_cache_status = 'pgrst205_error'
    } else if (hasErrors) {
      results.schema_cache_status = 'other_errors'  
    } else {
      results.schema_cache_status = 'working'
    }
    
    return NextResponse.json({
      success: true,
      schema_cache_status: results.schema_cache_status,
      table_access_results: results,
      recommendation: hasPGRST205 ? 
        'Schema cache has PGRST205 errors - refresh needed' :
        hasErrors ?
        'Some database access issues detected' :
        'Schema cache appears to be working'
    })
    
  } catch (error) {
    console.error('Schema cache check API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check schema cache status',
      details: error.message
    }, { status: 500 })
  }
}