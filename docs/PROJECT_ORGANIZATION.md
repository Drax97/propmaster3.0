# PropMaster 3.0 - Project Organization

## Overview
This document outlines the organized structure of the PropMaster 3.0 codebase after cleanup and reorganization.

## Directory Structure

### `/app` - Next.js App Router
- **`/api`** - API routes organized by feature
  - `/admin` - Admin management endpoints
  - `/auth` - Authentication endpoints
  - `/backup` - Backup system endpoints
  - `/database` - Database management endpoints
  - `/finances` - Financial data endpoints
  - `/properties` - Property management endpoints
  - `/security` - Security monitoring endpoints
  - `/sharing` - Property sharing endpoints
  - `/upload` - File upload endpoints
- **`/auth`** - Authentication pages
- **`/dashboard`** - Main dashboard
- **`/finances`** - Financial management pages
- **`/properties`** - Property management pages
- **`/settings`** - Application settings
- **`/share`** - Public sharing pages

### `/components` - React Components
- **`/forms`** - Form-related components
  - `RoleSelect.jsx` - Role selection component
- **`/layout`** - Layout and UI components
  - `Header.jsx` - Main navigation header
  - `LoadingSpinner.jsx` - Loading indicator
  - `QuickActions.jsx` - Quick action buttons
  - `StatsCards.jsx` - Statistics display cards
  - `ViewerPropertiesCard.jsx` - Property viewer card
- **`/management`** - Management components
  - `ArchiveManager.jsx` - Archive management interface
- **`/upload`** - File upload components
  - `DocumentUpload.jsx` - Single document upload
  - `MultipleDocumentUpload.jsx` - Multiple document upload
  - `PhotoUpload.jsx` - Single photo upload
  - `MultiplePhotoUpload.jsx` - Multiple photo upload
- **`/ui`** - Reusable UI components (shadcn/ui)
- **`LazyImage.jsx`** - Lazy-loaded image component

### `/lib` - Utility Libraries
- **`/database`** - Database utilities
  - `database-utils.js` - Database helper functions
  - `optimized-queries.js` - Optimized database queries
- **`/export`** - Export functionality
  - `export.js` - Main export utilities
  - `export-presets.js` - Export configuration presets
- **`/security`** - Security utilities
  - `security-middleware.js` - Security middleware functions
  - `security-system.js` - Core security system
- `backup-system.js` - Backup system utilities
- `permissions.js` - User permission system
- `property-sharing.js` - Property sharing utilities
- `share.js` - Sharing functionality
- `supabase.js` - Supabase client configuration
- `utils.js` - General utility functions

### `/tests` - Test Files
- **`/e2e`** - End-to-end tests (Playwright)
- **`/javascript`** - JavaScript test files
- **`/python`** - Python test files

### `/docs` - Documentation
- **`/development`** - Development documentation

### `/scripts` - Build and Setup Scripts
- Database setup and optimization scripts
- Archive system setup
- Backup system setup
- Supabase storage setup

### `/styles` - CSS Styles
- Component-specific stylesheets
- Theme and token definitions

## Key Improvements Made

1. **Removed Duplicate Code**
   - Eliminated the entire `Propmaster1.0-main/` duplicate folder
   - Consolidated redundant files

2. **Organized Components**
   - Grouped components by functionality (layout, forms, upload, management)
   - Maintained shadcn/ui components in separate `/ui` directory

3. **Structured Libraries**
   - Organized lib files by domain (database, security, export)
   - Maintained clear separation of concerns

4. **Consolidated Tests**
   - Moved all test files to organized `/tests` directory
   - Separated by language (JavaScript, Python) and type (e2e)

5. **Updated Import Paths**
   - Updated all import statements to reflect new organization
   - Maintained functionality while improving maintainability

6. **Documentation Organization**
   - Created centralized docs directory
   - Prepared for better documentation structure

## Benefits

- **Better Maintainability**: Clear separation of concerns and logical grouping
- **Easier Navigation**: Developers can quickly find relevant files
- **Reduced Duplication**: Eliminated redundant code and files
- **Improved Scalability**: Structure supports future growth
- **Enhanced Collaboration**: Clear organization helps team members understand the codebase

## Import Path Examples

```javascript
// Layout components
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/layout/LoadingSpinner'

// Upload components
import PhotoUpload from '@/components/upload/PhotoUpload'
import DocumentUpload from '@/components/upload/DocumentUpload'

// Management components
import ArchiveManager from '@/components/management/ArchiveManager'

// Database utilities
import { getUsers } from '@/lib/database/database-utils'

// Security utilities
import { securitySystem } from '@/lib/security/security-system'

// Export utilities
import { exportToPDF } from '@/lib/export/export'
```

This organization follows Next.js best practices and provides a scalable foundation for the PropMaster application.
