import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserRole, canAccessArchive } from '@/lib/permissions'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getUserByEmail } from '@/lib/optimized-queries'

export async function GET() {
  try {
    console.log('📊 Fetching archive statistics...')

    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user info
    const userResult = await getUserByEmail(session.user.email)
    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'Could not find user' }, { status: 403 })
    }

    const userRole = getUserRole(session.user)

    // Permission check - archive statistics are master-only
    if (!canAccessArchive(userRole)) {
      return NextResponse.json({ 
        error: 'Archive statistics are restricted to master users only' 
      }, { status: 403 })
    }

    const client = supabaseAdmin || supabase
    const stats = {
      timestamp: new Date().toISOString(),
      overview: {},
      trends: {},
      details: {}
    }

    // Try to use the optimized archive stats view first
    try {
      const { data: viewStats, error: viewError } = await client
        .from('property_archive_stats')
        .select('*')
        .single()

      if (!viewError && viewStats) {
        stats.overview = {
          totalArchived: viewStats.total_archived || 0,
          totalActive: viewStats.total_active || 0,
          archivedLast30Days: viewStats.archived_last_30_days || 0,
          archivedLast7Days: viewStats.archived_last_7_days || 0,
          lastArchivedDate: viewStats.last_archived_date,
          usersWithArchivedProperties: viewStats.users_with_archived_properties || 0
        }
        console.log('✅ Using optimized archive stats view')
      }
    } catch (err) {
      console.warn('Archive stats view not available, calculating manually')
    }

    // If view stats not available, calculate manually
    if (Object.keys(stats.overview).length === 0) {
      console.log('📊 Calculating archive statistics manually...')
      
      // Get all properties with archive information
      const { data: properties, error: propertiesError } = await client
        .from('properties')
        .select('id, status, archived_at, archive_reason, created_by, created_at')

      if (propertiesError) {
        throw new Error(`Failed to fetch properties: ${propertiesError.message}`)
      }

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const archivedProperties = properties.filter(p => p.status === 'archived')
      const activeProperties = properties.filter(p => p.status !== 'archived')

      stats.overview = {
        totalArchived: archivedProperties.length,
        totalActive: activeProperties.length,
        archivedLast30Days: archivedProperties.filter(p => 
          p.archived_at && new Date(p.archived_at) >= thirtyDaysAgo
        ).length,
        archivedLast7Days: archivedProperties.filter(p => 
          p.archived_at && new Date(p.archived_at) >= sevenDaysAgo
        ).length,
        lastArchivedDate: archivedProperties.length > 0 ? 
          Math.max(...archivedProperties.map(p => new Date(p.archived_at || 0).getTime())) : null,
        usersWithArchivedProperties: new Set(archivedProperties.map(p => p.created_by)).size
      }

      // Convert timestamp back to ISO string
      if (stats.overview.lastArchivedDate) {
        stats.overview.lastArchivedDate = new Date(stats.overview.lastArchivedDate).toISOString()
      }
    }

    // Calculate trends and patterns
    try {
      const { data: trendData, error: trendError } = await client
        .from('properties')
        .select('archived_at, archive_reason, status')
        .eq('status', 'archived')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })

      if (!trendError && trendData) {
        // Group by month
        const monthlyArchives = trendData.reduce((acc, property) => {
          const month = new Date(property.archived_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit'
          })
          acc[month] = (acc[month] || 0) + 1
          return acc
        }, {})

        // Group by reason
        const reasonBreakdown = trendData.reduce((acc, property) => {
          const reason = property.archive_reason || 'No reason specified'
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        }, {})

        // Calculate weekly trend (last 8 weeks)
        const weeklyTrend = []
        for (let i = 7; i >= 0; i--) {
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - (i * 7))
          weekStart.setHours(0, 0, 0, 0)
          
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          weekEnd.setHours(23, 59, 59, 999)
          
          const weekCount = trendData.filter(p => {
            const archivedDate = new Date(p.archived_at)
            return archivedDate >= weekStart && archivedDate <= weekEnd
          }).length
          
          weeklyTrend.push({
            week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: weekCount
          })
        }

        stats.trends = {
          monthlyArchives,
          reasonBreakdown,
          weeklyTrend,
          mostCommonReason: Object.entries(reasonBreakdown)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
        }
      }
    } catch (err) {
      console.warn('Could not calculate trends:', err.message)
      stats.trends = { error: 'Trends calculation failed' }
    }

    // Get detailed archive information for recent archives
    try {
      const { data: recentArchives, error: recentError } = await client
        .from('properties')
        .select(`
          id, name, location, archived_at, archive_reason,
          users:created_by(name, email)
        `)
        .eq('status', 'archived')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
        .limit(10)

      if (!recentError && recentArchives) {
        stats.details = {
          recentArchives: recentArchives.map(property => ({
            id: property.id,
            name: property.name,
            location: property.location,
            archivedAt: property.archived_at,
            reason: property.archive_reason,
            archivedBy: property.users?.name || 'Unknown User'
          }))
        }
      }
    } catch (err) {
      console.warn('Could not fetch recent archives:', err.message)
      stats.details = { error: 'Recent archives fetch failed' }
    }

    // Calculate derived metrics
    const totalProperties = stats.overview.totalArchived + stats.overview.totalActive
    stats.overview.archiveRate = totalProperties > 0 ? 
      ((stats.overview.totalArchived / totalProperties) * 100).toFixed(1) : 0

    // Determine archive activity level
    let activityLevel = 'Low'
    if (stats.overview.archivedLast7Days > 5) {
      activityLevel = 'High'
    } else if (stats.overview.archivedLast7Days > 2) {
      activityLevel = 'Medium'
    }
    stats.overview.activityLevel = activityLevel

    console.log(`📊 Archive statistics calculated: ${stats.overview.totalArchived} archived, ${stats.overview.totalActive} active`)

    return NextResponse.json({
      ...stats,
      message: 'Archive statistics retrieved successfully'
    })

  } catch (error) {
    console.error('Archive statistics error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve archive statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // This endpoint can be used to refresh archive statistics
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    if (!canAccessArchive(userRole)) {
      return NextResponse.json({ 
        error: 'Archive statistics are restricted to master users only' 
      }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { action = 'refresh' } = body

    if (action === 'refresh') {
      // Force refresh of archive statistics
      console.log('🔄 Refreshing archive statistics...')
      
      // Re-analyze the database
      const client = supabaseAdmin || supabase
      
      try {
        // Update table statistics for better query planning
        await client.rpc('exec_sql', { 
          sql: 'ANALYZE properties;' 
        })
        
        console.log('✅ Archive statistics refreshed')
        
        // Return fresh statistics
        const refreshResponse = await GET()
        return refreshResponse
        
      } catch (err) {
        console.error('Failed to refresh statistics:', err)
        return NextResponse.json({
          error: 'Failed to refresh statistics',
          details: err.message
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: `Unknown action: ${action}`
    }, { status: 400 })

  } catch (error) {
    console.error('Archive statistics POST error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
