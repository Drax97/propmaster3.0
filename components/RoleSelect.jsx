'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLES, ROLE_DISPLAY_NAMES, canManageUsers, getUserRole } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'

export default function RoleSelect({ 
  currentRole, 
  onRoleChange, 
  disabled = false, 
  userSession = null 
}) {
  // Check if current user can manage users
  const canManage = userSession ? canManageUsers(getUserRole(userSession.user)) : false
  
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case ROLES.MASTER:
        return 'destructive'
      case ROLES.EDITOR:
        return 'default'
      case ROLES.VIEWER:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // If user can't manage users, show role as badge only
  if (!canManage || disabled) {
    return (
      <Badge variant={getRoleBadgeVariant(currentRole)}>
        {ROLE_DISPLAY_NAMES[currentRole] || 'Unknown'}
      </Badge>
    )
  }

  return (
    <Select value={currentRole} onValueChange={onRoleChange}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ROLES).map(([key, value]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <Badge variant={getRoleBadgeVariant(value)} className="text-xs">
                {ROLE_DISPLAY_NAMES[value]}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
