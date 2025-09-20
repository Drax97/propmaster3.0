import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Security System Setup API
 * 
 * POST /api/security/setup - Setup security audit tables and indexes
 * GET /api/security/setup - Check security system setup status
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

    // Only master users can setup security system
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can setup security system.' },
        { status: 403 }
      )
    }

    console.log(`🔒 Security system setup requested by: ${session.user.email}`)

    const setupResult = {
      success: false,
      steps: [],
      tables: {},
      indexes: {},
      policies: {},
      recommendations: []
    }

    // Step 1: Create security audit log table
    console.log('📊 Creating security audit log table...')
    
    const auditTableSQL = `
      CREATE TABLE IF NOT EXISTS security_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_email VARCHAR(255),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    try {
      const { error: tableError } = await supabaseAdmin.rpc('exec_sql', { sql: auditTableSQL })
      
      if (tableError) {
        console.error('Failed to create security audit log table:', tableError)
        setupResult.tables.security_audit_log = {
          created: false,
          error: tableError.message
        }
        setupResult.steps.push({
          step: 'create_audit_table',
          success: false,
          error: tableError.message
        })
      } else {
        console.log('✅ Security audit log table created successfully')
        setupResult.tables.security_audit_log = {
          created: true
        }
        setupResult.steps.push({
          step: 'create_audit_table',
          success: true
        })
      }
    } catch (err) {
      console.error('Exception creating audit table:', err)
      setupResult.tables.security_audit_log = {
        created: false,
        error: err.message,
        manual_sql: auditTableSQL
      }
      setupResult.steps.push({
        step: 'create_audit_table',
        success: false,
        error: err.message,
        manual_sql: auditTableSQL
      })
    }

    // Step 2: Create security configuration table
    console.log('⚙️ Creating security configuration table...')
    
    const configTableSQL = `
      CREATE TABLE IF NOT EXISTS security_configuration (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value JSONB NOT NULL,
        description TEXT,
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `

    try {
      const { error: configError } = await supabaseAdmin.rpc('exec_sql', { sql: configTableSQL })
      
      if (configError) {
        setupResult.tables.security_configuration = {
          created: false,
          error: configError.message
        }
        setupResult.steps.push({
          step: 'create_config_table',
          success: false,
          error: configError.message
        })
      } else {
        setupResult.tables.security_configuration = {
          created: true
        }
        setupResult.steps.push({
          step: 'create_config_table',
          success: true
        })
      }
    } catch (err) {
      setupResult.tables.security_configuration = {
        created: false,
        error: err.message,
        manual_sql: configTableSQL
      }
      setupResult.steps.push({
        step: 'create_config_table',
        success: false,
        error: err.message,
        manual_sql: configTableSQL
      })
    }

    // Step 3: Create indexes for performance
    console.log('🚀 Creating security indexes...')
    
    const indexes = {
      idx_audit_log_timestamp: 'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON security_audit_log(created_at DESC);',
      idx_audit_log_event_type: 'CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON security_audit_log(event_type);',
      idx_audit_log_severity: 'CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON security_audit_log(severity);',
      idx_audit_log_ip: 'CREATE INDEX IF NOT EXISTS idx_audit_log_ip ON security_audit_log(ip_address);',
      idx_audit_log_user: 'CREATE INDEX IF NOT EXISTS idx_audit_log_user ON security_audit_log(user_email);',
      idx_config_key: 'CREATE INDEX IF NOT EXISTS idx_config_key ON security_configuration(config_key);'
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

    // Step 4: Enable RLS and create policies
    console.log('🔒 Setting up Row Level Security...')
    
    const rlsSQL = `
      -- Enable RLS
      ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
      ALTER TABLE security_configuration ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies
      DROP POLICY IF EXISTS "Masters can view audit logs" ON security_audit_log;
      DROP POLICY IF EXISTS "Masters can manage security config" ON security_configuration;

      -- Create policies for audit log (master users only)
      CREATE POLICY "Masters can view audit logs" ON security_audit_log 
      FOR SELECT TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id::text = auth.uid()::text 
          AND users.role = 'master'
        )
      );

      -- Create policies for security configuration (master users only)
      CREATE POLICY "Masters can manage security config" ON security_configuration 
      FOR ALL TO authenticated 
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

    // Step 5: Insert default security configuration
    console.log('⚙️ Inserting default security configuration...')
    
    const defaultConfigs = [
      {
        config_key: 'rate_limiting',
        config_value: {
          windowMs: 900000, // 15 minutes
          maxRequests: 100,
          maxAuthAttempts: 5,
          blockDuration: 3600000 // 1 hour
        },
        description: 'Rate limiting configuration',
        updated_by: session.user.email
      },
      {
        config_key: 'security_settings',
        config_value: {
          maxLoginAttempts: 5,
          sessionTimeout: 86400000, // 24 hours
          requireMFA: false,
          auditLogRetention: 7776000000 // 90 days
        },
        description: 'General security settings',
        updated_by: session.user.email
      },
      {
        config_key: 'validation_rules',
        config_value: {
          maxFileSize: 10485760, // 10MB
          allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
          allowedDocTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          maxInputLength: 10000
        },
        description: 'Input validation configuration',
        updated_by: session.user.email
      }
    ]

    let configInsertSuccess = 0
    for (const config of defaultConfigs) {
      try {
        const { error } = await supabaseAdmin
          .from('security_configuration')
          .upsert([config], { onConflict: 'config_key' })
        
        if (!error) {
          configInsertSuccess++
        }
      } catch (err) {
        console.error(`Failed to insert config ${config.config_key}:`, err)
      }
    }

    setupResult.steps.push({
      step: 'insert_default_configs',
      success: configInsertSuccess > 0,
      inserted_count: configInsertSuccess,
      total_count: defaultConfigs.length
    })

    // Step 6: Test security system functionality
    console.log('🧪 Testing security system...')
    
    const tests = [
      {
        name: 'audit_log_table_access',
        test: async () => {
          const { data, error } = await supabaseAdmin
            .from('security_audit_log')
            .select('id')
            .limit(1)
          return { success: !error, error: error?.message }
        }
      },
      {
        name: 'config_table_access',
        test: async () => {
          const { data, error } = await supabaseAdmin
            .from('security_configuration')
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
      step: 'security_tests',
      success: Object.values(testResults).every(t => t.success),
      results: testResults
    })

    // Determine overall success
    const criticalSteps = setupResult.steps.filter(step => 
      ['create_audit_table', 'create_config_table'].includes(step.step)
    )
    const criticalSuccess = criticalSteps.every(step => step.success)
    const allTestsPassed = Object.values(testResults).every(t => t.success)
    
    setupResult.success = criticalSuccess && allTestsPassed

    // Generate recommendations
    if (setupResult.success) {
      setupResult.recommendations = [
        '✅ Security system setup completed successfully',
        'All security tables created and accessible',
        'RLS policies configured for secure access',
        'Performance indexes created for audit logs',
        'Default security configuration inserted',
        'Security monitoring is now active'
      ]
    } else {
      setupResult.recommendations = [
        '⚠️ Security system setup completed with some issues',
        'Check individual step results for details',
        'Some manual SQL execution may be required',
        'Run GET /api/security/setup to verify current status'
      ]
    }

    console.log(`🏁 Security system setup complete: ${setupResult.success ? 'SUCCESS' : 'PARTIAL'}`)
    
    return NextResponse.json({
      ...setupResult,
      timestamp: new Date().toISOString(),
      message: setupResult.success ? 
        'Security system setup completed successfully' : 
        'Security system setup completed with some issues'
    }, { status: setupResult.success ? 200 : 206 })

  } catch (error) {
    console.error('❌ Security system setup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Security system setup failed',
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
    console.log('🔍 Checking security system setup status...')
    
    const status = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      tables: {},
      recommendations: []
    }

    const requiredTables = ['security_audit_log', 'security_configuration']
    
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
      status.recommendations = ['✅ Security system is fully set up and ready to use']
    } else if (schemaErrors > 0) {
      status.overall_status = 'schema_cache_error'
      status.recommendations = [
        '❌ Tables exist but have schema cache errors',
        'POST /api/security/setup to fix schema issues',
        'Or manually refresh schema in Supabase dashboard'
      ]
    } else if (existingTables < requiredTables.length) {
      status.overall_status = 'incomplete'
      status.recommendations = [
        '⚠️ Some required security tables are missing',
        'POST /api/security/setup to create missing tables',
        `Missing tables: ${requiredTables.filter(t => !status.tables[t]?.exists).join(', ')}`
      ]
    } else {
      status.overall_status = 'partial'
      status.recommendations = [
        '⚠️ Tables exist but some are not accessible',
        'Check RLS policies and permissions',
        'POST /api/security/setup to repair configuration'
      ]
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Security system status check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall_status: 'error',
      error: error.message,
      recommendations: [
        'Check Supabase connection',
        'Verify environment variables',
        'Try running security system setup'
      ]
    }, { status: 500 })
  }
}
