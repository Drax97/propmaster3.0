import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🗂️ Adding archive fields to properties table...')
    
    const client = supabaseAdmin || supabase
    
    const result = {
      success: false,
      changes: [],
      errors: []
    }

    // Test if archive fields already exist
    try {
      const { data: testData, error: testError } = await client
        .from('properties')
        .select('archived_at, archive_reason')
        .limit(1)
      
      if (testError && testError.message && testError.message.includes('archived_at')) {
        // Fields don't exist, provide SQL instructions
        console.log('Archive fields do not exist, providing SQL instructions')
        
        const sqlInstructions = `
-- Add archive fields to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create index for archived properties
CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties(status, archived_at) WHERE status = 'archived';

-- Create index for archive queries  
CREATE INDEX IF NOT EXISTS idx_properties_archive_status ON properties(status, updated_at DESC) WHERE status IN ('archived', 'available');

-- Update the property status check constraint if it exists
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('available', 'occupied', 'maintenance', 'sold', 'pending', 'private', 'archived'));

-- Create archive statistics view
CREATE OR REPLACE VIEW property_archive_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'archived') as total_archived,
  COUNT(*) FILTER (WHERE status != 'archived') as total_active,
  COUNT(*) FILTER (WHERE status = 'archived' AND archived_at > CURRENT_DATE - INTERVAL '30 days') as archived_last_30_days,
  COUNT(*) FILTER (WHERE status = 'archived' AND archived_at > CURRENT_DATE - INTERVAL '7 days') as archived_last_7_days,
  MAX(archived_at) as last_archived_date,
  COUNT(DISTINCT created_by) FILTER (WHERE status = 'archived') as users_with_archived_properties
FROM properties;
        `
        
        result.sqlInstructions = sqlInstructions.trim()
        result.errors.push({
          operation: 'add_archive_fields',
          error: 'Archive fields need to be added manually via Supabase dashboard SQL editor',
          instructions: [
            '1. Go to your Supabase dashboard',
            '2. Navigate to the SQL Editor',
            '3. Run the provided SQL script',
            '4. Refresh this page to verify setup'
          ]
        })
      } else {
        console.log('✅ Archive fields already exist')
        result.changes.push({
          operation: 'add_archive_fields',
          success: true,
          description: 'Archive fields (archived_at, archive_reason) are available'
        })
      }
    } catch (err) {
      console.error('Exception testing archive fields:', err)
      result.errors.push({
        operation: 'add_archive_fields',
        error: `Could not verify archive fields: ${err.message}`
      })
    }

    // Test the new fields
    try {
      const { data: testData, error: testError } = await client
        .from('properties')
        .select('archived_at, archive_reason')
        .limit(1)
      
      if (testError) {
        console.error('Failed to test archive fields:', testError)
        result.errors.push({
          operation: 'test_archive_fields',
          error: testError.message
        })
      } else {
        console.log('✅ Archive fields test successful')
        result.changes.push({
          operation: 'test_archive_fields',
          success: true,
          description: 'Archive fields are accessible and working'
        })
      }
    } catch (err) {
      console.error('Exception testing archive fields:', err)
      result.errors.push({
        operation: 'test_archive_fields',
        error: err.message
      })
    }

    result.success = result.changes.length > 0 && result.errors.length === 0

    return NextResponse.json({
      ...result,
      message: result.success ? 
        'Archive functionality added successfully' : 
        'Archive functionality added with some issues',
      timestamp: new Date().toISOString()
    }, { status: result.success ? 200 : 206 })

  } catch (error) {
    console.error('❌ Archive fields setup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add archive functionality',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('🔍 Checking archive fields status...')
    
    const client = supabaseAdmin || supabase
    const status = {
      timestamp: new Date().toISOString(),
      archiveFieldsExist: false,
      archiveViewExists: false,
      archiveStats: null,
      recommendations: []
    }

    // Check if archive fields exist
    try {
      const { data, error } = await client
        .from('properties')
        .select('archived_at, archive_reason')
        .limit(1)
      
      status.archiveFieldsExist = !error
      
      if (error && error.message.includes('archived_at')) {
        status.recommendations.push('Archive fields missing - run POST /api/database/add-archive-fields')
      }
    } catch (err) {
      status.recommendations.push('Could not check archive fields - database connection issue')
    }

    // Check if archive view exists
    try {
      const { data, error } = await client
        .from('property_archive_stats')
        .select('*')
        .single()
      
      if (!error && data) {
        status.archiveViewExists = true
        status.archiveStats = data
      }
    } catch (err) {
      status.recommendations.push('Archive statistics view missing')
    }

    // Generate recommendations
    if (status.archiveFieldsExist && status.archiveViewExists) {
      status.recommendations = ['✅ Archive functionality is fully set up and ready to use']
    } else {
      if (!status.archiveFieldsExist) {
        status.recommendations.push('❌ Archive fields missing from properties table')
      }
      if (!status.archiveViewExists) {
        status.recommendations.push('❌ Archive statistics view missing')
      }
      status.recommendations.push('Run POST /api/database/add-archive-fields to set up archive functionality')
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ Archive status check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error.message,
      recommendations: [
        'Check database connection',
        'Verify Supabase permissions',
        'Try running archive setup'
      ]
    }, { status: 500 })
  }
}
