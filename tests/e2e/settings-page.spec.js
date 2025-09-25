const { test, expect } = require('@playwright/test');

test.describe('Settings Page Responsiveness', () => {
  const mockSession = {
    user: {
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
      role: 'MASTER'
    }
  };

  test.beforeEach(async ({ page }) => {
    // Mock session data
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSession)
      });
    });
  });

  test('Mobile viewport - section interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings');

    // Check mobile section headers
    const sectionHeaders = await page.locator('.settings-section-header');
    expect(await sectionHeaders.count()).toBeGreaterThan(0);

    // Test profile section toggle
    const profileSectionHeader = await page.locator('[data-testid="profile-section-header"]');
    const profileSectionContent = await page.locator('.settings-section-content').first();

    expect(await profileSectionContent.getAttribute('class')).not.toContain('section-open');
    await profileSectionHeader.click();
    expect(await profileSectionContent.getAttribute('class')).toContain('section-open');
  });

  test('Desktop viewport - layout and content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/settings');

    // Check settings sections layout
    const settingsSections = await page.locator('.settings-sections');
    expect(await settingsSections.getAttribute('class')).toContain('grid');

    // Verify all sections are visible
    const sectionContents = await page.locator('.settings-section-content');
    for (const content of await sectionContents.elementHandles()) {
      expect(await content.isVisible()).toBeTruthy();
    }
  });

  test('Settings form interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings');

    // Open profile section
    const profileSectionHeader = await page.locator('[data-testid="profile-section-header"]');
    await profileSectionHeader.click();

    // Test profile name input
    const nameInput = await page.locator('[data-testid="profile-name-input"]');
    await nameInput.fill('New Test Name');
    expect(await nameInput.inputValue()).toBe('New Test Name');

    // Test switches
    const emailNotificationsSwitch = await page.locator('[data-testid="email-notifications-switch"]');
    await emailNotificationsSwitch.click();

    // Test selects
    const themeSelect = await page.locator('[data-testid="theme-select"]');
    await themeSelect.click();
    await page.getByText('Dark').click();
    
    const languageSelect = await page.locator('[data-testid="language-select"]');
    await languageSelect.click();
    await page.getByText('Spanish').click();
  });

  test('Save settings button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings');

    // Check save settings button
    const saveButton = await page.locator('[data-testid="save-settings-button"]');
    expect(saveButton).toBeVisible();

    // Verify button size (minimum 44px touch target)
    const buttonBox = await saveButton.boundingBox();
    expect(buttonBox.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);

    // Simulate saving settings
    await saveButton.click();
    
    // Check loading state
    expect(await saveButton.textContent()).toContain('Saving...');
  });

  test('Accessibility attributes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/settings');

    // Check semantic headings
    const headings = await page.locator('h2');
    for (const heading of await headings.elementHandles()) {
      const level = await heading.evaluate(el => el.tagName.toLowerCase());
      expect(level).toBe('h2');
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
