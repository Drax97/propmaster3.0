# Responsive Design Policy

## Breakpoint Strategy

### Breakpoint Definitions (Mobile-First)
1. **xs** (480px): Small mobile devices
   - Minimum width: 480px
   - Primary use: Basic mobile layouts
   - Example media query: `@media (min-width: 480px) { ... }`

2. **sm** (640px): Large mobile devices
   - Minimum width: 640px
   - Primary use: Expanded mobile layouts, initial content reorganization
   - Example media query: `@media (min-width: 640px) { ... }`

3. **md** (768px): Tablet devices
   - Minimum width: 768px
   - Primary use: Tablet-specific layouts, initial multi-column designs
   - Example media query: `@media (min-width: 768px) { ... }`

4. **lg** (1024px): Desktop devices
   - Minimum width: 1024px
   - Primary use: Standard desktop layouts
   - Example media query: `@media (min-width: 1024px) { ... }`

5. **xl** (1280px): Large desktop devices
   - Minimum width: 1280px
   - Primary use: Expanded desktop layouts, full-width content
   - Example media query: `@media (min-width: 1280px) { ... }`

## Container Query Policy

### When to Use Container Queries
Container queries are preferred in the following scenarios:

1. **Component-Specific Responsiveness**
   - Components that need to adapt based on their own width
   - Layouts within variable-width parent containers
   - Independent scaling of components

### Container Query Example
```css
.responsive-component {
  @container (min-width: 300px) {
    /* Styles applied when container is at least 300px wide */
    display: flex;
    gap: var(--spacing-md);
  }

  @container (min-width: 500px) {
    /* Additional styles for larger containers */
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Responsive Utility Mixins

### Responsive Visibility Utilities
```css
.hide-xs {
  @media (max-width: 479px) {
    display: none;
  }
}

.hide-sm {
  @media (min-width: 480px) and (max-width: 639px) {
    display: none;
  }
}

/* Similar utilities for other breakpoints */
```

### Responsive Spacing Utilities
```css
.responsive-padding {
  padding: var(--spacing-sm);

  @media (min-width: 768px) {
    padding: var(--spacing-md);
  }

  @media (min-width: 1024px) {
    padding: var(--spacing-lg);
  }
}
```

## Best Practices
1. Always start with mobile-first design
2. Use min-width media queries for progressive enhancement
3. Prefer container queries for component-level responsiveness
4. Utilize design tokens for consistent spacing and typography
5. Keep specificity low and avoid !important

## Performance Considerations
- Minimize the number of breakpoints
- Use CSS variables for dynamic theming
- Leverage browser's native responsive design capabilities

## Testing
- Test at defined breakpoints: 375px, 480px, 640px, 768px, 1024px, 1280px
- Ensure layout integrity and readability
- Verify touch target sizes (minimum 44px)

## Rationale
This policy ensures a consistent, scalable approach to responsive design while maintaining flexibility for individual component needs.
