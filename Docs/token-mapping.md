# Design Token Mapping

## Purpose
This document tracks the mapping between existing hard-coded values and our new design tokens. The goal is to gradually replace raw values with consistent, scalable tokens.

## Color Tokens

| Old Value | Token | Usage |
|-----------|-------|-------|
| `#3B82F6` | `--color-primary` | Primary brand color |
| `#10B981` | `--color-secondary` | Secondary accent color |
| `#FFFFFF` | `--color-background` | Main background color |
| `#1F2937` | `--color-text-primary` | Primary text color |
| `#6B7280` | `--color-text-secondary` | Secondary text color |
| `#E5E7EB` | `--color-border` | Default border color |

## Spacing Tokens

| Old Value | Token | Usage |
|-----------|-------|-------|
| `4px` | `--spacing-xs` | Smallest spacing |
| `8px` | `--spacing-sm` | Small spacing |
| `16px` | `--spacing-md` | Medium spacing |
| `24px` | `--spacing-lg` | Large spacing |
| `32px` | `--spacing-xl` | Extra large spacing |

## Typography Tokens

| Old Value | Token | Usage |
|-----------|-------|-------|
| `12px` | `--font-size-xs` | Extra small text |
| `14px` | `--font-size-sm` | Small text |
| `16px` | `--font-size-base` | Base text size |
| `20px` | `--font-size-lg` | Large text |
| `24px` | `--font-size-xl` | Extra large text |

## Radii Tokens

| Old Value | Token | Usage |
|-----------|-------|-------|
| `4px` | `--radius-sm` | Small border radius |
| `8px` | `--radius-md` | Medium border radius |
| `12px` | `--radius-lg` | Large border radius |
| `9999px` | `--radius-full` | Fully rounded elements |

## Shadow Tokens

| Old Value | Token | Usage |
|-----------|-------|-------|
| Light shadow | `--shadow-sm` | Subtle elevation |
| Medium shadow | `--shadow-md` | Moderate elevation |
| Heavy shadow | `--shadow-lg` | Significant elevation |

## Z-Index Tokens

| Old Value | Token | Usage |
|-----------|-------|-------|
| `0` | `--z-base` | Default layer |
| `10` | `--z-dropdown` | Dropdown menus |
| `20` | `--z-sticky` | Sticky headers/elements |
| `50` | `--z-modal` | Modal dialogs |
| `100` | `--z-tooltip` | Tooltips and overlays |

## Migration Strategy
1. Identify existing hard-coded values in the codebase
2. Replace values with corresponding tokens
3. Ensure no visual changes during replacement
4. Update this mapping as new tokens are added or modified
