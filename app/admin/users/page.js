'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Building2, ArrowLeft, UserCheck, UserX, Settings, Trash2, 
  Mail, Calendar, Eye, Edit, Shield, Users as UsersIcon, RefreshCw, ArrowUpDown
} from 'lucide-react'
import { USER_ROLES, USER_STATUS, PERMISSIONS as OLD_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/supabase'
import { canManageUsers, ROLES, ROLE_DISPLAY_NAMES, getUserRole, PERMISSIONS } from '@/lib/permissions'
import RoleSelect from '@/components/RoleSelect'
import Link from 'next/link'

export default function UserManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [error, setError] = useState(null)
  const [dataSource, setDataSource] = useState('unknown')
  const [sortBy, setSortBy] = useState('name') // 'name', 'role', 'status', 'created'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }

    // Only allow users with manage_users permission to access this page
    if (session?.user && !canManageUsers(getUserRole(session.user))) {
      router.push('/dashboard')
      return
    }

    fetchUsers()
  }, [status, session, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users || [])
        setDataSource(data.data_source || 'unknown')
        console.log('Fetched users:', {
          count: data.users?.length || 0,
          dataSource: data.data_source,
          note: data.note
        })
      } else {
        setError(data.error || 'Failed to fetch users')
        console.error('Error fetching users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userId, updates) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchUsers() // Refresh users list
        setSelectedUser(null)
        setShowPermissions(false)
        
        // Show success message with database status
        const statusMessage = data.data_source === 'database' 
          ? 'User updated successfully in database!' 
          : 'User updated (simulated due to database issues - changes may not persist)'
          
        alert(`${data.user?.name || 'User'} - ${statusMessage}`)
        
        // Log for debugging
        console.log('User update result:', {
          userId,
          updates,
          dataSource: data.data_source,
          note: data.note
        })
      } else {
        alert(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user - please check the console for details')
    }
  }

  const deleteUser = async (userId) => {
    const userToDelete = users.find(u => u.id === userId)
    if (!confirm(`Are you sure you want to delete ${userToDelete?.name || 'this user'}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchUsers()
        alert('User deleted successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.MASTER: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
      case ROLES.EDITOR: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
      case ROLES.VIEWER: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      case 'pending': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      case 'pending': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
      case 'suspended': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  // Define role hierarchy for sorting (higher number = higher permission level)
  const getRoleWeight = (role) => {
    switch (role) {
      case ROLES.MASTER: return 3
      case ROLES.EDITOR: return 2
      case ROLES.VIEWER: return 1
      case 'pending': return 0
      default: return 0
    }
  }

  // Sort users based on selected criteria
  const sortUsers = (usersList) => {
    return [...usersList].sort((a, b) => {
      switch (sortBy) {
        case 'role':
          // Sort by permission level (highest to lowest)
          return getRoleWeight(b.role) - getRoleWeight(a.role)
        case 'status':
          return a.status?.localeCompare(b.status) || 0
        case 'created':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'name':
        default:
          return a.name?.localeCompare(b.name) || 0
      }
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  if (!session?.user?.isMaster) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">Only master users can access user management.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const sortedUsers = sortUsers(users)
  const pendingUsers = sortedUsers.filter(user => user.status === 'pending' || user.role === 'pending')
  const activeUsers = sortedUsers.filter(user => user.status === 'active')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <h1 className="text-lg sm:text-xl font-bold text-foreground">User Management</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-24 sm:w-32 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="role">Permission Level</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="created">Date Joined</SelectItem>
                </SelectContent>
              </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
                className="text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <div className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Total Users: {users.length} | Pending: {pendingUsers.length}
                {dataSource && (
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    dataSource === 'database' 
                      ? 'bg-green-100 text-green-800' 
                      : dataSource === 'fallback'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {dataSource === 'database' ? '🟢 Live' : dataSource === 'fallback' ? '🟡 Fallback' : '❓ Unknown'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:px-6 sm:py-8">
        {/* Error Message */}
        {error && (
          <Card className="mb-4 sm:mb-6 border-destructive/20 bg-destructive/10">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 sm:h-4 sm:w-4 bg-red-500 rounded-full"></div>
                <p className="text-destructive font-medium text-sm sm:text-base">Error loading users</p>
              </div>
              <p className="text-destructive/80 text-xs sm:text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="mt-2 text-xs sm:text-sm"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{users.length}</p>
                </div>
                <UsersIcon className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">{pendingUsers.length}</p>
                </div>
                <UserCheck className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{activeUsers.length}</p>
                </div>
                <UserCheck className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Masters</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">
                    {users.filter(u => u.role === ROLES.MASTER).length}
                  </p>
                </div>
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <Card className="mb-4 sm:mb-8">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-orange-600 dark:text-orange-400 text-sm sm:text-base">🔔 Pending Approval ({pendingUsers.length})</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                These users are waiting for your approval to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs sm:text-sm">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{user.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground/70">
                          Signed up: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select
                        onValueChange={(role) => {
                          updateUser(user.id, { 
                            role, 
                            status: 'active'
                          })
                        }}
                      >
                        <SelectTrigger className="w-28 sm:w-32 text-xs sm:text-sm">
                          <SelectValue placeholder="Approve as..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROLES.MASTER}>Master</SelectItem>
                          <SelectItem value={ROLES.EDITOR}>Editor</SelectItem>
                          <SelectItem value={ROLES.VIEWER}>Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline sm:ml-1">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Users Table */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base">All Users ({users.length})</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage roles and permissions for all users in the system
                </CardDescription>
              </div>
              {sortBy !== 'name' && (
                <Badge variant="outline" className="text-xs">
                  Sorted by: {sortBy === 'role' ? 'Permission Level' : sortBy === 'status' ? 'Status' : 'Date Joined'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <UsersIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No Users Found</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {error ? 'Unable to load users. Please try refreshing.' : 'No users have signed up yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {sortedUsers.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs sm:text-sm">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{user.name}</h3>
                          {user.email === session.user.email && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                          <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                            {user.role?.toUpperCase()}
                          </Badge>
                          <Badge className={`${getStatusBadgeColor(user.status)} text-xs`}>
                            {user.status?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Last login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>

                    {user.email !== session.user.email && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowPermissions(true)
                          }}
                          className="text-xs sm:text-sm"
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline sm:ml-1">Delete</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Editor Modal */}
        {showPermissions && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-sm sm:text-base">Edit User: {selectedUser.name}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Customize role and permissions for this user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-foreground">Role</label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(role) => {
                      setSelectedUser({
                        ...selectedUser,
                        role
                      })
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROLES.MASTER}>Master</SelectItem>
                      <SelectItem value={ROLES.EDITOR}>Editor</SelectItem>
                      <SelectItem value={ROLES.VIEWER}>Viewer</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-foreground">Status</label>
                  <Select
                    value={selectedUser.status}
                    onValueChange={(status) => {
                      setSelectedUser({ ...selectedUser, status })
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Role-Based Permissions Info */}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3 block">
                    Role Permissions
                  </label>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      This user will have the following permissions based on their role:
                    </p>
                    <div className="space-y-1 sm:space-y-2">
                      {selectedUser.role && PERMISSIONS[selectedUser.role] ? 
                        PERMISSIONS[selectedUser.role].map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs sm:text-sm text-foreground">{permission.replace('_', ' ')}</span>
                          </div>
                        )) : (
                          <p className="text-xs sm:text-sm text-muted-foreground">No permissions assigned</p>
                        )
                      }
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPermissions(false)
                      setSelectedUser(null)
                    }}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateUser(selectedUser.id, {
                        role: selectedUser.role,
                        status: selectedUser.status,
                        permissions: selectedUser.permissions
                      })
                    }}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}