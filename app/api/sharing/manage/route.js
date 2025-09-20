import { NextResponse } from 'next/server'
import { propertySharingSystem } from '@/lib/property-sharing'
import { withAuthenticatedSecurity } from '@/lib/security-middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { canManageProperties } from '@/lib/permissions'

/**
 * Sharing Management API
 * 
 * GET /api/sharing/manage - List all sharing links for user
 * PUT /api/sharing/manage - Update sharing link
 * DELETE /api/sharing/manage - Deactivate sharing link
 */

async function listAllSharingLinks(request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user can manage properties
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage sharing links' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('active')
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    console.log(`📋 Listing all sharing links for user: ${session.user.email}`)

    // For master users, show all links; for editors, show only their own
    const filters = {
      isActive: isActive !== null ? isActive === 'true' : null,
      limit,
      offset
    }

    // Editors can only see their own sharing links
    if (session.user.role !== 'master') {
      filters.createdBy = session.user.email
    }

    const result = await propertySharingSystem.listSharingLinks(filters)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sharing_links: result.shares,
      total_count: result.total,
      pagination: {
        limit,
        offset,
        has_more: result.shares.length === limit
      },
      filters: {
        active: isActive,
        user_role: session.user.role
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

async function updateSharingLink(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage sharing links' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { shareId, updates } = body

    if (!shareId) {
      return NextResponse.json({
        success: false,
        error: 'Share ID is required'
      }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Updates are required'
      }, { status: 400 })
    }

    console.log(`🔧 Updating sharing link ${shareId} by ${session.user.email}`)

    // Update the sharing link
    const result = await propertySharingSystem.updateSharingLink(shareId, updates)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Sharing link updated successfully',
      sharing_link: result.share,
      updated_fields: Object.keys(updates)
    })

  } catch (error) {
    console.error('❌ Failed to update sharing link:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update sharing link',
      details: error.message
    }, { status: 500 })
  }
}

async function deactivateSharingLink(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage sharing links' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { shareId } = body

    if (!shareId) {
      return NextResponse.json({
        success: false,
        error: 'Share ID is required'
      }, { status: 400 })
    }

    console.log(`🗑️ Deactivating sharing link ${shareId} by ${session.user.email}`)

    // Deactivate the sharing link
    const result = await propertySharingSystem.deactivateSharingLink(shareId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      share_id: shareId,
      deactivated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to deactivate sharing link:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to deactivate sharing link',
      details: error.message
    }, { status: 500 })
  }
}

export const GET = withAuthenticatedSecurity(listAllSharingLinks, {
  requiredRole: 'editor'
})

export const PUT = withAuthenticatedSecurity(updateSharingLink, {
  requiredRole: 'editor',
  logAccess: true
})

export const DELETE = withAuthenticatedSecurity(deactivateSharingLink, {
  requiredRole: 'editor',
  logAccess: true
})
