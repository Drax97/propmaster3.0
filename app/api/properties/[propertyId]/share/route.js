import { NextResponse } from 'next/server'
import { propertySharingSystem } from '@/lib/property-sharing'
import { withAuthenticatedSecurity } from '@/lib/security/security-middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { canManageProperties } from '@/lib/permissions'

/**
 * Property Sharing API
 * 
 * POST /api/properties/[propertyId]/share - Create sharing link
 * GET /api/properties/[propertyId]/share - List sharing links for property
 */

async function createSharingLink(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    const { propertyId } = params

    // Check if user can manage properties
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to share properties' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      expiryHours = 168, // 7 days default
      clientEmail = null,
      clientName = null,
      allowedViews = null,
      requireClientInfo = false,
      allowDownloads = true,
      customMessage = null
    } = body

    console.log(`🔗 Creating sharing link for property ${propertyId} by ${session.user.email}`)

    // Create the sharing link
    const result = await propertySharingSystem.createSharingLink(propertyId, {
      expiryHours,
      clientEmail,
      clientName,
      allowedViews,
      requireClientInfo,
      allowDownloads,
      customMessage,
      createdBy: session.user.email
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Sharing link created successfully',
      sharing_link: {
        id: result.shareId,
        url: result.sharingUrl,
        token: result.shareToken,
        expires_at: result.expiresAt,
        property: result.property,
        settings: result.settings
      },
      email_template: result.property && result.sharingUrl ? 
        propertySharingSystem.generateSharingEmail(
          { 
            sharingUrl: result.sharingUrl, 
            expiresAt: result.expiresAt, 
            customMessage 
          },
          result.property
        ) : null
    })

  } catch (error) {
    console.error('❌ Failed to create sharing link:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create sharing link',
      details: error.message
    }, { status: 500 })
  }
}

async function listSharingLinks(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    const { propertyId } = params

    // Check if user can manage properties
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view sharing links' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('active')
    const limit = parseInt(searchParams.get('limit')) || 20

    console.log(`📋 Listing sharing links for property ${propertyId}`)

    // Get sharing links for this property
    const result = await propertySharingSystem.listSharingLinks({
      propertyId,
      isActive: isActive !== null ? isActive === 'true' : null,
      limit
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      property_id: propertyId,
      sharing_links: result.shares,
      total_count: result.total,
      filters: {
        active: isActive,
        limit
      }
    })

  } catch (error) {
    console.error('❌ Failed to list sharing links:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to list sharing links',
      details: error.message
    }, { status: 500 })
  }
}

export const POST = withAuthenticatedSecurity(createSharingLink, {
  requiredRole: 'editor',
  logAccess: true,
  sensitiveEndpoint: true
})

export const GET = withAuthenticatedSecurity(listSharingLinks, {
  requiredRole: 'editor'
})
