'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, TrendingUp, Users, Eye, Plus, DollarSign, UserCog } from 'lucide-react'

export default function QuickActions({ isMasterUser, stats }) {
  const actions = [
    {
      title: 'Properties',
      description: isMasterUser
        ? 'Manage your property portfolio, add new listings, and track status'
        : 'Browse and view available properties in the system',
      icon: Building2,
      color: 'text-blue-600',
      links: [
        {
          href: '/properties',
          label: 'View Properties',
          icon: Eye,
          variant: 'default',
        },
        {
          href: '/properties/new',
          label: 'Add New',
          icon: Plus,
          variant: 'outline',
          condition: isMasterUser,
        },
      ],
    },
    {
      title: 'Finance Tracking',
      description: 'Track payments, EMIs, and financial reports for your properties',
      icon: TrendingUp,
      color: 'text-green-600',
      condition: isMasterUser,
      links: [
        {
          href: '/finances',
          label: 'View Finances',
          icon: DollarSign,
          variant: 'default',
        },
        {
          href: '/finances/new',
          label: 'Add Record',
          icon: Plus,
          variant: 'outline',
        },
      ],
    },
    {
      title: 'User Management',
      description: 'Manage user access, roles, and permissions for the system',
      icon: UserCog,
      color: 'text-purple-600',
      condition: isMasterUser,
      links: [
        {
          href: '/admin/users',
          label: 'Manage Users',
          icon: Users,
          variant: 'default',
        },
      ],
      badge: stats.pendingUsers > 0 && (
        <Badge variant="destructive">{stats.pendingUsers} Pending</Badge>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {actions.map((action, index) =>
        action.condition !== false && (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span>{action.title}</span>
              </CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {action.links.map((link, linkIndex) =>
                  link.condition !== false && (
                    <Link key={linkIndex} href={link.href}>
                      <Button variant={link.variant}>
                        <link.icon className="h-4 w-4 mr-2" />
                        {link.label}
                      </Button>
                    </Link>
                  )
                )}
                {action.badge}
              </div>
            </CardContent>
          </Card>
        )
      )}

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
  )
}
