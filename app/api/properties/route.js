import { NextResponse } from 'next/server'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { getUserRole, ROLES } from '@/lib/permissions'

export async function GET(request) {
  try {
    console.log('Properties API called - fetching properties')

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's ID from 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Could not find user' }, { status: 403 })
    }
    const userId = userData.id;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')

    // Build Supabase query
    let query = supabase
      .from('properties')
      .select(`
        *,
        users:created_by(name, email)
      `)
      .order('updated_at', { ascending: false })

    // Filter for private properties - only visible to creator
    query = query.or(`status.neq.private,created_by.eq.${userId}`)

    // Role-based filtering for editors
    const userRole = getUserRole(session.user)
    if (userRole === ROLES.EDITOR) {
      query = query.or(`created_by.eq.${userId},status.eq.available,status.eq.pending`)
    }

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice))
    }

    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice))
    }

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    // Execute query
    const { data: properties, error } = await query

    if (error) {
      const errorInfo = handleSupabaseError(error, 'properties fetch')
      console.error('Database error fetching properties:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type,
        properties: [],
        message: 'Failed to fetch properties from database'
      }, { status: 500 })
    }

    console.log(`Successfully fetched ${properties.length} properties from database`)

    return NextResponse.json({ 
      properties: properties || [],
      message: `Found ${properties?.length || 0} properties`,
      source: 'database'
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