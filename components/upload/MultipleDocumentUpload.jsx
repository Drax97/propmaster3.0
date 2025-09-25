'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, FileText, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function MultipleDocumentUpload({ 
  value = [], 
  onChange, 
  label = "Property Documents",
  maxDocuments = 10,
  maxSize = 200 // MB - increased from 10MB to 200MB
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return

    // Check if adding these files would exceed the limit
    if (value.length + files.length > maxDocuments) {
      toast.error(`Maximum ${maxDocuments} documents allowed`)
      return
    }

    setUploading(true)
    const uploadedUrls = []
    const errors = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type - support multiple document types
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp'
        ]
        if (!allowedTypes.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type. Only PDF, Word, Excel, text files, and images are allowed.`)
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
          formData.append('fileType', 'document')

          const response = await fetch('/api/upload/files', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (response.ok) {
            uploadedUrls.push({
              url: data.url,
              filename: file.name,
              size: file.size,
              type: file.type
            })
          } else {
            errors.push(`${file.name}: ${data.error}`)
          }
        } catch (error) {
          errors.push(`${file.name}: Upload failed`)
        }
      }

      // Update the value with new document objects
      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls])
        toast.success(`${uploadedUrls.length} document(s) uploaded successfully!`)
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

  const handleRemove = async (index, documentObj) => {
    if (documentObj?.url && documentObj.url.startsWith('https://')) {
      // Extract filename from Supabase URL
      const filename = documentObj.url.split('/').pop()
      
      try {
        await fetch(`/api/upload/files?filename=${filename}&fileType=document`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
    
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
    toast.success('Document removed')
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const canAddMore = value.length < maxDocuments

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) {
      return <FileText className="h-6 w-6 text-blue-600" />
    }
    return <FileText className="h-6 w-6 text-red-600" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label} ({value.length}/{maxDocuments})
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
            Add Documents
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
                  <p className="text-sm text-gray-600">Uploading documents...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Click to upload or drag and drop multiple documents
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, Text files, and Images up to {maxSize}MB each
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((documentObj, index) => {
            // Handle both old format (just URL string) and new format (object with metadata)
            const isOldFormat = typeof documentObj === 'string'
            const url = isOldFormat ? documentObj : documentObj.url
            const filename = isOldFormat ? url.split('/').pop() : documentObj.filename
            const size = isOldFormat ? null : documentObj.size
            const type = isOldFormat ? null : documentObj.type
            
            return (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {filename}
                        </p>
                        {size && (
                          <p className="text-xs text-gray-500">
                            {formatFileSize(size)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(url, '_blank')}
                        className="bg-white/80 hover:bg-white"
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemove(index, documentObj)}
                        disabled={uploading}
                        className="bg-red-500/80 hover:bg-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {value.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          No documents uploaded yet
        </p>
      )}
    </div>
  )
}
