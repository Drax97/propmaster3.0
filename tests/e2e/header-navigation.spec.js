const { test, expect } = require('@playwright/test');

test.describe('Header Component Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session data
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            name: 'Test User',
            image: 'https://example.com/avatar.jpg',
            role: 'Admin',
            isMaster: true
          }
        })
      });
    });
  });

  test('Mobile viewport - navigation menu collapses', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    // Check for mobile menu toggle
    const mobileMenuToggle = await page.locator('[data-testid="mobile-menu-toggle"]');
    expect(mobileMenuToggle).toBeVisible();

    // Verify menu items are hidden by default
    const headerActions = await page.locator('.header-actions');
    expect(await headerActions.getAttribute('class')).not.toContain('mobile-menu-open');

    // Test menu toggle functionality
    await mobileMenuToggle.click();
    expect(await headerActions.getAttribute('class')).toContain('mobile-menu-open');
  });

  test('Desktop viewport - full horizontal navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    // Check for horizontal navigation
    const desktopNavigation = await page.locator('[data-testid="desktop-navigation"]');
    expect(desktopNavigation).toBeVisible();

    // Verify header actions are visible
    const headerActions = await page.locator('.header-actions');
    expect(headerActions).toBeVisible();

    // Check mobile menu toggle is hidden
    const mobileMenuToggle = await page.locator('[data-testid="mobile-menu-toggle"]');
    expect(mobileMenuToggle).toBeHidden();
  });

  test('Touch target sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    // Check menu toggle button
    const menuToggle = await page.locator('[data-testid="mobile-menu-toggle"]');
    const menuToggleBox = await menuToggle.boundingBox();
    expect(menuToggleBox.width).toBeGreaterThanOrEqual(44);
    expect(menuToggleBox.height).toBeGreaterThanOrEqual(44);

    // Check action buttons
    const actionButtons = await page.locator('.action-buttons button');
    for (const button of await actionButtons.elementHandles()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('Accessibility attributes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    // Check mobile menu toggle
    const mobileMenuToggle = await page.locator('[data-testid="mobile-menu-toggle"]');
    expect(await mobileMenuToggle.getAttribute('aria-label')).toBeTruthy();

    // Check user avatar
    const userAvatar = await page.locator('avatar');
    expect(await userAvatar.getAttribute('alt')).toBeTruthy();
  });
});
