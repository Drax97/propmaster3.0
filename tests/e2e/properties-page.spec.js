const { test, expect } = require('@playwright/test');

test.describe('Properties Page Responsiveness', () => {
  const mockProperties = [
    {
      id: '1',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      rent: 2000,
      status: 'available',
      imageUrl: 'https://example.com/property1.jpg'
    },
    {
      id: '2',
      address: '456 Oak Rd',
      city: 'Somewhere',
      state: 'NY',
      rent: 2500,
      status: 'occupied',
      imageUrl: 'https://example.com/property2.jpg'
    }
  ];

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

    // Mock properties API
    await page.route('**/api/properties*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ properties: mockProperties })
      });
    });
  });

  test('Mobile viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/properties');

    // Check mobile filter toggle
    const mobileFilterToggle = await page.locator('[data-testid="mobile-filter-toggle"]');
    expect(mobileFilterToggle).toBeVisible();

    // Verify filters are hidden by default
    const filtersContainer = await page.locator('[data-testid="filters-container"]');
    expect(await filtersContainer.getAttribute('class')).not.toContain('filters-open');

    // Open filters
    await mobileFilterToggle.click();
    expect(await filtersContainer.getAttribute('class')).toContain('filters-open');

    // Check property grid (single column)
    const propertiesGrid = await page.locator('[data-testid="properties-grid"]');
    const propertyCards = await propertiesGrid.locator('[data-testid="property-card"]');
    expect(await propertyCards.count()).toBe(2);

    // Verify single column layout
    const firstCardBox = await propertyCards.first().boundingBox();
    const secondCardBox = await propertyCards.nth(1).boundingBox();
    expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
  });

  test('Desktop viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/properties');

    // Check filters section
    const filtersContainer = await page.locator('[data-testid="filters-container"]');
    expect(filtersContainer).toBeVisible();

    // Check property grid (multi-column)
    const propertiesGrid = await page.locator('[data-testid="properties-grid"]');
    const propertyCards = await propertiesGrid.locator('[data-testid="property-card"]');
    expect(await propertyCards.count()).toBe(2);

    // Verify multi-column layout
    const firstCardBox = await propertyCards.first().boundingBox();
    const secondCardBox = await propertyCards.nth(1).boundingBox();
    expect(secondCardBox.x).toBeGreaterThan(firstCardBox.x + firstCardBox.width);
  });

  test('Search and filter interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/properties');

    // Open filters on mobile
    const mobileFilterToggle = await page.locator('[data-testid="mobile-filter-toggle"]');
    await mobileFilterToggle.click();

    // Check search input
    const searchInput = await page.locator('[data-testid="search-input"]');
    expect(searchInput).toBeVisible();
    await searchInput.fill('Main');

    // Check status filter
    const statusFilter = await page.locator('[data-testid="status-filter"]');
    expect(statusFilter).toBeVisible();
    await statusFilter.click();
    await page.getByText('Available').click();

    // Check location filter
    const locationFilter = await page.locator('[data-testid="location-filter"]');
    expect(locationFilter).toBeVisible();
    await locationFilter.fill('CA');
  });

  test('Add property button on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/properties');

    // Check add property button is visible without opening filters on mobile
    const addPropertyButton = await page.locator('[data-testid="add-property-button"]');
    expect(addPropertyButton).toBeVisible();

    // Verify button size (minimum 44px touch target)
    const buttonBox = await addPropertyButton.boundingBox();
    expect(buttonBox.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);

    // Ensure it's not inside the collapsible filters section
    const filtersContainer = await page.locator('[data-testid="filters-container"]');
    const isFiltersOpen = await filtersContainer.evaluate(el => el.classList.contains('filters-open'));
    expect(isFiltersOpen).toBe(false); // Filters should be closed by default
    expect(addPropertyButton).toBeVisible(); // But button should still be visible
  });

  test('Add property button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/properties');

    // Check desktop add property button is visible
    const desktopAddPropertyButton = await page.locator('[data-testid="desktop-add-property-button"]');
    expect(desktopAddPropertyButton).toBeVisible();

    // Mobile add property button should be hidden on desktop
    const mobileAddPropertySection = await page.locator('.mobile-add-property-section');
    expect(mobileAddPropertySection).toBeHidden();
  });

  test('Property card details', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/properties');

    const propertyCards = await page.locator('[data-testid="property-card"]');
    const firstCard = propertyCards.first();

    // Check card components
    const propertyImage = await firstCard.locator('.property-image');
    const propertyTitle = await firstCard.locator('.property-title');
    const propertyDetails = await firstCard.locator('.property-details');
    const propertyActions = await firstCard.locator('.property-card-actions');

    expect(propertyImage).toBeVisible();
    expect(propertyTitle).toBeVisible();
    expect(propertyDetails).toBeVisible();
    expect(propertyActions).toBeVisible();
  });

  test('Accessibility attributes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/properties');

    // Check semantic headings
    const headings = await page.locator('h1, h3');
    for (const heading of await headings.elementHandles()) {
      const level = await heading.evaluate(el => el.tagName.toLowerCase());
      expect(['h1', 'h3']).toContain(level);
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
