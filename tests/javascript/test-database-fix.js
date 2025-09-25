#!/usr/bin/env node

/**
 * Quick test script to verify database fixes are working
 * Run this after implementing the database stability improvements
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...')
  
  const tests = [
    {
      name: 'Users table access',
      test: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1)
        return { success: !error, error: error?.message, errorCode: error?.code }
      }
    },
    {
      name: 'Properties table access',
      test: async () => {
        const { data, error } = await supabase
          .from('properties')
          .select('id')
          .limit(1)
        return { success: !error, error: error?.message, errorCode: error?.code }
      }
    },
    {
      name: 'Finances table access',
      test: async () => {
        const { data, error } = await supabase
          .from('finances')
          .select('id')
          .limit(1)
        return { success: !error, error: error?.message, errorCode: error?.code }
      }
    }
  ]

  let allPassed = true
  let schemaErrors = 0

  for (const test of tests) {
    try {
      const result = await test.test()
      
      if (result.success) {
        console.log(`✅ ${test.name}: PASS`)
      } else {
        console.log(`❌ ${test.name}: FAIL - ${result.error}`)
        allPassed = false
        
        if (result.errorCode === 'PGRST205') {
          schemaErrors++
        }
      }
    } catch (err) {
      console.log(`❌ ${test.name}: ERROR - ${err.message}`)
      allPassed = false
    }
  }

  console.log('\n📊 Test Results:')
  console.log(`  Total tests: ${tests.length}`)
  console.log(`  Passed: ${tests.length - (allPassed ? 0 : 1)}`)
  console.log(`  Schema cache errors: ${schemaErrors}`)
  
  if (allPassed) {
    console.log('\n🎉 All database tests passed! Your database is healthy.')
  } else if (schemaErrors > 0) {
    console.log('\n⚠️ Schema cache errors detected.')
    console.log('Run the database fix script: node scripts/fix-database.js')
  } else {
    console.log('\n❌ Database issues detected.')
    console.log('Check your Supabase configuration and run database setup.')
  }

  return allPassed
}

async function main() {
  console.log('🚀 PropMaster Database Connection Test')
  console.log('=====================================')
  
  const success = await testDatabaseConnection()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Test failed:', err.message)
    process.exit(1)
  })
}

module.exports = { testDatabaseConnection }
