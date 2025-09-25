'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, 
  IndianRupee, 
  Calendar, 
  Download, 
  Eye,
  Clock,
  User,
  Mail,
  Phone,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function SharedPropertyPage() {
  const { shareToken } = useParams()
  const [property, setProperty] = useState(null)
  const [shareInfo, setShareInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [requiresClientInfo, setRequiresClientInfo] = useState(false)
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [submittingClientInfo, setSubmittingClientInfo] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    if (shareToken) {
      loadSharedProperty()
    }
  }, [shareToken])

  const loadSharedProperty = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/share/${shareToken}`)
      const data = await response.json()

      if (!response.ok) {
        if (data.error_code === 'CLIENT_INFO_REQUIRED') {
          setRequiresClientInfo(true)
          setError(null)
        } else {
          setError(data.error || 'Failed to load property')
        }
        return
      }

      setProperty(data.property)
      setShareInfo(data.share_info)
      setRequiresClientInfo(false)
      
    } catch (err) {
      console.error('Failed to load shared property:', err)
      setError('Failed to load property. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitClientInfo = async (e) => {
    e.preventDefault()
    
    if (!clientInfo.name.trim() || !clientInfo.email.trim()) {
      setError('Name and email are required')
      return
    }

    try {
      setSubmittingClientInfo(true)
      setError(null)

      const response = await fetch(`/api/share/${shareToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientInfo)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit information')
        return
      }

      setProperty(data.property)
      setShareInfo(data.share_info)
      setRequiresClientInfo(false)
      
    } catch (err) {
      console.error('Failed to submit client info:', err)
      setError('Failed to submit information. Please try again.')
    } finally {
      setSubmittingClientInfo(false)
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Price on request'
    return `₹${price.toLocaleString()}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysUntilExpiry = (expiresAt) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (error && !requiresClientInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Access Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="text-sm text-gray-500">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The sharing link has expired</li>
                <li>The link has been deactivated</li>
                <li>The view limit has been reached</li>
                <li>The link is invalid</li>
              </ul>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Please contact the person who shared this link for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requiresClientInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Property Access
            </CardTitle>
            <p className="text-sm text-gray-600">
              Please provide your information to view this property
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={submitClientInfo} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({...clientInfo, email: e.target.value})}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({...clientInfo, phone: e.target.value})}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={submittingClientInfo}
              >
                {submittingClientInfo ? 'Submitting...' : 'View Property'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Property not found</p>
        </div>
      </div>
    )
  }

  const images = property.images || []
  const documents = property.documents || []
  const hasImages = images.length > 0
  const hasDocuments = documents.length > 0
  const daysUntilExpiry = getDaysUntilExpiry(shareInfo.expires_at)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property Viewing</h1>
              <p className="text-sm text-gray-500">
                Shared by PropMaster Real Estate
              </p>
            </div>
            
            {daysUntilExpiry > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Custom Message */}
        {shareInfo.custom_message && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {shareInfo.custom_message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Images */}
            <Card>
              <CardContent className="p-0">
                {hasImages ? (
                  <div>
                    {/* Main Image */}
                    <div className="relative aspect-video bg-gray-100">
                      <Image
                        src={images[selectedImageIndex]}
                        alt={`${property.name} - Image ${selectedImageIndex + 1}`}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    </div>
                    
                    {/* Image Thumbnails */}
                    {images.length > 1 && (
                      <div className="p-4">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`relative aspect-square rounded-md overflow-hidden border-2 ${
                                selectedImageIndex === index 
                                  ? 'border-blue-500' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Image
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : property.cover_image ? (
                  <div className="relative aspect-video bg-gray-100">
                    <Image
                      src={property.cover_image}
                      alt={property.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No images available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{property.name}</CardTitle>
                {property.location && (
                  <p className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {property.location}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-lg">
                      {formatPrice(property.price)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {property.status || 'Available'}
                    </Badge>
                  </div>
                </div>

                {property.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {property.description}
                    </p>
                  </div>
                )}

                {property.maps_link && (
                  <div className="mt-6">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link 
                        href={property.maps_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Maps
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            {hasDocuments && shareInfo.allow_downloads && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {documents.map((doc, index) => (
                      <Button
                        key={index}
                        asChild
                        variant="outline"
                        className="justify-start"
                      >
                        <Link 
                          href={doc.url || doc} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          {doc.name || `Document ${index + 1}`}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Viewing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Views</span>
                  <span className="font-medium">{shareInfo.view_count}</span>
                </div>
                
                {shareInfo.allowed_views && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">View Limit</span>
                    <span className="font-medium">
                      {shareInfo.view_count} / {shareInfo.allowed_views}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expires</span>
                  <span className="font-medium text-sm">
                    {formatDate(shareInfo.expires_at)}
                  </span>
                </div>
                
                {shareInfo.client_name && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-gray-600">Shared with</span>
                    <p className="font-medium">{shareInfo.client_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Interested in this property?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Contact us for more information, scheduling a visit, or to discuss your requirements.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>PropMaster Real Estate</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Available for viewings</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                  <p>This property was shared using PropMaster Real Estate Management System</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
