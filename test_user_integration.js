#!/usr/bin/env node

/**
 * User Integration Test Script
 * Tests the user-based client selection functionality
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

class UserIntegrationTester {
  constructor() {
    this.testResults = []
    this.passedTests = 0
    this.totalTests = 0
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || '📋'
    
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async runTest(name, testFn) {
    this.totalTests++
    this.log(`Running test: ${name}`)
    
    try {
      await testFn()
      this.passedTests++
      this.log(`PASSED: ${name}`, 'success')
      this.testResults.push({ name, status: 'PASSED', error: null })
    } catch (error) {
      this.log(`FAILED: ${name} - ${error.message}`, 'error')
      this.testResults.push({ name, status: 'FAILED', error: error.message })
    }
  }

  async testUsersFetch() {
    await this.runTest(
      'Fetch users for client selection',
      async () => {
        const response = await fetch(`${BASE_URL}/api/users/clients`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(`API Error: ${data.error}`)
        }

        // Should return users array
        if (!Array.isArray(data.users)) {
          throw new Error('Expected users array in response')
        }

        this.log(`Found ${data.users.length} users available for selection`)
      }
    )
  }

  async testUsersSearch() {
    await this.runTest(
      'Search users by name/email',
      async () => {
        const response = await fetch(`${BASE_URL}/api/users/clients?search=master`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(`API Error: ${data.error}`)
        }

        // Should return filtered users array
        if (!Array.isArray(data.users)) {
          throw new Error('Expected users array in response')
        }

        this.log(`Search found ${data.users.length} matching users`)
      }
    )
  }

  async testDatabaseSetup() {
    await this.runTest(
      'Database setup health check',
      async () => {
        const response = await fetch(`${BASE_URL}/api/setup-gmail-integration`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Should have status information
        if (!data.tables || !data.status) {
          throw new Error('Missing database status information')
        }
      }
    )
  }

  async testFinanceCreation() {
    await this.runTest(
      'Finance record creation with client_id',
      async () => {
        // First get a user to use as client
        const usersResponse = await fetch(`${BASE_URL}/api/users/clients`)
        if (!usersResponse.ok) {
          throw new Error('Could not fetch users for test')
        }
        
        const usersData = await usersResponse.json()
        if (!usersData.success || usersData.users.length === 0) {
          throw new Error('No users available for test')
        }

        const testUser = usersData.users[0]
        
        // Note: This test would require authentication, so we'll just validate the structure
        this.log(`Would test finance creation with client: ${testUser.name} (${testUser.email})`)
        
        // Validate user structure
        if (!testUser.id || !testUser.name || !testUser.email) {
          throw new Error('User missing required fields for client selection')
        }
      }
    )
  }

  async testUserDataStructure() {
    await this.runTest(
      'User data structure validation',
      async () => {
        const response = await fetch(`${BASE_URL}/api/users/clients`)
        const data = await response.json()
        
        if (!data.success || data.users.length === 0) {
          throw new Error('No users to validate structure')
        }

        const user = data.users[0]
        const requiredFields = ['id', 'email', 'name', 'role', 'displayName']
        
        for (const field of requiredFields) {
          if (!(field in user)) {
            throw new Error(`User missing required field: ${field}`)
          }
        }

        this.log(`User structure validated: ${JSON.stringify(user, null, 2)}`)
      }
    )
  }

  async runAllTests() {
    this.log('🚀 Starting User Integration Tests', 'info')
    this.log(`Testing against: ${BASE_URL}`, 'info')
    
    // Test database setup
    await this.testDatabaseSetup()
    
    // Test user fetching
    await this.testUsersFetch()
    await this.testUsersSearch()
    
    // Test data structure
    await this.testUserDataStructure()
    
    // Test finance integration (structure only)
    await this.testFinanceCreation()
    
    // Print summary
    this.printSummary()
  }

  printSummary() {
    this.log('\n📊 Test Summary', 'info')
    this.log(`Total Tests: ${this.totalTests}`)
    this.log(`Passed: ${this.passedTests}`, 'success')
    this.log(`Failed: ${this.totalTests - this.passedTests}`, this.passedTests === this.totalTests ? 'success' : 'error')
    
    if (this.passedTests === this.totalTests) {
      this.log('🎉 All tests passed!', 'success')
    } else {
      this.log('❌ Some tests failed. Check the logs above.', 'error')
      
      // Print failed tests
      const failedTests = this.testResults.filter(t => t.status === 'FAILED')
      if (failedTests.length > 0) {
        this.log('\n❌ Failed Tests:', 'error')
        failedTests.forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error')
        })
      }
    }
    
    this.log(`\nTest completion: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new UserIntegrationTester()
  tester.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

module.exports = UserIntegrationTester
