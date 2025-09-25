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
  Mail, Calendar, Eye, Edit, Shield, Users as UsersIcon, RefreshCw
} from 'lucide-react'
import { USER_ROLES, USER_STATUS, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/supabase'
import Link from 'next/link'

export default function UserManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }

    // Only allow master users to access this page
    if (session?.user && !session.user.isMaster) {
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
        console.log('Fetched users:', data.users)
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
        
        // Show success message
        alert(`User ${data.user?.name || 'user'} updated successfully!`)
      } else {
        alert(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user')
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
      case USER_ROLES.MASTER: return 'bg-purple-100 text-purple-800'
      case USER_ROLES.ADMIN: return 'bg-blue-100 text-blue-800'
      case USER_ROLES.VIEWER: return 'bg-green-100 text-green-800'
      case USER_ROLES.CLIENT: return 'bg-gray-100 text-gray-800'
      case USER_ROLES.PENDING: return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case USER_STATUS.ACTIVE: return 'bg-green-100 text-green-800'
      case USER_STATUS.PENDING: return 'bg-orange-100 text-orange-800'
      case USER_STATUS.SUSPENDED: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (!session?.user?.isMaster) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">Only master users can access user management.</p>
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

  const pendingUsers = users.filter(user => user.status === USER_STATUS.PENDING)
  const activeUsers = users.filter(user => user.status === USER_STATUS.ACTIVE)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <UsersIcon className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">User Management</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="text-sm text-gray-600">
                Total Users: {users.length} | Pending: {pendingUsers.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-red-500 rounded-full"></div>
                <p className="text-red-800 font-medium">Error loading users</p>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="mt-2"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingUsers.length}</p>
                </div>
                <UserCheck className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{activeUsers.length}</p>
                </div>
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {users.filter(u => u.role === USER_ROLES.ADMIN).length}
                  </p>
                </div>
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-orange-600">🔔 Pending Approval ({pendingUsers.length})</CardTitle>
              <CardDescription>
                These users are waiting for your approval to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.image} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Signed up: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select
                        onValueChange={(role) => {
                          updateUser(user.id, { 
                            role, 
                            status: USER_STATUS.ACTIVE,
                            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role] || [])
                          })
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Approve as..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                          <SelectItem value={USER_ROLES.VIEWER}>Viewer</SelectItem>
                          <SelectItem value={USER_ROLES.CLIENT}>Client</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
            <CardDescription>
              Manage roles and permissions for all users in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600">
                  {error ? 'Unable to load users. Please try refreshing.' : 'No users have signed up yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.image} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          {user.email === session.user.email && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role?.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusBadgeColor(user.status)}>
                            {user.status?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
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
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Edit User: {selectedUser.name}</CardTitle>
                <CardDescription>
                  Customize role and permissions for this user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(role) => {
                      setSelectedUser({
                        ...selectedUser,
                        role,
                        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role] || [])
                      })
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                      <SelectItem value={USER_ROLES.VIEWER}>Viewer</SelectItem>
                      <SelectItem value={USER_ROLES.CLIENT}>Client</SelectItem>
                      <SelectItem value={USER_ROLES.PENDING}>Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={selectedUser.status}
                    onValueChange={(status) => {
                      setSelectedUser({ ...selectedUser, status })
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USER_STATUS.ACTIVE}>Active</SelectItem>
                      <SelectItem value={USER_STATUS.PENDING}>Pending</SelectItem>
                      <SelectItem value={USER_STATUS.SUSPENDED}>Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Permissions */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Custom Permissions (Override role defaults)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.values(PERMISSIONS).map((permission) => {
                      const userPermissions = JSON.parse(selectedUser.permissions || '[]')
                      const isChecked = userPermissions.includes(permission)
                      
                      return (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const currentPermissions = JSON.parse(selectedUser.permissions || '[]')
                              let newPermissions
                              
                              if (checked) {
                                newPermissions = [...currentPermissions, permission]
                              } else {
                                newPermissions = currentPermissions.filter(p => p !== permission)
                              }
                              
                              setSelectedUser({
                                ...selectedUser,
                                permissions: JSON.stringify(newPermissions)
                              })
                            }}
                          />
                          <label htmlFor={permission} className="text-sm text-gray-700">
                            {permission.replace('_', ' ').toUpperCase()}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPermissions(false)
                      setSelectedUser(null)
                    }}
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