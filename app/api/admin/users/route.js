import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { canManageUsers, getUserRole } from '@/lib/permissions'
import { getUsers } from '@/lib/database/database-utils'

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
    
    // Use enhanced database client with automatic fallback handling
    const result = await getUsers({ 
      retries: 3,
      timeout: 15000 // 15 second timeout
    })

    // Process user permissions
    const users = result.data.map(user => ({
      ...user,
      permissions: typeof user.permissions === 'string' ? 
        JSON.parse(user.permissions) : 
        (user.permissions || [])
    }))

    return NextResponse.json({ 
      users: users,
      total: users.length,
      message: `Found ${users.length} users`,
      data_source: result.source,
      error_details: result.error ? {
        code: result.error.code,
        message: result.error.message
      } : null,
      note: result.source === 'fallback' ? 
        'Using fallback data due to database issues - some functionality may be limited' : 
        'Live data from database'
    })

  } catch (error) {
    console.error('Users API error:', error)
    
    // Even on complete failure, try to provide fallback data
    const fallbackUsers = [
      {
        id: 'real-master-id',
        email: 'drax976797@gmail.com',
        name: 'Master User',
        role: 'master',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: []
      }
    ]
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      users: fallbackUsers,
      total: fallbackUsers.length,
      data_source: 'emergency_fallback',
      note: 'Using emergency fallback data - database connection failed'
    }, { status: 500 })
  }
}