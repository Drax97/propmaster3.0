import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { propertyId } = params
    console.log('Fetching property:', propertyId)

    // Mock property data based on the property ID
    const mockProperties = {
      'property-1': {
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
      'property-2': {
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
      }
    }

    // Check if it's a dynamically created property ID
    if (propertyId.startsWith('property-1757')) {
      // Return a mock property for newly created properties
      const newProperty = {
        id: propertyId,
        name: 'Test Property',
        location: 'Test Location',
        price: 1000000,
        description: 'This is a test property created through the system.',
        cover_image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        images: JSON.stringify([]),
        documents: JSON.stringify([]),
        maps_link: null,
        notes: 'Test property notes',
        status: 'available',
        created_by: 'master-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        users: { name: 'Master User', email: 'drax976797@gmail.com' }
      }
      
      return NextResponse.json({ property: newProperty })
    }

    const property = mockProperties[propertyId]
    
    if (!property) {
      return NextResponse.json({ 
        error: 'Property not found',
        message: `Property with ID ${propertyId} does not exist`
      }, { status: 404 })
    }

    console.log('Property found:', property.name)
    return NextResponse.json({ property })

  } catch (error) {
    console.error('Get property API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { propertyId } = params
    const body = await request.json()
    
    console.log('Updating property:', propertyId)

    // Mock update - in real implementation, update database
    const updatedProperty = {
      id: propertyId,
      ...body,
      updated_at: new Date().toISOString()
    }

    console.log('Property updated:', propertyId)

    return NextResponse.json({ 
      property: updatedProperty,
      message: 'Property updated successfully'
    })

  } catch (error) {
    console.error('Update property API error:', error)
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

    // Mock deletion - in real implementation, delete from database
    console.log('Property deleted:', propertyId)

    return NextResponse.json({ 
      message: 'Property deleted successfully'
    })

  } catch (error) {
    console.error('Delete property API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}