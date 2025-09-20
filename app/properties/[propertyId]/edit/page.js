'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
import MultipleDocumentUpload from '@/components/MultipleDocumentUpload'
import Link from 'next/link'

export default function EditPropertyPage({ params }) {
  const { propertyId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [property, setProperty] = useState(null)
  const [error, setError] = useState(null)
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
        router.push('/dashboard')
        return
      }
    }

    if (propertyId) {
      fetchProperty()
    }
  }, [status, session, router, propertyId, userRole])

  const fetchProperty = async () => {
    try {
      setFetchLoading(true)
      const response = await fetch(`/api/properties/${propertyId}`)
      const data = await response.json()
      
      if (response.ok) {
        setProperty(data.property)
        setFormData({
          name: data.property.name || '',
          location: data.property.location || '',
          price: data.property.price || '',
          description: data.property.description || '',
          cover_image: data.property.cover_image || '',
          images: Array.isArray(data.property.images) ? data.property.images : [],
          documents: Array.isArray(data.property.documents) ? data.property.documents : [],
          maps_link: data.property.maps_link || '',
          notes: data.property.notes || '',
          status: data.property.status || 'available'
        })
        setError(null)
      } else {
        setError(data.error || 'Property not found')
      }
    } catch (err) {
      console.error('Error fetching property:', err)
      setError('Failed to load property')
    } finally {
      setFetchLoading(false)
    }
  }

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
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Property "${data.property.name}" updated successfully!`)
        router.push(`/properties/${propertyId}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update property')
      }
    } catch (error) {
      console.error('Error updating property:', error)
      alert('Error updating property')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading property...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Property Not Found</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/properties">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href={`/properties/${propertyId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Property
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-card-foreground">Edit Property</h1>
                <p className="text-sm text-muted-foreground">Update property information</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Property Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter property name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Status
                  </label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location
                  </label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Enter location"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Price (₹)
                  </label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="Enter price"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter property description"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media & Links */}
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
              <MultipleDocumentUpload
                label="Property Documents"
                value={formData.documents || []}
                onChange={(documents) => handleInputChange('documents', documents)}
                maxDocuments={10}
                maxSize={200}
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Maps Link
                </label>
                <Input
                  type="url"
                  value={formData.maps_link}
                  onChange={(e) => handleInputChange('maps_link', e.target.value)}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>
                Any additional information about the property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter any additional notes"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href={`/properties/${propertyId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Property
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
