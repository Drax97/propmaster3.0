# Mobile-First Component Refactoring Guide

## Refactoring Checklist

### 1. Tokens and Values
- [ ] Replace all hardcoded px values with design tokens
- [ ] Use rem units for typography and spacing
- [ ] Verify color usage matches token palette
- [ ] Remove any inline styles

### 2. Responsive Layout
- [ ] Implement mobile-first base styles
- [ ] Add min-width media queries for progressive enhancement
- [ ] Use container queries where appropriate
- [ ] Ensure single-column layout at small screens
- [ ] Progressively enhance layout at larger breakpoints

### 3. Touch and Interaction
- [ ] Ensure all interactive elements have minimum 44px touch target
- [ ] Add hover/focus states for desktop interactions
- [ ] Verify touch targets have adequate spacing
- [ ] Test tap/click interactions across devices

### 4. Typography
- [ ] Use rem-based font sizes
- [ ] Implement responsive typography scale
- [ ] Maintain readable line heights
- [ ] Ensure text remains legible at all sizes

### 5. Performance and Specificity
- [ ] Keep CSS selectors flat and low-specificity
- [ ] Remove !important declarations
- [ ] Minimize CSS nesting
- [ ] Optimize for rendering performance

### 6. Accessibility
- [ ] Maintain color contrast ratios
- [ ] Ensure keyboard navigability
- [ ] Add appropriate ARIA attributes
- [ ] Test with screen readers

### 7. Testing
- [ ] Add/update Playwright tests for 375px viewport
- [ ] Add/update Playwright tests for 1280px viewport
- [ ] Perform visual regression testing
- [ ] Verify no unintended layout shifts

## Refactoring Template

```jsx
// Before refactoring
const Header = () => (
  <header style={{ 
    backgroundColor: '#FFFFFF', 
    padding: '20px', 
    display: 'flex' 
  }}>
    {/* Component content */}
  </header>
);

// After refactoring
const Header = () => (
  <header 
    className="header"
    data-testid="desktop-navigation"
  >
    {/* Component content with tokens and responsive classes */}
  </header>
);

// Corresponding CSS
.header {
  background-color: var(--color-background);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
}
```

## Common Pitfalls to Avoid
- Mixing absolute and relative units
- Overusing media queries
- Neglecting touch target sizes
- Hardcoding breakpoints
- Introducing complex CSS specificity

## Documentation Requirements
- Explain rationale for changes
- List before/after visual differences
- Note any desktop layout adjustments
- Provide screenshots at different viewports

## Verification Checklist
- [ ] Desktop layout preserved
- [ ] Mobile layout functional
- [ ] No visual regressions
- [ ] Performance maintained
- [ ] Accessibility improved

## Example Commit Message
```
refactor(Header): Implement mobile-first responsive design

- Replace hardcoded values with design tokens
- Add min-width media queries
- Ensure 44px touch targets
- Update Playwright tests for 375px and 1280px viewports

Closes #ISSUE_NUMBER
```
