import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { canManageProperties } from '@/lib/permissions'
import { createClient } from '@supabase/supabase-js'

// Comprehensive Supabase client creation
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('Missing Supabase URL')
    return null
  }

  if (!supabaseServiceKey) {
    console.error('Missing Supabase Service Role Key')
    return null
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': 'propmaster-file-upload'
        }
      }
    })
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

export async function POST(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has permission to manage properties (editor or master)
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const fileType = formData.get('fileType') || 'image'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type and size based on file type
    const validationResult = validateFile(file, fileType)
    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    // Get Supabase client
    const client = supabaseAdmin || getSupabaseClient()

    if (!client) {
      console.error('Unable to create Supabase client for file upload')
      return NextResponse.json({ 
        error: 'Storage configuration error', 
        details: 'Unable to initialize storage client' 
      }, { status: 500 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `${fileType}_${timestamp}_${randomString}.${fileExtension}`

    // Determine Supabase bucket based on file type
    const bucket = fileType === 'image' ? 'property-images' : 'property-documents'

    // Ensure bucket exists (this is a best-effort approach)
    const { error: bucketError } = await client.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: fileType === 'image' 
        ? ['image/jpeg', 'image/png', 'image/webp'] 
        : ['application/pdf']
    })

    // Ignore error if bucket already exists
    if (bucketError && bucketError.code !== 'BUCKET_ALREADY_EXISTS') {
      console.error('Bucket creation error:', bucketError)
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage with comprehensive error handling
    const { data, error } = await client.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      console.error('Detailed Supabase upload error:', {
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details,
        status: error.status,
        bucket: bucket,
        filename: filename,
        fileType: file.type,
        fileSize: file.size
      })
      
      return NextResponse.json({ 
        error: 'Failed to upload file to storage', 
        details: error.message,
        fullError: {
          message: error.message,
          code: error.code,
          status: error.status
        }
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from(bucket)
      .getPublicUrl(filename)

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Unexpected file upload error:', error)
    return NextResponse.json({ 
      error: 'Unexpected upload error',
      details: error.message
    }, { status: 500 })
  }
}

// Handle file deletion
export async function DELETE(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has permission to manage properties (editor or master)
    if (!canManageProperties(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const fileType = searchParams.get('fileType') || 'image'

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Determine Supabase bucket based on file type
    const bucket = fileType === 'image' ? 'property-images' : 'property-documents'

    // Use fallback client if primary admin client is null
    const client = supabaseAdmin || getSupabaseClient()

    if (!client) {
      console.error('No Supabase client available for deletion')
      return NextResponse.json({ 
        error: 'Internal server configuration error', 
        details: 'Unable to create Supabase client' 
      }, { status: 500 })
    }

    // Delete from Supabase Storage
    const { error } = await client.storage
      .from(bucket)
      .remove([filename])

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ 
        error: 'Failed to delete file from storage', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete file',
      details: error.message
    }, { status: 500 })
  }
}

// File validation function
function validateFile(file, fileType) {
  // Validate file type
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const documentTypes = ['application/pdf']
  
  const allowedTypes = fileType === 'image' ? imageTypes : documentTypes
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: fileType === 'image' 
        ? 'Invalid image type. Only JPEG, PNG, and WebP images are allowed.' 
        : 'Invalid document type. Only PDF files are allowed.'
    }
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is 10MB.`
    }
  }

  return { valid: true }
}
