import { NextResponse } from 'next/server'
import { backupSystem } from '@/lib/backup-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * List all available backups
 * 
 * GET /api/backup/list?type=daily&limit=20
 */
export async function GET(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only master users can view backups
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can view backups.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const backupType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit')) || 50

    console.log(`📋 Listing backups requested by: ${session.user.email}`)

    // Get backups list
    const backups = await backupSystem.listBackups({ 
      backupType, 
      limit 
    })

    // Format backup information for API response
    const formattedBackups = backups.map(backup => ({
      id: backup.id,
      timestamp: backup.timestamp,
      type: backup.type,
      status: backup.status,
      completed_at: backup.completed_at,
      metadata: {
        version: backup.metadata?.version,
        total_size: backup.metadata?.total_size || 0,
        compressed_size: backup.metadata?.compressed_size || 0,
        compression_ratio: backup.metadata?.compression_ratio
      },
      verification: backup.verification ? {
        status: backup.verification.status,
        timestamp: backup.verification.timestamp,
        summary: backup.verification.summary,
        issues_count: backup.verification.issues?.length || 0
      } : null,
      storage: {
        local_available: !!backup.storage?.local_path,
        drive_available: !!backup.storage?.drive_file_id,
        drive_folder_id: backup.storage?.drive_folder_id
      },
      tables_summary: Object.fromEntries(
        Object.entries(backup.tables || {}).map(([name, table]) => [
          name,
          {
            success: table.success,
            record_count: table.record_count,
            has_data: table.data && table.data !== '[DATA_REMOVED]',
            error: table.error || null
          }
        ])
      ),
      files_count: backup.files?.length || 0,
      error: backup.error
    }))

    // Get backup statistics
    const stats = {
      total_backups: formattedBackups.length,
      by_type: {},
      by_status: {},
      total_size: 0,
      latest_backup: formattedBackups[0]?.timestamp || null
    }

    formattedBackups.forEach(backup => {
      // Count by type
      stats.by_type[backup.type] = (stats.by_type[backup.type] || 0) + 1
      
      // Count by status
      stats.by_status[backup.status] = (stats.by_status[backup.status] || 0) + 1
      
      // Sum total size
      stats.total_size += backup.metadata.compressed_size || 0
    })

    return NextResponse.json({
      success: true,
      backups: formattedBackups,
      statistics: stats,
      filters: {
        type: backupType,
        limit: limit
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to list backups:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to list backups',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
