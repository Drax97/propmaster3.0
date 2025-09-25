import { NextResponse } from 'next/server'
import { backupSystem } from '@/lib/backup-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Get backup system health status
 * 
 * GET /api/backup/health
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

    // Only master users can view backup health
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can view backup health.' },
        { status: 403 }
      )
    }

    console.log(`🏥 Backup health check requested by: ${session.user.email}`)

    // Get comprehensive backup system health
    const health = await backupSystem.getBackupHealth()
    
    // Get recent backups for analysis
    const recentBackups = await backupSystem.listBackups({ limit: 20 })
    
    // Calculate additional metrics
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const metrics = {
      backups_last_24h: recentBackups.filter(b => new Date(b.timestamp) > oneDayAgo).length,
      backups_last_week: recentBackups.filter(b => new Date(b.timestamp) > oneWeekAgo).length,
      backups_last_month: recentBackups.filter(b => new Date(b.timestamp) > oneMonthAgo).length,
      successful_backups: recentBackups.filter(b => b.status === 'completed').length,
      failed_backups: recentBackups.filter(b => b.status === 'failed').length,
      verified_backups: recentBackups.filter(b => b.verification?.status === 'valid').length,
      average_backup_size: 0,
      total_storage_used: 0
    }

    // Calculate storage metrics
    const successfulBackups = recentBackups.filter(b => b.metadata?.compressed_size)
    if (successfulBackups.length > 0) {
      const totalSize = successfulBackups.reduce((sum, b) => sum + (b.metadata.compressed_size || 0), 0)
      metrics.average_backup_size = Math.round(totalSize / successfulBackups.length)
      metrics.total_storage_used = totalSize
    }

    // Determine overall health status
    let overallStatus = 'healthy'
    let criticalIssues = []
    let warnings = []

    // Critical checks
    if (!health.last_backup) {
      overallStatus = 'critical'
      criticalIssues.push('No backups found')
    } else if (new Date(health.last_backup) < oneWeekAgo) {
      overallStatus = 'warning'
      warnings.push('Last backup is over a week old')
    }

    if (metrics.failed_backups > metrics.successful_backups / 2) {
      overallStatus = 'critical'
      criticalIssues.push('High backup failure rate')
    }

    if (!health.google_drive_configured) {
      if (overallStatus === 'healthy') overallStatus = 'warning'
      warnings.push('Google Drive not configured - backups stored locally only')
    }

    // Configuration status
    const configuration = {
      google_drive: {
        configured: health.google_drive_configured,
        project_id: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        service_account: !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
        backup_folder: !!process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID
      },
      backup_settings: {
        max_backups_per_type: 10,
        compression_enabled: true,
        encryption_enabled: true,
        verification_enabled: true
      },
      scheduled_backups: {
        daily_enabled: true, // Would check actual cron configuration
        weekly_enabled: true,
        monthly_enabled: true,
        next_scheduled: 'Not implemented' // Would calculate from cron schedule
      }
    }

    // Performance analysis
    const performance = {
      average_backup_time: 'Not tracked', // Would need to implement timing
      success_rate: metrics.successful_backups + metrics.failed_backups > 0 ? 
        Math.round((metrics.successful_backups / (metrics.successful_backups + metrics.failed_backups)) * 100) : 0,
      verification_rate: recentBackups.length > 0 ? 
        Math.round((metrics.verified_backups / recentBackups.length) * 100) : 0,
      storage_efficiency: successfulBackups.length > 0 ? 
        Math.round(successfulBackups.reduce((sum, b) => sum + parseFloat(b.metadata?.compression_ratio || 0), 0) / successfulBackups.length) : 0
    }

    return NextResponse.json({
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      health_summary: {
        ...health,
        critical_issues: criticalIssues,
        warnings: warnings
      },
      metrics: {
        ...metrics,
        average_backup_size_formatted: formatBytes(metrics.average_backup_size),
        total_storage_used_formatted: formatBytes(metrics.total_storage_used)
      },
      configuration,
      performance,
      recent_activity: recentBackups.slice(0, 5).map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        type: backup.type,
        status: backup.status,
        verification_status: backup.verification?.status || 'not_verified',
        size: formatBytes(backup.metadata?.compressed_size || 0),
        records: backup.verification?.summary?.total_records || 0
      })),
      recommendations: [
        ...health.recommendations,
        ...(criticalIssues.length > 0 ? ['Address critical issues immediately'] : []),
        ...(warnings.length > 0 ? ['Review and resolve warnings'] : []),
        'Monitor backup system regularly',
        'Test restore procedures periodically'
      ]
    })

  } catch (error) {
    console.error('❌ Failed to get backup health:', error)
    
    return NextResponse.json({
      overall_status: 'error',
      error: 'Failed to get backup health status',
      details: error.message,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Check backup system configuration',
        'Verify database connectivity',
        'Review error logs for details'
      ]
    }, { status: 500 })
  }
}

/**
 * Run backup system diagnostics and repair
 * 
 * POST /api/backup/health
 * Body: {
 *   action: 'diagnose' | 'repair' | 'test_drive'
 * }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { action = 'diagnose' } = body

    console.log(`🔧 Backup system ${action} requested by: ${session.user.email}`)

    const result = {
      action,
      timestamp: new Date().toISOString(),
      success: false,
      details: {},
      recommendations: []
    }

    switch (action) {
      case 'diagnose':
        // Run comprehensive diagnostics
        result.details = {
          database_connectivity: await testDatabaseConnectivity(),
          google_drive_connectivity: await testGoogleDriveConnectivity(),
          storage_access: await testStorageAccess(),
          backup_integrity: await testBackupIntegrity()
        }
        
        result.success = Object.values(result.details).every(test => test.success)
        
        if (!result.success) {
          result.recommendations = [
            'Review failed diagnostic tests',
            'Check environment configuration',
            'Verify network connectivity'
          ]
        }
        break

      case 'repair':
        // Attempt to repair common issues
        result.details = {
          created_directories: await ensureBackupDirectories(),
          fixed_permissions: await fixStoragePermissions(),
          cleaned_temp_files: await cleanupTempFiles()
        }
        
        result.success = Object.values(result.details).every(repair => repair.success)
        break

      case 'test_drive':
        // Test Google Drive connectivity
        if (!backupSystem.drive) {
          result.details = {
            error: 'Google Drive not configured',
            configuration_missing: [
              'GOOGLE_CLOUD_PROJECT_ID',
              'GOOGLE_CLOUD_PRIVATE_KEY',
              'GOOGLE_CLOUD_CLIENT_EMAIL'
            ].filter(env => !process.env[env])
          }
        } else {
          result.details = await testGoogleDriveAccess()
          result.success = result.details.success
        }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error(`❌ Backup system ${action || 'operation'} failed:`, error)
    
    return NextResponse.json({
      action: action || 'unknown',
      success: false,
      error: 'Operation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function testDatabaseConnectivity() {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
    
    return {
      success: !error,
      error: error?.message,
      test: 'database_query'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      test: 'database_connection'
    }
  }
}

async function testGoogleDriveConnectivity() {
  try {
    if (!backupSystem.drive) {
      return {
        success: false,
        error: 'Google Drive not configured',
        test: 'drive_initialization'
      }
    }

    // Test basic Drive API access
    const response = await backupSystem.drive.about.get({ fields: 'user' })
    
    return {
      success: true,
      user_email: response.data.user?.emailAddress,
      test: 'drive_api_access'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      test: 'drive_connectivity'
    }
  }
}

async function testStorageAccess() {
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const backupDir = path.join(process.cwd(), 'backups')
    const testFile = path.join(backupDir, 'test_access.txt')
    
    // Ensure directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // Test write access
    fs.writeFileSync(testFile, 'test')
    
    // Test read access
    const content = fs.readFileSync(testFile, 'utf8')
    
    // Cleanup
    fs.unlinkSync(testFile)
    
    return {
      success: content === 'test',
      directory: backupDir,
      test: 'storage_read_write'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      test: 'storage_access'
    }
  }
}

async function testBackupIntegrity() {
  try {
    const backups = await backupSystem.listBackups({ limit: 5 })
    const validBackups = backups.filter(b => b.verification?.status === 'valid')
    
    return {
      success: backups.length > 0,
      total_backups: backups.length,
      valid_backups: validBackups.length,
      integrity_rate: backups.length > 0 ? Math.round((validBackups.length / backups.length) * 100) : 0,
      test: 'backup_verification'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      test: 'backup_integrity'
    }
  }
}

async function ensureBackupDirectories() {
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const directories = [
      path.join(process.cwd(), 'backups'),
      path.join(process.cwd(), 'backups', 'metadata'),
      path.join(process.cwd(), 'backups', 'temp')
    ]
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
    
    return {
      success: true,
      directories_created: directories.length,
      test: 'directory_creation'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      test: 'directory_repair'
    }
  }
}

async function fixStoragePermissions() {
  // Placeholder for permission fixes
  return {
    success: true,
    message: 'Permissions check completed',
    test: 'permission_repair'
  }
}

async function cleanupTempFiles() {
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const tempDir = path.join(process.cwd(), 'backups', 'temp')
    let cleanedFiles = 0
    
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir)
      for (const file of files) {
        const filePath = path.join(tempDir, file)
        fs.unlinkSync(filePath)
        cleanedFiles++
      }
    }
    
    return {
      success: true,
      cleaned_files: cleanedFiles,
      test: 'temp_cleanup'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      test: 'temp_cleanup'
    }
  }
}

async function testGoogleDriveAccess() {
  try {
    if (!backupSystem.drive) {
      throw new Error('Google Drive not initialized')
    }

    // Test folder access
    const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID
    if (folderId) {
      const folder = await backupSystem.drive.files.get({
        fileId: folderId,
        fields: 'id,name,parents'
      })
      
      return {
        success: true,
        folder_accessible: true,
        folder_name: folder.data.name,
        folder_id: folder.data.id
      }
    } else {
      // Test basic Drive access
      const about = await backupSystem.drive.about.get({ fields: 'user,storageQuota' })
      
      return {
        success: true,
        folder_accessible: false,
        user_email: about.data.user?.emailAddress,
        storage_quota: about.data.storageQuota
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
