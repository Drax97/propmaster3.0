'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, ArrowLeft, Edit, Share, MapPin, DollarSign, 
  Calendar, User, FileText, Image as ImageIcon, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import LazyImage from '@/components/LazyImage'
import { useToast } from '@/hooks/use-toast'
import { shareProperty } from '@/lib/share'
import LoadingSpinner from '@/components/layout/LoadingSpinner'

export default function PropertyDetailPage({ params }) {
  const { propertyId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProperty()
  }, [propertyId])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}`)
      const data = await response.json()
      
      if (response.ok) {
        setProperty(data.property)
        setError(null)
      } else {
        setError(data.error || 'Property not found')
      }
    } catch (err) {
      console.error('Error fetching property:', err)
      setError('Failed to load property')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'sold': return 'bg-blue-100 text-blue-800'
      case 'rented': return 'bg-purple-100 text-purple-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return 'Price not set'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleShare = async () => {
    if (property) {
      await shareProperty(propertyId, property.title, toast)
    }
  }

  // Helper function to safely parse images/documents
  const parseArrayField = (field) => {
    if (!field) return []
    if (Array.isArray(field)) return field
    if (typeof field === 'string') {
      try {
        return JSON.parse(field)
      } catch {
        return []
      }
    }
    return []
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading property details..." />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Property Not Found</h3>
          <p className="text-gray-600 mb-4">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          {/* Mobile Header Layout */}
          <div className="flex flex-col space-y-3 sm:hidden">
            <div className="flex items-center justify-between">
              <Link href="/properties">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-200 hover:bg-slate-800">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">Back to Properties</span>
                  <span className="xs:hidden">Back</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                <h1 className="text-lg font-bold text-white">Property Details</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-800" onClick={handleShare}>
                <Share className="h-4 w-4 mr-1" />
                <span>Share</span>
              </Button>
              <Link href={`/properties/${propertyId}/edit`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
                  <Edit className="h-4 w-4 mr-1" />
                  <span>Edit</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop Header Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/properties">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-200 hover:bg-slate-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-400" />
                <h1 className="text-xl font-bold text-white">Property Details</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share Property
              </Button>
              <Link href={`/properties/${propertyId}/edit`}>
                <Button variant="secondary" className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Property
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Property Header */}
          <div className="mb-6 sm:mb-8">
            {/* Mobile Property Header */}
            <div className="sm:hidden">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{property.name}</h1>
              <div className="flex flex-col space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{property.location || 'Location not specified'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusBadgeColor(property.status)}>
                    {property.status?.toUpperCase()}
                  </Badge>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(property.price)}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Property Header */}
            <div className="hidden sm:block">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location || 'Location not specified'}</span>
                    </div>
                    <Badge className={getStatusBadgeColor(property.status)}>
                      {property.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(property.price)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photos and Documents Section - Top of Page */}
          <div className="mb-6 lg:mb-8">
            {/* Cover Image */}
            <Card className="mb-6">
              <CardContent className="p-0">
                <LazyImage
                  src={property.cover_image}
                  alt={property.name}
                  className="rounded-lg"
                  aspectRatio="aspect-video"
                  fallbackIcon={ImageIcon}
                />
              </CardContent>
            </Card>

            {/* Additional Images and Documents Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Additional Images */}
              {parseArrayField(property.images).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <ImageIcon className="h-5 w-5" />
                      <span>Additional Images</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      {parseArrayField(property.images).slice(0, 4).map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`${property.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      ))}
                      {parseArrayField(property.images).length > 4 && (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                          <span className="text-sm font-medium">+{parseArrayField(property.images).length - 4} more</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents Section */}
              {parseArrayField(property.documents).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <FileText className="h-5 w-5" />
                      <span>Documents</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {parseArrayField(property.documents).map((doc, index) => (
                        <a
                          key={index}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Document {index + 1}</span>
                          <ExternalLink className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              {/* Description */}
              {property.description && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <FileText className="h-5 w-5" />
                      <span>Description</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{property.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6 order-first lg:order-last">
              {/* Additional Information */}
              {property.maps_link && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Map Location</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <a 
                      href={property.maps_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm"
                    >
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      <span>View on Maps</span>
                    </a>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Property Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created By</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{property.users?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created Date</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{formatDate(property.created_at)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{formatDate(property.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Internal Notes */}
              {property.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Internal Notes</CardTitle>
                    <CardDescription className="text-sm">Private notes (not visible to clients)</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-700 text-sm leading-relaxed">{property.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}