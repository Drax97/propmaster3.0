'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
<<<<<<< HEAD
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
import { 
  Building2, ArrowLeft, Plus, Search, Filter, MapPin, DollarSign, 
  Eye, Edit, Calendar, User
} from 'lucide-react'
import Link from 'next/link'

<<<<<<< HEAD
const PropertiesLoading = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-36" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </header>

    <main className="container mx-auto px-6 py-8">
      {/* Search and Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-full mt-1" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              <Skeleton className="aspect-video rounded-t-lg" />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/4 ml-2" />
                </div>
                <div className="space-y-1.5 mb-3 text-xs flex-1">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-3/6" />
                </div>
                <div className="flex space-x-2 mt-auto pt-3 border-t">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  </div>
);


=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
export default function PropertiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
<<<<<<< HEAD
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchProperties = async (reset = false) => {
    if (reset) {
      setPage(1)
      setProperties([])
    }

    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

=======

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }

    fetchProperties()
  }, [status, session, router])

  const fetchProperties = async () => {
    try {
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (locationFilter) params.append('location', locationFilter)
<<<<<<< HEAD
      params.append('page', reset ? 1 : page)
      params.append('limit', '12')
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771

      const response = await fetch(`/api/properties?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
<<<<<<< HEAD
        setProperties(prev => reset ? data.properties : [...prev, ...data.properties])
        setTotalPages(data.totalPages)
        if (reset) setPage(2)
        else setPage(prev => prev + 1)
=======
        setProperties(data.properties || [])
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
<<<<<<< HEAD
      setLoadingMore(false)
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
<<<<<<< HEAD
      fetchProperties(true)
=======
      fetchProperties()
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
    }
  }, [searchTerm, statusFilter, locationFilter, status])

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
      month: 'short',
      day: 'numeric'
    })
  }

  if (status === 'loading' || loading) {
<<<<<<< HEAD
    return <PropertiesLoading />
=======
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
  }

  if (!session) {
    return null
  }

  const isMasterUser = session.user.isMaster

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
<<<<<<< HEAD
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
=======
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Properties</h1>
              </div>
            </div>
            
            {isMasterUser && (
<<<<<<< HEAD
              <Link href="/properties/new" className="w-full sm:w-auto">
                <Button className="w-full">
=======
              <Link href="/properties/new">
                <Button>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search & Filter</span>
            </CardTitle>
            <CardDescription>
              Find properties by name, location, or other criteria
            </CardDescription>
          </CardHeader>
<<<<<<< HEAD
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2 md:col-span-1">
=======
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search Properties
                </label>
                <Input
                  placeholder="Search by name, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Status Filter
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Location Filter
                </label>
                <Input
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {properties.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || locationFilter
                  ? 'No properties match your current filters.'
                  : 'No properties have been added yet.'}
              </p>
              {isMasterUser && !searchTerm && statusFilter === 'all' && !locationFilter && (
                <Link href="/properties/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Property
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
<<<<<<< HEAD
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Property Image */}
                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                    {property.cover_image ? (
                      <Image
                        src={property.cover_image}
                        alt={property.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
=======
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Property Image */}
                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                    {property.cover_image ? (
                      <img
                        src={property.cover_image}
                        alt={property.name}
                        className="w-full h-full object-cover"
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Property Details */}
<<<<<<< HEAD
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
                        {property.name}
                      </h3>
                      <Badge className={`ml-2 text-xs ${getStatusBadgeColor(property.status)}`}>
=======
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                        {property.name}
                      </h3>
                      <Badge className={`ml-2 ${getStatusBadgeColor(property.status)}`}>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                        {property.status?.toUpperCase()}
                      </Badge>
                    </div>
                    
<<<<<<< HEAD
                    <div className="space-y-1.5 mb-3 text-xs text-gray-600 flex-1">
                      <div className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span className="truncate">
=======
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="text-sm truncate">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                          {property.location || 'Location not specified'}
                        </span>
                      </div>
                      
<<<<<<< HEAD
                      <div className="flex items-center">
                        <DollarSign className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span className="font-medium text-green-600">
=======
                      <div className="flex items-center text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium text-green-600">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                          {formatCurrency(property.price)}
                        </span>
                      </div>
                      
<<<<<<< HEAD
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span>
                          Added {formatDate(property.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 mt-auto pt-3 border-t border-gray-100">
                      <Link href={`/properties/${property.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View
=======
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-xs">
                          Added {formatDate(property.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span className="text-xs">
                          By {property.users?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    {property.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {property.description}
                      </p>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Link href={`/properties/${property.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                        </Button>
                      </Link>
                      
                      {isMasterUser && (
                        <Link href={`/properties/${property.id}/edit`}>
<<<<<<< HEAD
                          <Button variant="default" size="sm">
=======
                          <Button variant="outline" size="sm">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

<<<<<<< HEAD
        {/* Load More Button */}
        {properties.length > 0 && page <= totalPages && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => fetchProperties()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
=======
        {/* Properties Count */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Showing {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter !== 'all' && ` with status "${statusFilter}"`}
            {locationFilter && ` in "${locationFilter}"`}
          </p>
        </div>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      </main>
    </div>
  )
}