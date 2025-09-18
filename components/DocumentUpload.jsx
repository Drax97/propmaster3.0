'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DocumentUpload({ 
  value, 
  onChange, 
  label = "Upload Document",
  description = "Click to upload PDF document",
  maxSize = 10 // MB
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid document type. Only PDF files are allowed.')
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
      formData.append('fileType', 'document')

      const response = await fetch('/api/upload/files', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        onChange(data.url)
        toast.success('Document uploaded successfully!')
      } else {
        toast.error(data.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload document')
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
        await fetch(`/api/upload/files?filename=${filename}&fileType=document`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
    
    onChange('')
    toast.success('Document removed')
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
        <CardContent className="p-6">
          {value ? (
            // Show uploaded document
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="text-sm text-gray-700">
                  {value.split('/').pop()}
                </span>
              </div>
              <div className="space-x-2">
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
              className={`flex flex-col items-center justify-center cursor-pointer transition-colors ${
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
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">{description}</p>
                  <p className="text-xs text-gray-500">
                    PDF up to {maxSize}MB
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
        accept="application/pdf"
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
