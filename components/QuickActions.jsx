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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Properties - Available to Everyone */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span>Properties</span>
          </CardTitle>
          <CardDescription>
            {getPropertyCardDescription()}
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
            {showAddProperty && (
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

      {/* Finance Management */}
      {showFinances && (
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
              {isMasterUser && (
                <Link href="/finances/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      {isMasterUser && (
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
              {stats?.pendingUsers > 0 && (
                <Badge variant="destructive">
                  {stats.pendingUsers} Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Viewer Message */}
      {isViewer && (
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
  )
}
