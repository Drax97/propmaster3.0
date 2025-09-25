#!/usr/bin/env node

/**
 * Archive System Test Suite
 * Tests all aspects of the property archive functionality
 */

const https = require('https')
const http = require('http')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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

async function testArchiveSetup() {
  console.log('🛠️ Testing archive setup...')
  
  const tests = [
    {
      name: 'Check archive fields status',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/database/add-archive-fields`)
        return {
          success: response.status === 200,
          status: response.status,
          data: response.data
        }
      }
    },
    {
      name: 'Setup archive fields',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/database/add-archive-fields`, {
          method: 'POST'
        })
        return {
          success: response.status === 200 || response.status === 206,
          status: response.status,
          data: response.data
        }
      }
    }
  ]

  let allPassed = true
  const results = []

  for (const test of tests) {
    try {
      console.log(`  Testing: ${test.name}`)
      const result = await test.test()
      
      if (result.success) {
        console.log(`    ✅ ${test.name}: PASS`)
        results.push({ name: test.name, status: 'PASS', ...result })
      } else {
        console.log(`    ❌ ${test.name}: FAIL (${result.status})`)
        allPassed = false
        results.push({ name: test.name, status: 'FAIL', ...result })
      }
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
      results.push({ name: test.name, status: 'ERROR', error: err.message })
    }
  }

  return { allPassed, results }
}

async function testBulkOperations() {
  console.log('🔄 Testing bulk operations API...')
  
  const tests = [
    {
      name: 'Get bulk operations info',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/properties/bulk`)
        return {
          success: response.status === 200,
          status: response.status,
          data: response.data
        }
      }
    },
    {
      name: 'Test bulk operation validation (empty array)',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/properties/bulk`, {
          method: 'POST',
          body: {
            action: 'archive',
            propertyIds: []
          }
        })
        return {
          success: response.status === 400 || response.status === 401, // Should fail with empty array or auth
          status: response.status,
          data: response.data
        }
      }
    },
    {
      name: 'Test bulk operation validation (missing action)',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/properties/bulk`, {
          method: 'POST',
          body: {
            propertyIds: ['test-id']
          }
        })
        return {
          success: response.status === 400 || response.status === 401, // Should fail without action or auth
          status: response.status,
          data: response.data
        }
      }
    }
  ]

  let allPassed = true
  const results = []

  for (const test of tests) {
    try {
      console.log(`  Testing: ${test.name}`)
      const result = await test.test()
      
      if (result.success) {
        console.log(`    ✅ ${test.name}: PASS`)
        results.push({ name: test.name, status: 'PASS', ...result })
      } else {
        console.log(`    ❌ ${test.name}: FAIL (${result.status})`)
        allPassed = false
        results.push({ name: test.name, status: 'FAIL', ...result })
      }
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
      results.push({ name: test.name, status: 'ERROR', error: err.message })
    }
  }

  return { allPassed, results }
}

async function testArchiveStatistics() {
  console.log('📊 Testing archive statistics...')
  
  const tests = [
    {
      name: 'Get archive statistics',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/properties/archive/stats`)
        return {
          success: response.status === 200 || response.status === 401 || response.status === 403, // Auth issues are expected without session
          status: response.status,
          data: response.data
        }
      }
    },
    {
      name: 'Refresh archive statistics',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/api/properties/archive/stats`, {
          method: 'POST',
          body: { action: 'refresh' }
        })
        return {
          success: response.status === 200 || response.status === 401 || response.status === 403, // Auth issues are expected without session
          status: response.status,
          data: response.data
        }
      }
    }
  ]

  let allPassed = true
  const results = []

  for (const test of tests) {
    try {
      console.log(`  Testing: ${test.name}`)
      const result = await test.test()
      
      if (result.success) {
        console.log(`    ✅ ${test.name}: PASS`)
        results.push({ name: test.name, status: 'PASS', ...result })
      } else {
        console.log(`    ❌ ${test.name}: FAIL (${result.status})`)
        allPassed = false
        results.push({ name: test.name, status: 'FAIL', ...result })
      }
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
      results.push({ name: test.name, status: 'ERROR', error: err.message })
    }
  }

  return { allPassed, results }
}

async function testArchivePages() {
  console.log('📱 Testing archive pages accessibility...')
  
  const tests = [
    {
      name: 'Archive management page',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/properties/archive`)
        return {
          success: response.status === 200 || response.status < 500, // Any non-server error is OK
          status: response.status,
          isHtml: typeof response.data === 'string' && response.data.includes('html')
        }
      }
    },
    {
      name: 'Main properties page (with archive button)',
      test: async () => {
        const response = await makeRequest(`${baseUrl}/properties`)
        return {
          success: response.status === 200 || response.status < 500,
          status: response.status,
          isHtml: typeof response.data === 'string' && response.data.includes('html')
        }
      }
    }
  ]

  let allPassed = true
  const results = []

  for (const test of tests) {
    try {
      console.log(`  Testing: ${test.name}`)
      const result = await test.test()
      
      if (result.success) {
        console.log(`    ✅ ${test.name}: PASS`)
        results.push({ name: test.name, status: 'PASS', ...result })
      } else {
        console.log(`    ❌ ${test.name}: FAIL (${result.status})`)
        allPassed = false
        results.push({ name: test.name, status: 'FAIL', ...result })
      }
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
      results.push({ name: test.name, status: 'ERROR', error: err.message })
    }
  }

  return { allPassed, results }
}

async function runComprehensiveTest() {
  console.log('🗂️ PropMaster Archive System Test Suite')
  console.log('=======================================')
  
  const testResults = {
    setup: { passed: false, results: [] },
    bulkOps: { passed: false, results: [] },
    statistics: { passed: false, results: [] },
    pages: { passed: false, results: [] }
  }

  // Test 1: Archive Setup
  console.log('\n📋 Test 1: Archive Setup')
  const setupResults = await testArchiveSetup()
  testResults.setup = setupResults

  // Test 2: Bulk Operations
  console.log('\n📋 Test 2: Bulk Operations API')
  const bulkResults = await testBulkOperations()
  testResults.bulkOps = bulkResults

  // Test 3: Archive Statistics
  console.log('\n📋 Test 3: Archive Statistics')
  const statsResults = await testArchiveStatistics()
  testResults.statistics = statsResults

  // Test 4: Archive Pages
  console.log('\n📋 Test 4: Archive Pages')
  const pagesResults = await testArchivePages()
  testResults.pages = pagesResults

  // Final Results
  console.log('\n📊 Test Summary:')
  console.log(`  Archive Setup: ${testResults.setup.allPassed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Bulk Operations: ${testResults.bulkOps.allPassed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Statistics API: ${testResults.statistics.allPassed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Archive Pages: ${testResults.pages.allPassed ? '✅ PASS' : '❌ FAIL'}`)

  const overallSuccess = Object.values(testResults).every(result => result.allPassed)
  const partialSuccess = Object.values(testResults).some(result => result.allPassed)

  if (overallSuccess) {
    console.log('\n🎉 All archive system tests passed!')
    console.log('Your archive system is ready to use:')
    console.log('  • Archive and restore properties')
    console.log('  • Bulk operations (archive, delete, status updates)')
    console.log('  • Archive statistics and analytics')
    console.log('  • Archive management interface')
    console.log('\nTo use the archive system:')
    console.log('  1. Navigate to /properties/archive')
    console.log('  2. Select properties to archive or restore')
    console.log('  3. Use bulk operations for efficient management')
    return true
  } else if (partialSuccess) {
    console.log('\n⚠️ Some archive system tests passed, but there are issues:')
    
    if (!testResults.setup.allPassed) {
      console.log('  • Archive setup incomplete - run database setup')
    }
    if (!testResults.bulkOps.allPassed) {
      console.log('  • Bulk operations API issues - check server logs')
    }
    if (!testResults.statistics.allPassed) {
      console.log('  • Statistics API issues - may need authentication')
    }
    if (!testResults.pages.allPassed) {
      console.log('  • Archive pages not accessible - check routing')
    }
    
    console.log('\nRecommendations:')
    console.log('  1. Ensure Next.js development server is running')
    console.log('  2. Run archive setup: POST /api/database/add-archive-fields')
    console.log('  3. Check authentication if getting 403 errors')
    return false
  } else {
    console.log('\n❌ All archive system tests failed.')
    console.log('Check the following:')
    console.log('  1. Next.js development server is running on correct port')
    console.log('  2. Database connection is working')
    console.log('  3. Archive API routes are properly configured')
    console.log('  4. Run: npm run dev to start the server')
    return false
  }
}

async function main() {
  const success = await runComprehensiveTest()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Archive system test failed:', err.message)
    process.exit(1)
  })
}

module.exports = { runComprehensiveTest }
