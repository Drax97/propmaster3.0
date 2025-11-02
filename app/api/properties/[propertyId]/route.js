import { NextResponse } from 'next/server'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserRole, ROLES } from '@/lib/permissions'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId } = params
    console.log('Fetching property:', propertyId)

    if (!propertyId) {
      return NextResponse.json({ 
        error: 'Property ID is required' 
      }, { status: 400 })
    }

    // Fetch property from database
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        users:created_by(name, email)
      `)
      .eq('id', propertyId)
      .single()

    if (error) {
      const errorInfo = handleSupabaseError(error, 'property fetch')
      console.error('Database error fetching property:', errorInfo.message)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Property not found',
          message: 'The requested property does not exist'
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type
      }, { status: 500 })
    }

    if (!property) {
      return NextResponse.json({ 
        error: 'Property not found',
        message: 'The requested property does not exist'
      }, { status: 404 })
    }

    // Check for private status
    if (property.status === 'private') {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (userError || !userData) {
        return NextResponse.json({ error: 'Could not find user' }, { status: 403 })
      }

      if (property.created_by !== userData.id) {
        return NextResponse.json({ 
          error: 'Property not found',
          message: 'The requested property does not exist'
        }, { status: 404 }) // Not found to hide existence
      }
    }

    console.log('Property fetched successfully:', property.id)

    return NextResponse.json({ 
      property,
      message: 'Property fetched successfully'
    })

  } catch (error) {
    console.error('Property fetch API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId } = params
    const body = await request.json()
    
    console.log('Updating property:', propertyId)

    if (!propertyId) {
      return NextResponse.json({ 
        error: 'Property ID is required' 
      }, { status: 400 })
    }

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

    const userRole = getUserRole(session.user)
    if (status === 'private' && userRole !== ROLES.MASTER) {
      return NextResponse.json({ 
        error: 'You do not have permission to set a property to private.' 
      }, { status: 403 })
    }

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ 
        error: 'Property name is required' 
      }, { status: 400 })
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      location: location?.trim() || null,
      price: price ? parseFloat(price) : null,
      description: description?.trim() || null,
      cover_image: cover_image || null,
      images: images || [],
      documents: documents || [],
      maps_link: maps_link?.trim() || null,
      notes: notes?.trim() || null,
      status: status || 'available'
    }

    // Update property in database
    const { data: property, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)
      .select(`
        *,
        users:created_by(name, email)
      `)
      .single()

    if (error) {
      const errorInfo = handleSupabaseError(error, 'property update')
      console.error('Database error updating property:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type
      }, { status: 500 })
    }

    console.log('Property updated successfully:', property.id)

    return NextResponse.json({ 
      property,
      message: 'Property updated successfully'
    })

  } catch (error) {
    console.error('Property update API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { propertyId } = params
    console.log('Deleting property:', propertyId)

    if (!propertyId) {
      return NextResponse.json({ 
        error: 'Property ID is required' 
      }, { status: 400 })
    }

    // Delete property from database
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)

    if (error) {
      const errorInfo = handleSupabaseError(error, 'property deletion')
      console.error('Database error deleting property:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type
      }, { status: 500 })
    }

    console.log('Property deleted successfully:', propertyId)

    return NextResponse.json({ 
      message: 'Property deleted successfully'
    })

  } catch (error) {
    console.error('Property delete API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}