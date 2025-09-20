import { supabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

/**
 * PropMaster 3.0 - Secure Property Sharing System
 * 
 * Features:
 * - Time-limited secure sharing URLs
 * - Client portal for shared properties
 * - Sharing analytics and tracking
 * - Custom branding for professional presentation
 * - Access control and permissions
 * - View tracking and analytics
 */

export class PropertySharingSystem {
  constructor() {
    this.defaultConfig = {
      defaultExpiryHours: 168, // 7 days
      maxExpiryHours: 720, // 30 days
      trackViews: true,
      requireClientInfo: false,
      allowDownloads: true,
      customBranding: true
    }
  }

  /**
   * Create a secure sharing link for a property
   */
  async createSharingLink(propertyId, options = {}) {
    const {
      expiryHours = this.defaultConfig.defaultExpiryHours,
      clientEmail = null,
      clientName = null,
      allowedViews = null,
      requireClientInfo = this.defaultConfig.requireClientInfo,
      allowDownloads = this.defaultConfig.allowDownloads,
      customMessage = null,
      createdBy
    } = options

    try {
      // Validate property exists and user has access
      const { data: property, error: propError } = await supabaseAdmin
        .from('properties')
        .select('id, name, created_by, status')
        .eq('id', propertyId)
        .single()

      if (propError || !property) {
        throw new Error('Property not found or access denied')
      }

      // Generate secure sharing token
      const shareToken = this.generateSecureToken()
      const shareId = uuidv4()
      
      // Calculate expiry date
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + Math.min(expiryHours, this.defaultConfig.maxExpiryHours))

      // Create sharing record
      const sharingData = {
        id: shareId,
        property_id: propertyId,
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        client_email: clientEmail,
        client_name: clientName,
        allowed_views: allowedViews,
        require_client_info: requireClientInfo,
        allow_downloads: allowDownloads,
        custom_message: customMessage,
        created_by: createdBy,
        is_active: true,
        view_count: 0,
        last_viewed_at: null
      }

      const { data: shareRecord, error: shareError } = await supabaseAdmin
        .from('property_shares')
        .insert([sharingData])
        .select()
        .single()

      if (shareError) {
        throw new Error(`Failed to create sharing link: ${shareError.message}`)
      }

      // Generate the public sharing URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const sharingUrl = `${baseUrl}/share/${shareToken}`

      // Log the sharing creation
      await this.logSharingEvent('SHARE_CREATED', {
        shareId: shareRecord.id,
        propertyId,
        createdBy,
        clientEmail,
        expiresAt: expiresAt.toISOString()
      })

      return {
        success: true,
        shareId: shareRecord.id,
        shareToken,
        sharingUrl,
        expiresAt: expiresAt.toISOString(),
        property: {
          id: property.id,
          name: property.name
        },
        settings: {
          allowedViews,
          requireClientInfo,
          allowDownloads,
          customMessage
        }
      }
    } catch (error) {
      console.error('Failed to create sharing link:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get property data for sharing (public access)
   */
  async getSharedProperty(shareToken, clientInfo = {}) {
    try {
      // Find the sharing record
      const { data: shareRecord, error: shareError } = await supabaseAdmin
        .from('property_shares')
        .select(`
          *,
          properties (
            id,
            name,
            location,
            price,
            description,
            cover_image,
            images,
            documents,
            maps_link,
            status,
            created_at
          )
        `)
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .single()

      if (shareError || !shareRecord) {
        return {
          success: false,
          error: 'Invalid or expired sharing link',
          errorCode: 'INVALID_SHARE_TOKEN'
        }
      }

      // Check if link has expired
      if (new Date() > new Date(shareRecord.expires_at)) {
        // Deactivate expired link
        await supabaseAdmin
          .from('property_shares')
          .update({ is_active: false })
          .eq('id', shareRecord.id)

        return {
          success: false,
          error: 'This sharing link has expired',
          errorCode: 'EXPIRED_LINK'
        }
      }

      // Check view limits
      if (shareRecord.allowed_views && shareRecord.view_count >= shareRecord.allowed_views) {
        return {
          success: false,
          error: 'This sharing link has reached its view limit',
          errorCode: 'VIEW_LIMIT_EXCEEDED'
        }
      }

      // Check if client info is required
      if (shareRecord.require_client_info && (!clientInfo.name || !clientInfo.email)) {
        return {
          success: false,
          error: 'Client information required to view this property',
          errorCode: 'CLIENT_INFO_REQUIRED',
          requiresClientInfo: true
        }
      }

      // Update view count and last viewed
      const updateData = {
        view_count: shareRecord.view_count + 1,
        last_viewed_at: new Date().toISOString()
      }

      // If client info provided, update it
      if (clientInfo.name || clientInfo.email) {
        updateData.actual_client_name = clientInfo.name
        updateData.actual_client_email = clientInfo.email
      }

      await supabaseAdmin
        .from('property_shares')
        .update(updateData)
        .eq('id', shareRecord.id)

      // Log the view
      await this.logSharingEvent('PROPERTY_VIEWED', {
        shareId: shareRecord.id,
        propertyId: shareRecord.property_id,
        clientEmail: clientInfo.email || shareRecord.client_email,
        clientName: clientInfo.name || shareRecord.client_name,
        viewCount: shareRecord.view_count + 1
      })

      // Prepare property data for sharing
      const property = shareRecord.properties
      const sharedPropertyData = {
        id: property.id,
        name: property.name,
        location: property.location,
        price: property.price,
        description: property.description,
        cover_image: property.cover_image,
        images: property.images || [],
        maps_link: property.maps_link,
        status: property.status,
        created_at: property.created_at
      }

      // Include documents only if downloads are allowed
      if (shareRecord.allow_downloads) {
        sharedPropertyData.documents = property.documents || []
      }

      return {
        success: true,
        property: sharedPropertyData,
        shareInfo: {
          id: shareRecord.id,
          expiresAt: shareRecord.expires_at,
          customMessage: shareRecord.custom_message,
          allowDownloads: shareRecord.allow_downloads,
          viewCount: shareRecord.view_count + 1,
          allowedViews: shareRecord.allowed_views,
          clientName: shareRecord.client_name,
          sharedBy: shareRecord.created_by
        }
      }
    } catch (error) {
      console.error('Failed to get shared property:', error)
      return {
        success: false,
        error: 'Failed to load property',
        errorCode: 'SYSTEM_ERROR'
      }
    }
  }

  /**
   * List all sharing links for a property or user
   */
  async listSharingLinks(filters = {}) {
    const {
      propertyId = null,
      createdBy = null,
      isActive = null,
      limit = 50,
      offset = 0
    } = filters

    try {
      let query = supabaseAdmin
        .from('property_shares')
        .select(`
          *,
          properties (
            id,
            name,
            cover_image
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      if (createdBy) {
        query = query.eq('created_by', createdBy)
      }

      if (isActive !== null) {
        query = query.eq('is_active', isActive)
      }

      const { data: shares, error } = await query

      if (error) {
        throw new Error(`Failed to list sharing links: ${error.message}`)
      }

      // Process shares to add status and URLs
      const processedShares = shares.map(share => ({
        ...share,
        sharingUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/share/${share.share_token}`,
        status: this.getShareStatus(share),
        daysUntilExpiry: this.getDaysUntilExpiry(share.expires_at)
      }))

      return {
        success: true,
        shares: processedShares,
        total: shares.length
      }
    } catch (error) {
      console.error('Failed to list sharing links:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update sharing link settings
   */
  async updateSharingLink(shareId, updates = {}) {
    const allowedUpdates = [
      'expires_at',
      'client_email',
      'client_name',
      'allowed_views',
      'require_client_info',
      'allow_downloads',
      'custom_message',
      'is_active'
    ]

    try {
      // Filter updates to only allowed fields
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key]
          return obj
        }, {})

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid updates provided')
      }

      filteredUpdates.updated_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from('property_shares')
        .update(filteredUpdates)
        .eq('id', shareId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update sharing link: ${error.message}`)
      }

      // Log the update
      await this.logSharingEvent('SHARE_UPDATED', {
        shareId,
        updates: filteredUpdates
      })

      return {
        success: true,
        share: data
      }
    } catch (error) {
      console.error('Failed to update sharing link:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Deactivate sharing link
   */
  async deactivateSharingLink(shareId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('property_shares')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq('id', shareId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to deactivate sharing link: ${error.message}`)
      }

      // Log the deactivation
      await this.logSharingEvent('SHARE_DEACTIVATED', {
        shareId
      })

      return {
        success: true,
        message: 'Sharing link deactivated successfully'
      }
    } catch (error) {
      console.error('Failed to deactivate sharing link:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get sharing analytics
   */
  async getSharingAnalytics(filters = {}) {
    const {
      propertyId = null,
      createdBy = null,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate = new Date()
    } = filters

    try {
      let query = supabaseAdmin
        .from('property_shares')
        .select(`
          *,
          properties (
            id,
            name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      if (createdBy) {
        query = query.eq('created_by', createdBy)
      }

      const { data: shares, error } = await query

      if (error) {
        throw new Error(`Failed to get sharing analytics: ${error.message}`)
      }

      // Calculate analytics
      const analytics = {
        summary: {
          totalShares: shares.length,
          activeShares: shares.filter(s => s.is_active && new Date(s.expires_at) > new Date()).length,
          expiredShares: shares.filter(s => new Date(s.expires_at) <= new Date()).length,
          totalViews: shares.reduce((sum, s) => sum + (s.view_count || 0), 0),
          uniqueClients: new Set(shares.filter(s => s.actual_client_email).map(s => s.actual_client_email)).size
        },
        byProperty: {},
        byMonth: {},
        topClients: {},
        viewTrends: []
      }

      // Group by property
      shares.forEach(share => {
        const propertyName = share.properties?.name || 'Unknown Property'
        if (!analytics.byProperty[propertyName]) {
          analytics.byProperty[propertyName] = {
            totalShares: 0,
            totalViews: 0,
            activeShares: 0
          }
        }
        
        analytics.byProperty[propertyName].totalShares++
        analytics.byProperty[propertyName].totalViews += share.view_count || 0
        
        if (share.is_active && new Date(share.expires_at) > new Date()) {
          analytics.byProperty[propertyName].activeShares++
        }
      })

      // Group by month
      shares.forEach(share => {
        const month = new Date(share.created_at).toISOString().substring(0, 7) // YYYY-MM
        if (!analytics.byMonth[month]) {
          analytics.byMonth[month] = {
            shares: 0,
            views: 0
          }
        }
        
        analytics.byMonth[month].shares++
        analytics.byMonth[month].views += share.view_count || 0
      })

      // Top clients
      shares.forEach(share => {
        const clientEmail = share.actual_client_email || share.client_email
        if (clientEmail) {
          if (!analytics.topClients[clientEmail]) {
            analytics.topClients[clientEmail] = {
              name: share.actual_client_name || share.client_name || 'Unknown',
              views: 0,
              properties: new Set()
            }
          }
          
          analytics.topClients[clientEmail].views += share.view_count || 0
          analytics.topClients[clientEmail].properties.add(share.property_id)
        }
      })

      // Convert sets to counts
      Object.keys(analytics.topClients).forEach(email => {
        analytics.topClients[email].propertiesViewed = analytics.topClients[email].properties.size
        delete analytics.topClients[email].properties
      })

      return {
        success: true,
        analytics,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    } catch (error) {
      console.error('Failed to get sharing analytics:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Clean up expired sharing links
   */
  async cleanupExpiredShares() {
    try {
      const { data, error } = await supabaseAdmin
        .from('property_shares')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true)
        .select('id')

      if (error) {
        throw new Error(`Failed to cleanup expired shares: ${error.message}`)
      }

      const cleanedCount = data?.length || 0

      // Log cleanup
      await this.logSharingEvent('SHARES_CLEANUP', {
        cleanedCount
      })

      return {
        success: true,
        cleanedCount
      }
    } catch (error) {
      console.error('Failed to cleanup expired shares:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Helper methods
   */
  generateSecureToken() {
    // Generate a secure, URL-safe token
    return crypto.randomBytes(32).toString('base64url')
  }

  getShareStatus(share) {
    if (!share.is_active) {
      return 'INACTIVE'
    }
    
    if (new Date() > new Date(share.expires_at)) {
      return 'EXPIRED'
    }
    
    if (share.allowed_views && share.view_count >= share.allowed_views) {
      return 'VIEW_LIMIT_REACHED'
    }
    
    return 'ACTIVE'
  }

  getDaysUntilExpiry(expiresAt) {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  async logSharingEvent(eventType, details = {}) {
    try {
      await supabaseAdmin
        .from('property_sharing_log')
        .insert([{
          event_type: eventType,
          details,
          created_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Failed to log sharing event:', error)
    }
  }

  /**
   * Generate sharing email template
   */
  generateSharingEmail(shareData, propertyData) {
    const { sharingUrl, expiresAt, customMessage } = shareData
    const { name: propertyName, location, price } = propertyData
    
    const expiryDate = new Date(expiresAt).toLocaleDateString()
    
    return {
      subject: `Property Viewing: ${propertyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Property Viewing Invitation</h2>
          
          <p>You have been invited to view the following property:</p>
          
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${propertyName}</h3>
            ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            ${price ? `<p><strong>Price:</strong> ₹${price.toLocaleString()}</p>` : ''}
          </div>
          
          ${customMessage ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><em>${customMessage}</em></p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sharingUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Property
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire on ${expiryDate}. 
            <br>
            If you have any questions, please contact us directly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            PropMaster Real Estate Management System
          </p>
        </div>
      `,
      text: `
        Property Viewing Invitation
        
        You have been invited to view: ${propertyName}
        ${location ? `Location: ${location}` : ''}
        ${price ? `Price: ₹${price.toLocaleString()}` : ''}
        
        ${customMessage ? `Message: ${customMessage}` : ''}
        
        View Property: ${sharingUrl}
        
        This link will expire on ${expiryDate}.
      `
    }
  }
}

// Export singleton instance
export const propertySharingSystem = new PropertySharingSystem()
