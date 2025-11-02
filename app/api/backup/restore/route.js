import { NextResponse } from 'next/server'
import { backupSystem } from '@/lib/backup-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Restore database from backup
 * 
 * POST /api/backup/restore
 * Body: {
 *   backupId: string,
 *   tables?: string[], // Optional: specific tables to restore
 *   confirmRestore: boolean, // Required: explicit confirmation
 *   createSafetyBackup?: boolean // Optional: create backup before restore
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

    // Only master users can restore backups
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can restore backups.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      backupId,
      tables = null,
      confirmRestore = false,
      createSafetyBackup = true
    } = body

    // Validate required parameters
    if (!backupId) {
      return NextResponse.json(
        { error: 'Missing required parameter: backupId' },
        { status: 400 }
      )
    }

    if (!confirmRestore) {
      return NextResponse.json(
        { 
          error: 'Restore operation requires explicit confirmation',
          message: 'Set confirmRestore: true to proceed with restore',
          warning: 'This operation will replace existing data with backup data'
        },
        { status: 400 }
      )
    }

    console.log(`🔄 Database restore requested by: ${session.user.email}`)
    console.log(`📦 Backup ID: ${backupId}`)
    console.log(`📋 Tables: ${tables ? tables.join(', ') : 'all tables'}`)

    // Perform the restore
    const restoreResult = await backupSystem.restoreFromBackup(backupId, {
      tables,
      confirmRestore: true,
      createBackupBeforeRestore: createSafetyBackup
    })

    // Log the restore operation
    console.log(`✅ Restore completed: ${restoreResult.restored_tables}/${restoreResult.total_tables} tables`)

    return NextResponse.json({
      success: restoreResult.success,
      message: restoreResult.success ? 
        'Database restored successfully' : 
        'Database restore completed with some failures',
      restore_summary: {
        backup_id: restoreResult.backup_id,
        restored_tables: restoreResult.restored_tables,
        total_tables: restoreResult.total_tables,
        success_rate: `${Math.round((restoreResult.restored_tables / restoreResult.total_tables) * 100)}%`,
        restored_at: restoreResult.restored_at
      },
      table_results: Object.fromEntries(
        Object.entries(restoreResult.results).map(([tableName, result]) => [
          tableName,
          {
            success: result.success,
            records_restored: result.records_restored || 0,
            total_records: result.total_records || 0,
            error: result.error || null
          }
        ])
      ),
      warnings: restoreResult.success ? [] : [
        'Some tables failed to restore completely',
        'Check individual table results for details',
        'Consider running a manual data verification'
      ]
    })

  } catch (error) {
    console.error('❌ Database restore failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Database restore failed',
      details: error.message,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Verify the backup ID exists and is accessible',
        'Check database connectivity and permissions',
        'Review backup integrity before attempting restore',
        'Contact system administrator if issues persist'
      ]
    }, { status: 500 })
  }
}

/**
 * Get restore operation status and history
 * 
 * GET /api/backup/restore
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

    // Get recent restore operations from backup metadata
    const backups = await backupSystem.listBackups({ limit: 100 })
    const safetyBackups = backups.filter(b => b.type === 'pre_restore_safety')
    
    // Get system health to show current database state
    const health = await backupSystem.getBackupHealth()

    return NextResponse.json({
      system_status: {
        database_healthy: health.status === 'healthy',
        last_backup: health.last_backup,
        total_backups: health.total_backups,
        google_drive_configured: health.google_drive_configured
      },
      recent_safety_backups: safetyBackups.slice(0, 10).map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        status: backup.status,
        verification_status: backup.verification?.status,
        total_records: backup.verification?.summary?.total_records || 0
      })),
      restore_guidelines: {
        requirements: [
          'Master user privileges required',
          'Explicit confirmation (confirmRestore: true) required',
          'Safety backup created automatically before restore'
        ],
        recommendations: [
          'Test restore operations on non-production data first',
          'Verify backup integrity before restoring',
          'Monitor application functionality after restore',
          'Keep safety backups for rollback if needed'
        ],
        supported_tables: ['users', 'properties', 'finances', 'client_profiles']
      }
    })

  } catch (error) {
    console.error('❌ Failed to get restore status:', error)
    
    return NextResponse.json({
      error: 'Failed to get restore status',
      details: error.message
    }, { status: 500 })
  }
}
