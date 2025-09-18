import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { canManageUsers, getUserRole } from '@/lib/permissions'

// Make this endpoint dynamic to connect to real database
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage users
    if (!canManageUsers(getUserRole(session.user))) {
      return NextResponse.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 })
    }

    console.log('Fetching users from database...')
    
    // Try to fetch users from Supabase database using admin client for full access
    let users = []
    let usedFallback = false
    let errorDetails = null

    try {
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        users = data.map(user => ({
          ...user,
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || [])
        }))
        console.log(`Successfully fetched ${users.length} users from database`)
      } else if (error) {
        console.error('Supabase query error:', error)
        errorDetails = error
        
        if (error.code === 'PGRST205') {
          console.log('Schema cache issue detected - trying to refresh...')
          // Try to refresh schema cache by making a simple query
          await client.from('users').select('id').limit(1)
          
          // Retry the query
          const { data: retryData, error: retryError } = await client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            
          if (!retryError && retryData) {
            users = retryData.map(user => ({
              ...user,
              permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || [])
            }))
            console.log(`Retry successful - fetched ${users.length} users`)
          } else {
            console.log('Retry failed, using fallback data')
            usedFallback = true
            users = getFallbackUsers()
          }
        } else if (error.code === 'PGRST116') {
          console.log('Users table not found - using fallback data')
          usedFallback = true
          users = getFallbackUsers()
        } else {
          throw error
        }
      }
    } catch (queryError) {
      console.error('Database query exception:', queryError)
      usedFallback = true
      users = getFallbackUsers()
      errorDetails = queryError
    }

    return NextResponse.json({ 
      users: users,
      total: users.length,
      message: `Found ${users.length} users`,
      data_source: usedFallback ? 'fallback' : 'database',
      error_details: errorDetails ? {
        code: errorDetails.code,
        message: errorDetails.message
      } : null,
      note: usedFallback ? 'Using fallback data due to database issues' : 'Live data from database'
    })

  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      users: getFallbackUsers(), // Provide fallback even on error
      data_source: 'fallback'
    }, { status: 500 })
  }
}

function getFallbackUsers() {
  return [
    {
      id: 'real-master-id',
      email: 'drax976797@gmail.com',
      name: 'Master User',
      role: 'master',
      status: 'active', 
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      last_login: '2025-01-01T00:00:00.000Z',
      permissions: []
    },
    {
      id: 'real-pending-id',
      email: 'shaurya.barara24@vit.edu',
      name: 'Shaurya',
      role: 'pending',
      status: 'pending',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z', 
      last_login: '2025-01-01T00:00:00.000Z',
      permissions: []
    }
  ]
}