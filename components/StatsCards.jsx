'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Building2, Eye, DollarSign, Users } from 'lucide-react'

export default function StatsCards({ stats }) {
  // Provide default values to prevent undefined errors
  const safeStats = {
    pendingUsers: stats.pendingUsers || 0,
    totalProperties: stats.totalProperties || 0,
    availableProperties: stats.availableProperties || 0,
    totalReceivables: stats.totalReceivables || 0
  }

  return (
    <div className="stats-grid mb-8">
      <Card className="stats-card stats-card-users">
        <CardContent className="p-6 flex items-center justify-center w-full h-full">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{safeStats.pendingUsers}</p>
            <Users className="h-8 w-8 text-gray-600 mt-2" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="stats-card stats-card-properties">
        <CardContent className="p-6 flex items-center justify-center w-full h-full">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Properties</p>
            <p className="text-2xl font-bold text-blue-600">{safeStats.totalProperties}</p>
            <Building2 className="h-8 w-8 text-blue-600 mt-2" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="stats-card stats-card-available">
        <CardContent className="p-6 flex items-center justify-center w-full h-full">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Available Properties</p>
            <p className="text-2xl font-bold text-blue-600">{safeStats.availableProperties}</p>
            <Eye className="h-8 w-8 text-blue-600 mt-2" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="stats-card stats-card-unpaid">
        <CardContent className="p-6 flex items-center justify-center w-full h-full">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Unpaid Money</p>
            <p className="text-2xl font-bold text-purple-600">₹{safeStats.totalReceivables.toLocaleString()}</p>
            <DollarSign className="h-8 w-8 text-purple-600 mt-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
