import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Create client_profiles table for Gmail to name mapping
    const { error: profilesError } = await supabase.from('client_profiles').select('id').limit(1)
    
    if (profilesError && profilesError.code === 'PGRST116') {
      // Table doesn't exist, need to create it manually via Supabase dashboard
      return NextResponse.json({ 
        message: 'Gmail integration database tables need to be created in Supabase dashboard',
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the SQL Editor',
          '3. Run the provided SQL script to create Gmail integration tables',
          '4. Then restart this setup process'
        ],
        sql_script: `
-- Create client_profiles table for Gmail to name mapping
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  display_name VARCHAR(255),
  gmail_verified BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_email ON client_profiles(email);
CREATE INDEX IF NOT EXISTS idx_client_profiles_display_name ON client_profiles(display_name);

-- Add client_id field to finances table for user association
ALTER TABLE finances ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES users(id);

-- Create index on client_id for better performance
CREATE INDEX IF NOT EXISTS idx_finances_client_id ON finances(client_id);

-- Create update trigger for client_profiles
DROP TRIGGER IF EXISTS update_client_profiles_updated_at ON client_profiles;
CREATE TRIGGER update_client_profiles_updated_at 
  BEFORE UPDATE ON client_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for client_profiles
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for client_profiles table
CREATE POLICY "Authenticated users can view client profiles" ON client_profiles 
FOR SELECT TO authenticated;

CREATE POLICY "Masters and Editors can create client profiles" ON client_profiles 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role IN ('master', 'editor')
  )
);

CREATE POLICY "Masters and Editors can update client profiles" ON client_profiles 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = auth.uid()::text 
    AND users.role IN ('master', 'editor')
  )
);

-- Only Masters can delete client profiles
CREATE POLICY "Only Masters can delete client profiles" ON client_profiles 
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
    const { data: profilesData, error: profilesCheckError } = await supabase
      .from('client_profiles')
      .select('id, email, full_name')
      .limit(1)

    if (profilesCheckError) {
      console.error('Client profiles table check failed:', profilesCheckError)
      return NextResponse.json({ 
        error: 'Failed to verify client_profiles table structure',
        details: profilesCheckError.message
      }, { status: 500 })
    }

    // Check if client_id column exists in finances table
    const { data: financesData, error: financesCheckError } = await supabase
      .from('finances')
      .select('id, client_id')
      .limit(1)

    if (financesCheckError) {
      console.warn('Client ID column may not exist in finances table:', financesCheckError)
    }

    return NextResponse.json({ 
      message: 'Gmail integration database setup completed successfully',
      tables: {
        client_profiles: 'Ready',
        finances_client_id: financesCheckError ? 'Column may be missing' : 'Ready'
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Gmail integration setup error:', error)
    return NextResponse.json({ 
      error: 'Failed to setup Gmail integration database',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Health check for Gmail integration database
    const healthCheck = {
      timestamp: new Date().toISOString(),
      tables: {
        client_profiles: { exists: false, record_count: 0 },
        finances_client_id: { exists: false }
      },
      status: 'unknown'
    }

    // Check client_profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('client_profiles')
      .select('id')
      .limit(1)

    if (!profilesError) {
      healthCheck.tables.client_profiles.exists = true
      
      // Get record count
      const { count } = await supabase
        .from('client_profiles')
        .select('*', { count: 'exact', head: true })
      
      healthCheck.tables.client_profiles.record_count = count || 0
    }

    // Check finances client_id column
    const { data: financesData, error: financesError } = await supabase
      .from('finances')
      .select('client_id')
      .limit(1)

    healthCheck.tables.finances_client_id.exists = !financesError

    healthCheck.status = (
      healthCheck.tables.client_profiles.exists && 
      healthCheck.tables.finances_client_id.exists
    ) ? 'ready' : 'incomplete'

    return NextResponse.json(healthCheck, { status: 200 })

  } catch (error) {
    console.error('Gmail integration health check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check Gmail integration status',
      details: error.message
    }, { status: 500 })
  }
}
