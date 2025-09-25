import { NextResponse } from 'next/server'
import { propertySharingSystem } from '@/lib/property-sharing'
import { withPublicSecurity } from '@/lib/security-middleware'

/**
 * Public Property Sharing API
 * 
 * GET /api/share/[shareToken] - Get shared property data (public access)
 * POST /api/share/[shareToken] - Submit client info and get property data
 */

async function getSharedProperty(request, { params }) {
  try {
    const { shareToken } = params
    const { searchParams } = new URL(request.url)
    
    // Get client info from query params (for direct access)
    const clientInfo = {
      name: searchParams.get('name') || '',
      email: searchParams.get('email') || ''
    }

    console.log(`🔗 Accessing shared property with token: ${shareToken.substring(0, 8)}...`)

    // Get the shared property data
    const result = await propertySharingSystem.getSharedProperty(shareToken, clientInfo)

    if (!result.success) {
      const statusCode = result.errorCode === 'INVALID_SHARE_TOKEN' ? 404 :
                         result.errorCode === 'EXPIRED_LINK' ? 410 :
                         result.errorCode === 'VIEW_LIMIT_EXCEEDED' ? 429 :
                         result.errorCode === 'CLIENT_INFO_REQUIRED' ? 422 : 400

      return NextResponse.json({
        success: false,
        error: result.error,
        error_code: result.errorCode,
        requires_client_info: result.requiresClientInfo || false
      }, { status: statusCode })
    }

    // Return the property data with sharing information
    return NextResponse.json({
      success: true,
      property: result.property,
      share_info: {
        id: result.shareInfo.id,
        expires_at: result.shareInfo.expiresAt,
        custom_message: result.shareInfo.customMessage,
        allow_downloads: result.shareInfo.allowDownloads,
        view_count: result.shareInfo.viewCount,
        allowed_views: result.shareInfo.allowedViews,
        client_name: result.shareInfo.clientName
      },
      access_info: {
        token: shareToken,
        accessed_at: new Date().toISOString(),
        client_provided: !!(clientInfo.name || clientInfo.email)
      }
    })

  } catch (error) {
    console.error('❌ Failed to get shared property:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to load shared property',
      error_code: 'SYSTEM_ERROR'
    }, { status: 500 })
  }
}

async function submitClientInfo(request, { params }) {
  try {
    const { shareToken } = params
    const body = await request.json().catch(() => ({}))
    
    const { name, email, phone } = body

    // Validate required client information
    if (!name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Name and email are required',
        error_code: 'MISSING_CLIENT_INFO'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format',
        error_code: 'INVALID_EMAIL'
      }, { status: 400 })
    }

    console.log(`👤 Client info submitted for token: ${shareToken.substring(0, 8)}... by ${email}`)

    // Get the shared property data with client info
    const result = await propertySharingSystem.getSharedProperty(shareToken, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim()
    })

    if (!result.success) {
      const statusCode = result.errorCode === 'INVALID_SHARE_TOKEN' ? 404 :
                         result.errorCode === 'EXPIRED_LINK' ? 410 :
                         result.errorCode === 'VIEW_LIMIT_EXCEEDED' ? 429 : 400

      return NextResponse.json({
        success: false,
        error: result.error,
        error_code: result.errorCode
      }, { status: statusCode })
    }

    return NextResponse.json({
      success: true,
      message: 'Access granted successfully',
      property: result.property,
      share_info: {
        id: result.shareInfo.id,
        expires_at: result.shareInfo.expiresAt,
        custom_message: result.shareInfo.customMessage,
        allow_downloads: result.shareInfo.allowDownloads,
        view_count: result.shareInfo.viewCount,
        allowed_views: result.shareInfo.allowedViews
      },
      client_info: {
        name,
        email,
        access_granted_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Failed to submit client info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process client information',
      error_code: 'SYSTEM_ERROR'
    }, { status: 500 })
  }
}

export const GET = withPublicSecurity(getSharedProperty, {
  rateLimitOptions: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  validateInput: false // No JSON body for GET requests
})

export const POST = withPublicSecurity(submitClientInfo, {
  rateLimitOptions: { maxRequests: 10, windowMs: 60000 }, // 10 submissions per minute
  validateInput: true
})
