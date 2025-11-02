# 📸 File Upload Feature

## Overview

This feature allows **Editor** and **Master** users to upload:
- **Photos**: For property images
- **Documents**: PDF files related to properties

### Key Features
- **Supabase Storage**: Files stored in cloud storage
- **Role-based Permissions**: Only Editor and Master users can upload
- **File Validation**: 
  - Photos: JPEG, PNG, WebP up to 10MB each
  - Documents: PDF up to 10MB
- **Drag & Drop**: Modern, intuitive upload interface
- **File Management**: Automatic file deletion when removed

## Components Created

### 1. PhotoUpload Component (`/components/PhotoUpload.jsx`)
- Single photo upload with drag & drop
- Preview with replace/remove options
- File validation and error handling
- Configurable aspect ratio and size limits

### 2. MultiplePhotoUpload Component (`/components/MultiplePhotoUpload.jsx`)
- Multiple photo upload with drag & drop
- Grid layout for photo management
- Individual photo removal
- Configurable photo limits

### 3. DocumentUpload Component (`/components/DocumentUpload.jsx`)
- Single PDF document upload
- Preview with replace/remove options
- File validation and error handling
- Configurable size limits

### 4. File Upload API (`/app/api/upload/files/route.js`)
- Secure file upload with authentication
- Role-based permission checking
- File validation and storage
- Supports multiple file types
- File deletion endpoint

## Supabase Storage Buckets

- `property-images`: Stores property photos
- `property-documents`: Stores property-related PDF documents

## Usage

### In Property Creation/Edit Forms:

```jsx
import PhotoUpload from '@/components/PhotoUpload'
import MultiplePhotoUpload from '@/components/MultiplePhotoUpload'
import DocumentUpload from '@/components/DocumentUpload'

// Cover Image
<PhotoUpload
  label="Cover Image"
  value={coverImageUrl}
  onChange={setCoverImageUrl}
  aspectRatio="aspect-video"
/>

// Additional Photos
<MultiplePhotoUpload
  label="Additional Photos"
  value={photoUrls}
  onChange={setPhotoUrls}
  maxPhotos={10}
/>

// Property Document
<DocumentUpload
  label="Property Document"
  value={documentUrl}
  onChange={setDocumentUrl}
/>
```

## Permissions

- **Master Users**: Full access to file upload/management
- **Editor Users**: Full access to file upload/management  
- **Viewer Users**: No access to file upload features
- **Unauthenticated**: No access

## Security Features

- Server-side authentication and authorization
- File type validation (images and PDFs)
- File size limits (10MB per file)
- Secure filename generation
- Cloud storage with access controls

## Integration

The feature is integrated into:
- ✅ Property Creation Page (`/app/properties/new/page.js`)
- ✅ Property Edit Page (`/app/properties/[propertyId]/edit/page.js`)
- ✅ Toast notifications for user feedback
- ✅ Role-based UI hiding for unauthorized users

## Testing

To test the feature:

1. Log in as Editor or Master user
2. Navigate to "Add Property" or edit an existing property
3. Try uploading:
   - Cover photo
   - Additional photos
   - Property document (PDF)
4. Verify files appear in property views
5. Test file removal functionality

## File Structure

```
/components/
  ├── PhotoUpload.jsx           # Single photo upload component
  ├── MultiplePhotoUpload.jsx   # Multiple photo upload component
  └── DocumentUpload.jsx        # Single document upload component

/app/api/upload/files/
  └── route.js                  # File upload API endpoint

/Supabase Storage/
  ├── property-images/          # Uploaded property photos
  └── property-documents/       # Uploaded property documents
```

## Future Enhancements

Potential improvements:
- Multiple document uploads
- Advanced file preview
- Cloud storage optimization
- Enhanced file metadata tracking
- Bulk file upload
- Image editing capabilities
