#!/usr/bin/env node

/**
 * Database Fix Script for PropMaster 3.0
 * 
 * This script attempts to fix all database-related issues including:
 * - Schema cache errors (PGRST205)
 * - Missing tables
 * - Performance optimizations
 * - RLS policy setup
 * 
 * Usage: node scripts/fix-database.js [options]
 * Options:
 *   --force: Force recreation of existing structures
 *   --skip-rls: Skip RLS policy setup
 *   --verbose: Show detailed output
 */

const https = require('https')
const http = require('http')

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const VERBOSE = process.argv.includes('--verbose')
const FORCE = process.argv.includes('--force')
const SKIP_RLS = process.argv.includes('--skip-rls')

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[level] || '📋'
  
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
            data: jsonData,
            headers: res.headers
          })
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
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

async function checkDatabaseHealth() {
  log('Checking current database health...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/health`)
    
    if (response.status === 200) {
      log('Database health check completed', 'success')
      if (VERBOSE) {
        log(`Health status: ${response.data.overallHealth}`)
        log(`Issues found: ${response.data.issues.length}`)
      }
      return response.data
    } else {
      log(`Database health check failed with status ${response.status}`, 'error')
      return null
    }
  } catch (err) {
    log(`Database health check error: ${err.message}`, 'error')
    return null
  }
}

async function fixSchemaCache() {
  log('Attempting to fix schema cache issues...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/fix-schema-cache`, {
      method: 'POST',
      body: {
        force: FORCE,
        method: 'auto'
      }
    })
    
    if (response.status === 200 && response.data.success) {
      log('Schema cache fix completed successfully', 'success')
      return true
    } else {
      log('Schema cache fix completed with issues', 'warning')
      if (VERBOSE && response.data.recommendations) {
        response.data.recommendations.forEach(rec => log(`  ${rec}`, 'debug'))
      }
      return false
    }
  } catch (err) {
    log(`Schema cache fix error: ${err.message}`, 'error')
    return false
  }
}

async function setupDatabase() {
  log('Running comprehensive database setup...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/setup`, {
      method: 'POST',
      body: {
        force: FORCE,
        skipExisting: !FORCE,
        createIndexes: true,
        setupRLS: !SKIP_RLS
      }
    })
    
    if (response.status === 200 && response.data.success) {
      log('Database setup completed successfully', 'success')
      return true
    } else if (response.status === 206) {
      log('Database setup completed with some issues', 'warning')
      if (VERBOSE && response.data.steps) {
        const failedSteps = response.data.steps.filter(step => !step.success)
        failedSteps.forEach(step => {
          log(`  Failed step: ${step.step} - ${step.error}`, 'debug')
        })
      }
      return false
    } else {
      log(`Database setup failed with status ${response.status}`, 'error')
      return false
    }
  } catch (err) {
    log(`Database setup error: ${err.message}`, 'error')
    return false
  }
}

async function verifyFix() {
  log('Verifying database fixes...')
  
  const health = await checkDatabaseHealth()
  if (!health) {
    log('Could not verify database health', 'error')
    return false
  }
  
  const isHealthy = health.overallHealth === 'healthy'
  const hasSchemaErrors = health.issues.some(issue => issue.includes('PGRST205'))
  
  if (isHealthy) {
    log('Database is now healthy and fully functional!', 'success')
    return true
  } else if (!hasSchemaErrors) {
    log('Schema cache issues resolved, but some other issues remain', 'warning')
    return true
  } else {
    log('Schema cache issues persist - manual intervention may be required', 'error')
    return false
  }
}

async function main() {
  log('🚀 Starting PropMaster Database Fix Script')
  log(`Base URL: ${BASE_URL}`)
  log(`Options: ${FORCE ? 'FORCE ' : ''}${SKIP_RLS ? 'SKIP_RLS ' : ''}${VERBOSE ? 'VERBOSE' : ''}`)
  
  // Step 1: Check initial health
  log('\n📊 Step 1: Initial Health Check')
  const initialHealth = await checkDatabaseHealth()
  
  if (initialHealth && initialHealth.overallHealth === 'healthy') {
    log('Database is already healthy - no fixes needed!', 'success')
    process.exit(0)
  }
  
  // Step 2: Fix schema cache
  log('\n🔧 Step 2: Fix Schema Cache')
  const schemaCacheFixed = await fixSchemaCache()
  
  // Step 3: Setup database
  log('\n🏗️ Step 3: Database Setup')
  const databaseSetup = await setupDatabase()
  
  // Step 4: Verify fixes
  log('\n✅ Step 4: Verify Fixes')
  const verified = await verifyFix()
  
  // Final results
  log('\n📋 Fix Summary:')
  log(`  Schema Cache Fix: ${schemaCacheFixed ? '✅ Success' : '❌ Failed'}`)
  log(`  Database Setup: ${databaseSetup ? '✅ Success' : '❌ Failed'}`)
  log(`  Verification: ${verified ? '✅ Success' : '❌ Failed'}`)
  
  if (verified) {
    log('\n🎉 Database fixes completed successfully!')
    log('Your PropMaster application should now work without fallback data.')
    process.exit(0)
  } else {
    log('\n⚠️ Database fixes completed with issues.')
    log('Manual intervention may be required. Check the following:')
    log('  1. Go to your Supabase dashboard')
    log('  2. Navigate to Settings → API → PostgREST Settings')
    log('  3. Click "Restart PostgREST" or "Reload Schema"')
    log('  4. Run this script again to verify')
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
    log(`Script failed: ${err.message}`, 'error')
    process.exit(1)
  })
}
