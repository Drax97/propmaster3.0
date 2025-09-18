'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
<<<<<<< HEAD
import { Skeleton } from '@/components/ui/skeleton'
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
import { 
  TrendingUp, DollarSign, Calendar, ArrowLeft, Plus, 
  Search, Filter, Receipt, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import Link from 'next/link'

<<<<<<< HEAD
const FinancesLoading = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-36" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
      </div>
    </header>
    <main className="container mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card className="mb-8">
        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
    </main>
  </div>
);

=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
export default function FinancesPage() {
  const router = useRouter()
  const [finances, setFinances] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
<<<<<<< HEAD
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchFinances = async (reset = false) => {
    if (reset) {
      setPage(1)
      setFinances([])
    }

    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
=======

  useEffect(() => {
    fetchFinances()
  }, [])

  const fetchFinances = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      const params = new URLSearchParams()
      if (searchTerm) params.append('clientName', searchTerm)
      if (statusFilter) params.append('status', statusFilter)
      if (dateFilter) params.append('startDate', dateFilter)
<<<<<<< HEAD
      params.append('page', reset ? 1 : page)
      params.append('limit', '10')
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771

      const response = await fetch(`/api/finances?${params}`)
      const data = await response.json()
      
      if (response.ok) {
<<<<<<< HEAD
        setFinances(prev => reset ? data.finances : [...prev, ...data.finances])
        setSummary(data.summary || {})
        setTotalPages(data.totalPages)
        if (reset) setPage(2)
        else setPage(prev => prev + 1)
=======
        setFinances(data.finances || [])
        setSummary(data.summary || {})
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      } else {
        console.error('Failed to fetch finances:', data.error)
      }
    } catch (error) {
      console.error('Error fetching finances:', error)
    } finally {
      setLoading(false)
<<<<<<< HEAD
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchFinances(true)
  }, [searchTerm, statusFilter, dateFilter])

=======
    }
  }

>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
<<<<<<< HEAD
    return <FinancesLoading />
=======
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
  }

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
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Finance Management</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                {finances.length} Records
              </div>
              <Link href="/finances/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Record
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Receivables</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.totalReceivables || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Received</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalReceived || 0)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(summary.pendingAmount || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.overdueAmount || 0)}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Search & Filter Financial Records</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                placeholder="From date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setDateFilter('')
                  }}
                >
                  Clear Filters
                </Button>
<<<<<<< HEAD
                <Button onClick={() => fetchFinances(true)}>
=======
                <Button onClick={fetchFinances}>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Records */}
<<<<<<< HEAD
        {finances.length === 0 && !loading ? (
=======
        {finances.length === 0 ? (
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Records Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter || dateFilter
                  ? 'Try adjusting your search filters'
                  : 'Get started by adding your first payment record'}
              </p>
              <Link href="/finances/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Payment Record
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {finances.map((finance) => (
              <Card key={finance.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(finance.status)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {finance.client_name}
                        </h3>
                        <Badge className={getStatusBadgeColor(finance.status)}>
                          {finance.status?.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Amount:</span>
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(finance.amount)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium">Payment Type:</span>
                          <div className="capitalize">{finance.payment_type}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium">Due Date:</span>
                          <div>{formatDate(finance.due_date)}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium">Property:</span>
<<<<<<< HEAD
                          <div>{finance.properties.name}</div>
=======
                          <div>{finance.property_name}</div>
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
                        </div>
                      </div>
                      
                      {finance.next_payment_date && (
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Next Payment:</span> {formatDate(finance.next_payment_date)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-6">
                      {finance.receipt_url && (
                        <Button variant="outline" size="sm">
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                      
                      <Link href={`/finances/${finance.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
<<<<<<< HEAD

        {/* Load More Button */}
        {finances.length > 0 && page <= totalPages && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => fetchFinances()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
=======
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      </main>
    </div>
  )
}