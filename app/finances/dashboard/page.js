'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, DollarSign, Users, Calendar, ArrowLeft, 
  BarChart3, PieChart, Receipt, AlertTriangle, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

export default function FinanceDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/finances/dashboard')
      const data = await response.json()
      
      if (response.ok) {
        setDashboardData(data)
      } else {
        console.error('Failed to fetch dashboard data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'unpaid': return 'bg-orange-100 text-orange-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading financial dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600">Failed to load financial dashboard</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { summary, recentTransactions, upcomingPayments, monthlyRevenue, paymentStatus, topClients } = dashboardData

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
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Financial Dashboard</h1>
              </div>
            </div>
            
            <Button onClick={fetchDashboardData} variant="outline">
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Receivables</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(summary.totalReceivables)}
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
                  <p className="text-sm font-medium text-gray-600">Amount Received</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(summary.totalReceived)}
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
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-3xl font-bold text-purple-600">{summary.activeClients}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month Revenue</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatCurrency(summary.thisMonthRevenue)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Recent Transactions</span>
              </CardTitle>
              <CardDescription>Latest payment activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{transaction.client_name}</div>
                      <div className="text-sm text-gray-600">{transaction.properties?.name || 'Property not available'}</div>
                      <div className="text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Due Date:</span>
                          <div>{formatDate(transaction.created_at)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(transaction.amount)}</div>
                      <Badge className={getStatusBadgeColor(transaction.status)}>
                        {transaction.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link href="/finances">
                  <Button variant="outline" className="w-full">
                    View All Transactions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Upcoming Payments</span>
              </CardTitle>
              <CardDescription>Payments due in the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{payment.client_name}</div>
                      <div className="text-sm text-gray-600">{payment.properties?.name || 'Property not available'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(payment.amount)}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(payment.due_date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">
                  Send Payment Reminders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Payment Status Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentStatus.map((status) => (
                  <div key={status.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${
                        status.status === 'Paid' ? 'bg-green-500' :
                        status.status === 'Pending' ? 'bg-orange-500' :
                        status.status === 'Overdue' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="font-medium">{status.status}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(status.amount)}</div>
                      <div className="text-sm text-gray-600">{status.count} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Top Clients</span>
              </CardTitle>
              <CardDescription>Clients by total payment value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClients.map((client, index) => (
                  <div key={client.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-gray-600">{client.properties} properties</div>
                      </div>
                    </div>
                    <div className="font-bold text-green-600">
                      {formatCurrency(client.totalPaid)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Chart Placeholder */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Monthly Revenue Trend</span>
            </CardTitle>
            <CardDescription>Revenue performance vs targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-4">
              {monthlyRevenue.map((month) => (
                <div key={month.month} className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-2">{month.month}</div>
                  <div className="relative bg-gray-200 rounded h-24 mb-2">
                    <div 
                      className="absolute bottom-0 w-full bg-blue-500 rounded"
                      style={{ height: `${(month.revenue / month.target) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatCurrency(month.revenue).replace('₹', '₹')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}