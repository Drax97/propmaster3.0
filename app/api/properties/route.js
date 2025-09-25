import { NextResponse } from 'next/server'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { getUserRole, ROLES } from '@/lib/permissions'
import { getOptimizedProperties, getUserByEmail } from '@/lib/database/optimized-queries'

export async function GET(request) {
  try {
    console.log('Properties API called - fetching properties (optimized)')

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user info using optimized query
    const userResult = await getUserByEmail(session.user.email)
    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'Could not find user' }, { status: 403 })
    }

    const userId = userResult.data.id
    const userRole = getUserRole(session.user)

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    // Build filters object
    const filters = {}
    if (search) filters.search = search
    if (status) filters.status = status
    if (minPrice) filters.minPrice = minPrice
    if (maxPrice) filters.maxPrice = maxPrice
    if (location) filters.location = location
    if (includeArchived) filters.includeArchived = includeArchived

    // Use optimized query with automatic fallback
    const result = await getOptimizedProperties(filters, {
      userId,
      userRole,
      limit,
      offset,
      useView: false // Disable views temporarily to avoid schema cache issues
    })

    if (result.error) {
      const errorInfo = handleSupabaseError(result.error, 'properties fetch')
      console.error('Database error fetching properties:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type,
        properties: [],
        message: 'Failed to fetch properties from database'
      }, { status: 500 })
    }

    console.log(`Successfully fetched ${result.data.length} properties from database (${result.optimized ? 'optimized' : 'standard'} query)`)

    return NextResponse.json({ 
      properties: result.data || [],
      total: result.count,
      message: `Found ${result.data?.length || 0} properties`,
      source: result.source,
      optimized: result.optimized,
      pagination: {
        limit,
        offset,
        hasMore: result.count > (offset + limit)
      }
    })

  } catch (error) {
    console.error('Properties API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}


export async function POST(request) {
  try {
    console.log('Creating new property')

    // Get the current user's session
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required to create a property' 
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    const body = await request.json()
    const { 
      name, 
      location, 
      price, 
      description, 
      cover_image, 
      images, 
      documents, 
      maps_link, 
      notes, 
      status
    } = body

    if (status === 'private' && userRole !== ROLES.MASTER) {
      return NextResponse.json({ 
        error: 'You do not have permission to create a private property.' 
      }, { status: 403 })
    }

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ 
        error: 'Property name is required' 
      }, { status: 400 })
    }

    // Fetch user ID from Supabase to ensure we have the correct user reference
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'Could not find user information' 
      }, { status: 403 })
    }

    // Prepare property data for database
    const propertyData = {
      name: name.trim(),
      location: location?.trim() || null,
      price: price ? parseFloat(price) : null,
      description: description?.trim() || null,
      cover_image: cover_image || null,
      images: images || [],
      documents: documents || [],
      maps_link: maps_link?.trim() || null,
      notes: notes?.trim() || null,
      status: status || 'available',
      created_by: userData.id // Automatically set to the current user's ID
    }

    // Try to create property in database
    const { data: property, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select(`
        *,
        users:created_by(name, email)
      `)
      .single()

    if (error) {
      const errorInfo = handleSupabaseError(error, 'property creation')
      console.error('Database error creating property:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type,
        message: 'Failed to create property in database'
      }, { status: 500 })
    }

    console.log('New property created in database:', property.id)

    return NextResponse.json({ 
      property,
      message: 'Property created successfully',
      source: 'database'
    }, { status: 201 })

  } catch (error) {
    console.error('Property creation API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}