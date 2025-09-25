import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Create users table using direct SQL
    const { error: usersError } = await supabase.from('users').select('id').limit(1)
    
    if (usersError && usersError.code === 'PGRST116') {
      // Table doesn't exist, need to create it manually via Supabase dashboard
      return NextResponse.json({ 
        message: 'Database tables need to be created in Supabase dashboard',
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the SQL Editor',
          '3. Run the provided SQL script to create tables',
          '4. Then restart this setup process'
        ],
        sql_script: `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  role VARCHAR(50) DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create properties table  
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create finances table
CREATE TABLE IF NOT EXISTS finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  client_name VARCHAR(255),
  amount DECIMAL(15,2),
  payment_type VARCHAR(50),
  due_date DATE,
  next_payment_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;  
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finances_updated_at ON finances;
CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON finances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Create policies for properties table (basic - can be refined later)
CREATE POLICY "Authenticated users can view properties" ON properties FOR SELECT TO authenticated;
CREATE POLICY "Authenticated users can create properties" ON properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own properties" ON properties FOR UPDATE TO authenticated USING (created_by::text = auth.uid()::text);

-- Phase 3: Enhanced RLS policies for finances table with role-based access
-- Drop existing basic policies first (if they exist)
DROP POLICY IF EXISTS "Authenticated users can view finances" ON finances;
DROP POLICY IF EXISTS "Authenticated users can create finances" ON finances;
DROP POLICY IF EXISTS "Users can update own finances" ON finances;

-- Create enhanced policies based on user roles
-- Masters can see all financial records
CREATE POLICY "Masters can view all finances" ON finances 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role = 'master'
  )
);

-- Editors can only see their own financial records
CREATE POLICY "Editors can view own finances" ON finances 
FOR SELECT TO authenticated 
USING (
  created_by::text = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role = 'editor'
  )
);

-- Masters and Editors can create financial records
CREATE POLICY "Masters and Editors can create finances" ON finances 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role IN ('master', 'editor')
  )
);

-- Only Masters can update financial records (Phase 3 locking rule)
CREATE POLICY "Only Masters can update finances" ON finances 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role = 'master'
  )
);

-- Only Masters can delete financial records
CREATE POLICY "Only Masters can delete finances" ON finances 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role = 'master'
  )
);
        `
      }, { status: 200 })
    }

    // Check if tables exist and have proper structure
    const { error: propertiesError } = await supabase.from('properties').select('id').limit(1)
    const { error: financesError } = await supabase.from('finances').select('id').limit(1)

    if (usersError || propertiesError || financesError) {
      const missing = []
      if (usersError && usersError.code === 'PGRST116') missing.push('users')
      if (propertiesError && propertiesError.code === 'PGRST116') missing.push('properties') 
      if (financesError && financesError.code === 'PGRST116') missing.push('finances')

      return NextResponse.json({ 
        error: `Missing database tables: ${missing.join(', ')}`,
        message: 'Please create the tables using the Supabase dashboard SQL editor',
        missing_tables: missing
      }, { status: 400 })
    }

    return NextResponse.json({ 
      message: 'Database verification completed successfully - all tables exist',
      tables_verified: ['users', 'properties', 'finances']
    })

  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// Also provide a GET endpoint to check database status
export async function GET() {
  try {
    const tableChecks = {
      users: false,
      properties: false,
      finances: false
    }

    // Check each table exists
    const { error: usersError } = await supabase.from('users').select('id').limit(1)
    const { error: propertiesError } = await supabase.from('properties').select('id').limit(1)
    const { error: financesError } = await supabase.from('finances').select('id').limit(1)

    tableChecks.users = !usersError || usersError.code !== 'PGRST116'
    tableChecks.properties = !propertiesError || propertiesError.code !== 'PGRST116'
    tableChecks.finances = !financesError || financesError.code !== 'PGRST116'

    const allTablesExist = Object.values(tableChecks).every(exists => exists)

    return NextResponse.json({
      database_status: allTablesExist ? 'ready' : 'incomplete',
      tables: tableChecks,
      message: allTablesExist 
        ? 'All database tables are properly configured'
        : 'Some database tables are missing and need to be created'
    })

  } catch (error) {
    console.error('Database check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}