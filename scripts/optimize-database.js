#!/usr/bin/env node

/**
 * Database Optimization Script for PropMaster 3.0
 * 
 * This script optimizes database performance by:
 * - Creating performance indexes
 * - Setting up optimized views
 * - Running query optimizations
 * - Analyzing performance metrics
 * 
 * Usage: node scripts/optimize-database.js [options]
 * Options:
 *   --indexes-only: Only create indexes
 *   --views-only: Only create views
 *   --analyze-only: Only run performance analysis
 *   --force: Force recreation of existing optimizations
 *   --verbose: Show detailed output
 */

const https = require('https')
const http = require('http')

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const VERBOSE = process.argv.includes('--verbose')
const FORCE = process.argv.includes('--force')
const INDEXES_ONLY = process.argv.includes('--indexes-only')
const VIEWS_ONLY = process.argv.includes('--views-only')
const ANALYZE_ONLY = process.argv.includes('--analyze-only')

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: '📊',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[level] || '📊'
  
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

async function checkOptimizationStatus() {
  log('Checking current database optimization status...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/optimize`)
    
    if (response.status === 200) {
      log('Database optimization status check completed', 'success')
      if (VERBOSE) {
        const data = response.data
        log(`Indexes: ${Object.keys(data.indexes || {}).length} checked`)
        log(`Views: ${Object.keys(data.views || {}).length} checked`)
        log(`Performance rating: ${data.performance?.rating || 'unknown'}`)
      }
      return response.data
    } else {
      log(`Database optimization status check failed with status ${response.status}`, 'error')
      return null
    }
  } catch (err) {
    log(`Database optimization status check error: ${err.message}`, 'error')
    return null
  }
}

async function runOptimization() {
  log('Running comprehensive database optimization...')
  
  const optimizationOptions = {
    createIndexes: !VIEWS_ONLY && !ANALYZE_ONLY,
    createViews: !INDEXES_ONLY && !ANALYZE_ONLY,
    optimizeQueries: !INDEXES_ONLY && !VIEWS_ONLY,
    analyzePerformance: true,
    force: FORCE
  }
  
  if (VERBOSE) {
    log(`Optimization options: ${JSON.stringify(optimizationOptions, null, 2)}`, 'debug')
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/optimize`, {
      method: 'POST',
      body: optimizationOptions
    })
    
    if (response.status === 200 && response.data.success) {
      log('Database optimization completed successfully', 'success')
      
      if (VERBOSE && response.data.optimizations) {
        // Show index results
        if (response.data.optimizations.indexes) {
          const indexResults = response.data.optimizations.indexes
          const createdIndexes = Object.values(indexResults).filter(idx => idx.created).length
          const totalIndexes = Object.keys(indexResults).length
          log(`Indexes: ${createdIndexes}/${totalIndexes} created successfully`)
          
          if (VERBOSE) {
            Object.entries(indexResults).forEach(([name, result]) => {
              log(`  ${name}: ${result.created ? '✅' : '❌'} ${result.purpose}`, 'debug')
            })
          }
        }
        
        // Show view results
        if (response.data.optimizations.views) {
          const viewResults = response.data.optimizations.views
          const createdViews = Object.values(viewResults).filter(view => view.created).length
          const totalViews = Object.keys(viewResults).length
          log(`Views: ${createdViews}/${totalViews} created successfully`)
          
          if (VERBOSE) {
            Object.entries(viewResults).forEach(([name, result]) => {
              log(`  ${name}: ${result.created ? '✅' : '❌'} ${result.purpose}`, 'debug')
            })
          }
        }
        
        // Show performance results
        if (response.data.performance) {
          const perf = response.data.performance
          if (perf.overall) {
            log(`Performance: ${perf.overall.average_query_time_ms}ms avg (Grade: ${perf.overall.performance_grade})`)
          }
          
          if (VERBOSE && perf.tests) {
            Object.entries(perf.tests).forEach(([name, test]) => {
              log(`  ${name}: ${test.duration_ms}ms (${test.performance_rating})`, 'debug')
            })
          }
        }
      }
      
      return true
    } else if (response.status === 206) {
      log('Database optimization completed with some issues', 'warning')
      if (VERBOSE && response.data.recommendations) {
        response.data.recommendations.forEach(rec => log(`  ${rec}`, 'debug'))
      }
      return false
    } else {
      log(`Database optimization failed with status ${response.status}`, 'error')
      if (response.data.error) {
        log(`Error: ${response.data.error}`, 'error')
      }
      return false
    }
  } catch (err) {
    log(`Database optimization error: ${err.message}`, 'error')
    return false
  }
}

async function verifyOptimizations() {
  log('Verifying database optimizations...')
  
  const status = await checkOptimizationStatus()
  if (!status) {
    log('Could not verify optimization status', 'error')
    return false
  }
  
  // Check if key optimizations are in place
  const hasIndexes = Object.values(status.indexes || {}).some(idx => idx.exists)
  const hasViews = Object.values(status.views || {}).some(view => view.exists)
  const performanceGood = status.performance?.rating === 'excellent' || status.performance?.rating === 'good'
  
  if (hasIndexes && hasViews && performanceGood) {
    log('Database optimizations verified successfully!', 'success')
    return true
  } else {
    log('Some optimizations may not be working properly', 'warning')
    if (!hasIndexes) log('  - Performance indexes may be missing', 'warning')
    if (!hasViews) log('  - Optimized views may be missing', 'warning')
    if (!performanceGood) log('  - Query performance needs improvement', 'warning')
    return false
  }
}

async function main() {
  log('🚀 Starting PropMaster Database Optimization')
  log(`Base URL: ${BASE_URL}`)
  log(`Options: ${INDEXES_ONLY ? 'INDEXES_ONLY ' : ''}${VIEWS_ONLY ? 'VIEWS_ONLY ' : ''}${ANALYZE_ONLY ? 'ANALYZE_ONLY ' : ''}${FORCE ? 'FORCE ' : ''}${VERBOSE ? 'VERBOSE' : ''}`)
  
  // Step 1: Check initial status
  log('\n📊 Step 1: Initial Status Check')
  const initialStatus = await checkOptimizationStatus()
  
  if (initialStatus && !FORCE) {
    const hasOptimizations = Object.values(initialStatus.indexes || {}).some(idx => idx.exists) &&
                            Object.values(initialStatus.views || {}).some(view => view.exists)
    
    if (hasOptimizations && initialStatus.performance?.rating === 'excellent') {
      log('Database is already fully optimized - no changes needed!', 'success')
      process.exit(0)
    }
  }
  
  // Step 2: Run optimizations
  log('\n⚡ Step 2: Database Optimization')
  const optimizationSuccess = await runOptimization()
  
  // Step 3: Verify optimizations
  log('\n✅ Step 3: Verify Optimizations')
  const verified = await verifyOptimizations()
  
  // Final results
  log('\n📋 Optimization Summary:')
  log(`  Database Optimization: ${optimizationSuccess ? '✅ Success' : '❌ Failed'}`)
  log(`  Verification: ${verified ? '✅ Success' : '❌ Failed'}`)
  
  if (verified) {
    log('\n🎉 Database optimization completed successfully!')
    log('Your PropMaster application should now have:')
    log('  • Faster property searches and listings')
    log('  • Optimized financial calculations')
    log('  • Improved user authentication performance')
    log('  • Enhanced dashboard loading times')
    process.exit(0)
  } else {
    log('\n⚠️ Database optimization completed with issues.')
    log('Some optimizations may require manual intervention:')
    log('  1. Check your Supabase project permissions')
    log('  2. Verify you have admin access to create indexes/views')
    log('  3. Review the optimization API logs for specific errors')
    log('  4. Try running with --force to recreate existing optimizations')
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
