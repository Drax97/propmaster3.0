'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, DollarSign, Calendar, ArrowLeft, Plus, 
  Search, Filter, Receipt, AlertCircle, CheckCircle, Clock, Shield, Lock
} from 'lucide-react'
import Link from 'next/link'
import { canViewAllFinances, canManageOwnFinances, getUserRole } from '@/lib/permissions'
import { useIsMobile } from '@/hooks/use-mobile'

export default function FinancesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isMobile = useIsMobile()
  const [finances, setFinances] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [createdByFilter, setCreatedByFilter] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      const role = getUserRole(session?.user)
      if (canViewAllFinances(role)) {
        // Fetch users for master filter
        fetchUsers()
      }
      fetchFinances()
    }
  }, [status])

  const fetchFinances = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Build query parameters
      const params = new URLSearchParams()
      if (searchTerm) params.append('clientName', searchTerm)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFilter) params.append('startDate', dateFilter)
      const role = getUserRole(session?.user)
      if (role !== 'editor' && createdByFilter && createdByFilter !== 'all') params.append('createdBy', createdByFilter)

      const response = await fetch(`/api/finances?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setFinances(data.finances || [])
        setSummary(data.summary || {})
      } else {
        console.error('Failed to fetch finances:', data.error)
        setError(data.error || 'Failed to fetch financial records')
      }
    } catch (error) {
      console.error('Error fetching finances:', error)
      setError('Network error occurred while fetching financial records')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (response.ok) {
        // Only keep editors (and optionally master if needed)
        setUsers((data.users || []).filter(u => u.role === 'editor'))
      }
    } catch (e) {
      // Non-blocking; ignore errors here
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending': return <Clock className="h-4 w-4 text-orange-600" />
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    // Create a Date object from the input string
    const date = new Date(dateString)
    
    // Create options for formatting
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
    
    // Adjust for Indian Standard Time (UTC+5:30)
    const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000))
    
    // Format the adjusted time
    return indianTime.toLocaleString('en-IN', options)
  }

  // Check authentication and permissions
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please sign in to access financial records.</p>
            <Button onClick={() => router.push('/auth/signin')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userRole = getUserRole(session?.user)
  const canViewFinances = canViewAllFinances(userRole) || canManageOwnFinances(userRole)

  if (!canViewFinances) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">You do not have permission to view financial records.</p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className={`container mx-auto ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
          <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'}`}>
            <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center space-x-3'}`}>
              <Link href="/dashboard">
                <Button variant="outline" size={isMobile ? "sm" : "sm"} className={isMobile ? 'w-full justify-center' : ''}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className={`${isMobile ? 'flex items-center justify-center space-x-2' : 'flex items-center space-x-2'}`}>
                <TrendingUp className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-green-600`} />
                <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>Finance Management</h1>
              </div>
            </div>
            
            <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center space-x-3'}`}>
              <div className={`${isMobile ? 'text-center text-xs' : 'text-sm'} text-gray-600`}>
                {finances.length} Records {userRole === 'editor' ? '(Your Records)' : ''}
              </div>
              {canManageOwnFinances(userRole) && (
                <Link href="/finances/new">
                  <Button size={isMobile ? "sm" : "default"} className={isMobile ? 'w-full' : ''}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Record
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-6 py-8'}`}>
        {/* Role-based access information */}
        {userRole === 'editor' && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Editor Access:</strong> You can view and create your own financial records. Records cannot be edited after creation. Contact an administrator for changes.
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        {/* Financial Summary Cards */}
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3 mb-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'}`}>
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`${isMobile ? 'flex flex-col items-center text-center space-y-1' : 'flex items-center justify-between'}`}>
                <div className={isMobile ? 'order-2' : ''}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Total Owed</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
                    {isMobile ? formatCurrency(summary.totalReceivables || 0).replace('₹', '₹') : formatCurrency(summary.totalReceivables || 0)}
                  </p>
                </div>
                <DollarSign className={`${isMobile ? 'h-5 w-5 order-1' : 'h-8 w-8'} text-blue-600`} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`${isMobile ? 'flex flex-col items-center text-center space-y-1' : 'flex items-center justify-between'}`}>
                <div className={isMobile ? 'order-2' : ''}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Total Paid</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
                    {isMobile ? formatCurrency(summary.totalReceived || 0).replace('₹', '₹') : formatCurrency(summary.totalReceived || 0)}
                  </p>
                </div>
                <CheckCircle className={`${isMobile ? 'h-5 w-5 order-1' : 'h-8 w-8'} text-green-600`} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`${isMobile ? 'flex flex-col items-center text-center space-y-1' : 'flex items-center justify-between'}`}>
                <div className={isMobile ? 'order-2' : ''}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Unpaid Expenses</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600`}>
                    {isMobile ? formatCurrency(summary.pendingAmount || 0).replace('₹', '₹') : formatCurrency(summary.pendingAmount || 0)}
                  </p>
                </div>
                <Clock className={`${isMobile ? 'h-5 w-5 order-1' : 'h-8 w-8'} text-orange-600`} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`${isMobile ? 'flex flex-col items-center text-center space-y-1' : 'flex items-center justify-between'}`}>
                <div className={isMobile ? 'order-2' : ''}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Overdue Expenses</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-red-600`}>
                    {isMobile ? formatCurrency(summary.overdueAmount || 0).replace('₹', '₹') : formatCurrency(summary.overdueAmount || 0)}
                  </p>
                </div>
                <AlertCircle className={`${isMobile ? 'h-5 w-5 order-1' : 'h-8 w-8'} text-red-600`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className={isMobile ? 'mb-6' : 'mb-8'}>
          <CardHeader className={isMobile ? 'pb-3' : ''}>
            <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : ''}`}>
              <Filter className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              <span>Search & Filter Financial Records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'pt-0' : ''}>
            <div className={`${isMobile ? 'flex flex-col space-y-3' : 'grid grid-cols-1 md:grid-cols-4 gap-4'}`}>
              <div className="relative">
                <Search className={`absolute left-3 ${isMobile ? 'top-2.5' : 'top-3'} h-4 w-4 text-gray-400`} />
                <Input 
                  type="text"
                  placeholder="Search by employee name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'text-sm' : ''}`}
                />
              </div>
              
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                placeholder="From date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={isMobile ? 'text-sm' : ''}
              />

              {canViewAllFinances(userRole) && (
                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                  <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                    <SelectValue placeholder="All Editors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Editors</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex space-x-2'}`}>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  className={isMobile ? 'w-full' : ''}
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                    setDateFilter('')
                    setCreatedByFilter('')
                  }}
                >
                  Clear Filters
                </Button>
                <Button 
                  onClick={fetchFinances}
                  size={isMobile ? "sm" : "default"}
                  className={isMobile ? 'w-full' : ''}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Records */}
        {finances.length === 0 ? (
          <Card>
            <CardContent className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
              <TrendingUp className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} text-gray-400 mx-auto mb-4`} />
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 mb-2`}>No Financial Records Found</h3>
              <p className={`text-gray-600 mb-4 ${isMobile ? 'text-sm' : ''}`}>
                {searchTerm || statusFilter || dateFilter
                  ? 'Try adjusting your search filters'
                  : 'Get started by adding your first payment record'}
              </p>
              {canManageOwnFinances(userRole) && (
                <Link href="/finances/new">
                  <Button size={isMobile ? "sm" : "default"}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Payment Record
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            {finances.map((finance) => (
              <Card key={finance.id} className="hover:shadow-lg transition-shadow">
                <CardContent className={isMobile ? 'p-4' : 'p-6'}>
                  <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'}`}>
                    <div className="flex-1">
                      <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center space-x-3 mb-2'}`}>
                        <div className={`${isMobile ? 'flex items-center space-x-2' : 'flex items-center space-x-3'}`}>
                          {getStatusIcon(finance.status)}
                          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                            {finance.client_name}
                          </h3>
                        </div>
                        <Badge className={`${getStatusBadgeColor(finance.status)} ${isMobile ? 'self-start text-xs' : ''}`}>
                          {finance.status?.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className={`${isMobile ? 'grid grid-cols-1 gap-2 text-sm' : 'grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'} text-gray-600`}>
                        <div>
                          <span className="font-medium">Amount:</span>
                          <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900`}>
                            {formatCurrency(finance.amount)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium">Payment Type:</span>
                          <div className="capitalize">{finance.payment_type}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium">Created On:</span>
                          <div className={isMobile ? 'text-xs' : ''}>{formatDate(finance.created_at)}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium">Property:</span>
                          <div className={isMobile ? 'text-xs' : ''}>{finance.properties?.name || 'Property not available'}</div>
                        </div>
                      </div>
                      
                      {finance.next_payment_date && (
                        <div className={`${isMobile ? 'mt-2 text-xs' : 'mt-3 text-sm'} text-gray-600`}>
                          <span className="font-medium">Next Payment:</span> {formatDate(finance.next_payment_date)}
                        </div>
                      )}
                    </div>
                    
                    <div className={`${isMobile ? 'flex flex-row space-x-2 justify-between' : 'flex flex-col space-y-2 ml-6'}`}>
                      {finance.receipt_url && (
                        <Button variant="outline" size="sm" className={isMobile ? 'flex-1' : ''}>
                          <Receipt className="h-4 w-4 mr-1" />
                          {isMobile ? '' : 'Receipt'}
                        </Button>
                      )}
                      
                      <Link href={`/finances/${finance.id}`}>
                        <Button variant="outline" size="sm" className={`${isMobile ? 'flex-1' : 'w-full'}`}>
                          View Details
                        </Button>
                      </Link>
                      
                      {userRole === 'editor' && (
                        <div className={`${isMobile ? 'text-xs text-gray-500 flex items-center' : 'text-xs text-gray-500 mt-1 flex items-center'}`}>
                          <Lock className="h-3 w-3 mr-1" />
                          {isMobile ? '' : 'Locked'}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}