'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

import Header from '@/components/layout/Header'
import ArchiveManager from '@/components/management/ArchiveManager'
import LoadingSpinner from '@/components/layout/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Archive, 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  TrendingDown,
  TrendingUp,
  Settings,
  Info
} from 'lucide-react'

import { getUserRole, canAccessArchive } from '@/lib/permissions'
import { useToast } from '@/hooks/use-toast'

export default function ArchivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [properties, setProperties] = useState([])
  const [archiveStats, setArchiveStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [archiveSetupStatus, setArchiveSetupStatus] = useState(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const userRole = getUserRole(session?.user)
  const canAccess = canAccessArchive(userRole)

  // Check if user has permission to access archive (master only)
  useEffect(() => {
    if (status === 'authenticated' && !canAccess) {
      toast({
        title: 'Access Denied',
        description: 'Archive access is restricted to master users only.',
        variant: 'destructive'
      })
      router.push('/properties')
    }
  }, [status, canAccess, router, toast])

  // Fetch properties and archive setup status
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch all properties (including archived)
      const propertiesResponse = await fetch('/api/properties?includeArchived=true')
      const propertiesData = await propertiesResponse.json()
      
      if (propertiesResponse.ok) {
        setProperties(propertiesData.properties || [])
      } else {
        throw new Error(propertiesData.error || 'Failed to fetch properties')
      }

      // Check archive setup status
      const setupResponse = await fetch('/api/database/add-archive-fields')
      const setupData = await setupResponse.json()
      setArchiveSetupStatus(setupData)

      // Fetch archive statistics if available
      if (setupData.archiveFieldsExist) {
        try {
          const statsResponse = await fetch('/api/properties/archive/stats')
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            setArchiveStats(statsData)
          }
        } catch (err) {
          console.warn('Could not fetch archive statistics:', err)
        }
      }

    } catch (error) {
      console.error('Error fetching archive data:', error)
      setError(error.message)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load archive data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Setup archive functionality
  const setupArchive = async () => {
    try {
      toast({
        title: 'Setting up archive...',
        description: 'Please wait while we configure the archive functionality.'
      })

      const response = await fetch('/api/database/add-archive-fields', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Archive Setup Complete',
          description: 'Archive functionality has been successfully configured.',
          variant: 'default'
        })
        
        // Refresh data
        await fetchData()
      } else {
        throw new Error(data.error || 'Failed to setup archive')
      }
    } catch (error) {
      console.error('Archive setup error:', error)
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to setup archive functionality',
        variant: 'destructive'
      })
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (status === 'authenticated' && canAccess) {
      fetchData()
    }
  }, [status, canAccess])

  // Calculate archive statistics
  const calculateStats = () => {
    const total = properties.length
    const archived = properties.filter(p => p.status === 'archived').length
    const active = total - archived
    
    // Calculate archive trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentlyArchived = properties.filter(p => 
      p.status === 'archived' && 
      p.archived_at && 
      new Date(p.archived_at) >= thirtyDaysAgo
    ).length

    // Group archived properties by month
    const archivedByMonth = properties
      .filter(p => p.status === 'archived' && p.archived_at)
      .reduce((acc, property) => {
        const month = new Date(property.archived_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {})

    return {
      total,
      archived,
      active,
      recentlyArchived,
      archivedByMonth,
      archiveRate: total > 0 ? ((archived / total) * 100).toFixed(1) : 0
    }
  }

  const stats = calculateStats()

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/properties">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Archive className="w-8 h-8 mr-3 text-blue-600" />
                Property Archive
              </h1>
              <p className="text-gray-600 mt-2">
                Manage archived properties and view archive statistics
              </p>
            </div>
            
            {userRole === 'master' && (
              <Button variant="outline" onClick={setupArchive}>
                <Settings className="w-4 h-4 mr-2" />
                Setup Archive
              </Button>
            )}
          </div>
        </div>

        {/* Archive Setup Status */}
        {archiveSetupStatus && !archiveSetupStatus.archiveFieldsExist && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Archive functionality not set up.</strong> Click "Setup Archive" to enable archiving features.
              </div>
              {userRole === 'master' && (
                <Button size="sm" onClick={setupArchive}>
                  Setup Now
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Archive Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All properties in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived Properties</CardTitle>
              <Archive className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.archived}</div>
              <p className="text-xs text-muted-foreground">
                {stats.archiveRate}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Archived</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recentlyArchived}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Archive Trends */}
        {Object.keys(stats.archivedByMonth).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Archive Activity</CardTitle>
              <CardDescription>
                Properties archived by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.archivedByMonth)
                  .sort(([a], [b]) => new Date(a) - new Date(b))
                  .map(([month, count]) => (
                    <Badge key={month} variant="secondary" className="text-sm">
                      {month}: {count}
                    </Badge>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Archive Manager */}
        {archiveSetupStatus?.archiveFieldsExist ? (
          <Card>
            <CardHeader>
              <CardTitle>Archive Management</CardTitle>
              <CardDescription>
                Select properties to archive, restore, or perform bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchiveManager
                properties={properties}
                onPropertiesUpdate={fetchData}
                userRole={userRole}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Archive Setup Required</CardTitle>
              <CardDescription>
                Archive functionality needs to be set up before you can manage archived properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  Archive functionality is not yet configured for your database.
                </p>
                {userRole === 'master' ? (
                  <Button onClick={setupArchive}>
                    <Settings className="w-4 h-4 mr-2" />
                    Setup Archive Functionality
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Please contact your administrator to set up archive functionality.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
