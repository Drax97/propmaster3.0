#!/usr/bin/env node

/**
 * Comprehensive Database Optimization Test
 * Tests all aspects of the database optimization implementation
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const http = require('http')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function testDatabaseConnection() {
  console.log('🔌 Testing basic database connection...')
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log(`❌ Database connection test failed: ${error.message}`)
      return false
    } else {
      console.log(`✅ Database connection successful (${data || 0} users)`)
      return true
    }
  } catch (err) {
    console.log(`❌ Database connection exception: ${err.message}`)
    return false
  }
}

async function testOptimizationAPIs() {
  console.log('🧪 Testing optimization APIs...')
  
  const tests = [
    {
      name: 'Database Health Check',
      url: `${baseUrl}/api/database/health`,
      method: 'GET',
      expectedStatus: [200, 206, 503]
    },
    {
      name: 'Schema Cache Fix',
      url: `${baseUrl}/api/database/fix-schema-cache`,
      method: 'GET',
      expectedStatus: [200, 503]
    },
    {
      name: 'Database Setup Status',
      url: `${baseUrl}/api/database/setup`,
      method: 'GET',
      expectedStatus: [200, 500]
    },
    {
      name: 'Database Optimization Status',
      url: `${baseUrl}/api/database/optimize`,
      method: 'GET',
      expectedStatus: [200, 500]
    }
  ]

  let allPassed = true

  for (const test of tests) {
    try {
      console.log(`  Testing: ${test.name}`)
      const response = await makeRequest(test.url, { method: test.method })
      
      if (test.expectedStatus.includes(response.status)) {
        console.log(`    ✅ ${test.name}: PASS (${response.status})`)
      } else {
        console.log(`    ❌ ${test.name}: FAIL (${response.status})`)
        allPassed = false
      }
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
    }
  }

  return allPassed
}

async function testQueryPerformance() {
  console.log('⚡ Testing query performance...')
  
  const performanceTests = [
    {
      name: 'User lookup by email',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('email', 'drax976797@gmail.com')
          .single()
        const duration = Date.now() - start
        return { duration, success: !error, error: error?.message }
      },
      expectedMaxDuration: 200
    },
    {
      name: 'Property listing (first 10)',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('properties')
          .select(`
            id, name, status, price, location,
            users:created_by(name)
          `)
          .order('updated_at', { ascending: false })
          .limit(10)
        const duration = Date.now() - start
        return { duration, success: !error, error: error?.message, count: data?.length || 0 }
      },
      expectedMaxDuration: 500
    },
    {
      name: 'Finance summary calculation',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('finances')
          .select('amount, status')
        const duration = Date.now() - start
        
        let summary = { total: 0, paid: 0, pending: 0 }
        if (data) {
          summary = {
            total: data.reduce((sum, f) => sum + (f.amount || 0), 0),
            paid: data.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0),
            pending: data.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0)
          }
        }
        
        return { duration, success: !error, error: error?.message, summary }
      },
      expectedMaxDuration: 300
    },
    {
      name: 'Property search (text)',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('properties')
          .select('id, name, location')
          .or('name.ilike.%apartment%,location.ilike.%apartment%')
          .limit(5)
        const duration = Date.now() - start
        return { duration, success: !error, error: error?.message, count: data?.length || 0 }
      },
      expectedMaxDuration: 400
    }
  ]

  let allPassed = true
  const results = []

  for (const test of performanceTests) {
    try {
      console.log(`  Testing: ${test.name}`)
      const result = await test.query()
      
      const passed = result.success && result.duration <= test.expectedMaxDuration
      const rating = result.duration < 50 ? 'excellent' : 
                    result.duration < 150 ? 'good' : 
                    result.duration < 300 ? 'acceptable' : 'needs optimization'
      
      if (passed) {
        console.log(`    ✅ ${test.name}: ${result.duration}ms (${rating})`)
      } else {
        console.log(`    ❌ ${test.name}: ${result.duration}ms (${rating}) - ${result.error || 'Too slow'}`)
        allPassed = false
      }
      
      results.push({
        name: test.name,
        duration: result.duration,
        success: result.success,
        rating,
        passed
      })
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
    }
  }

  // Calculate average performance
  const successfulTests = results.filter(r => r.success)
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
    const overallRating = avgDuration < 100 ? 'A' : 
                         avgDuration < 200 ? 'B' : 
                         avgDuration < 400 ? 'C' : 'D'
    
    console.log(`  📊 Overall Performance: ${Math.round(avgDuration)}ms average (Grade: ${overallRating})`)
  }

  return allPassed
}

async function testOptimizedViews() {
  console.log('👁️ Testing optimized views...')
  
  const viewTests = [
    {
      name: 'property_summary_view',
      query: async () => {
        const { data, error } = await supabase
          .from('property_summary_view')
          .select('*')
          .limit(1)
        return { success: !error, error: error?.message }
      }
    },
    {
      name: 'finance_summary_view',
      query: async () => {
        const { data, error } = await supabase
          .from('finance_summary_view')
          .select('*')
          .limit(1)
        return { success: !error, error: error?.message }
      }
    },
    {
      name: 'user_activity_summary',
      query: async () => {
        const { data, error } = await supabase
          .from('user_activity_summary')
          .select('*')
          .limit(1)
        return { success: !error, error: error?.message }
      }
    }
  ]

  let viewsAvailable = 0

  for (const test of viewTests) {
    try {
      console.log(`  Testing view: ${test.name}`)
      const result = await test.query()
      
      if (result.success) {
        console.log(`    ✅ ${test.name}: Available`)
        viewsAvailable++
      } else {
        console.log(`    ❌ ${test.name}: Not available - ${result.error}`)
      }
    } catch (err) {
      console.log(`    ❌ ${test.name}: ERROR - ${err.message}`)
    }
  }

  console.log(`  📊 Views Available: ${viewsAvailable}/${viewTests.length}`)
  return viewsAvailable > 0
}

async function runComprehensiveTest() {
  console.log('🚀 PropMaster Database Optimization Test')
  console.log('=========================================')
  
  const testResults = {
    connection: false,
    apis: false,
    performance: false,
    views: false
  }

  // Test 1: Basic Connection
  console.log('\n📋 Test 1: Database Connection')
  testResults.connection = await testDatabaseConnection()

  // Test 2: API Endpoints
  console.log('\n📋 Test 2: Optimization APIs')
  testResults.apis = await testOptimizationAPIs()

  // Test 3: Query Performance
  console.log('\n📋 Test 3: Query Performance')
  testResults.performance = await testQueryPerformance()

  // Test 4: Optimized Views
  console.log('\n📋 Test 4: Optimized Views')
  testResults.views = await testOptimizedViews()

  // Final Results
  console.log('\n📊 Test Summary:')
  console.log(`  Database Connection: ${testResults.connection ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Optimization APIs: ${testResults.apis ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Query Performance: ${testResults.performance ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Optimized Views: ${testResults.views ? '✅ PASS' : '❌ FAIL'}`)

  const overallSuccess = Object.values(testResults).every(result => result)
  const partialSuccess = Object.values(testResults).some(result => result)

  if (overallSuccess) {
    console.log('\n🎉 All tests passed! Your database optimization is working perfectly.')
    console.log('Benefits you should see:')
    console.log('  • Faster property listings and searches')
    console.log('  • Quicker user authentication')
    console.log('  • Improved financial calculations')
    console.log('  • Better dashboard performance')
    return true
  } else if (partialSuccess) {
    console.log('\n⚠️ Some tests passed, but there are issues to address:')
    if (!testResults.connection) {
      console.log('  • Database connection issues - check your Supabase configuration')
    }
    if (!testResults.apis) {
      console.log('  • Optimization APIs not working - ensure your Next.js server is running')
    }
    if (!testResults.performance) {
      console.log('  • Query performance needs improvement - run database optimization')
    }
    if (!testResults.views) {
      console.log('  • Optimized views not available - run: node scripts/optimize-database.js')
    }
    return false
  } else {
    console.log('\n❌ All tests failed. Check your database configuration and ensure:')
    console.log('  1. Supabase environment variables are correct')
    console.log('  2. Next.js development server is running')
    console.log('  3. Database tables exist and are accessible')
    console.log('  4. Run: node scripts/fix-database.js to fix basic issues')
    return false
  }
}

async function main() {
  const success = await runComprehensiveTest()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Test failed:', err.message)
    process.exit(1)
  })
}

module.exports = { runComprehensiveTest }
