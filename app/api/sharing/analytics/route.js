import { NextResponse } from 'next/server'
import { propertySharingSystem } from '@/lib/property-sharing'
import { withAuthenticatedSecurity } from '@/lib/security/security-middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { canManageProperties } from '@/lib/permissions'

/**
 * Sharing Analytics API
 * 
 * GET /api/sharing/analytics - Get sharing analytics and insights
 * POST /api/sharing/analytics - Cleanup expired shares
 */

async function getSharingAnalytics(request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user can manage properties
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view sharing analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const days = parseInt(searchParams.get('days')) || 30

    // Calculate date range
    const endDateTime = endDate ? new Date(endDate) : new Date()
    const startDateTime = startDate ? new Date(startDate) : new Date(endDateTime.getTime() - days * 24 * 60 * 60 * 1000)

    console.log(`📊 Getting sharing analytics for user: ${session.user.email}`)

    // For editors, only show analytics for their own shares
    const filters = {
      propertyId,
      startDate: startDateTime,
      endDate: endDateTime
    }

    if (session.user.role !== 'master') {
      filters.createdBy = session.user.email
    }

    const result = await propertySharingSystem.getSharingAnalytics(filters)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    // Calculate additional insights
    const insights = generateAnalyticsInsights(result.analytics)

    return NextResponse.json({
      success: true,
      analytics: result.analytics,
      insights,
      date_range: result.dateRange,
      filters: {
        property_id: propertyId,
        days,
        user_role: session.user.role
      }
    })

  } catch (error) {
    console.error('❌ Failed to get sharing analytics:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get sharing analytics',
      details: error.message
    }, { status: 500 })
  }
}

async function cleanupExpiredShares(request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only master users can perform cleanup
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can cleanup expired shares.' },
        { status: 403 }
      )
    }

    console.log(`🧹 Cleaning up expired shares by: ${session.user.email}`)

    const result = await propertySharingSystem.cleanupExpiredShares()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Expired shares cleanup completed',
      cleaned_count: result.cleanedCount,
      cleaned_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to cleanup expired shares:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup expired shares',
      details: error.message
    }, { status: 500 })
  }
}

// Helper function to generate insights from analytics data
function generateAnalyticsInsights(analytics) {
  const insights = {
    performance: {},
    trends: {},
    recommendations: []
  }

  const { summary, byProperty, byMonth, topClients } = analytics

  // Performance insights
  if (summary.totalShares > 0) {
    insights.performance.averageViewsPerShare = Math.round(summary.totalViews / summary.totalShares * 100) / 100
    insights.performance.activeShareRate = Math.round(summary.activeShares / summary.totalShares * 100)
    insights.performance.expirationRate = Math.round(summary.expiredShares / summary.totalShares * 100)
  }

  // Property performance insights
  const propertyPerformance = Object.entries(byProperty)
    .map(([property, data]) => ({
      property,
      ...data,
      avgViewsPerShare: data.totalShares > 0 ? Math.round(data.totalViews / data.totalShares * 100) / 100 : 0
    }))
    .sort((a, b) => b.totalViews - a.totalViews)

  insights.performance.topPerformingProperties = propertyPerformance.slice(0, 5)

  // Client engagement insights
  const clientEngagement = Object.entries(topClients)
    .map(([email, data]) => ({
      email,
      ...data
    }))
    .sort((a, b) => b.views - a.views)

  insights.performance.mostEngagedClients = clientEngagement.slice(0, 10)

  // Trend insights
  const monthlyData = Object.entries(byMonth).sort()
  if (monthlyData.length >= 2) {
    const currentMonth = monthlyData[monthlyData.length - 1]
    const previousMonth = monthlyData[monthlyData.length - 2]
    
    const sharesTrend = currentMonth[1].shares - previousMonth[1].shares
    const viewsTrend = currentMonth[1].views - previousMonth[1].views
    
    insights.trends.sharesChange = sharesTrend
    insights.trends.viewsChange = viewsTrend
    insights.trends.sharesChangePercent = previousMonth[1].shares > 0 ? 
      Math.round((sharesTrend / previousMonth[1].shares) * 100) : 0
    insights.trends.viewsChangePercent = previousMonth[1].views > 0 ? 
      Math.round((viewsTrend / previousMonth[1].views) * 100) : 0
  }

  // Generate recommendations
  if (summary.totalShares === 0) {
    insights.recommendations.push({
      type: 'action',
      priority: 'high',
      message: 'Start sharing properties to engage with potential clients'
    })
  } else {
    // Low engagement recommendation
    if (insights.performance.averageViewsPerShare < 2) {
      insights.recommendations.push({
        type: 'improvement',
        priority: 'medium',
        message: 'Consider improving property descriptions or adding more photos to increase engagement'
      })
    }

    // High expiration rate
    if (insights.performance.expirationRate > 50) {
      insights.recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: 'Many shares are expiring unused. Consider shorter expiry times or more targeted sharing'
      })
    }

    // Active sharing recommendation
    if (insights.performance.activeShareRate > 80) {
      insights.recommendations.push({
        type: 'success',
        priority: 'low',
        message: 'Great! Most of your shares are actively being used'
      })
    }

    // Client follow-up recommendation
    if (summary.uniqueClients > 5) {
      insights.recommendations.push({
        type: 'action',
        priority: 'medium',
        message: 'You have engaged multiple clients - consider following up with the most active ones'
      })
    }
  }

  // Trending insights
  if (insights.trends.sharesChangePercent > 20) {
    insights.recommendations.push({
      type: 'success',
      priority: 'low',
      message: 'Sharing activity is increasing - keep up the momentum!'
    })
  } else if (insights.trends.sharesChangePercent < -20) {
    insights.recommendations.push({
      type: 'warning',
      priority: 'medium',
      message: 'Sharing activity has decreased - consider more active client outreach'
    })
  }

  return insights
}

export const GET = withAuthenticatedSecurity(getSharingAnalytics, {
  requiredRole: 'editor'
})

export const POST = withAuthenticatedSecurity(cleanupExpiredShares, {
  requiredRole: 'master',
  logAccess: true,
  sensitiveEndpoint: true
})
