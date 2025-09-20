'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'

import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, ArrowLeft, Plus, Search, Filter, MapPin, DollarSign, 
  Eye, Edit, Calendar, User, X, Share, FileText, ChevronDown, ChevronUp,
  Archive
} from 'lucide-react'

import LoadingSpinner from '@/components/LoadingSpinner'
import LazyImage from '@/components/LazyImage'
import { getUserRole, canManageProperties, canAccessArchive, ROLES } from '@/lib/permissions'
import { useToast } from '@/hooks/use-toast'
import { shareProperty } from '@/lib/share'

const PROPERTY_STATUS_OPTIONS = [
  { value: 'all', label: 'All Properties' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' }
]

export default function PropertiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }
  }, [status, session, router])

  const fetchProperties = useCallback(async () => {
    if (!session) return

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (locationFilter) params.append('location', locationFilter)

      const response = await fetch(`/api/properties?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setProperties(data.properties || [])
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }, [session, searchTerm, statusFilter, locationFilter])

  const handleShare = async (propertyId, propertyTitle) => {
    await shareProperty(propertyId, propertyTitle, toast)
  }

  // Simple search input handler (no auto-search)
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value
    setSearchTerm(value)
  }, [])

  // Manual search trigger
  const handleSearch = useCallback(() => {
    setLoading(true)
    fetchProperties()
  }, [fetchProperties])

  // Handle Enter key press in search input
  const handleSearchKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  // Initial load - fetch all properties without search filters
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const initialFetch = async () => {
        try {
          const params = new URLSearchParams()
          if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
          if (locationFilter) params.append('location', locationFilter)

          const response = await fetch(`/api/properties?${params.toString()}`)
          const data = await response.json()
          
          if (response.ok) {
            setProperties(data.properties || [])
          }
        } catch (error) {
          console.error('Error fetching properties:', error)
        } finally {
          setLoading(false)
        }
      }
      
      initialFetch()
    }
  }, [status, session, statusFilter, locationFilter])

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'available': return 'green'
      case 'occupied': return 'blue'
      case 'maintenance': return 'orange'
      default: return 'gray'
    }
  }

  const userRole = getUserRole(session?.user)
  const canAddProperty = canManageProperties(userRole)
  const canViewArchive = canAccessArchive(userRole)

  // Toggle card expansion for metadata
  const toggleCardExpansion = useCallback((propertyId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId)
      } else {
        newSet.add(propertyId)
      }
      return newSet
    })
  }, [])

  // Helper function to safely parse images
  const parseImages = useCallback((images) => {
    if (!images) return []
    if (Array.isArray(images)) return images
    if (typeof images === 'string') {
      try {
        return JSON.parse(images)
      } catch {
        return []
      }
    }
    return []
  }, [])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading properties..." />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        session={session} 
        showBackButton={true} 
        backButtonLink="/dashboard"
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 max-w-7xl">
        <section 
          className="space-y-4"
          data-testid="properties-filters"
        >
          {/* Mobile Search and Filter Toggle Row */}
          <div className="flex gap-3 md:hidden">
            <div className="flex-1 relative">
              <Input 
                type="text" 
                placeholder="Search properties..." 
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={handleSearchKeyPress}
                data-testid="search-input"
                className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-all duration-150 hover:bg-accent"
                data-testid="search-button"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              data-testid="mobile-filter-toggle"
              className="flex-shrink-0 transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
            >
              {mobileFiltersOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile Add Property Button - Always visible outside filters */}
          <div className="flex flex-col sm:flex-row gap-3 md:hidden">
            {canAddProperty && (
              <Link href="/properties/new" className="flex-1">
                <Button 
                  variant="default" 
                  className="w-full transition-all duration-150 hover:bg-primary/90"
                  data-testid="add-property-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </Link>
            )}
            
            {canViewArchive && (
              <Link href="/properties/archive" className={canAddProperty ? "flex-shrink-0" : "flex-1"}>
                <Button 
                  variant="outline" 
                  className="w-full transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
                  data-testid="mobile-archive-button"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </Link>
            )}
          </div>

          {/* Filters Section */}
          <div 
            className={`${mobileFiltersOpen ? 'flex' : 'hidden'} md:flex flex-col space-y-4`}
            data-testid="filters-container"
          >
            {/* Desktop Search Input */}
            <div className="hidden md:flex relative">
              <Input 
                type="text" 
                placeholder="Search properties..." 
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={handleSearchKeyPress}
                data-testid="desktop-search-input"
                className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-all duration-150 hover:bg-accent"
                data-testid="desktop-search-button"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value)
                  // Filters will auto-trigger due to useEffect dependency
                }}
                data-testid="status-filter"
              >
                <SelectTrigger className="transition-all duration-150 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Property Status" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUS_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input 
                type="text" 
                placeholder="Filter by Location" 
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value)
                  // Filters will auto-trigger due to useEffect dependency
                }}
                data-testid="location-filter"
                className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Desktop Add Property Button - Inside filters for desktop */}
            <div className="hidden md:flex flex-col sm:flex-row gap-3">
              {canAddProperty && (
                <Link href="/properties/new" className="flex-1">
                  <Button 
                    variant="outline" 
                    className="w-full transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
                    data-testid="desktop-add-property-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </Link>
              )}
              
              {canViewArchive && (
                <Link href="/properties/archive" className={canAddProperty ? "flex-shrink-0" : "flex-1"}>
                  <Button 
                    variant="ghost" 
                    className="w-full transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
                    data-testid="archive-button"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        <section 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          data-testid="properties-grid"
        >
          {properties.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">No properties found. Try adjusting your filters.</p>
            </div>
          ) : (
            properties.map((property) => {
              const propertyImages = parseImages(property.images)
              const isExpanded = expandedCards.has(property.id)
              
              return (
                <div 
                  key={property.id} 
                  className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90 overflow-hidden"
                  data-testid="property-card"
                >
                  {/* Mobile Card Layout */}
                  <div className="md:hidden">
                    {/* Card Header with Logo Button */}
                    <div className="flex items-center justify-between p-4 pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="bg-primary/10 p-1.5 rounded-lg">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground text-sm">Property</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {canAddProperty && (
                          <Link href={`/properties/${property.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 px-2 transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleShare(property.id, property.title)}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Property Photos */}
                    <div className="px-4 pb-3">
                      {property.cover_image ? (
                        <Link href={`/properties/${property.id}`}>
                          <div className="relative rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-95 transition-opacity">
                            <LazyImage 
                              src={property.cover_image} 
                              alt={`${property.name || 'Property'}`}
                              className="w-full h-48 object-cover"
                            />
                            {/* Status Badge on Image */}
                            <Badge 
                              variant="secondary" 
                              className={`absolute top-2 right-2 text-xs font-medium rounded-full px-2 py-1 ${
                                property.status === 'available' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                property.status === 'occupied' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                property.status === 'maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                                'bg-muted text-muted-foreground border-muted'
                              }`}
                            >
                              {property.status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                            
                            {/* Additional Images Indicator */}
                            {propertyImages.length > 0 && (
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                                +{propertyImages.length} more
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <Link href={`/properties/${property.id}`}>
                          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        </Link>
                      )}
                    </div>


                    {/* Basic Information */}
                    <div className="px-4 pb-3 space-y-2">
                      <h3 className="font-semibold text-foreground text-lg leading-tight">
                        {property.name || 'Unnamed Property'}
                      </h3>
                      
                      {/* Price */}
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                          ₹{(property.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      {/* Location */}
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{property.location || 'Location not specified'}</span>
                      </div>
                    </div>

                    {/* Collapsible Metadata Section */}
                    <div className="border-t border-muted">
                      <button
                        onClick={() => toggleCardExpansion(property.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        <span>Property Details</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-muted-foreground border-t border-muted bg-muted/30">
                          {property.created_at && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-3 w-3" />
                              <span>Added: {new Date(property.created_at).toLocaleDateString()}</span>
                            </div>
                          )}
                          {property.users?.name && (
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3" />
                              <span>By: {property.users.name}</span>
                            </div>
                          )}
                          <div className="pt-2">
                            <Link href={`/properties/${property.id}`}>
                              <Button variant="outline" size="sm" className="w-full transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Card Layout */}
                  <div className="hidden md:block">
                    <div className="relative">
                      {property.cover_image ? (
                        <LazyImage 
                          src={property.cover_image || property.imageUrl || '/placeholder-property.jpg'} 
                          alt={`Property at ${property.name || property.address || 'Unnamed Location'}`}
                          className="w-full aspect-video object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-muted flex items-center justify-center">
                          <Building2 className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`absolute top-2 right-2 text-xs font-medium rounded-full px-2 py-1 ${
                          property.status === 'available' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                          property.status === 'occupied' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                          property.status === 'maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                          'bg-muted text-muted-foreground border-muted'
                        }`}
                      >
                        {property.status}
                      </Badge>
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground text-lg leading-tight">{property.name || property.address || 'Unnamed Property'}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm">{property.location || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">₹{(property.price || property.rent || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 p-4 pt-0 border-t border-muted">
                      <Link href={`/properties/${property.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      {canAddProperty && (
                        <Link href={`/properties/${property.id}/edit`}>
                          <Button variant="outline" size="sm" className="transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}