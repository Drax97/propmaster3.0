#!/usr/bin/env node

/**
 * PropMaster 3.0 - Backup System Setup Script
 * 
 * This script sets up the automated backup system with Google Drive integration
 * and configures all necessary components for reliable data protection.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v')
const SKIP_TESTS = process.argv.includes('--skip-tests')
const FORCE = process.argv.includes('--force')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function verbose(message) {
  if (VERBOSE) {
    log(`[VERBOSE] ${message}`, 'cyan')
  }
}

function success(message) {
  log(`✅ ${message}`, 'green')
}

function error(message) {
  log(`❌ ${message}`, 'red')
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue')
}

async function main() {
  try {
    log('🚀 PropMaster 3.0 - Backup System Setup', 'bright')
    log('=' .repeat(50), 'cyan')
    
    // Step 1: Check environment and prerequisites
    info('Step 1: Checking prerequisites...')
    await checkPrerequisites()
    
    // Step 2: Create backup directories
    info('Step 2: Setting up backup directories...')
    await setupDirectories()
    
    // Step 3: Verify Google Drive configuration
    info('Step 3: Verifying Google Drive configuration...')
    await checkGoogleDriveConfig()
    
    // Step 4: Test backup system functionality
    if (!SKIP_TESTS) {
      info('Step 4: Testing backup system...')
      await testBackupSystem()
    } else {
      warning('Step 4: Skipped tests (--skip-tests flag)')
    }
    
    // Step 5: Create initial backup (skip if no auth)
    info('Step 5: Creating initial backup...')
    try {
      await createInitialBackup()
    } catch (err) {
      if (err.message.includes('Authentication required')) {
        warning('Skipping initial backup - authentication required')
        warning('You can create your first backup after logging in as a master user')
      } else {
        throw err
      }
    }
    
    // Step 6: Setup scheduled backups (information only)
    info('Step 6: Backup scheduling information...')
    await showSchedulingInfo()
    
    log('=' .repeat(50), 'cyan')
    success('🎉 Backup system setup completed successfully!')
    
    // Show summary
    await showSetupSummary()
    
  } catch (err) {
    error(`Setup failed: ${err.message}`)
    if (VERBOSE) {
      console.error(err)
    }
    process.exit(1)
  }
}

async function checkPrerequisites() {
  verbose('Checking Node.js version...')
  const nodeVersion = process.version
  log(`Node.js version: ${nodeVersion}`)
  
  verbose('Checking environment variables...')
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    error(`Missing required environment variables: ${missingVars.join(', ')}`)
    throw new Error('Environment configuration incomplete')
  }
  
  success('All required environment variables found')
  
  // Check optional Google Drive variables
  const googleDriveVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_PRIVATE_KEY',
    'GOOGLE_CLOUD_CLIENT_EMAIL',
    'GOOGLE_DRIVE_BACKUP_FOLDER_ID'
  ]
  
  const missingGoogleVars = googleDriveVars.filter(varName => !process.env[varName])
  
  if (missingGoogleVars.length > 0) {
    warning(`Google Drive integration not fully configured. Missing: ${missingGoogleVars.join(', ')}`)
    log('Backups will be stored locally only until Google Drive is configured.')
  } else {
    success('Google Drive configuration found')
  }
}

async function setupDirectories() {
  const directories = [
    'backups',
    'backups/metadata',
    'backups/temp'
  ]
  
  for (const dir of directories) {
    const fullPath = path.join(process.cwd(), dir)
    
    if (!fs.existsSync(fullPath)) {
      verbose(`Creating directory: ${fullPath}`)
      fs.mkdirSync(fullPath, { recursive: true })
      success(`Created directory: ${dir}`)
    } else {
      verbose(`Directory already exists: ${dir}`)
    }
  }
  
  // Create .gitignore for backups directory
  const gitignorePath = path.join(process.cwd(), 'backups', '.gitignore')
  const gitignoreContent = `# Backup files - do not commit to version control
*.json.gz
*.backup
temp/
*.tmp

# Keep metadata for reference
!metadata/
metadata/*.json

# Keep directory structure
!.gitignore
`
  
  if (!fs.existsSync(gitignorePath) || FORCE) {
    fs.writeFileSync(gitignorePath, gitignoreContent)
    success('Created backups/.gitignore')
  }
}

async function checkGoogleDriveConfig() {
  try {
    verbose('Testing Google Drive API connectivity...')
    
    const response = await axios.post(`${SITE_URL}/api/backup/health`, {
      action: 'test_drive'
    }, {
      timeout: 30000
    })
    
    if (response.data.success) {
      success('Google Drive connectivity test passed')
      if (response.data.details.folder_accessible) {
        success(`Backup folder accessible: ${response.data.details.folder_name}`)
      } else {
        warning('Backup folder not configured, but Drive access works')
      }
    } else {
      warning('Google Drive connectivity test failed')
      if (response.data.details.configuration_missing) {
        log(`Missing configuration: ${response.data.details.configuration_missing.join(', ')}`)
      }
    }
  } catch (err) {
    if (err.response?.status === 401) {
      error('Authentication required - make sure your Next.js server is running and you are logged in as a master user')
    } else {
      warning(`Could not test Google Drive connectivity: ${err.message}`)
    }
  }
}

async function testBackupSystem() {
  try {
    verbose('Running backup system health check...')
    
    const response = await axios.get(`${SITE_URL}/api/backup/health`, {
      timeout: 30000
    })
    
    const health = response.data
    log(`Backup system status: ${health.overall_status}`)
    
    if (health.critical_issues && health.critical_issues.length > 0) {
      error('Critical issues found:')
      health.critical_issues.forEach(issue => error(`  - ${issue}`))
    }
    
    if (health.warnings && health.warnings.length > 0) {
      warning('Warnings found:')
      health.warnings.forEach(warn => warning(`  - ${warn}`))
    }
    
    if (health.overall_status === 'healthy') {
      success('Backup system health check passed')
    } else if (health.overall_status === 'warning') {
      warning('Backup system has warnings but is functional')
    } else {
      error('Backup system health check failed')
      throw new Error('System not healthy')
    }
    
    // Test diagnostics
    verbose('Running system diagnostics...')
    
    const diagnostics = await axios.post(`${SITE_URL}/api/backup/health`, {
      action: 'diagnose'
    }, {
      timeout: 30000
    })
    
    if (diagnostics.data.success) {
      success('System diagnostics passed')
    } else {
      warning('Some diagnostic tests failed')
      Object.entries(diagnostics.data.details).forEach(([test, result]) => {
        if (result.success) {
          success(`  ${test}: PASS`)
        } else {
          error(`  ${test}: FAIL - ${result.error}`)
        }
      })
    }
    
  } catch (err) {
    if (err.response?.status === 401) {
      error('Authentication required for testing - please ensure you are logged in as a master user')
      throw new Error('Authentication required')
    } else {
      error(`Backup system test failed: ${err.message}`)
      throw err
    }
  }
}

async function createInitialBackup() {
  try {
    verbose('Creating initial backup...')
    
    const response = await axios.post(`${SITE_URL}/api/backup/create`, {
      backupType: 'manual',
      includeFiles: true,
      uploadToDrive: true,
      verifyBackup: true
    }, {
      timeout: 120000 // 2 minutes timeout for backup creation
    })
    
    if (response.data.success) {
      const backup = response.data.backup
      success(`Initial backup created: ${backup.id}`)
      log(`  - Type: ${backup.type}`)
      log(`  - Status: ${backup.status}`)
      log(`  - Records: ${backup.verification?.summary?.total_records || 'Unknown'}`)
      log(`  - Size: ${formatBytes(backup.metadata?.compressed_size || 0)}`)
      log(`  - Storage: ${backup.storage.local_available ? 'Local' : ''}${backup.storage.local_available && backup.storage.drive_available ? ' + ' : ''}${backup.storage.drive_available ? 'Google Drive' : ''}`)
      
      if (backup.verification?.status === 'valid') {
        success('Backup verification passed')
      } else if (backup.verification?.status === 'valid_with_warnings') {
        warning('Backup verification passed with warnings')
      } else {
        error('Backup verification failed')
      }
    } else {
      error('Initial backup creation failed')
      throw new Error(response.data.details || 'Backup creation failed')
    }
    
  } catch (err) {
    if (err.response?.status === 401) {
      error('Authentication required - please ensure you are logged in as a master user')
      throw new Error('Authentication required')
    } else if (err.code === 'ECONNREFUSED') {
      error('Cannot connect to Next.js server - make sure it is running on the correct port')
      throw new Error('Server connection failed')
    } else {
      error(`Initial backup creation failed: ${err.message}`)
      throw err
    }
  }
}

async function showSchedulingInfo() {
  log('📅 Backup Scheduling Configuration:', 'yellow')
  log('')
  log('The backup system supports automated scheduling with the following recommended schedule:')
  log('  • Daily backups: 2:00 AM (database only)')
  log('  • Weekly backups: Sunday 3:00 AM (database + files)')
  log('  • Monthly backups: 1st day 4:00 AM (full backup with verification)')
  log('')
  log('To enable automated backups, you can:')
  log('1. Set up a cron job to call the backup API endpoints')
  log('2. Use a task scheduler (Windows) or systemd timers (Linux)')
  log('3. Use a cloud-based scheduler (AWS CloudWatch Events, etc.)')
  log('')
  log('Example cron job entries:')
  log('# Daily backup at 2 AM')
  log('0 2 * * * curl -X POST http://localhost:3000/api/backup/create -H "Content-Type: application/json" -d \'{"backupType":"daily","includeFiles":false}\'')
  log('')
  log('# Weekly backup on Sunday at 3 AM')
  log('0 3 * * 0 curl -X POST http://localhost:3000/api/backup/create -H "Content-Type: application/json" -d \'{"backupType":"weekly","includeFiles":true}\'')
  log('')
  log('# Monthly backup on 1st day at 4 AM')
  log('0 4 1 * * curl -X POST http://localhost:3000/api/backup/create -H "Content-Type: application/json" -d \'{"backupType":"monthly","includeFiles":true}\'')
  log('')
  warning('Note: Automated scheduling requires additional setup outside of this script.')
}

async function showSetupSummary() {
  log('')
  log('📋 Setup Summary:', 'bright')
  log('=' .repeat(30), 'cyan')
  
  try {
    // Get current system status
    const healthResponse = await axios.get(`${SITE_URL}/api/backup/health`, {
      timeout: 15000
    })
    
    const health = healthResponse.data
    
    log(`System Status: ${health.overall_status}`, health.overall_status === 'healthy' ? 'green' : 'yellow')
    log(`Google Drive: ${health.configuration.google_drive.configured ? 'Configured' : 'Not Configured'}`, health.configuration.google_drive.configured ? 'green' : 'yellow')
    log(`Last Backup: ${health.health_summary.last_backup ? new Date(health.health_summary.last_backup).toLocaleString() : 'None'}`)
    log(`Total Backups: ${health.health_summary.total_backups}`)
    log(`Storage Used: ${health.metrics.total_storage_used_formatted}`)
    
  } catch (err) {
    warning('Could not retrieve system status for summary')
  }
  
  log('')
  log('🔧 Available Commands:', 'bright')
  log('  • Create backup: POST /api/backup/create')
  log('  • List backups: GET /api/backup/list')
  log('  • System health: GET /api/backup/health')
  log('  • Restore backup: POST /api/backup/restore')
  log('')
  log('📖 Next Steps:', 'bright')
  log('1. Configure Google Drive (if not already done)')
  log('2. Set up automated backup scheduling')
  log('3. Test backup and restore procedures')
  log('4. Monitor backup system regularly')
  log('')
  success('Backup system is ready for use!')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Handle script interruption
process.on('SIGINT', () => {
  log('\n')
  warning('Setup interrupted by user')
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the main function
if (require.main === module) {
  main()
}
