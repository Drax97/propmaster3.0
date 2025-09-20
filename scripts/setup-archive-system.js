#!/usr/bin/env node

/**
 * Archive System Setup Script for PropMaster 3.0
 * 
 * This script sets up the complete archive functionality including:
 * - Database schema updates for archive fields
 * - Performance indexes for archive operations
 * - Archive statistics views
 * - Testing and verification
 * 
 * Usage: node scripts/setup-archive-system.js [options]
 * Options:
 *   --skip-tests: Skip verification tests
 *   --force: Force recreation of existing structures
 *   --verbose: Show detailed output
 */

const https = require('https')
const http = require('http')

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const VERBOSE = process.argv.includes('--verbose')
const FORCE = process.argv.includes('--force')
const SKIP_TESTS = process.argv.includes('--skip-tests')

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: '🗂️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[level] || '🗂️'
  
  console.log(`${prefix} [${timestamp}] ${message}`)
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https')
    const client = isHttps ? https : http
    
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }
    
    const req = client.request(url, requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            status: res.statusCode,
            data: jsonData
          })
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: data
          })
        }
      })
    })
    
    req.on('error', (err) => {
      reject(err)
    })
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function checkArchiveStatus() {
  log('Checking current archive system status...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/add-archive-fields`)
    
    if (response.status === 200) {
      log('Archive status check completed', 'success')
      if (VERBOSE) {
        log(`Archive fields exist: ${response.data.archiveFieldsExist}`)
        log(`Archive view exists: ${response.data.archiveViewExists}`)
      }
      return response.data
    } else {
      log(`Archive status check failed with status ${response.status}`, 'error')
      return null
    }
  } catch (err) {
    log(`Archive status check error: ${err.message}`, 'error')
    return null
  }
}

async function setupArchiveFields() {
  log('Setting up archive database fields...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/add-archive-fields`, {
      method: 'POST'
    })
    
    if (response.status === 200 && response.data.success) {
      log('Archive fields setup completed successfully', 'success')
      
      if (VERBOSE && response.data.changes) {
        response.data.changes.forEach(change => {
          log(`  ${change.operation}: ${change.description}`, 'debug')
        })
      }
      
      return true
    } else if (response.status === 206) {
      log('Archive fields setup completed with some issues', 'warning')
      
      if (VERBOSE && response.data.errors) {
        response.data.errors.forEach(error => {
          log(`  Error in ${error.operation}: ${error.error}`, 'debug')
        })
      }
      
      return false
    } else {
      log(`Archive fields setup failed with status ${response.status}`, 'error')
      if (response.data.error) {
        log(`Error: ${response.data.error}`, 'error')
      }
      return false
    }
  } catch (err) {
    log(`Archive fields setup error: ${err.message}`, 'error')
    return false
  }
}

async function verifyArchiveSystem() {
  log('Verifying archive system functionality...')
  
  const verificationTests = [
    {
      name: 'Archive fields accessibility',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/api/database/add-archive-fields`)
        return response.data?.archiveFieldsExist === true
      }
    },
    {
      name: 'Bulk operations API',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/api/properties/bulk`)
        return response.status === 200
      }
    },
    {
      name: 'Archive statistics API',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/api/properties/archive/stats`)
        return response.status === 200 || response.status === 403 // 403 is OK for auth check
      }
    }
  ]

  let allPassed = true
  
  for (const test of verificationTests) {
    try {
      const result = await test.test()
      
      if (result) {
        log(`  ✅ ${test.name}: Working`, 'success')
      } else {
        log(`  ❌ ${test.name}: Not working`, 'error')
        allPassed = false
      }
    } catch (err) {
      log(`  ❌ ${test.name}: Error - ${err.message}`, 'error')
      allPassed = false
    }
  }

  return allPassed
}

async function runArchiveTests() {
  if (SKIP_TESTS) {
    log('Skipping verification tests as requested')
    return true
  }

  log('Running comprehensive archive system tests...')
  
  try {
    // Run the test suite
    const testScript = require('../test-archive-system.js')
    const testResults = await testScript.runComprehensiveTest()
    
    if (testResults) {
      log('Archive system tests completed successfully', 'success')
      return true
    } else {
      log('Archive system tests completed with issues', 'warning')
      return false
    }
  } catch (err) {
    log(`Archive system tests failed: ${err.message}`, 'error')
    return false
  }
}

async function main() {
  log('🚀 Starting PropMaster Archive System Setup')
  log(`Base URL: ${BASE_URL}`)
  log(`Options: ${FORCE ? 'FORCE ' : ''}${SKIP_TESTS ? 'SKIP_TESTS ' : ''}${VERBOSE ? 'VERBOSE' : ''}`)
  
  // Step 1: Check current status
  log('\n📊 Step 1: Status Check')
  const currentStatus = await checkArchiveStatus()
  
  if (currentStatus && currentStatus.archiveFieldsExist && !FORCE) {
    log('Archive system is already set up!', 'success')
    if (!SKIP_TESTS) {
      log('Running verification tests...')
      const verified = await verifyArchiveSystem()
      if (verified) {
        log('Archive system verified and working correctly', 'success')
        process.exit(0)
      }
    } else {
      process.exit(0)
    }
  }
  
  // Step 2: Setup archive fields
  log('\n🛠️ Step 2: Setup Archive Fields')
  const setupSuccess = await setupArchiveFields()
  
  // Step 3: Verify setup
  log('\n✅ Step 3: Verify Setup')
  const verified = await verifyArchiveSystem()
  
  // Step 4: Run tests (optional)
  let testsPass = true
  if (!SKIP_TESTS) {
    log('\n🧪 Step 4: Run Tests')
    testsPass = await runArchiveTests()
  }
  
  // Final results
  log('\n📋 Setup Summary:')
  log(`  Archive Fields Setup: ${setupSuccess ? '✅ Success' : '❌ Failed'}`)
  log(`  System Verification: ${verified ? '✅ Success' : '❌ Failed'}`)
  if (!SKIP_TESTS) {
    log(`  Test Suite: ${testsPass ? '✅ Success' : '❌ Failed'}`)
  }
  
  if (verified && (SKIP_TESTS || testsPass)) {
    log('\n🎉 Archive system setup completed successfully!')
    log('Your PropMaster application now includes:')
    log('  • Property archiving and restoration')
    log('  • Bulk operations (archive, delete, status updates)')
    log('  • Archive statistics and analytics')
    log('  • Archive management interface')
    log('\nTo use the archive system:')
    log('  1. Navigate to /properties/archive in your app')
    log('  2. Select properties to archive or restore')
    log('  3. Use bulk operations for efficient management')
    process.exit(0)
  } else {
    log('\n⚠️ Archive system setup completed with issues.')
    log('Manual intervention may be required:')
    log('  1. Check your Supabase database permissions')
    log('  2. Verify all API routes are working')
    log('  3. Run tests manually: node test-archive-system.js')
    log('  4. Check server logs for specific errors')
    process.exit(1)
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error')
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error')
  process.exit(1)
})

// Run the script
if (require.main === module) {
  main().catch(err => {
    log(`Setup script failed: ${err.message}`, 'error')
    process.exit(1)
  })
}
