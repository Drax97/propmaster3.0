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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {/* Total Users Card */}
      <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border-l-4 border-l-blue-500 bg-card/90 min-h-[120px] sm:min-h-[140px]">
        <CardContent className="p-4 sm:p-6 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">Total Users</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 break-all">{safeStats.pendingUsers}</p>
            </div>
            <div className="bg-blue-500/10 p-2 sm:p-3 rounded-xl ml-2 sm:ml-3 flex-shrink-0">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Total Properties Card */}
      <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border-l-4 border-l-primary bg-card/90 min-h-[120px] sm:min-h-[140px]">
        <CardContent className="p-4 sm:p-6 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">Total Properties</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary break-all">{safeStats.totalProperties}</p>
            </div>
            <div className="bg-primary/10 p-2 sm:p-3 rounded-xl ml-2 sm:ml-3 flex-shrink-0">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Available Properties Card */}
      <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border-l-4 border-l-green-500 bg-card/90 min-h-[120px] sm:min-h-[140px]">
        <CardContent className="p-4 sm:p-6 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">Available Properties</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400 break-all">{safeStats.availableProperties}</p>
            </div>
            <div className="bg-green-500/10 p-2 sm:p-3 rounded-xl ml-2 sm:ml-3 flex-shrink-0">
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Unpaid Money Card */}
      <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border-l-4 border-l-purple-500 bg-card/90 min-h-[120px] sm:min-h-[140px]">
        <CardContent className="p-4 sm:p-6 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">Unpaid Money</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 dark:text-purple-400 break-all">₹{safeStats.totalReceivables.toLocaleString()}</p>
            </div>
            <div className="bg-purple-500/10 p-2 sm:p-3 rounded-xl ml-2 sm:ml-3 flex-shrink-0">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
