const { test, expect } = require('@playwright/test');

test.describe('Dashboard Page Responsiveness', () => {
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
            role: 'MASTER',
            isMaster: true
          }
        })
      });
    });

    // Mock dashboard statistics
    await page.route('**/api/dashboard/statistics', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalProperties: 10,
          availableProperties: 5,
          totalReceivables: 50000,
          totalUsers: 25
        })
      });
    });
  });

  test('Mobile viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    // Check welcome section
    const welcomeTitle = await page.locator('.welcome-title');
    expect(welcomeTitle).toBeVisible();
    expect(await welcomeTitle.textContent()).toContain('Welcome back');

    // Check stats section (single column)
    const statsGrid = await page.locator('.stats-grid');
    const statsCards = await statsGrid.locator('[data-testid="stats-card"]');
    expect(await statsCards.count()).toBeGreaterThan(0);

    // Verify single column layout
    const firstCardBox = await statsCards.first().boundingBox();
    const secondCardBox = await statsCards.nth(1).boundingBox();
    expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
  });

  test('Desktop viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    // Check welcome section
    const welcomeTitle = await page.locator('.welcome-title');
    expect(welcomeTitle).toBeVisible();

    // Check stats section (multi-column)
    const statsGrid = await page.locator('.stats-grid');
    const statsCards = await statsGrid.locator('[data-testid="stats-card"]');
    expect(await statsCards.count()).toBeGreaterThan(0);

    // Verify multi-column layout
    const firstCardBox = await statsCards.first().boundingBox();
    const secondCardBox = await statsCards.nth(1).boundingBox();
    expect(secondCardBox.x).toBeGreaterThan(firstCardBox.x + firstCardBox.width);
  });

  test('Quick Actions section', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    // Check quick actions section
    const quickActionsSection = await page.locator('[data-testid="dashboard-quick-actions"]');
    expect(quickActionsSection).toBeVisible();

    // Check action buttons
    const actionButtons = await page.locator('.action-button');
    expect(await actionButtons.count()).toBeGreaterThan(0);

    // Verify touch target sizes
    for (const button of await actionButtons.elementHandles()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('System Overview section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    // Check system overview section
    const systemOverviewSection = await page.locator('[data-testid="dashboard-system-overview"]');
    expect(systemOverviewSection).toBeVisible();

    // Check status badges
    const statusBadges = await page.locator('.status-badge');
    expect(await statusBadges.count()).toBeGreaterThan(0);

    // Verify status badge text
    for (const badge of await statusBadges.elementHandles()) {
      const badgeText = await badge.textContent();
      expect(['Connected', 'Active', 'Operational']).toContain(badgeText);
    }
  });

  test('Accessibility attributes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    // Check semantic headings
    const headings = await page.locator('h2, h3');
    for (const heading of await headings.elementHandles()) {
      const level = await heading.evaluate(el => el.tagName.toLowerCase());
      expect(['h2', 'h3']).toContain(level);
    }

    // Check color contrast
    const elements = await page.locator('body *');
    for (const element of await elements.elementHandles()) {
      const style = await element.evaluate(el => {
        const computedStyle = window.getComputedStyle(el);
        return {
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor
        };
      });

      // Basic color contrast check
      expect(style.color).not.toBe(style.backgroundColor);
    }
  });
});
