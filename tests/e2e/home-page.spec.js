const { test, expect } = require('@playwright/test');

test.describe('Home Page Responsiveness', () => {
  test('Mobile viewport - single column layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Verify single column layout
    const contentSections = await page.locator('[data-testid="content-section"]');
    const contentSectionsCount = await contentSections.count();

    // Check stacking order
    for (let i = 0; i < contentSectionsCount; i++) {
      const section = contentSections.nth(i);
      const sectionBox = await section.boundingBox();
      
      if (i > 0) {
        const prevSection = contentSections.nth(i - 1);
        const prevSectionBox = await prevSection.boundingBox();
        
        // Verify vertical stacking
        expect(sectionBox.y).toBeGreaterThan(prevSectionBox.y + prevSectionBox.height);
      }
    }

    // Check for no horizontal scrolling
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.viewportSize().width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('Desktop viewport - multi-column layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Verify multi-column layout
    const contentGrid = await page.locator('[data-testid="content-grid"]');
    expect(contentGrid).toBeVisible();

    // Check column layout
    const columns = await page.locator('[data-testid="content-column"]');
    expect(await columns.count()).toBeGreaterThan(1);

    // Verify spacing between columns
    const firstColumn = columns.first();
    const secondColumn = columns.nth(1);

    const firstColumnBox = await firstColumn.boundingBox();
    const secondColumnBox = await secondColumn.boundingBox();

    expect(secondColumnBox.x).toBeGreaterThan(firstColumnBox.x + firstColumnBox.width);
  });

  test('Typography and spacing consistency', async ({ page }) => {
    // Test both mobile and desktop viewports
    const viewports = [
      { width: 375, height: 812 },   // Mobile
      { width: 1280, height: 800 }   // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      // Check headings
      const headings = await page.locator('h1, h2, h3');
      for (const heading of await headings.elementHandles()) {
        const style = await heading.evaluate(el => window.getComputedStyle(el));
        
        // Verify font sizes use rem
        expect(style.fontSize).toMatch(/rem$/);
        
        // Check line height
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight);
        expect(lineHeight).toBeGreaterThanOrEqual(fontSize * 1.2);
      }

      // Check paragraph spacing
      const paragraphs = await page.locator('p');
      for (const paragraph of await paragraphs.elementHandles()) {
        const style = await paragraph.evaluate(el => window.getComputedStyle(el));
        
        // Verify margins/paddings use design tokens
        ['margin-bottom', 'padding-bottom'].forEach(prop => {
          expect(style[prop]).toMatch(/^(0|var\(--spacing-)/);
        });
      }
    }
  });
});
