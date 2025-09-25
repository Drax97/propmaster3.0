'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Building2, Eye, DollarSign, Users } from 'lucide-react'

export default function StatsCards({ stats }) {
  const statsList = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      title: 'Available',
      value: stats.availableProperties,
      icon: Eye,
      color: 'text-green-600',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalReceivables.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
    },
    {
      title: 'Pending Users',
      value: stats.pendingUsers,
      icon: Users,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {statsList.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
