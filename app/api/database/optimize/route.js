import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    console.log('🚀 Starting database optimization...')
    
    const body = await request.json().catch(() => ({}))
    const { 
      createIndexes = true,
      optimizeQueries = true,
      analyzePerformance = true,
      createViews = true,
      force = false 
    } = body
    
    const result = {
      success: false,
      optimizations: {},
      performance: {},
      recommendations: [],
      executionTime: null
    }

    const startTime = Date.now()
    const client = supabaseAdmin || supabase

    // Step 1: Create Performance Indexes
    if (createIndexes) {
      console.log('📊 Creating performance indexes...')
      
      const indexes = {
        // User lookup optimizations
        idx_users_email_btree: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_users_email_btree ON users USING btree(email);',
          purpose: 'Optimize user authentication lookups'
        },
        idx_users_role_status: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);',
          purpose: 'Optimize role-based filtering'
        },
        
        // Property search optimizations
        idx_properties_status_updated: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_properties_status_updated ON properties(status, updated_at DESC);',
          purpose: 'Optimize property listing with status filter'
        },
        idx_properties_created_by: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);',
          purpose: 'Optimize user-specific property queries'
        },
        idx_properties_price_range: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_properties_price_range ON properties(price) WHERE price IS NOT NULL;',
          purpose: 'Optimize price range filtering'
        },
        idx_properties_location_gin: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_properties_location_gin ON properties USING gin(to_tsvector(\'english\', coalesce(location, \'\')));',
          purpose: 'Optimize location-based text search'
        },
        idx_properties_search_gin: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_properties_search_gin ON properties USING gin(to_tsvector(\'english\', coalesce(name, \'\') || \' \' || coalesce(location, \'\') || \' \' || coalesce(description, \'\')));',
          purpose: 'Optimize full-text search across name, location, description'
        },
        
        // Finance query optimizations
        idx_finances_created_by_updated: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_created_by_updated ON finances(created_by, updated_at DESC);',
          purpose: 'Optimize user-specific finance queries'
        },
        idx_finances_property_status: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_property_status ON finances(property_id, status);',
          purpose: 'Optimize property-specific finance queries'
        },
        idx_finances_status_amount: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_status_amount ON finances(status, amount) WHERE amount IS NOT NULL;',
          purpose: 'Optimize financial summary calculations'
        },
        idx_finances_due_date: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_due_date ON finances(due_date) WHERE due_date IS NOT NULL;',
          purpose: 'Optimize due date filtering and overdue calculations'
        },
        idx_finances_client_name_gin: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_client_name_gin ON finances USING gin(to_tsvector(\'english\', coalesce(client_name, \'\')));',
          purpose: 'Optimize client name search'
        },
        idx_finances_date_range: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_date_range ON finances(created_at, status);',
          purpose: 'Optimize date range queries with status filtering'
        },
        
        // Composite indexes for common query patterns
        idx_properties_composite_search: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_properties_composite_search ON properties(status, created_by, updated_at DESC) WHERE status != \'private\';',
          purpose: 'Optimize common property listing queries'
        },
        idx_finances_composite_summary: {
          sql: 'CREATE INDEX IF NOT EXISTS idx_finances_composite_summary ON finances(created_by, status, amount) WHERE amount IS NOT NULL;',
          purpose: 'Optimize financial summary calculations per user'
        }
      }

      result.optimizations.indexes = {}
      
      for (const [indexName, config] of Object.entries(indexes)) {
        try {
          console.log(`Creating index: ${indexName}`)
          
          const { data, error } = await client.rpc('exec_sql', { sql: config.sql })
          
          if (error) {
            console.error(`Failed to create ${indexName}:`, error)
            result.optimizations.indexes[indexName] = {
              created: false,
              error: error.message,
              purpose: config.purpose
            }
          } else {
            console.log(`✅ Index ${indexName} created successfully`)
            result.optimizations.indexes[indexName] = {
              created: true,
              purpose: config.purpose
            }
          }
        } catch (err) {
          console.error(`Exception creating ${indexName}:`, err)
          result.optimizations.indexes[indexName] = {
            created: false,
            error: err.message,
            purpose: config.purpose,
            manual_sql: config.sql
          }
        }
      }
    }

    // Step 2: Create Optimized Views
    if (createViews) {
      console.log('👁️ Creating optimized database views...')
      
      const views = {
        property_summary_view: {
          sql: `
            CREATE OR REPLACE VIEW property_summary_view AS
            SELECT 
              p.*,
              u.name as creator_name,
              u.email as creator_email,
              CASE 
                WHEN p.status = 'private' THEN p.created_by
                ELSE NULL
              END as visibility_restricted_to,
              (
                SELECT COUNT(*) 
                FROM finances f 
                WHERE f.property_id = p.id
              ) as finance_records_count,
              (
                SELECT COALESCE(SUM(f.amount), 0) 
                FROM finances f 
                WHERE f.property_id = p.id AND f.status IN ('pending', 'overdue')
              ) as pending_amount
            FROM properties p
            LEFT JOIN users u ON p.created_by = u.id;
          `,
          purpose: 'Optimized property listing with creator info and finance summaries'
        },
        
        finance_summary_view: {
          sql: `
            CREATE OR REPLACE VIEW finance_summary_view AS
            SELECT 
              f.*,
              p.name as property_name,
              p.location as property_location,
              u.name as creator_name,
              u.email as creator_email,
              CASE 
                WHEN f.due_date < CURRENT_DATE AND f.status = 'pending' THEN 'overdue'
                ELSE f.status
              END as computed_status,
              CASE 
                WHEN f.due_date IS NOT NULL THEN 
                  EXTRACT(days FROM (f.due_date - CURRENT_DATE))::int
                ELSE NULL
              END as days_until_due
            FROM finances f
            LEFT JOIN properties p ON f.property_id = p.id
            LEFT JOIN users u ON f.created_by = u.id;
          `,
          purpose: 'Optimized finance listing with property info and computed fields'
        },
        
        user_activity_summary: {
          sql: `
            CREATE OR REPLACE VIEW user_activity_summary AS
            SELECT 
              u.id,
              u.email,
              u.name,
              u.role,
              u.status,
              u.created_at,
              u.last_login,
              (SELECT COUNT(*) FROM properties p WHERE p.created_by = u.id) as properties_created,
              (SELECT COUNT(*) FROM finances f WHERE f.created_by = u.id) as finance_records_created,
              (
                SELECT COALESCE(SUM(f.amount), 0) 
                FROM finances f 
                WHERE f.created_by = u.id AND f.status = 'paid'
              ) as total_payments_received,
              (
                SELECT COALESCE(SUM(f.amount), 0) 
                FROM finances f 
                WHERE f.created_by = u.id AND f.status IN ('pending', 'overdue')
              ) as total_pending_amount
            FROM users u;
          `,
          purpose: 'User activity and performance summary for admin dashboard'
        }
      }

      result.optimizations.views = {}
      
      for (const [viewName, config] of Object.entries(views)) {
        try {
          console.log(`Creating view: ${viewName}`)
          
          const { data, error } = await client.rpc('exec_sql', { sql: config.sql })
          
          if (error) {
            console.error(`Failed to create ${viewName}:`, error)
            result.optimizations.views[viewName] = {
              created: false,
              error: error.message,
              purpose: config.purpose
            }
          } else {
            console.log(`✅ View ${viewName} created successfully`)
            result.optimizations.views[viewName] = {
              created: true,
              purpose: config.purpose
            }
          }
        } catch (err) {
          console.error(`Exception creating ${viewName}:`, err)
          result.optimizations.views[viewName] = {
            created: false,
            error: err.message,
            purpose: config.purpose,
            manual_sql: config.sql
          }
        }
      }
    }

    // Step 3: Query Optimizations
    if (optimizeQueries) {
      console.log('⚡ Implementing query optimizations...')
      
      const optimizations = {
        analyze_tables: {
          sql: 'ANALYZE users, properties, finances;',
          purpose: 'Update table statistics for query planner'
        },
        vacuum_analyze: {
          sql: 'VACUUM ANALYZE;',
          purpose: 'Clean up and analyze all tables'
        },
        update_stats: {
          sql: `
            SELECT pg_stat_reset();
            SELECT pg_stat_reset_shared('bgwriter');
          `,
          purpose: 'Reset statistics to get fresh performance metrics'
        }
      }

      result.optimizations.queries = {}
      
      for (const [optName, config] of Object.entries(optimizations)) {
        try {
          console.log(`Running optimization: ${optName}`)
          
          const { data, error } = await client.rpc('exec_sql', { sql: config.sql })
          
          if (error) {
            console.error(`Failed optimization ${optName}:`, error)
            result.optimizations.queries[optName] = {
              success: false,
              error: error.message,
              purpose: config.purpose
            }
          } else {
            console.log(`✅ Optimization ${optName} completed`)
            result.optimizations.queries[optName] = {
              success: true,
              purpose: config.purpose
            }
          }
        } catch (err) {
          console.error(`Exception in optimization ${optName}:`, err)
          result.optimizations.queries[optName] = {
            success: false,
            error: err.message,
            purpose: config.purpose
          }
        }
      }
    }

    // Step 4: Performance Analysis
    if (analyzePerformance) {
      console.log('📈 Analyzing database performance...')
      
      try {
        // Test query performance
        const performanceTests = [
          {
            name: 'user_lookup_by_email',
            sql: "SELECT id, role FROM users WHERE email = 'drax976797@gmail.com'",
            description: 'User authentication lookup'
          },
          {
            name: 'property_listing_with_join',
            sql: `
              SELECT p.*, u.name as creator_name 
              FROM properties p 
              LEFT JOIN users u ON p.created_by = u.id 
              WHERE p.status != 'private' 
              ORDER BY p.updated_at DESC 
              LIMIT 20
            `,
            description: 'Property listing with creator info'
          },
          {
            name: 'finance_summary_calculation',
            sql: `
              SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
                SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END) as total_pending
              FROM finances
            `,
            description: 'Financial summary calculation'
          },
          {
            name: 'property_search',
            sql: `
              SELECT id, name, location, price 
              FROM properties 
              WHERE to_tsvector('english', coalesce(name, '') || ' ' || coalesce(location, '')) 
                @@ plainto_tsquery('english', 'apartment')
              LIMIT 10
            `,
            description: 'Full-text property search'
          }
        ]

        result.performance.tests = {}
        
        for (const test of performanceTests) {
          try {
            const testStart = Date.now()
            const { data, error } = await client.rpc('exec_sql', { sql: test.sql })
            const testDuration = Date.now() - testStart
            
            result.performance.tests[test.name] = {
              duration_ms: testDuration,
              success: !error,
              error: error?.message,
              description: test.description,
              performance_rating: testDuration < 100 ? 'excellent' : 
                                 testDuration < 500 ? 'good' : 
                                 testDuration < 1000 ? 'acceptable' : 'needs_optimization'
            }
            
            console.log(`Test ${test.name}: ${testDuration}ms (${result.performance.tests[test.name].performance_rating})`)
          } catch (err) {
            result.performance.tests[test.name] = {
              duration_ms: null,
              success: false,
              error: err.message,
              description: test.description,
              performance_rating: 'error'
            }
          }
        }
        
        // Calculate overall performance score
        const successfulTests = Object.values(result.performance.tests).filter(t => t.success)
        const avgDuration = successfulTests.length > 0 ? 
          successfulTests.reduce((sum, t) => sum + t.duration_ms, 0) / successfulTests.length : 0
        
        result.performance.overall = {
          average_query_time_ms: Math.round(avgDuration),
          successful_tests: successfulTests.length,
          total_tests: performanceTests.length,
          performance_grade: avgDuration < 100 ? 'A' : 
                            avgDuration < 300 ? 'B' : 
                            avgDuration < 600 ? 'C' : 'D'
        }
        
      } catch (err) {
        result.performance.error = err.message
      }
    }

    // Calculate execution time
    result.executionTime = Date.now() - startTime

    // Determine overall success
    const indexSuccess = !createIndexes || Object.values(result.optimizations.indexes || {}).some(idx => idx.created)
    const viewSuccess = !createViews || Object.values(result.optimizations.views || {}).some(view => view.created)
    const querySuccess = !optimizeQueries || Object.values(result.optimizations.queries || {}).some(opt => opt.success)
    
    result.success = indexSuccess && viewSuccess && querySuccess

    // Generate recommendations
    if (result.success) {
      result.recommendations = [
        '✅ Database optimization completed successfully',
        `Execution time: ${result.executionTime}ms`,
        'Performance indexes created for faster queries',
        'Optimized views created for complex operations',
        'Database statistics updated for better query planning'
      ]
      
      if (result.performance.overall) {
        result.recommendations.push(
          `Average query performance: ${result.performance.overall.average_query_time_ms}ms (Grade: ${result.performance.overall.performance_grade})`
        )
      }
    } else {
      result.recommendations = [
        '⚠️ Database optimization completed with some issues',
        'Some optimizations may require manual execution',
        'Check individual optimization results for details'
      ]
    }

    // Add specific performance recommendations
    if (result.performance.overall) {
      if (result.performance.overall.performance_grade === 'D') {
        result.recommendations.push(
          '🐌 Query performance needs improvement',
          'Consider adding more specific indexes',
          'Review and optimize slow queries',
          'Check database resource allocation'
        )
      } else if (result.performance.overall.performance_grade === 'C') {
        result.recommendations.push(
          '⚡ Query performance is acceptable but could be better',
          'Monitor query performance over time',
          'Consider query optimization for heavy-use endpoints'
        )
      } else {
        result.recommendations.push(
          '🚀 Excellent query performance achieved!'
        )
      }
    }

    console.log(`🏁 Database optimization complete: ${result.success ? 'SUCCESS' : 'PARTIAL'}`)
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      message: result.success ? 
        'Database optimization completed successfully' : 
        'Database optimization completed with some issues'
    }, { status: result.success ? 200 : 206 })

  } catch (error) {
    console.error('❌ Database optimization failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database optimization failed',
      details: error.message,
      recommendations: [
        'Check database connection and permissions',
        'Verify you have admin privileges for creating indexes',
        'Try running individual optimizations manually',
        'Review database logs for specific errors'
      ]
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Quick optimization status check
    console.log('🔍 Checking database optimization status...')
    
    const status = {
      timestamp: new Date().toISOString(),
      indexes: {},
      views: {},
      performance: {},
      recommendations: []
    }

    const client = supabaseAdmin || supabase

    // Check if key indexes exist
    const keyIndexes = [
      'idx_users_email_btree',
      'idx_properties_status_updated', 
      'idx_finances_created_by_updated',
      'idx_properties_search_gin'
    ]

    try {
      const { data: indexData, error: indexError } = await client.rpc('exec_sql', {
        sql: `
          SELECT indexname, tablename 
          FROM pg_indexes 
          WHERE indexname = ANY($1)
        `,
        params: [keyIndexes]
      })

      if (!indexError && indexData) {
        const existingIndexes = indexData.map(idx => idx.indexname)
        
        for (const indexName of keyIndexes) {
          status.indexes[indexName] = {
            exists: existingIndexes.includes(indexName)
          }
        }
      }
    } catch (err) {
      status.indexes.error = err.message
    }

    // Check if key views exist
    const keyViews = ['property_summary_view', 'finance_summary_view', 'user_activity_summary']
    
    try {
      const { data: viewData, error: viewError } = await client.rpc('exec_sql', {
        sql: `
          SELECT viewname 
          FROM pg_views 
          WHERE viewname = ANY($1)
        `,
        params: [keyViews]
      })

      if (!viewError && viewData) {
        const existingViews = viewData.map(view => view.viewname)
        
        for (const viewName of keyViews) {
          status.views[viewName] = {
            exists: existingViews.includes(viewName)
          }
        }
      }
    } catch (err) {
      status.views.error = err.message
    }

    // Quick performance test
    try {
      const perfStart = Date.now()
      const { error: perfError } = await client
        .from('users')
        .select('id')
        .eq('email', 'drax976797@gmail.com')
        .single()
      
      const perfDuration = Date.now() - perfStart
      
      status.performance.user_lookup_ms = perfDuration
      status.performance.rating = perfDuration < 50 ? 'excellent' : 
                                 perfDuration < 200 ? 'good' : 
                                 perfDuration < 500 ? 'acceptable' : 'needs_optimization'
    } catch (err) {
      status.performance.error = err.message
    }

    // Generate recommendations
    const indexCount = Object.values(status.indexes).filter(idx => idx.exists).length
    const viewCount = Object.values(status.views).filter(view => view.exists).length
    
    if (indexCount === keyIndexes.length && viewCount === keyViews.length) {
      status.recommendations = [
        '✅ Database is fully optimized',
        'All performance indexes are in place',
        'Optimized views are available',
        `Query performance: ${status.performance.rating || 'unknown'}`
      ]
    } else {
      status.recommendations = [
        '⚠️ Database optimization is incomplete',
        `${indexCount}/${keyIndexes.length} key indexes exist`,
        `${viewCount}/${keyViews.length} optimized views exist`,
        'POST /api/database/optimize to run full optimization'
      ]
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Database optimization status check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error.message,
      recommendations: [
        'Check database connection',
        'Verify admin permissions',
        'Try running database optimization'
      ]
    }, { status: 500 })
  }
}
