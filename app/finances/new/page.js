'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import UserClientSelector from '@/components/ui/user-client-selector'
import { 
  ArrowLeft, DollarSign, Save, User, Calendar, 
  Receipt, FileText, AlertCircle, Building2 
} from 'lucide-react'
import { canViewAllFinances, canManageOwnFinances, getUserRole } from '@/lib/permissions'
import Link from 'next/link'

export default function NewFinanceRecordPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    property_id: '',
    client_id: '',
    client_name: '',
    amount: '',
    payment_type: 'registration',
    due_date: '',
    next_payment_date: '',
    status: 'pending',
    receipt_url: '',
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }

    if (session?.user) {
      const userRole = getUserRole(session.user)
      if (!canViewAllFinances(userRole) && !canManageOwnFinances(userRole)) {
        router.push('/finances')
        return
      }
      
      // Load properties for selection
      fetchProperties()
    }
  }, [status, session, router])

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true)
      const response = await fetch('/api/properties')
      const data = await response.json()
      
      if (response.ok) {
        setProperties(data.properties || [])
      } else {
        console.error('Failed to fetch properties:', data.error)
        setError('Failed to load properties. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      setError('Network error occurred while loading properties.')
    } finally {
      setLoadingProperties(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!formData.property_id) {
      setError('Please select a property')
      return
    }
    
    if (!formData.client_id.trim()) {
      setError('Please select a client')
      return
    }
    
    if (!formData.client_name.trim()) {
      setError('Client name is required')
      return
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          client_id: formData.client_id.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Show success message and redirect to finances list
        alert(`Financial record for "${formData.client_name}" created successfully!`)
        router.push('/finances')
      } else {
        setError(data.error || 'Failed to create financial record')
      }
    } catch (error) {
      console.error('Error creating financial record:', error)
      setError('Network error occurred while creating the record')
    } finally {
      setLoading(false)
    }
  }

  // Set default due date to today
  useEffect(() => {
    if (!formData.due_date) {
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, due_date: today }))
    }
  }, [formData.due_date])

  if (status === 'loading' || loadingProperties) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {status === 'loading' ? 'Loading...' : 'Loading properties...'}
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const userRole = getUserRole(session.user)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <h1 className="text-xl font-bold text-gray-900">Add New Payment Record</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {userRole === 'editor' && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> As an editor, you can create financial records but cannot edit them after creation. 
                Please ensure all information is correct before submitting.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Payment Information</span>
                </CardTitle>
                <CardDescription>
                  Enter the payment details for this financial record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      Property *
                    </label>
                    <Select 
                      value={formData.property_id} 
                      onValueChange={(value) => handleInputChange('property_id', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name} - {property.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <UserClientSelector
                      value={formData.client_id}
                      onValueChange={(clientId) => handleInputChange('client_id', clientId)}
                      clientName={formData.client_name}
                      onClientNameChange={(name) => handleInputChange('client_name', name)}
                      placeholder="Select a client from your users"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Amount (₹) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 25000"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Payment Type *
                    </label>
                    <Select 
                      value={formData.payment_type} 
                      onValueChange={(value) => handleInputChange('payment_type', value)}
                    >
                      <SelectTrigger>
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Next Payment Date
                    </label>
                    <Input
                      type="date"
                      value={formData.next_payment_date}
                      onChange={(e) => handleInputChange('next_payment_date', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For recurring payments (e.g., monthly rent)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Status
                  </label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partial">Partial Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5" />
                  <span>Additional Information</span>
                </CardTitle>
                <CardDescription>
                  Optional receipt and notes for this payment record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <Receipt className="h-4 w-4 mr-1" />
                    Receipt URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/receipt.pdf"
                    value={formData.receipt_url}
                    onChange={(e) => handleInputChange('receipt_url', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a direct URL to a receipt or payment proof document
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Notes <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <Textarea
                    placeholder="Additional notes about this payment..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Link href="/finances">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Payment Record
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
