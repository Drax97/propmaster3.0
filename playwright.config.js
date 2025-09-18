const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Timeout for each test
  timeout: 30000,

  // Reporters
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  // Test directory
  testDir: './tests/e2e',

  // Viewport configurations
  use: {
    // Base viewport settings
    viewport: { width: 1280, height: 800 },

    // Device emulation configurations
    devices: {
      'Mobile Viewport': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      },
      'Desktop Viewport': {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        isMobile: false
      }
    },

    // Browser-specific settings
    browserName: 'chromium',
    headless: true,

    // Accessibility and performance tracing
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  // Project configurations
  projects: [
    {
      name: 'Mobile Tests',
      use: { 
        ...defineConfig.devices['Mobile Viewport'],
        viewport: { width: 375, height: 812 }
      }
    },
    {
      name: 'Desktop Tests',
      use: { 
        ...defineConfig.devices['Desktop Viewport'],
        viewport: { width: 1280, height: 800 }
      }
    }
  ],

  // Global setup and teardown
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js'
});
