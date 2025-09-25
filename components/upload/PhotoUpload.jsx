'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PhotoUpload({ 
  value, 
  onChange, 
  label = "Upload Photo",
  description = "Click to upload or drag and drop",
  aspectRatio = "aspect-video",
  maxSize = 10 // MB
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
      return
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      toast.error(`File too large. Maximum size is ${maxSize}MB.`)
      return
    }

    setUploading(true)

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
        onChange(data.url)
        toast.success('Photo uploaded successfully!')
      } else {
        toast.error(data.error || 'Failed to upload photo')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
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

  const handleRemove = async () => {
    if (value && value.startsWith('https://')) {
      // Extract filename from Supabase URL
      const filename = value.split('/').pop()
      
      try {
        await fetch(`/api/upload/files?filename=${filename}&fileType=image`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
    
    onChange('')
    toast.success('Photo removed')
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <Card className={`border-2 border-dashed transition-colors ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}>
        <CardContent className="p-0">
          {value ? (
            // Show uploaded image
            <div className={`relative ${aspectRatio} bg-gray-100 rounded-lg overflow-hidden`}>
              <img
                src={value}
                alt="Uploaded photo"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={triggerFileInput}
                  disabled={uploading}
                  className="bg-white/80 hover:bg-white"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={uploading}
                  className="bg-red-500/80 hover:bg-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            // Show upload area
            <div
              className={`${aspectRatio} flex flex-col items-center justify-center p-6 cursor-pointer transition-colors ${
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
                  <p className="text-sm text-gray-600">Uploading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">{description}</p>
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, WebP up to {maxSize}MB
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {description && !value && (
        <p className="text-xs text-gray-500 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}
