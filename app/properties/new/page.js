'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Building2, Save, MapPin, DollarSign, FileText, Image as ImageIcon } from 'lucide-react'
import { getUserRole, canManageProperties, ROLES } from '@/lib/permissions'
import PhotoUpload from '@/components/PhotoUpload'
import MultiplePhotoUpload from '@/components/MultiplePhotoUpload'
import DocumentUpload from '@/components/DocumentUpload'
import Link from 'next/link'

export default function NewPropertyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    price: '',
    description: '',
    cover_image: '',
    images: [],
    documents: [],
    maps_link: '',
    notes: '',
    status: 'available'
  })

  const userRole = session?.user ? getUserRole(session.user) : null

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }

    if (session?.user) {
      if (!canManageProperties(userRole)) {
        router.push('/dashboard') // Redirect to dashboard instead of properties
        return
      }
    }
  }, [status, session, router, userRole])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Property name is required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        // Show success message and redirect to properties list
        alert(`Property "${data.property.name}" created successfully!`)
        router.push('/properties')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create property')
      }
    } catch (error) {
      console.error('Error creating property:', error)
      alert('Error creating property')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/properties">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Add New Property</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Basic Information</span>
                </CardTitle>
                <CardDescription>
                  Enter the basic details of your property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Property Name *
                    </label>
                    <Input
                      placeholder="e.g., Modern 3BHK Apartment"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Status
                    </label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        {userRole === ROLES.MASTER && (
                          <SelectItem value="private">Private</SelectItem>
                        )}
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Location
                    </label>
                    <Input
                      placeholder="e.g., Bandra West, Mumbai"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Price (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 5000000"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe the property features, amenities, etc."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media & Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Media & Documents</span>
                </CardTitle>
                <CardDescription>
                  Upload property photos and documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cover Image Upload */}
                <PhotoUpload
                  label="Cover Image"
                  description="Upload the main property photo"
                  value={formData.cover_image}
                  onChange={(url) => handleInputChange('cover_image', url)}
                  aspectRatio="aspect-video"
                />

                {/* Additional Images Upload */}
                <MultiplePhotoUpload
                  label="Additional Photos"
                  value={formData.images}
                  onChange={(urls) => handleInputChange('images', urls)}
                  maxPhotos={10}
                />

                {/* Document Upload */}
                <DocumentUpload
                  label="Property Document"
                  description="Upload a PDF document related to the property"
                  value={formData.documents?.[0]} // Assuming single document for now
                  onChange={(url) => handleInputChange('documents', [url])}
                />

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Google Maps Link
                  </label>
                  <Input
                    placeholder="https://maps.google.com/..."
                    value={formData.maps_link}
                    onChange={(e) => handleInputChange('maps_link', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste a Google Maps link for property location
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>
                  Private notes for internal use (not visible to clients)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Internal notes, reminders, special instructions..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Link href="/properties">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Property
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}