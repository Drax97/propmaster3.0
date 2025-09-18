import { NextResponse } from 'next/server'
<<<<<<< HEAD
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
=======

export async function GET(request) {
  try {
    console.log('Properties API called - fetching properties')

    // Get query parameters for filtering
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')
<<<<<<< HEAD
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('properties')
      .select(`
        *,
        users (
          name,
          email
        )
      `, { count: 'exact' })

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

    query = query.range(offset, offset + limit - 1)

    const { data: properties, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      properties,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
=======

    // For now, return mock property data that demonstrates the system
    // This will be replaced with real database queries once schema cache is stable
    const mockProperties = [
      {
        id: 'property-1',
        name: 'Modern 3BHK Apartment',
        location: 'Bandra West, Mumbai',
        price: 5000000,
        description: 'Spacious 3BHK apartment with modern amenities, sea view, and premium location in Bandra West.',
        cover_image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
        ]),
        documents: JSON.stringify([]),
        maps_link: 'https://maps.google.com/bandra-west-mumbai',
        notes: 'Premium property with excellent connectivity',
        status: 'available',
        created_by: 'master-user-id',
        created_at: '2025-08-15T10:00:00Z',
        updated_at: '2025-09-05T12:00:00Z',
        users: { name: 'Master User', email: 'drax976797@gmail.com' }
      },
      {
        id: 'property-2',
        name: 'Luxury Villa',
        location: 'Juhu, Mumbai',
        price: 12000000,
        description: 'Stunning luxury villa with private garden, swimming pool, and beach access in prime Juhu location.',
        cover_image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
        ]),
        documents: JSON.stringify([]),
        maps_link: 'https://maps.google.com/juhu-mumbai',
        notes: 'Exclusive beachside villa',
        status: 'available',
        created_by: 'master-user-id',
        created_at: '2025-07-20T14:30:00Z',
        updated_at: '2025-09-01T09:15:00Z',
        users: { name: 'Master User', email: 'drax976797@gmail.com' }
      },
      {
        id: 'property-3',
        name: 'Commercial Office Space',
        location: 'BKC, Mumbai',
        price: 8000000,
        description: 'Prime commercial office space in Bandra Kurla Complex with modern infrastructure.',
        cover_image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        images: JSON.stringify([]),
        documents: JSON.stringify([]),
        maps_link: 'https://maps.google.com/bkc-mumbai',
        notes: 'Perfect for corporate offices',
        status: 'sold',
        created_by: 'master-user-id',
        created_at: '2025-06-10T16:45:00Z',
        updated_at: '2025-08-15T11:20:00Z',
        users: { name: 'Master User', email: 'drax976797@gmail.com' }
      }
    ]

    // Apply filters to mock data
    let filteredProperties = mockProperties

    if (search) {
      filteredProperties = filteredProperties.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (status && status !== 'all') {
      filteredProperties = filteredProperties.filter(p => p.status === status)
    }
    
    if (minPrice) {
      filteredProperties = filteredProperties.filter(p => p.price >= parseFloat(minPrice))
    }
    
    if (maxPrice) {
      filteredProperties = filteredProperties.filter(p => p.price <= parseFloat(maxPrice))
    }
    
    if (location) {
      filteredProperties = filteredProperties.filter(p => 
        p.location.toLowerCase().includes(location.toLowerCase())
      )
    }

    console.log(`Returning ${filteredProperties.length} properties (mock data)`)

    return NextResponse.json({ 
      properties: filteredProperties,
      message: `Found ${filteredProperties.length} properties`,
      note: 'Using mock property data - replace with real database queries when schema cache is stable'
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
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
<<<<<<< HEAD
    const body = await request.json()

    // Assuming you have a way to get the current user's ID, e.g., from a session
    // For now, let's hardcode it as 'master-user-id' as in the mock
    const created_by = 'master-user-id';

    const { data, error } = await supabase
      .from('properties')
      .insert([
        { ...body, created_by },
      ])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      property: data[0],
=======
    console.log('Creating new property')

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

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ 
        error: 'Property name is required' 
      }, { status: 400 })
    }

    // Create new property
    const newProperty = {
      id: `property-${Date.now()}`,
      name: name.trim(),
      location: location?.trim() || '',
      price: price ? parseFloat(price) : null,
      description: description?.trim() || '',
      cover_image: cover_image || null,
      images: JSON.stringify(images || []),
      documents: JSON.stringify(documents || []),
      maps_link: maps_link?.trim() || null,
      notes: notes?.trim() || null,
      status: status || 'available',
      created_by: 'master-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      users: { name: 'Master User', email: 'drax976797@gmail.com' }
    }

    console.log('New property created:', newProperty.id)

    return NextResponse.json({ 
      property: newProperty,
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      message: 'Property created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create property API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}