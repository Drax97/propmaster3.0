import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Property Sharing System Setup API
 * 
 * POST /api/sharing/setup - Setup property sharing tables and indexes
 * GET /api/sharing/setup - Check sharing system setup status
 */

export async function POST(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only master users can setup sharing system
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can setup sharing system.' },
        { status: 403 }
      )
    }

    console.log(`🔗 Property sharing system setup requested by: ${session.user.email}`)

    const setupResult = {
      success: false,
      steps: [],
      tables: {},
      indexes: {},
      policies: {},
      recommendations: []
    }

    // Step 1: Create property shares table
    console.log('🔗 Creating property shares table...')
    
    const sharesTableSQL = `
      CREATE TABLE IF NOT EXISTS property_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        share_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        client_email VARCHAR(255),
        client_name VARCHAR(255),
        actual_client_email VARCHAR(255),
        actual_client_name VARCHAR(255),
        allowed_views INTEGER,
        require_client_info BOOLEAN DEFAULT false,
        allow_downloads BOOLEAN DEFAULT true,
        custom_message TEXT,
        created_by VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        view_count INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMP,
        deactivated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `

    try {
      const { error: tableError } = await supabaseAdmin.rpc('exec_sql', { sql: sharesTableSQL })
      
      if (tableError) {
        console.error('Failed to create property shares table:', tableError)
        setupResult.tables.property_shares = {
          created: false,
          error: tableError.message
        }
        setupResult.steps.push({
          step: 'create_shares_table',
          success: false,
          error: tableError.message
        })
      } else {
        console.log('✅ Property shares table created successfully')
        setupResult.tables.property_shares = {
          created: true
        }
        setupResult.steps.push({
          step: 'create_shares_table',
          success: true
        })
      }
    } catch (err) {
      console.error('Exception creating shares table:', err)
      setupResult.tables.property_shares = {
        created: false,
        error: err.message,
        manual_sql: sharesTableSQL
      }
      setupResult.steps.push({
        step: 'create_shares_table',
        success: false,
        error: err.message,
        manual_sql: sharesTableSQL
      })
    }

    // Step 2: Create property sharing log table
    console.log('📊 Creating property sharing log table...')
    
    const logTableSQL = `
      CREATE TABLE IF NOT EXISTS property_sharing_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        share_id UUID REFERENCES property_shares(id) ON DELETE CASCADE,
        property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    try {
      const { error: logError } = await supabaseAdmin.rpc('exec_sql', { sql: logTableSQL })
      
      if (logError) {
        setupResult.tables.property_sharing_log = {
          created: false,
          error: logError.message
        }
        setupResult.steps.push({
          step: 'create_log_table',
          success: false,
          error: logError.message
        })
      } else {
        setupResult.tables.property_sharing_log = {
          created: true
        }
        setupResult.steps.push({
          step: 'create_log_table',
          success: true
        })
      }
    } catch (err) {
      setupResult.tables.property_sharing_log = {
        created: false,
        error: err.message,
        manual_sql: logTableSQL
      }
      setupResult.steps.push({
        step: 'create_log_table',
        success: false,
        error: err.message,
        manual_sql: logTableSQL
      })
    }

    // Step 3: Create update trigger
    console.log('⚡ Creating update triggers...')
    
    const triggerSQL = `
      -- Create or update the update trigger function if it doesn't exist
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Drop existing trigger if exists
      DROP TRIGGER IF EXISTS update_property_shares_updated_at ON property_shares;

      -- Create trigger for property shares
      CREATE TRIGGER update_property_shares_updated_at 
        BEFORE UPDATE ON property_shares 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: triggerSQL })
      
      if (error) {
        setupResult.steps.push({
          step: 'create_triggers',
          success: false,
          error: error.message
        })
      } else {
        setupResult.steps.push({
          step: 'create_triggers',
          success: true
        })
      }
    } catch (err) {
      setupResult.steps.push({
        step: 'create_triggers',
        success: false,
        error: err.message,
        manual_sql: triggerSQL
      })
    }

    // Step 4: Create indexes for performance
    console.log('🚀 Creating sharing indexes...')
    
    const indexes = {
      idx_property_shares_token: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_property_shares_token ON property_shares(share_token);',
      idx_property_shares_property_id: 'CREATE INDEX IF NOT EXISTS idx_property_shares_property_id ON property_shares(property_id);',
      idx_property_shares_created_by: 'CREATE INDEX IF NOT EXISTS idx_property_shares_created_by ON property_shares(created_by);',
      idx_property_shares_expires_at: 'CREATE INDEX IF NOT EXISTS idx_property_shares_expires_at ON property_shares(expires_at);',
      idx_property_shares_active: 'CREATE INDEX IF NOT EXISTS idx_property_shares_active ON property_shares(is_active, expires_at) WHERE is_active = true;',
      idx_property_shares_client_email: 'CREATE INDEX IF NOT EXISTS idx_property_shares_client_email ON property_shares(actual_client_email) WHERE actual_client_email IS NOT NULL;',
      idx_sharing_log_share_id: 'CREATE INDEX IF NOT EXISTS idx_sharing_log_share_id ON property_sharing_log(share_id);',
      idx_sharing_log_event_type: 'CREATE INDEX IF NOT EXISTS idx_sharing_log_event_type ON property_sharing_log(event_type);',
      idx_sharing_log_created_at: 'CREATE INDEX IF NOT EXISTS idx_sharing_log_created_at ON property_sharing_log(created_at DESC);'
    }

    for (const [indexName, sql] of Object.entries(indexes)) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
        
        if (error) {
          setupResult.indexes[indexName] = {
            created: false,
            error: error.message
          }
        } else {
          setupResult.indexes[indexName] = {
            created: true
          }
        }
      } catch (err) {
        setupResult.indexes[indexName] = {
          created: false,
          error: err.message,
          manual_sql: sql
        }
      }
    }

    setupResult.steps.push({
      step: 'create_indexes',
      success: Object.values(setupResult.indexes).some(idx => idx.created),
      created_count: Object.values(setupResult.indexes).filter(idx => idx.created).length,
      total_count: Object.keys(indexes).length
    })

    // Step 5: Enable RLS and create policies
    console.log('🔒 Setting up Row Level Security...')
    
    const rlsSQL = `
      -- Enable RLS
      ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;
      ALTER TABLE property_sharing_log ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies
      DROP POLICY IF EXISTS "Property owners can manage shares" ON property_shares;
      DROP POLICY IF EXISTS "Masters can manage all shares" ON property_shares;
      DROP POLICY IF EXISTS "Public can access valid shares" ON property_shares;
      DROP POLICY IF EXISTS "Masters can view sharing logs" ON property_sharing_log;

      -- Property shares policies
      -- Property owners (creators) can manage their own shares
      CREATE POLICY "Property owners can manage shares" ON property_shares 
      FOR ALL TO authenticated 
      USING (
        created_by = auth.email() OR
        EXISTS (
          SELECT 1 FROM properties 
          WHERE properties.id = property_shares.property_id 
          AND properties.created_by::text = auth.uid()::text
        )
      );

      -- Masters can manage all shares
      CREATE POLICY "Masters can manage all shares" ON property_shares 
      FOR ALL TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id::text = auth.uid()::text 
          AND users.role = 'master'
        )
      );

      -- Sharing logs policies (master users only)
      CREATE POLICY "Masters can view sharing logs" ON property_sharing_log 
      FOR SELECT TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id::text = auth.uid()::text 
          AND users.role = 'master'
        )
      );
    `

    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: rlsSQL })
      
      if (error) {
        setupResult.policies.rls_setup = {
          success: false,
          error: error.message
        }
        setupResult.steps.push({
          step: 'setup_rls',
          success: false,
          error: error.message
        })
      } else {
        setupResult.policies.rls_setup = {
          success: true
        }
        setupResult.steps.push({
          step: 'setup_rls',
          success: true
        })
      }
    } catch (err) {
      setupResult.policies.rls_setup = {
        success: false,
        error: err.message,
        manual_sql: rlsSQL
      }
      setupResult.steps.push({
        step: 'setup_rls',
        success: false,
        error: err.message,
        manual_sql: rlsSQL
      })
    }

    // Step 6: Test sharing system functionality
    console.log('🧪 Testing sharing system...')
    
    const tests = [
      {
        name: 'property_shares_table_access',
        test: async () => {
          const { data, error } = await supabaseAdmin
            .from('property_shares')
            .select('id')
            .limit(1)
          return { success: !error, error: error?.message }
        }
      },
      {
        name: 'sharing_log_table_access',
        test: async () => {
          const { data, error } = await supabaseAdmin
            .from('property_sharing_log')
            .select('id')
            .limit(1)
          return { success: !error, error: error?.message }
        }
      }
    ]

    const testResults = {}
    for (const test of tests) {
      try {
        const result = await test.test()
        testResults[test.name] = result
      } catch (err) {
        testResults[test.name] = { success: false, error: err.message }
      }
    }

    setupResult.steps.push({
      step: 'sharing_tests',
      success: Object.values(testResults).every(t => t.success),
      results: testResults
    })

    // Determine overall success
    const criticalSteps = setupResult.steps.filter(step => 
      ['create_shares_table', 'create_log_table'].includes(step.step)
    )
    const criticalSuccess = criticalSteps.every(step => step.success)
    const allTestsPassed = Object.values(testResults).every(t => t.success)
    
    setupResult.success = criticalSuccess && allTestsPassed

    // Generate recommendations
    if (setupResult.success) {
      setupResult.recommendations = [
        '✅ Property sharing system setup completed successfully',
        'All sharing tables created and accessible',
        'RLS policies configured for secure access',
        'Performance indexes created for sharing operations',
        'Property sharing is now ready to use',
        'Users can now create and manage property sharing links'
      ]
    } else {
      setupResult.recommendations = [
        '⚠️ Property sharing setup completed with some issues',
        'Check individual step results for details',
        'Some manual SQL execution may be required',
        'Run GET /api/sharing/setup to verify current status'
      ]
    }

    console.log(`🏁 Property sharing setup complete: ${setupResult.success ? 'SUCCESS' : 'PARTIAL'}`)
    
    return NextResponse.json({
      ...setupResult,
      timestamp: new Date().toISOString(),
      message: setupResult.success ? 
        'Property sharing system setup completed successfully' : 
        'Property sharing system setup completed with some issues'
    }, { status: setupResult.success ? 200 : 206 })

  } catch (error) {
    console.error('❌ Property sharing system setup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Property sharing system setup failed',
      details: error.message,
      recommendations: [
        'Check your Supabase connection',
        'Verify you have admin privileges',
        'Try running individual setup steps manually',
        'Contact support if issues persist'
      ]
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('🔍 Checking property sharing system setup status...')
    
    const status = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      tables: {},
      recommendations: []
    }

    const requiredTables = ['property_shares', 'property_sharing_log']
    
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('id')
          .limit(1)
        
        status.tables[tableName] = {
          exists: !error || error.code !== 'PGRST116',
          accessible: !error,
          error: error?.message,
          schema_error: error?.code === 'PGRST205'
        }
      } catch (err) {
        status.tables[tableName] = {
          exists: false,
          accessible: false,
          error: err.message,
          schema_error: false
        }
      }
    }

    const existingTables = Object.values(status.tables).filter(t => t.exists).length
    const accessibleTables = Object.values(status.tables).filter(t => t.accessible).length
    const schemaErrors = Object.values(status.tables).filter(t => t.schema_error).length

    if (existingTables === requiredTables.length && accessibleTables === requiredTables.length) {
      status.overall_status = 'ready'
      status.recommendations = ['✅ Property sharing system is fully set up and ready to use']
    } else if (schemaErrors > 0) {
      status.overall_status = 'schema_cache_error'
      status.recommendations = [
        '❌ Tables exist but have schema cache errors',
        'POST /api/sharing/setup to fix schema issues',
        'Or manually refresh schema in Supabase dashboard'
      ]
    } else if (existingTables < requiredTables.length) {
      status.overall_status = 'incomplete'
      status.recommendations = [
        '⚠️ Some required sharing tables are missing',
        'POST /api/sharing/setup to create missing tables',
        `Missing tables: ${requiredTables.filter(t => !status.tables[t]?.exists).join(', ')}`
      ]
    } else {
      status.overall_status = 'partial'
      status.recommendations = [
        '⚠️ Tables exist but some are not accessible',
        'Check RLS policies and permissions',
        'POST /api/sharing/setup to repair configuration'
      ]
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Property sharing system status check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall_status: 'error',
      error: error.message,
      recommendations: [
        'Check Supabase connection',
        'Verify environment variables',
        'Try running property sharing system setup'
      ]
    }, { status: 500 })
  }
}
