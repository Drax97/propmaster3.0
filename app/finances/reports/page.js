'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Download, Filter, Search, AlertTriangle, CheckCircle, DollarSign 
} from 'lucide-react'
import { getUserRole, canViewAllFinances } from '@/lib/permissions'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function FinanceReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [finances, setFinances] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters
  const [selectedUser, setSelectedUser] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('')
  
  // Users list for masters to select from
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (status === 'authenticated') {
      const role = getUserRole(session?.user)
      
      // Redirect non-authorized users
      if (!canViewAllFinances(role) && role !== 'editor') {
        router.push('/dashboard')
        return
      }
      
      // Fetch users for masters
      if (canViewAllFinances(role)) {
        fetchUsers()
      } else {
        // For editors, automatically set their own user ID
        setSelectedUser(session.user.userId)
      }
      
      fetchFinances()
    }
  }, [status, selectedUser, statusFilter, dateRangeFilter])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users || [])
      } else {
        console.error('Failed to fetch users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchFinances = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams()
      
      if (selectedUser) params.append('userId', selectedUser)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (dateRangeFilter) {
        const [startDate, endDate] = dateRangeFilter.split('/')
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(finances)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Records')
    XLSX.writeFile(workbook, `finance_report_${selectedUser || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text('Finance Report', 14, 20)
    
    const tableColumn = ['ID', 'Client', 'Amount', 'Status', 'Due Date', 'Property']
    const tableRows = finances.map(finance => [
      finance.id.slice(0, 8),
      finance.client_name,
      formatCurrency(finance.amount),
      finance.status.toUpperCase(),
      new Date(finance.due_date).toLocaleDateString(),
      finance.properties?.name || 'N/A'
    ])
    
    doc.autoTable({
      startY: 30,
      head: [tableColumn],
      body: tableRows
    })
    
    doc.save(`finance_report_${selectedUser || 'all'}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Finance Reports</h1>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {canViewAllFinances(getUserRole(session?.user)) && (
              <Select 
                value={selectedUser} 
                onValueChange={setSelectedUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            <Input 
              type="date" 
              placeholder="Date Range" 
              onChange={(e) => setDateRangeFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalReceivables || 0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalReceived || 0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.pendingAmount || 0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.overdueAmount || 0)}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Export Buttons */}
      <div className="flex justify-end space-x-2 mb-4">
        <Button 
          variant="outline" 
          onClick={exportToExcel} 
          disabled={finances.length === 0}
        >
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
        <Button 
          variant="outline" 
          onClick={exportToPDF} 
          disabled={finances.length === 0}
        >
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>
      
      {/* Finance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Finance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading finance records...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-12">{error}</div>
          ) : finances.length === 0 ? (
            <div className="text-center py-12">No finance records found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Property</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finances.map(finance => (
                  <TableRow key={finance.id}>
                    <TableCell>{finance.id.slice(0, 8)}</TableCell>
                    <TableCell>{finance.client_name}</TableCell>
                    <TableCell>{formatCurrency(finance.amount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(finance.status)}>
                        {finance.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(finance.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>{finance.properties?.name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
