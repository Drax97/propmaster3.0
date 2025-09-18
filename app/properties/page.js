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
  Eye, Edit, Calendar, User, X, Share, FileText, ChevronDown, ChevronUp
} from 'lucide-react'

import LoadingSpinner from '@/components/LoadingSpinner'
import LazyImage from '@/components/LazyImage'
import { getUserRole, canManageProperties, ROLES } from '@/lib/permissions'

const PROPERTY_STATUS_OPTIONS = [
  { value: 'all', label: 'All Properties' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' }
]

export default function PropertiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
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
      <div className="properties-loading">
        <LoadingSpinner size="lg" text="Loading properties..." />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="properties-page">
      <Header 
        session={session} 
        showBackButton={true} 
        backButtonLink="/dashboard"
      />

      <main className="properties-main">
        <section 
          className="properties-filters"
          data-testid="properties-filters"
        >
          {/* Mobile Search and Filter Toggle Row */}
          <div className="mobile-search-filter-row">
            <div className="search-input">
              <Input 
                type="text" 
                placeholder="Search properties..." 
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={handleSearchKeyPress}
                data-testid="search-input"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSearch}
                className="search-button"
                data-testid="search-button"
              >
                <Search className="search-icon" />
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              data-testid="mobile-filter-toggle"
              className="filter-toggle-button"
            >
              {mobileFiltersOpen ? <X /> : <Filter />}
            </Button>
          </div>

          {/* Mobile Add Property Button - Always visible outside filters */}
          {canAddProperty && (
            <div className="mobile-add-property-section">
              <Link 
                href="/properties/new" 
                className="add-property-link"
              >
                <Button 
                  variant="default" 
                  className="add-property-button"
                  data-testid="add-property-button"
                >
                  <Plus className="button-icon" />
                  Add Property
                </Button>
              </Link>
            </div>
          )}

          {/* Filters Section */}
          <div 
            className={`filters-container ${mobileFiltersOpen ? 'filters-open' : ''}`}
            data-testid="filters-container"
          >
            {/* Desktop Search Input */}
            <div className="desktop-search-input">
              <Input 
                type="text" 
                placeholder="Search properties..." 
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={handleSearchKeyPress}
                data-testid="desktop-search-input"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSearch}
                className="search-button"
                data-testid="desktop-search-button"
              >
                <Search className="search-icon" />
              </Button>
            </div>

            <div className="filter-inputs">
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value)
                  // Filters will auto-trigger due to useEffect dependency
                }}
                data-testid="status-filter"
              >
                <SelectTrigger>
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
              />
            </div>

            {/* Desktop Add Property Button - Inside filters for desktop */}
            {canAddProperty && (
              <div className="desktop-add-property-section">
                <Link 
                  href="/properties/new" 
                  className="add-property-link"
                >
                  <Button 
                    variant="outline" 
                    className="add-property-button"
                    data-testid="desktop-add-property-button"
                  >
                    <Plus className="button-icon" />
                    Add Property
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section 
          className="properties-grid"
          data-testid="properties-grid"
        >
          {properties.length === 0 ? (
            <div className="no-properties-message">
              <p>No properties found. Try adjusting your filters.</p>
            </div>
          ) : (
            properties.map((property) => {
              const propertyImages = parseImages(property.images)
              const isExpanded = expandedCards.has(property.id)
              
              return (
                <div 
                  key={property.id} 
                  className="property-card-mobile md:property-card-desktop"
                  data-testid="property-card"
                >
                  {/* Mobile Card Layout */}
                  <div className="md:hidden">
                    {/* Card Header with Logo Button */}
                    <div className="flex items-center justify-between p-4 pb-2">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900 text-sm">Property</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canAddProperty && (
                          <Link href={`/properties/${property.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Property Photos */}
                    <div className="px-4 pb-3">
                      {property.cover_image ? (
                        <Link href={`/properties/${property.id}`}>
                          <div className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-95 transition-opacity">
                            <LazyImage 
                              src={property.cover_image} 
                              alt={`${property.name || 'Property'}`}
                              className="w-full h-48 object-cover"
                            />
                            {/* Status Badge on Image */}
                            <Badge 
                              variant="secondary" 
                              className={`absolute top-2 right-2 text-xs font-medium ${
                                property.status === 'available' ? 'bg-green-100 text-green-800' :
                                property.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                                property.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
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
                          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity">
                            <Building2 className="h-12 w-12 text-gray-400" />
                          </div>
                        </Link>
                      )}
                    </div>


                    {/* Basic Information */}
                    <div className="px-4 pb-3 space-y-2">
                      <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                        {property.name || 'Unnamed Property'}
                      </h3>
                      
                      {/* Price */}
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-green-600 text-lg">
                          ₹{(property.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      {/* Location */}
                      <div className="flex items-center space-x-1 text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{property.location || 'Location not specified'}</span>
                      </div>
                    </div>

                    {/* Collapsible Metadata Section */}
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => toggleCardExpansion(property.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <span>Property Details</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2 text-sm text-gray-600 border-t border-gray-100 bg-gray-50">
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
                              <Button variant="outline" size="sm" className="w-full">
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Card Layout (unchanged) */}
                  <div className="hidden md:block">
                    <div className="property-card-header">
                      <LazyImage 
                        src={property.cover_image || property.imageUrl || '/placeholder-property.jpg'} 
                        alt={`Property at ${property.name || property.address || 'Unnamed Location'}`}
                        className="property-image"
                      />
                      <Badge 
                        variant="outline" 
                        className={`status-badge status-${getStatusBadgeColor(property.status)}`}
                      >
                        {property.status}
                      </Badge>
                    </div>

                    <div className="property-card-content">
                      <h3 className="property-title">{property.name || property.address || 'Unnamed Property'}</h3>
                      <div className="property-details">
                        <div className="detail-item">
                          <MapPin className="detail-icon" />
                          <span>{property.location || 'Location not specified'}</span>
                        </div>
                        <div className="detail-item">
                          <DollarSign className="detail-icon" />
                          <span>Price: ₹{(property.price || property.rent || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="property-card-actions">
                      <Link href={`/properties/${property.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="button-icon" />
                          View Details
                        </Button>
                      </Link>
                      {canAddProperty && (
                        <Link href={`/properties/${property.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="button-icon" />
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