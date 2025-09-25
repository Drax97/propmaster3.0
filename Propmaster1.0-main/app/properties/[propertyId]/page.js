'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
<<<<<<< HEAD
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
import { 
  Building2, ArrowLeft, Edit, Share, MapPin, DollarSign, 
  Calendar, User, FileText, Image as ImageIcon, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

<<<<<<< HEAD
const PropertyDetailLoading = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-36" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
    </header>
    <main className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/6" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardContent className="p-0">
                <Skeleton className="aspect-video rounded-lg" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  </div>
);

=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
export default function PropertyDetailPage({ params }) {
  const { propertyId } = params
  const router = useRouter()
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

  if (loading) {
<<<<<<< HEAD
    return <PropertyDetailLoading />
=======
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
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
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/properties">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Property Details</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Share className="h-4 w-4 mr-2" />
                Share Property
              </Button>
              <Link href={`/properties/${propertyId}/edit`}>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Property
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Property Header */}
          <div className="mb-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Cover Image */}
              <Card>
                <CardContent className="p-0">
<<<<<<< HEAD
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                    {property.cover_image ? (
                      <Image
                        src={property.cover_image}
                        alt={property.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 66vw"
=======
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {property.cover_image ? (
                      <img
                        src={property.cover_image}
                        alt={property.name}
                        className="w-full h-full object-cover"
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-gray-400" />
                        <p className="ml-4 text-gray-500">No image available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {property.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Description</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{property.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Additional Images */}
              {property.images && JSON.parse(property.images).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5" />
                      <span>Additional Images</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {JSON.parse(property.images).map((image, index) => (
<<<<<<< HEAD
                        <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                          <Image
                            src={image}
                            alt={`${property.name} - Image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
=======
                        <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`${property.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Price</label>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(property.price)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div>
                      <Badge className={getStatusBadgeColor(property.status)}>
                        {property.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <div className="text-gray-900">{property.location || 'Not specified'}</div>
                  </div>
                  
                  {property.maps_link && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Map Location</label>
                      <div>
                        <a 
                          href={property.maps_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>View on Maps</span>
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created By</label>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{property.users?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created Date</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(property.created_at)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(property.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Internal Notes */}
              {property.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Internal Notes</CardTitle>
                    <CardDescription>Private notes (not visible to clients)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 text-sm">{property.notes}</p>
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