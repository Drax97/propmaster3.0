'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, DollarSign, Calendar, User, Building2, 
  Receipt, FileText, CheckCircle, Clock, AlertCircle, 
  Edit, Trash2, Shield, Lock
} from 'lucide-react'
import { canViewAllFinances, canManageOwnFinances, getUserRole, can } from '@/lib/permissions'
import Link from 'next/link'

export default function FinanceDetailPage() {
  const { financeId } = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [finance, setFinance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    if (status === 'authenticated' && financeId) {
      fetchFinanceDetail()
    }
  }, [status, financeId])

  const fetchFinanceDetail = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/finances/${financeId}`)
      const data = await response.json()
      
      if (response.ok) {
        setFinance(data.finance)
      } else {
        console.error('Failed to fetch finance detail:', data.error)
        setError(data.error || 'Failed to fetch financial record details')
      }
    } catch (error) {
      console.error('Error fetching finance detail:', error)
      setError('Network error occurred while fetching financial record details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this financial record? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      setError('') // Clear any previous errors
      
      console.log('Attempting to delete finance record:', financeId)
      
      const response = await fetch(`/api/finances/${financeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      console.log('Delete response:', { status: response.status, data })
      
      if (response.ok) {
        console.log('Delete successful, redirecting to finances page')
        alert('Financial record deleted successfully!')
        // Force a page refresh to ensure we don't stay on a deleted record
        window.location.href = '/finances'
      } else {
        console.error('Delete failed:', data)
        setError(data.error || `Failed to delete financial record (Status: ${response.status})`)
      }
    } catch (error) {
      console.error('Error deleting finance record:', error)
      setError(`Network error occurred while deleting the record: ${error.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit mode
      setIsEditMode(false)
      setEditData({})
    } else {
      // Enter edit mode
      setIsEditMode(true)
      setEditData({
        client_name: finance.client_name || '',
        amount: finance.amount || 0,
        payment_type: finance.payment_type || 'monthly_rent',
        // Properly format dates for HTML date inputs
        due_date: finance.due_date ? new Date(finance.due_date).toISOString().split('T')[0] : '',
        next_payment_date: finance.next_payment_date ? new Date(finance.next_payment_date).toISOString().split('T')[0] : '',
        status: finance.status || 'pending',
        receipt_url: finance.receipt_url || '',
        notes: finance.notes || ''
      })
    }
  }

  const handleEditSave = async () => {
    try {
      setLoading(true)
      
      // Clean up the data before sending to API
      const cleanedData = {
        ...editData,
        // Convert empty date strings to null for PostgreSQL compatibility
        due_date: editData.due_date || null,
        next_payment_date: editData.next_payment_date || null,
        // Convert empty strings to null for other optional fields
        receipt_url: editData.receipt_url?.trim() || null,
        notes: editData.notes?.trim() || null
      }
      
      const response = await fetch(`/api/finances/${financeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      })
      
      const data = await response.json()
      
      console.log('Edit response:', { status: response.status, data })
      
      if (response.ok) {
        setFinance(data.finance)
        setIsEditMode(false)
        setEditData({})
        alert('Financial record updated successfully!')
      } else {
        console.error('Edit failed:', data)
        setError(data.error || `Failed to update financial record (Status: ${response.status})`)
      }
    } catch (error) {
      console.error('Error updating finance record:', error)
      setError('Network error occurred while updating the record')
    } finally {
      setLoading(false)
    }
  }

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending': return <Clock className="h-5 w-5 text-orange-600" />
      case 'overdue': return <AlertCircle className="h-5 w-5 text-red-600" />
      default: return <Clock className="h-5 w-5 text-gray-600" />
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
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not available'
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading financial record...</p>
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
            <p className="text-gray-600 mb-4">Please sign in to view financial records.</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <Link href="/finances">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Finance Records
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Financial Record Details</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  if (!finance) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <Link href="/finances">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Finance Records
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Financial Record Not Found</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Record Not Found</h3>
              <p className="text-gray-600 mb-4">
                The financial record you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link href="/finances">
                <Button>Back to Finance Records</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/finances">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Finance Records
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Financial Record Details</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(finance.status)}
              <Badge className={getStatusBadgeColor(finance.status)}>
                {finance.status?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {userRole === 'editor' && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Editor Access:</strong> You can view this financial record but cannot edit it. 
                Contact an administrator for changes.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Payment Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Client Name</label>
                      {isEditMode ? (
                        <Input
                          value={editData.client_name || ''}
                          onChange={(e) => handleEditChange('client_name', e.target.value)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-lg font-semibold text-gray-900">{finance.client_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Amount</label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.amount || ''}
                          onChange={(e) => handleEditChange('amount', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(finance.amount)}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment Type</label>
                      {isEditMode ? (
                        <Select 
                          value={editData.payment_type || ''} 
                          onValueChange={(value) => handleEditChange('payment_type', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="registration">Registration</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="documents">Documents</SelectItem>
                            <SelectItem value="advocate">Advocate</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-lg text-gray-900 capitalize">{finance.payment_type?.replace('_', ' ')}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      {isEditMode ? (
                        <Select 
                          value={editData.status || ''} 
                          onValueChange={(value) => handleEditChange('status', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="partial">Partial Payment</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(finance.status)}
                          <Badge className={getStatusBadgeColor(finance.status)}>
                            {finance.status?.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Property Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Property</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {finance.properties?.name || 'Property information not available'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Date Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Important Dates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Due Date</label>
                      {isEditMode ? (
                        <Input
                          type="date"
                          value={editData.due_date || ''}
                          onChange={(e) => handleEditChange('due_date', e.target.value)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{formatDate(finance.due_date)}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Next Payment Date</label>
                      {isEditMode ? (
                        <Input
                          type="date"
                          value={editData.next_payment_date || ''}
                          onChange={(e) => handleEditChange('next_payment_date', e.target.value)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{formatDate(finance.next_payment_date)}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created On</label>
                      <p className="text-sm text-gray-700">{formatDateTime(finance.created_at)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Updated</label>
                      <p className="text-sm text-gray-700">{formatDateTime(finance.updated_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Information */}
              {(finance.notes || finance.receipt_url || isEditMode) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Additional Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Receipt URL</label>
                      {isEditMode ? (
                        <Input
                          type="url"
                          value={editData.receipt_url || ''}
                          onChange={(e) => handleEditChange('receipt_url', e.target.value)}
                          placeholder="https://example.com/receipt.pdf"
                          className="mt-1"
                        />
                      ) : finance.receipt_url ? (
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(finance.receipt_url, '_blank')}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            View Receipt
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">No receipt uploaded</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      {isEditMode ? (
                        <Textarea
                          value={editData.notes || ''}
                          onChange={(e) => handleEditChange('notes', e.target.value)}
                          placeholder="Additional notes about this payment..."
                          rows={3}
                          className="mt-1"
                        />
                      ) : finance.notes ? (
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{finance.notes}</p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">No notes added</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {can(userRole, 'delete') && (
                    <>
                      {isEditMode ? (
                        <>
                          <Button 
                            onClick={handleEditSave} 
                            className="w-full justify-start"
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {loading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleEditToggle}
                            className="w-full justify-start"
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Cancel Edit
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={handleEditToggle}
                            className="w-full justify-start"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Record
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleDelete}
                            className="w-full justify-start text-red-600 hover:text-red-700"
                            disabled={deleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleting ? 'Deleting...' : 'Delete Record'}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  
                  {userRole === 'editor' && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <Lock className="h-3 w-3 mr-1" />
                      Record is locked for editors
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Record Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Record ID</span>
                    <span className="text-sm font-mono text-gray-900">{finance.id.slice(0, 8)}...</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Type</span>
                    <span className="text-sm text-gray-900 capitalize">{finance.payment_type?.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge className={getStatusBadgeColor(finance.status)} size="sm">
                      {finance.status?.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
