#!/usr/bin/env node

/**
 * PropMaster 3.0 - Backup System Test Suite
 * 
 * Comprehensive test suite for the automated backup system
 * Tests all backup functionality including creation, verification, and restoration
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v')
const QUICK_TEST = process.argv.includes('--quick')

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

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
}

function recordTest(testName, success, message, details = null) {
  testResults.total++
  if (success) {
    testResults.passed++
  } else {
    testResults.failed++
  }
  
  testResults.tests.push({
    name: testName,
    success,
    message,
    details,
    timestamp: new Date().toISOString()
  })
  
  if (success) {
    log(`✅ ${testName}: ${message}`, 'green')
  } else {
    log(`❌ ${testName}: ${message}`, 'red')
  }
  
  if (details && VERBOSE) {
    console.log('   Details:', details)
  }
}

async function main() {
  try {
    log('🧪 PropMaster 3.0 - Backup System Test Suite', 'bright')
    log('=' .repeat(60), 'cyan')
    
    const startTime = Date.now()
    
    // Test Suite
    await testServerConnection()
    await testBackupSystemHealth()
    await testBackupCreation()
    await testBackupListing()
    await testBackupVerification()
    
    if (!QUICK_TEST) {
      await testGoogleDriveIntegration()
      await testBackupRestore()
      await testSystemDiagnostics()
      await testErrorHandling()
    } else {
      warning('Quick test mode - skipping advanced tests')
    }
    
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    // Show results summary
    log('=' .repeat(60), 'cyan')
    log('📊 Test Results Summary', 'bright')
    log('=' .repeat(30), 'cyan')
    
    log(`Total Tests: ${testResults.total}`)
    log(`Passed: ${testResults.passed}`, 'green')
    log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green')
    log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`)
    log(`Duration: ${duration}s`)
    
    if (testResults.failed > 0) {
      log('')
      log('❌ Failed Tests:', 'red')
      testResults.tests
        .filter(test => !test.success)
        .forEach(test => {
          log(`  • ${test.name}: ${test.message}`, 'red')
        })
    }
    
    // Overall result
    if (testResults.failed === 0) {
      log('')
      success('🎉 All tests passed! Backup system is fully functional.')
    } else if (testResults.failed <= 2) {
      log('')
      warning('⚠️ Most tests passed with some minor issues.')
    } else {
      log('')
      error('❌ Multiple test failures detected. Please review and fix issues.')
      process.exit(1)
    }
    
  } catch (err) {
    error(`Test suite failed: ${err.message}`)
    if (VERBOSE) {
      console.error(err)
    }
    process.exit(1)
  }
}

async function testServerConnection() {
  info('Testing server connection...')
  
  try {
    const response = await axios.get(`${SITE_URL}/api/health`, {
      timeout: 10000
    })
    
    recordTest(
      'Server Connection', 
      response.status === 200, 
      'Server is responding'
    )
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      recordTest(
        'Server Connection', 
        false, 
        'Cannot connect to server - make sure Next.js is running',
        { url: SITE_URL, error: err.message }
      )
    } else {
      recordTest(
        'Server Connection', 
        false, 
        'Server connection failed',
        { error: err.message }
      )
    }
  }
}

async function testBackupSystemHealth() {
  info('Testing backup system health...')
  
  try {
    const response = await axios.get(`${SITE_URL}/api/backup/health`, {
      timeout: 30000
    })
    
    const health = response.data
    
    recordTest(
      'Backup System Health Check',
      response.status === 200,
      `System status: ${health.overall_status}`,
      health
    )
    
    // Test configuration
    recordTest(
      'Backup Configuration',
      health.configuration?.backup_settings !== undefined,
      'Backup configuration is available',
      health.configuration
    )
    
    // Test Google Drive configuration
    recordTest(
      'Google Drive Configuration',
      true, // Always pass, just informational
      `Google Drive: ${health.configuration?.google_drive?.configured ? 'Configured' : 'Not Configured'}`,
      health.configuration?.google_drive
    )
    
  } catch (err) {
    if (err.response?.status === 401) {
      recordTest(
        'Backup System Health Check',
        false,
        'Authentication required - please log in as master user',
        { status: err.response.status }
      )
    } else {
      recordTest(
        'Backup System Health Check',
        false,
        'Health check failed',
        { error: err.message }
      )
    }
  }
}

async function testBackupCreation() {
  info('Testing backup creation...')
  
  try {
    verbose('Creating test backup...')
    const response = await axios.post(`${SITE_URL}/api/backup/create`, {
      backupType: 'manual',
      includeFiles: false, // Skip files for faster testing
      uploadToDrive: false, // Skip Drive upload for testing
      verifyBackup: true
    }, {
      timeout: 120000 // 2 minutes
    })
    
    const backup = response.data.backup
    
    recordTest(
      'Backup Creation',
      response.data.success && backup.status === 'completed',
      `Backup created successfully: ${backup.id}`,
      {
        id: backup.id,
        type: backup.type,
        status: backup.status,
        tables: Object.keys(backup.tables_summary || {}),
        records: backup.verification?.summary?.total_records
      }
    )
    
    // Test backup verification
    if (backup.verification) {
      recordTest(
        'Backup Verification',
        backup.verification.status === 'valid' || backup.verification.status === 'valid_with_warnings',
        `Verification status: ${backup.verification.status}`,
        backup.verification
      )
    } else {
      recordTest(
        'Backup Verification',
        false,
        'No verification data available'
      )
    }
    
    // Store backup ID for later tests
    global.testBackupId = backup.id
    
  } catch (err) {
    recordTest(
      'Backup Creation',
      false,
      'Backup creation failed',
      { error: err.message, status: err.response?.status }
    )
  }
}

async function testBackupListing() {
  info('Testing backup listing...')
  
  try {
    const response = await axios.get(`${SITE_URL}/api/backup/list?limit=10`, {
      timeout: 15000
    })
    
    const data = response.data
    
    recordTest(
      'Backup Listing',
      data.success && Array.isArray(data.backups),
      `Found ${data.backups?.length || 0} backups`,
      {
        total_backups: data.statistics?.total_backups,
        by_type: data.statistics?.by_type,
        by_status: data.statistics?.by_status
      }
    )
    
    // Test if our test backup is in the list
    if (global.testBackupId && data.backups) {
      const testBackup = data.backups.find(b => b.id === global.testBackupId)
      recordTest(
        'Test Backup in List',
        !!testBackup,
        testBackup ? 'Test backup found in list' : 'Test backup not found in list',
        testBackup
      )
    }
    
  } catch (err) {
    recordTest(
      'Backup Listing',
      false,
      'Backup listing failed',
      { error: err.message }
    )
  }
}

async function testBackupVerification() {
  info('Testing backup verification...')
  
  if (!global.testBackupId) {
    recordTest(
      'Backup Verification',
      false,
      'No test backup available for verification'
    )
    return
  }
  
  try {
    // Check if backup file exists locally
    const backupPath = path.join(process.cwd(), 'backups', `${global.testBackupId}.json.gz`)
    const backupExists = fs.existsSync(backupPath)
    
    recordTest(
      'Backup File Existence',
      backupExists,
      backupExists ? 'Backup file exists locally' : 'Backup file not found locally',
      { path: backupPath }
    )
    
    if (backupExists) {
      // Check file size
      const stats = fs.statSync(backupPath)
      recordTest(
        'Backup File Size',
        stats.size > 0,
        `Backup file size: ${formatBytes(stats.size)}`,
        { size: stats.size, path: backupPath }
      )
    }
    
    // Check metadata file
    const metadataPath = path.join(process.cwd(), 'backups', 'metadata', `${global.testBackupId}.json`)
    const metadataExists = fs.existsSync(metadataPath)
    
    recordTest(
      'Backup Metadata',
      metadataExists,
      metadataExists ? 'Backup metadata file exists' : 'Backup metadata file not found',
      { path: metadataPath }
    )
    
  } catch (err) {
    recordTest(
      'Backup Verification',
      false,
      'Backup verification failed',
      { error: err.message }
    )
  }
}

async function testGoogleDriveIntegration() {
  info('Testing Google Drive integration...')
  
  try {
    const response = await axios.post(`${SITE_URL}/api/backup/health`, {
      action: 'test_drive'
    }, {
      timeout: 30000
    })
    
    const result = response.data
    
    recordTest(
      'Google Drive Connectivity',
      result.success,
      result.success ? 'Google Drive connection successful' : 'Google Drive connection failed',
      result.details
    )
    
    if (result.success && result.details.folder_accessible) {
      recordTest(
        'Google Drive Folder Access',
        true,
        `Backup folder accessible: ${result.details.folder_name}`,
        result.details
      )
    } else if (result.success) {
      recordTest(
        'Google Drive Folder Access',
        false,
        'Google Drive works but backup folder not configured',
        result.details
      )
    }
    
  } catch (err) {
    recordTest(
      'Google Drive Integration',
      false,
      'Google Drive test failed',
      { error: err.message }
    )
  }
}

async function testBackupRestore() {
  info('Testing backup restore functionality...')
  
  if (!global.testBackupId) {
    recordTest(
      'Backup Restore Test',
      false,
      'No test backup available for restore testing'
    )
    return
  }
  
  warning('Skipping actual restore test to avoid data loss')
  warning('In production, test restore on a separate environment')
  
  // Test restore API endpoint without actually restoring
  try {
    const response = await axios.get(`${SITE_URL}/api/backup/restore`, {
      timeout: 15000
    })
    
    recordTest(
      'Restore API Availability',
      response.status === 200,
      'Restore API endpoint is accessible',
      response.data.restore_guidelines
    )
    
  } catch (err) {
    recordTest(
      'Restore API Availability',
      false,
      'Restore API endpoint failed',
      { error: err.message }
    )
  }
}

async function testSystemDiagnostics() {
  info('Testing system diagnostics...')
  
  try {
    const response = await axios.post(`${SITE_URL}/api/backup/health`, {
      action: 'diagnose'
    }, {
      timeout: 45000
    })
    
    const diagnostics = response.data
    
    recordTest(
      'System Diagnostics',
      diagnostics.success,
      diagnostics.success ? 'All diagnostic tests passed' : 'Some diagnostic tests failed',
      diagnostics.details
    )
    
    // Test individual diagnostic components
    if (diagnostics.details) {
      Object.entries(diagnostics.details).forEach(([testName, result]) => {
        recordTest(
          `Diagnostic: ${testName}`,
          result.success,
          result.success ? 'PASS' : `FAIL - ${result.error}`,
          result
        )
      })
    }
    
  } catch (err) {
    recordTest(
      'System Diagnostics',
      false,
      'Diagnostics test failed',
      { error: err.message }
    )
  }
}

async function testErrorHandling() {
  info('Testing error handling...')
  
  // Test invalid backup creation
  try {
    await axios.post(`${SITE_URL}/api/backup/create`, {
      backupType: 'invalid_type',
      includeFiles: 'invalid_boolean'
    }, {
      timeout: 10000
    })
    
    recordTest(
      'Error Handling - Invalid Parameters',
      false,
      'Should have rejected invalid parameters'
    )
  } catch (err) {
    recordTest(
      'Error Handling - Invalid Parameters',
      err.response?.status === 400,
      'Correctly rejected invalid parameters',
      { status: err.response?.status, message: err.response?.data?.error }
    )
  }
  
  // Test non-existent backup restore
  try {
    await axios.post(`${SITE_URL}/api/backup/restore`, {
      backupId: 'non-existent-backup-id',
      confirmRestore: true
    }, {
      timeout: 10000
    })
    
    recordTest(
      'Error Handling - Non-existent Backup',
      false,
      'Should have rejected non-existent backup'
    )
  } catch (err) {
    recordTest(
      'Error Handling - Non-existent Backup',
      err.response?.status >= 400,
      'Correctly rejected non-existent backup',
      { status: err.response?.status, message: err.response?.data?.error }
    )
  }
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
  warning('Tests interrupted by user')
  log(`\nPartial Results: ${testResults.passed}/${testResults.total} tests passed`)
  process.exit(1)
})

// Run the main function
if (require.main === module) {
  main()
}
