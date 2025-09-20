'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, TrendingUp, UserCog, Eye, Plus, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'
import { ROLES, canManageProperties, canManageOwnFinances } from '@/lib/permissions'

export default function QuickActions({ userRole, stats }) {
  const isMasterUser = userRole === ROLES.MASTER
  const isEditor = userRole === ROLES.EDITOR
  const isViewer = userRole === ROLES.VIEWER

  const showAddProperty = canManageProperties(userRole)
  const showFinances = canManageOwnFinances(userRole)

  const getPropertyCardDescription = () => {
    if (isMasterUser) return 'Manage your property portfolio, add new listings, and track status'
    if (isEditor) return 'Manage properties, add new listings, and view details'
    return 'Browse and view available properties in the system'
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Properties - Available to Everyone */}
      <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Properties</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {getPropertyCardDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2">
            <Link href="/properties" className="flex-1">
              <Button className="w-full transition-all duration-150 hover:bg-primary/90 text-sm sm:text-base">
                <Eye className="h-4 w-4 mr-2" />
                View Properties
              </Button>
            </Link>
            {showAddProperty && (
              <Link href="/properties/new" className="sm:flex-shrink-0">
                <Button variant="outline" className="w-full sm:w-auto transition-all duration-150 hover:bg-accent hover:text-accent-foreground text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Add Property</span>
                  <span className="hidden sm:inline">Add New</span>
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Finance Management */}
      {showFinances && (
        <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="bg-green-500/10 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span>Finance Tracking</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Track payments, EMIs, and financial reports for your properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2">
              <Link href="/finances" className="flex-1">
                <Button className="w-full transition-all duration-150 hover:bg-primary/90 text-sm sm:text-base">
                  <DollarSign className="h-4 w-4 mr-2" />
                  View Finances
                </Button>
              </Link>
              {isMasterUser && (
                <Link href="/finances/new" className="sm:flex-shrink-0">
                  <Button variant="outline" className="w-full sm:w-auto transition-all duration-150 hover:bg-accent hover:text-accent-foreground text-sm sm:text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="sm:hidden">Add Finance Record</span>
                    <span className="hidden sm:inline">Add Record</span>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      {isMasterUser && (
        <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <UserCog className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span>User Management</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage user access, roles, and permissions for the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2">
              <Link href="/admin/users" className="flex-1">
                <Button className="w-full relative transition-all duration-150 hover:bg-primary/90 text-sm sm:text-base">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                  {stats?.pendingUsers > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full animate-pulse">
                      {stats.pendingUsers}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Viewer Message */}
      {isViewer && (
        <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="bg-muted/50 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
              <span>Your Access Level</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              You have property viewing access to browse available listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-foreground">View all properties</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-foreground">Browse property details</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-foreground">Access property information</p>
              </div>
              <div className="mt-4">
                <Badge variant="outline" className="rounded-full px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  Property Viewer Access
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
