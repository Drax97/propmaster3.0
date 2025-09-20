import { NextResponse } from 'next/server'
import { backupSystem } from '@/lib/backup-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Create a new database backup
 * 
 * POST /api/backup/create
 * Body: {
 *   backupType: 'manual' | 'daily' | 'weekly' | 'monthly',
 *   includeFiles: boolean,
 *   uploadToDrive: boolean,
 *   verifyBackup: boolean
 * }
 */
export async function POST(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only master users can create backups
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can create backups.' },
        { status: 403 }
      )
    }

    console.log('🚀 Backup creation requested by:', session.user.email)

    const body = await request.json().catch(() => ({}))
    const {
      backupType = 'manual',
      includeFiles = true,
      uploadToDrive = true,
      verifyBackup = true
    } = body

    // Validate backup type
    const validBackupTypes = ['manual', 'daily', 'weekly', 'monthly', 'pre_restore_safety']
    if (!validBackupTypes.includes(backupType)) {
      return NextResponse.json(
        { error: `Invalid backup type. Must be one of: ${validBackupTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create the backup
    const backup = await backupSystem.createFullBackup({
      backupType,
      includeFiles,
      uploadToDrive,
      verifyBackup
    })

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        id: backup.id,
        timestamp: backup.timestamp,
        type: backup.type,
        status: backup.status,
        metadata: backup.metadata,
        verification: backup.verification,
        storage: {
          local_available: !!backup.storage.local_path,
          drive_available: !!backup.storage.drive_file_id,
          drive_folder_id: backup.storage.drive_folder_id
        },
        tables_summary: Object.fromEntries(
          Object.entries(backup.tables).map(([name, table]) => [
            name,
            {
              success: table.success,
              record_count: table.record_count,
              error: table.error || null
            }
          ])
        ),
        files_count: backup.files?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Backup creation failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Backup creation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Get backup creation status/progress
 * 
 * GET /api/backup/create
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get backup system health and recent activity
    const health = await backupSystem.getBackupHealth()
    const recentBackups = await backupSystem.listBackups({ limit: 5 })

    return NextResponse.json({
      system_health: health,
      recent_backups: recentBackups.map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        type: backup.type,
        status: backup.status,
        verification_status: backup.verification?.status,
        total_records: backup.verification?.summary?.total_records || 0,
        size: backup.metadata?.compressed_size || 0,
        storage: {
          local_available: !!backup.storage?.local_path,
          drive_available: !!backup.storage?.drive_file_id
        }
      })),
      configuration: {
        google_drive_configured: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
        backup_folder_configured: !!process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID,
        max_backups_per_type: 10,
        compression_enabled: true
      }
    })

  } catch (error) {
    console.error('❌ Failed to get backup status:', error)
    
    return NextResponse.json({
      error: 'Failed to get backup status',
      details: error.message
    }, { status: 500 })
  }
}
