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
import MultipleDocumentUpload from '@/components/MultipleDocumentUpload'
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/properties">
              <Button variant="outline" size="sm" className="transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Add New Property</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Basic Information */}
            <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <span>Basic Information</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter the basic details of your property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Property Name *
                    </label>
                    <Input
                      placeholder="e.g., Modern 3BHK Apartment"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Status
                    </label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger className="transition-all duration-150 focus:ring-2 focus:ring-primary/20">
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
                    <label className="text-sm font-medium text-foreground mb-2 block flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                      Location
                    </label>
                    <Input
                      placeholder="e.g., Bandra West, Mumbai"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                      Price (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 5000000"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe the property features, amenities, etc."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media & Documents */}
            <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <div className="bg-green-500/10 p-2 rounded-lg">
                    <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span>Media & Documents</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
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
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Google Maps Link
                  </label>
                  <Input
                    placeholder="https://maps.google.com/..."
                    value={formData.maps_link}
                    onChange={(e) => handleInputChange('maps_link', e.target.value)}
                    className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste a Google Maps link for property location
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Additional Notes</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Private notes for internal use (not visible to clients)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Internal notes, reminders, special instructions..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Link href="/properties">
                <Button variant="outline" type="button" className="w-full sm:w-auto transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto transition-all duration-150 hover:bg-primary/90">
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