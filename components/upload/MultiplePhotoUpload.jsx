'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function MultiplePhotoUpload({ 
  value = [], 
  onChange, 
  label = "Additional Photos",
  maxPhotos = 10,
  maxSize = 10 // MB
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return

    // Check if adding these files would exceed the limit
    if (value.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`)
      return
    }

    setUploading(true)
    const uploadedUrls = []
    const errors = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type`)
          continue
        }

        // Validate file size
        const maxSizeBytes = maxSize * 1024 * 1024
        if (file.size > maxSizeBytes) {
          errors.push(`${file.name}: File too large (max ${maxSize}MB)`)
          continue
        }

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('fileType', 'image')

          const response = await fetch('/api/upload/files', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (response.ok) {
            uploadedUrls.push(data.url)
          } else {
            errors.push(`${file.name}: ${data.error}`)
          }
        } catch (error) {
          errors.push(`${file.name}: Upload failed`)
        }
      }

      // Update the value with new URLs
      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls])
        toast.success(`${uploadedUrls.length} photo(s) uploaded successfully!`)
      }

      // Show errors if any
      if (errors.length > 0) {
        toast.error(`Some uploads failed: ${errors.join(', ')}`)
      }

    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files)
    }
    // Reset input
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleRemove = async (index, url) => {
    if (url && url.startsWith('https://')) {
      // Extract filename from Supabase URL
      const filename = url.split('/').pop()
      
      try {
        await fetch(`/api/upload/files?filename=${filename}&fileType=image`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
    
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
    toast.success('Photo removed')
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const canAddMore = value.length < maxPhotos

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label} ({value.length}/{maxPhotos})
          </label>
        )}
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Photos
          </Button>
        )}
      </div>

      {/* Upload Area */}
      {canAddMore && (
        <Card className={`border-2 border-dashed transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}>
          <CardContent className="p-6">
            <div
              className={`flex flex-col items-center justify-center py-4 cursor-pointer transition-colors ${
                dragOver ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={triggerFileInput}
            >
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Uploading photos...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Click to upload or drag and drop multiple photos
                  </p>
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, WebP up to {maxSize}MB each
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(index, url)}
                    disabled={uploading}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {value.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          No additional photos uploaded yet
        </p>
      )}
    </div>
  )
}
