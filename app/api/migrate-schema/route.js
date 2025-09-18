import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    console.log('Starting schema migration for finances table...')
    
    const body = await request.json()
    const { action } = body
    
    if (action === 'add_notes_column') {
      // Attempt to add the notes column to finances table
      console.log('Adding notes column to finances table...')
      
      // First, check if the column already exists
      const { data: columns, error: checkError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'finances')
        .eq('table_schema', 'public')
        .eq('column_name', 'notes')
      
      if (checkError) {
        console.log('Cannot check existing columns:', checkError.message)
      } else if (columns && columns.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Notes column already exists in finances table',
          action: 'no_action_needed'
        })
      }
      
      // Try to add the column using RPC if available
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE finances ADD COLUMN IF NOT EXISTS notes TEXT;'
      })
      
      if (error) {
        console.log('RPC method failed, trying alternative approach...')
        
        // Alternative: Try to insert a test record to see if notes column exists
        const testData = {
          property_id: null, // This will fail but help us detect the column issue
          client_name: 'schema_test',
          amount: 0,
          payment_type: 'test',
          status: 'pending',
          notes: 'schema_test_note'
        }
        
        const { error: testError } = await supabase
          .from('finances')
          .insert([testData])
        
        if (testError && testError.message.includes('notes')) {
          return NextResponse.json({
            success: false,
            error: 'Notes column does not exist in finances table',
            solution: 'manual_migration_needed',
            sql_command: 'ALTER TABLE finances ADD COLUMN notes TEXT;',
            instructions: [
              '1. Go to your Supabase dashboard',
              '2. Navigate to the SQL Editor',
              '3. Run: ALTER TABLE finances ADD COLUMN notes TEXT;',
              '4. Refresh the schema cache'
            ]
          }, { status: 400 })
        }
      } else {
        console.log('Notes column added successfully via RPC')
        return NextResponse.json({
          success: true,
          message: 'Notes column added successfully to finances table',
          action: 'column_added'
        })
      }
    }
    
    if (action === 'check_schema') {
      // Check current schema status
      const schemaStatus = {
        finances_table_exists: false,
        notes_column_exists: false,
        errors: []
      }
      
      try {
        // Test finances table access
        const { data, error } = await supabase
          .from('finances')
          .select('id')
          .limit(1)
        
        if (!error) {
          schemaStatus.finances_table_exists = true
        } else {
          schemaStatus.errors.push(`Finances table error: ${error.message}`)
        }
        
        // Test notes column specifically
        const { data: notesTest, error: notesError } = await supabase
          .from('finances')
          .select('notes')
          .limit(1)
        
        if (!notesError) {
          schemaStatus.notes_column_exists = true
        } else {
          schemaStatus.errors.push(`Notes column error: ${notesError.message}`)
        }
        
      } catch (error) {
        schemaStatus.errors.push(`Schema check error: ${error.message}`)
      }
      
      return NextResponse.json({
        success: true,
        schema_status: schemaStatus,
        recommendations: schemaStatus.notes_column_exists ? 
          ['Schema appears to be up to date'] :
          [
            'Notes column is missing from finances table',
            'Run POST /api/migrate-schema with action: add_notes_column',
            'Or manually add the column in Supabase dashboard'
          ]
      })
    }
    
    return NextResponse.json({
      error: 'Invalid action. Use "check_schema" or "add_notes_column"'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Schema migration API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Schema migration failed',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    // Quick schema status check
    const { data, error } = await supabase
      .from('finances')
      .select('notes')
      .limit(1)
    
    const notesColumnExists = !error || !error.message.includes('notes')
    
    return NextResponse.json({
      finances_table_accessible: true,
      notes_column_exists: notesColumnExists,
      schema_error: error?.message || null,
      recommendations: notesColumnExists ? 
        ['Schema appears to be working correctly'] :
        [
          'Notes column missing from finances table',
          'POST /api/migrate-schema with {"action": "add_notes_column"}',
          'Or add manually: ALTER TABLE finances ADD COLUMN notes TEXT;'
        ]
    })
    
  } catch (error) {
    return NextResponse.json({
      finances_table_accessible: false,
      error: error.message,
      recommendations: [
        'Check Supabase connection',
        'Verify finances table exists',
        'Run database setup if needed'
      ]
    }, { status: 500 })
  }
}
