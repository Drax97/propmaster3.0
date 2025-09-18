'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
<<<<<<< HEAD
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Settings, LogOut } from 'lucide-react'
import { USER_ROLES, PERMISSIONS, getUserPermissions, hasPermission, canAccessDashboard } from '@/lib/supabase'
import Link from 'next/link'
import StatsCards from '@/components/StatsCards'
import QuickActions from '@/components/QuickActions'

const DashboardLoading = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8" />
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="text-right sm:text-left">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
            </div>
            <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start space-x-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </div>
    </header>

    <main className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
              </CardTitle>
              <Skeleton className="h-4 w-full mt-1" />
              <Skeleton className="h-4 w-4/5 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  </div>
);
=======
import { Building2, TrendingUp, Users, Settings, LogOut, Plus, Eye, DollarSign, UserCog } from 'lucide-react'
import { USER_ROLES, PERMISSIONS, getUserPermissions, hasPermission, canAccessDashboard } from '@/lib/supabase'
import Link from 'next/link'
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalProperties: 0,
    availableProperties: 0,
    totalReceivables: 0,
    pendingPayments: 0,
    pendingUsers: 0
  })
  const [loading, setLoading] = useState(true)

  const loadDashboardStats = async () => {
    // For now, just set loading to false since we're focusing on property viewing
    setLoading(false)
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Check if user has pending access
    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }

    // All authenticated users with active status can access dashboard
    // Master users get full access, others get property viewing access
    if (session?.user?.status === 'active') {
      // User has access - load dashboard stats
      loadDashboardStats()
    }
  }, [status, session, router])

  if (status === 'loading' || loading) {
<<<<<<< HEAD
    return <DashboardLoading />
=======
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
  }

  if (!session) {
    return null
  }

  const isMasterUser = session.user.isMaster
  const userRole = session.user.role

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
<<<<<<< HEAD
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
=======
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PropMaster</h1>
                <p className="text-sm text-gray-600">Real Estate Management</p>
              </div>
            </div>
            
<<<<<<< HEAD
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* User Info */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start space-x-3">
=======
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                <Avatar>
                  <AvatarImage src={session.user.image} />
                  <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
<<<<<<< HEAD
                <div className="text-right sm:text-left">
=======
                <div className="hidden md:block">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                  <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {session.user.role?.toUpperCase()}
                    </Badge>
<<<<<<< HEAD
                    <span className="hidden md:inline-flex text-xs text-gray-500">{session.user.email}</span>
=======
                    <span className="text-xs text-gray-500">{session.user.email}</span>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
<<<<<<< HEAD
              <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start space-x-2">
                {isMasterUser && (
                  <Link href="/settings" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full">
=======
              <div className="flex items-center space-x-2">
                {isMasterUser && (
                  <Link href="/settings">
                    <Button variant="outline" size="sm">
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                )}
<<<<<<< HEAD
                <Button variant="outline" size="sm" onClick={() => signOut()} className="w-full sm:w-auto">
=======
                <Button variant="outline" size="sm" onClick={() => signOut()}>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user.name}!
          </h2>
          <p className="text-gray-600">
            {isMasterUser ? 
              'Manage your real estate portfolio, finances, and users.' :
              'Browse and view available properties in the system.'
            }
          </p>
        </div>

        {/* Quick Stats for Master Users */}
<<<<<<< HEAD
        {isMasterUser && <StatsCards stats={stats} />}

        {/* Quick Actions */}
        <QuickActions isMasterUser={isMasterUser} stats={stats} />
=======
        {isMasterUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Properties</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available</p>
                    <p className="text-2xl font-bold text-green-600">{stats.availableProperties}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">₹{stats.totalReceivables.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Users</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.pendingUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Properties - Available to Everyone */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Properties</span>
              </CardTitle>
              <CardDescription>
                {isMasterUser ? 
                  'Manage your property portfolio, add new listings, and track status' :
                  'Browse and view available properties in the system'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Link href="/properties">
                  <Button>
                    <Eye className="h-4 w-4 mr-2" />
                    View Properties
                  </Button>
                </Link>
                {isMasterUser && (
                  <Link href="/properties/new">
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Master-Only Features */}
          {isMasterUser && (
            <>
              {/* Finance Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span>Finance Tracking</span>
                  </CardTitle>
                  <CardDescription>
                    Track payments, EMIs, and financial reports for your properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Link href="/finances">
                      <Button>
                        <DollarSign className="h-4 w-4 mr-2" />
                        View Finances
                      </Button>
                    </Link>
                    <Link href="/finances/new">
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Record
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* User Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCog className="h-5 w-5 text-purple-600" />
                    <span>User Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage user access, roles, and permissions for the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Link href="/admin/users">
                      <Button>
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                    </Link>
                    {stats.pendingUsers > 0 && (
                      <Badge variant="destructive">
                        {stats.pendingUsers} Pending
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Property Viewer Message */}
          {!isMasterUser && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <span>Your Access Level</span>
                </CardTitle>
                <CardDescription>
                  You have property viewing access to browse available listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>✅ View all properties</p>
                  <p>✅ Browse property details</p>
                  <p>✅ Access property information</p>
                  <div className="mt-4">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Property Viewer Access
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771

        {/* Recent Activity Section for Master Users */}
        {isMasterUser && (
          <div className="mt-12">
<<<<<<< HEAD
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
=======
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                  <CardDescription>
                    Current status of your PropMaster system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">User Authentication</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Property System</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Operational
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    New to PropMaster? Here's what you can do
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/properties/new">
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Property
                      </Button>
                    </Link>
                    <Link href="/admin/users">
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Manage User Access
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}