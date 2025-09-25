const { test, expect } = require('@playwright/test');

test.describe('Landing Page Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure no active session for landing page tests
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null)
      });
    });
  });

  test('Mobile viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Check header
    const header = await page.locator('.landing-header');
    expect(header).toBeVisible();

    // Check hero section
    const heroTitle = await page.locator('.hero-title');
    expect(heroTitle).toBeVisible();
    expect(await heroTitle.textContent()).toContain('Simplify Property Management');

    // Check features section
    const featuresSection = await page.locator('[data-testid="features-section"]');
    expect(featuresSection).toBeVisible();

    // Check feature cards (mobile: single column)
    const featureCards = await page.locator('[data-testid="feature-card"]');
    expect(await featureCards.count()).toBe(3);
    
    // Verify single column layout
    const firstCardBox = await featureCards.first().boundingBox();
    const secondCardBox = await featureCards.nth(1).boundingBox();
    expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
  });

  test('Desktop viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Check header
    const header = await page.locator('.landing-header');
    expect(header).toBeVisible();

    // Check hero section
    const heroTitle = await page.locator('.hero-title');
    expect(heroTitle).toBeVisible();

    // Check features section
    const featuresSection = await page.locator('[data-testid="features-section"]');
    expect(featuresSection).toBeVisible();

    // Check feature cards (desktop: three columns)
    const featureCards = await page.locator('[data-testid="feature-card"]');
    expect(await featureCards.count()).toBe(3);
    
    // Verify three-column layout
    const firstCardBox = await featureCards.first().boundingBox();
    const secondCardBox = await featureCards.nth(1).boundingBox();
    const thirdCardBox = await featureCards.nth(2).boundingBox();

    expect(secondCardBox.x).toBeGreaterThan(firstCardBox.x + firstCardBox.width);
    expect(thirdCardBox.x).toBeGreaterThan(secondCardBox.x + secondCardBox.width);
  });

  test('Call to Action button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const ctaButton = await page.locator('[data-testid="landing-cta-button"]');
    expect(ctaButton).toBeVisible();

    // Check button size (minimum 44px touch target)
    const buttonBox = await ctaButton.boundingBox();
    expect(buttonBox.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);

    // Verify navigation on click
    const [page1] = await Promise.all([
      page.waitForEvent('popup'),
      ctaButton.click()
    ]);

    expect(page1.url()).toContain('/auth/signin');
  });

  test('Accessibility attributes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Check semantic headings
    const headings = await page.locator('h1, h2');
    for (const heading of await headings.elementHandles()) {
      const level = await heading.evaluate(el => el.tagName.toLowerCase());
      expect(['h1', 'h2']).toContain(level);
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

      // Basic color contrast check (you might want a more sophisticated check)
      expect(style.color).not.toBe(style.backgroundColor);
    }
  });
});
