import { NextResponse } from 'next/server'
import { supabase, USER_ROLES, USER_STATUS, MASTER_EMAIL, createOrUpdateUser, handleSupabaseError } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { email, name, image } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('Checking user:', email)

    // Try direct approach first - if schema cache is working now
    let existingUser = null
    let userExists = false

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (!error && data) {
        existingUser = data
        userExists = true
        console.log('User found in database:', email)
      } else if (error && error.code === 'PGRST205') {
        console.log('Schema cache issue - will create user anyway')
        // Continue with creation since we can't check
      } else if (error) {
        console.log('Other database error:', error.message)
      }
    } catch (queryError) {
      console.log('Query error, continuing with creation:', queryError.message)
    }

    if (!userExists) {
      // Create new user
      const isMaster = email === MASTER_EMAIL
      const userRole = isMaster ? USER_ROLES.MASTER : USER_ROLES.PENDING
      const userStatus = isMaster ? USER_STATUS.ACTIVE : USER_STATUS.PENDING

      const userData = {
        id: crypto.randomUUID(),
        email,
        name,
        image,
        role: userRole,
        status: userStatus,
        permissions: JSON.stringify([]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      }

      // Use the enhanced utility function for user creation
      const result = await createOrUpdateUser(userData)

      if (result.success) {
        console.log('User created successfully in database:', email)
        return NextResponse.json({ 
          message: 'User created successfully',
          user: result.data,
          source: 'database'
        })
      } else {
        const errorInfo = result.error
        console.log('Database operation failed:', errorInfo.message)
        
        // Handle specific error types with appropriate fallbacks
        if (errorInfo.type === 'SCHEMA_CACHE_ERROR') {
          console.log('Schema cache issue during insert - user data prepared')
          return NextResponse.json({ 
            message: 'User prepared (schema cache issue)',
            user: userData,
            source: 'fallback',
            note: 'Authentication will proceed with fallback data'
          })
        } else if (errorInfo.type === 'TABLE_NOT_FOUND') {
          console.log('Users table not found - database setup required')
          return NextResponse.json({ 
            message: 'User prepared (table not found)',
            user: userData,
            source: 'fallback',
            note: 'Database tables need to be created'
          })
        } else {
          console.error('Database insert error:', errorInfo.originalError)
          return NextResponse.json({ 
            message: 'User prepared (database error)',
            user: userData,
            source: 'fallback',
            note: errorInfo.message
          })
        }
      }

    } else {
      // Update last login for existing user
      try {
        await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
      } catch (updateErr) {
        console.log('Update error (non-critical):', updateErr.message)
      }

      console.log('Existing user login updated:', email)
      return NextResponse.json({ 
        message: 'User login updated',
        user: existingUser
      })
    }

  } catch (error) {
    console.error('Check user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}