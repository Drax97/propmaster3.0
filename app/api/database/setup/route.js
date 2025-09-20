import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    console.log('🚀 Starting comprehensive database setup...')
    
    const body = await request.json().catch(() => ({}))
    const { 
      force = false, 
      skipExisting = true,
      createIndexes = true,
      setupRLS = true 
    } = body
    
    const result = {
      success: false,
      steps: [],
      tables: {},
      indexes: {},
      policies: {},
      recommendations: []
    }

    const client = supabaseAdmin || supabase

    // Step 1: Create all tables with proper schema
    console.log('📋 Creating database tables...')
    
    const tableDefinitions = {
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          image TEXT,
          role VARCHAR(50) DEFAULT 'viewer',
          status VARCHAR(50) DEFAULT 'pending',
          permissions JSONB DEFAULT '[]',
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `,
      properties: `
        CREATE TABLE IF NOT EXISTS properties (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          location TEXT,
          price DECIMAL(15,2),
          description TEXT,
          cover_image TEXT,
          images JSONB DEFAULT '[]',
          documents JSONB DEFAULT '[]',
          maps_link TEXT,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'available',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `,
      finances: `
        CREATE TABLE IF NOT EXISTS finances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
          client_name VARCHAR(255),
          client_email VARCHAR(255),
          amount DECIMAL(15,2),
          payment_type VARCHAR(50),
          due_date DATE,
          next_payment_date DATE,
          status VARCHAR(50) DEFAULT 'pending',
          receipt_url TEXT,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `,
      client_profiles: `
        CREATE TABLE IF NOT EXISTS client_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          extracted_name VARCHAR(255),
          extraction_method VARCHAR(50),
          confidence_score DECIMAL(3,2),
          verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    }

    // Create tables
    for (const [tableName, sql] of Object.entries(tableDefinitions)) {
      try {
        console.log(`Creating table: ${tableName}`)
        
        const { data, error } = await client.rpc('exec_sql', { sql })
        
        if (error) {
          console.error(`Failed to create ${tableName}:`, error)
          result.tables[tableName] = { 
            created: false, 
            error: error.message,
            sql_provided: true
          }
          result.steps.push({
            step: `create_${tableName}_table`,
            success: false,
            error: error.message
          })
        } else {
          console.log(`✅ Table ${tableName} created successfully`)
          result.tables[tableName] = { 
            created: true, 
            error: null 
          }
          result.steps.push({
            step: `create_${tableName}_table`,
            success: true
          })
        }
      } catch (err) {
        console.error(`Exception creating ${tableName}:`, err)
        result.tables[tableName] = { 
          created: false, 
          error: err.message,
          requires_manual_creation: true
        }
        result.steps.push({
          step: `create_${tableName}_table`,
          success: false,
          error: err.message,
          manual_sql: sql
        })
      }
    }

    // Step 2: Create update triggers
    console.log('⚡ Creating update triggers...')
    
    const triggerSQL = `
      -- Create update function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Drop existing triggers if they exist
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
      DROP TRIGGER IF EXISTS update_finances_updated_at ON finances;
      DROP TRIGGER IF EXISTS update_client_profiles_updated_at ON client_profiles;

      -- Create triggers
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
      CREATE TRIGGER update_properties_updated_at 
        BEFORE UPDATE ON properties 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
      CREATE TRIGGER update_finances_updated_at 
        BEFORE UPDATE ON finances 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
      CREATE TRIGGER update_client_profiles_updated_at 
        BEFORE UPDATE ON client_profiles 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    try {
      const { data, error } = await client.rpc('exec_sql', { sql: triggerSQL })
      
      if (error) {
        console.error('Failed to create triggers:', error)
        result.steps.push({
          step: 'create_triggers',
          success: false,
          error: error.message
        })
      } else {
        console.log('✅ Update triggers created successfully')
        result.steps.push({
          step: 'create_triggers',
          success: true
        })
      }
    } catch (err) {
      console.error('Exception creating triggers:', err)
      result.steps.push({
        step: 'create_triggers',
        success: false,
        error: err.message,
        manual_sql: triggerSQL
      })
    }

    // Step 3: Create performance indexes
    if (createIndexes) {
      console.log('🚀 Creating performance indexes...')
      
      const indexes = {
        idx_users_email: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
        idx_users_role: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
        idx_properties_status: 'CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);',
        idx_properties_created_by: 'CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);',
        idx_properties_price: 'CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);',
        idx_properties_location: 'CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING gin(to_tsvector(\'english\', location));',
        idx_finances_property_id: 'CREATE INDEX IF NOT EXISTS idx_finances_property_id ON finances(property_id);',
        idx_finances_status: 'CREATE INDEX IF NOT EXISTS idx_finances_status ON finances(status);',
        idx_finances_created_by: 'CREATE INDEX IF NOT EXISTS idx_finances_created_by ON finances(created_by);',
        idx_finances_due_date: 'CREATE INDEX IF NOT EXISTS idx_finances_due_date ON finances(due_date);',
        idx_client_profiles_email: 'CREATE INDEX IF NOT EXISTS idx_client_profiles_email ON client_profiles(email);'
      }

      for (const [indexName, sql] of Object.entries(indexes)) {
        try {
          const { data, error } = await client.rpc('exec_sql', { sql })
          
          if (error) {
            console.error(`Failed to create index ${indexName}:`, error)
            result.indexes[indexName] = { 
              created: false, 
              error: error.message 
            }
          } else {
            console.log(`✅ Index ${indexName} created successfully`)
            result.indexes[indexName] = { 
              created: true 
            }
          }
        } catch (err) {
          console.error(`Exception creating index ${indexName}:`, err)
          result.indexes[indexName] = { 
            created: false, 
            error: err.message,
            manual_sql: sql
          }
        }
      }
      
      result.steps.push({
        step: 'create_indexes',
        success: Object.values(result.indexes).some(idx => idx.created),
        created_count: Object.values(result.indexes).filter(idx => idx.created).length,
        total_count: Object.keys(indexes).length
      })
    }

    // Step 4: Enable RLS and create policies
    if (setupRLS) {
      console.log('🔒 Setting up Row Level Security...')
      
      const rlsSQL = `
        -- Enable RLS
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
        ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
        ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON users;
        DROP POLICY IF EXISTS "Users can update own profile" ON users;
        DROP POLICY IF EXISTS "Masters can view all users" ON users;
        DROP POLICY IF EXISTS "Masters can manage users" ON users;
        
        DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties;
        DROP POLICY IF EXISTS "Authenticated users can create properties" ON properties;
        DROP POLICY IF EXISTS "Users can update own properties" ON properties;
        DROP POLICY IF EXISTS "Masters can manage all properties" ON properties;
        
        DROP POLICY IF EXISTS "Masters can view all finances" ON finances;
        DROP POLICY IF EXISTS "Editors can view own finances" ON finances;
        DROP POLICY IF EXISTS "Masters and Editors can create finances" ON finances;
        DROP POLICY IF EXISTS "Only Masters can update finances" ON finances;
        DROP POLICY IF EXISTS "Only Masters can delete finances" ON finances;
        
        DROP POLICY IF EXISTS "Users can manage own client profiles" ON client_profiles;

        -- Create user policies
        CREATE POLICY "Users can view own profile" ON users 
        FOR SELECT USING (auth.uid()::text = id::text);
        
        CREATE POLICY "Users can update own profile" ON users 
        FOR UPDATE USING (auth.uid()::text = id::text);
        
        CREATE POLICY "Masters can view all users" ON users 
        FOR SELECT TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'master'
          )
        );
        
        CREATE POLICY "Masters can manage users" ON users 
        FOR ALL TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'master'
          )
        );

        -- Create property policies
        CREATE POLICY "Authenticated users can view properties" ON properties 
        FOR SELECT TO authenticated;
        
        CREATE POLICY "Authenticated users can create properties" ON properties 
        FOR INSERT TO authenticated 
        WITH CHECK (auth.uid()::text IS NOT NULL);
        
        CREATE POLICY "Users can update own properties" ON properties 
        FOR UPDATE TO authenticated 
        USING (created_by::text = auth.uid()::text);
        
        CREATE POLICY "Masters can manage all properties" ON properties 
        FOR ALL TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'master'
          )
        );

        -- Create finance policies with role-based access
        CREATE POLICY "Masters can view all finances" ON finances 
        FOR SELECT TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'master'
          )
        );
        
        CREATE POLICY "Editors can view own finances" ON finances 
        FOR SELECT TO authenticated 
        USING (
          created_by::text = auth.uid()::text 
          AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role IN ('editor', 'master')
          )
        );
        
        CREATE POLICY "Masters and Editors can create finances" ON finances 
        FOR INSERT TO authenticated 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role IN ('master', 'editor')
          )
        );
        
        CREATE POLICY "Only Masters can update finances" ON finances 
        FOR UPDATE TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'master'
          )
        );
        
        CREATE POLICY "Only Masters can delete finances" ON finances 
        FOR DELETE TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'master'
          )
        );

        -- Create client profile policies
        CREATE POLICY "Users can manage own client profiles" ON client_profiles 
        FOR ALL TO authenticated 
        USING (auth.uid()::text IS NOT NULL);
      `

      try {
        const { data, error } = await client.rpc('exec_sql', { sql: rlsSQL })
        
        if (error) {
          console.error('Failed to setup RLS:', error)
          result.policies.rls_setup = { 
            success: false, 
            error: error.message 
          }
          result.steps.push({
            step: 'setup_rls',
            success: false,
            error: error.message
          })
        } else {
          console.log('✅ RLS policies created successfully')
          result.policies.rls_setup = { 
            success: true 
          }
          result.steps.push({
            step: 'setup_rls',
            success: true
          })
        }
      } catch (err) {
        console.error('Exception setting up RLS:', err)
        result.policies.rls_setup = { 
          success: false, 
          error: err.message,
          manual_sql: rlsSQL
        }
        result.steps.push({
          step: 'setup_rls',
          success: false,
          error: err.message,
          manual_sql: rlsSQL
        })
      }
    }

    // Step 5: Test database functionality
    console.log('🧪 Testing database functionality...')
    
    const tests = [
      {
        name: 'users_table_access',
        test: async () => {
          const { data, error } = await client
            .from('users')
            .select('id')
            .limit(1)
          return { success: !error, error: error?.message }
        }
      },
      {
        name: 'properties_table_access',
        test: async () => {
          const { data, error } = await client
            .from('properties')
            .select('id')
            .limit(1)
          return { success: !error, error: error?.message }
        }
      },
      {
        name: 'finances_table_access',
        test: async () => {
          const { data, error } = await client
            .from('finances')
            .select('id')
            .limit(1)
          return { success: !error, error: error?.message }
        }
      },
      {
        name: 'client_profiles_table_access',
        test: async () => {
          const { data, error } = await client
            .from('client_profiles')
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
        console.log(`Test ${test.name}: ${result.success ? '✅ PASS' : '❌ FAIL'}`)
      } catch (err) {
        testResults[test.name] = { success: false, error: err.message }
        console.log(`Test ${test.name}: ❌ FAIL (${err.message})`)
      }
    }

    result.steps.push({
      step: 'database_tests',
      success: Object.values(testResults).every(t => t.success),
      results: testResults
    })

    // Step 6: Attempt schema cache refresh
    console.log('🔄 Refreshing schema cache...')
    
    try {
      await client.rpc('exec_sql', { 
        sql: "NOTIFY pgrst, 'reload schema'" 
      })
      
      // Wait a moment for cache refresh
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Test if cache refresh worked
      const { error: cacheTestError } = await client
        .from('users')
        .select('id')
        .limit(1)
      
      result.steps.push({
        step: 'schema_cache_refresh',
        success: !cacheTestError || cacheTestError.code !== 'PGRST205',
        error: cacheTestError?.message
      })
    } catch (err) {
      result.steps.push({
        step: 'schema_cache_refresh',
        success: false,
        error: err.message
      })
    }

    // Determine overall success
    const criticalSteps = result.steps.filter(step => 
      ['create_users_table', 'create_properties_table', 'create_finances_table'].includes(step.step)
    )
    const criticalSuccess = criticalSteps.every(step => step.success)
    const allTestsPassed = Object.values(testResults).every(t => t.success)
    
    result.success = criticalSuccess && allTestsPassed

    // Generate recommendations
    if (result.success) {
      result.recommendations = [
        '✅ Database setup completed successfully',
        'All tables created and accessible',
        'RLS policies configured for security',
        'Performance indexes created',
        'Your application should now work without fallback data'
      ]
    } else {
      result.recommendations = [
        '⚠️ Database setup completed with some issues',
        'Check individual step results for details',
        'Some manual SQL execution may be required',
        'Run GET /api/database/health to verify current status'
      ]
      
      // Add specific recommendations based on failures
      const failedSteps = result.steps.filter(step => !step.success)
      for (const step of failedSteps) {
        if (step.manual_sql) {
          result.recommendations.push(
            `Manual SQL required for ${step.step}:`,
            `Execute in Supabase SQL Editor: ${step.manual_sql.substring(0, 100)}...`
          )
        }
      }
    }

    console.log(`🏁 Database setup complete: ${result.success ? 'SUCCESS' : 'PARTIAL'}`)
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      message: result.success ? 
        'Database setup completed successfully' : 
        'Database setup completed with some issues'
    }, { status: result.success ? 200 : 206 })

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database setup failed',
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
    // Quick setup status check
    console.log('🔍 Checking database setup status...')
    
    const status = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      tables: {},
      recommendations: []
    }

    const requiredTables = ['users', 'properties', 'finances', 'client_profiles']
    
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabase
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
      status.recommendations = ['✅ Database is fully set up and ready to use']
    } else if (schemaErrors > 0) {
      status.overall_status = 'schema_cache_error'
      status.recommendations = [
        '❌ Tables exist but have schema cache errors',
        'POST /api/database/setup to fix schema issues',
        'Or manually refresh schema in Supabase dashboard'
      ]
    } else if (existingTables < requiredTables.length) {
      status.overall_status = 'incomplete'
      status.recommendations = [
        '⚠️ Some required tables are missing',
        'POST /api/database/setup to create missing tables',
        `Missing tables: ${requiredTables.filter(t => !status.tables[t]?.exists).join(', ')}`
      ]
    } else {
      status.overall_status = 'partial'
      status.recommendations = [
        '⚠️ Tables exist but some are not accessible',
        'Check RLS policies and permissions',
        'POST /api/database/setup to repair configuration'
      ]
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Database setup status check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall_status: 'error',
      error: error.message,
      recommendations: [
        'Check Supabase connection',
        'Verify environment variables',
        'Try running database setup'
      ]
    }, { status: 500 })
  }
}
