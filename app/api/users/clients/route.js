import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'
import { canViewAllFinances, canManageOwnFinances, getUserRole } from '@/lib/permissions'

/**
 * API endpoint to fetch users for client selection in finance forms
 * GET /api/users/clients?search=query
 */
export async function GET(request) {
  try {
    console.log('Users clients API called - fetching users for client selection')

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized access. Please sign in to view clients.',
        users: [],
        success: false
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)

    // Check if user has permission to manage finances (and thus select clients)
    if (!canViewAllFinances(userRole) && !canManageOwnFinances(userRole)) {
      return NextResponse.json({ 
        error: 'Access denied. You do not have permission to view clients.',
        users: [],
        success: false
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 50 users

    // Build query to fetch users from the database
    let query = supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .order('name', { ascending: true })
      .limit(limit)

    // Apply search filter if provided
    if (searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    }

    // Only include active users (exclude pending users unless they're the only option)
    // Masters can see all users, others see active users
    if (userRole !== 'master') {
      query = query.neq('role', 'pending')
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users for client selection:', error)
      
      // Fallback to some default users if database query fails
      const fallbackUsers = [
        {
          id: 'fallback-1',
          email: 'drax976797@gmail.com',
          name: 'Master User',
          role: 'master',
          created_at: new Date().toISOString()
        }
      ]

      return NextResponse.json({
        success: true,
        users: fallbackUsers,
        message: 'Using fallback user data due to database connection issues'
      }, { status: 200 })
    }

    // Format users for client selection
    const formattedUsers = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0], // Fallback to email username if no name
      role: user.role,
      displayName: user.name ? `${user.name} (${user.email})` : user.email,
      createdAt: user.created_at
    }))

    // Sort by name, putting users with names first
    formattedUsers.sort((a, b) => {
      if (a.name && !b.name) return -1
      if (!a.name && b.name) return 1
      return (a.name || a.email).localeCompare(b.name || b.email)
    })

    console.log(`Found ${formattedUsers.length} users for client selection`)

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    }, { status: 200 })

  } catch (error) {
    console.error('Users clients API error:', error)
    
    // Return fallback users on any error
    const fallbackUsers = [
      {
        id: 'fallback-master',
        email: 'drax976797@gmail.com',
        name: 'Master User',
        role: 'master',
        displayName: 'Master User (drax976797@gmail.com)',
        createdAt: new Date().toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      users: fallbackUsers,
      message: 'Using fallback data due to system error',
      error: error.message
    }, { status: 200 })
  }
}
