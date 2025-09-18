import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Fetching financial dashboard data')

    // Mock comprehensive dashboard data
    const dashboardData = {
      summary: {
        totalReceivables: 1775000,
        totalReceived: 1200000,
        pendingAmount: 500000,
        overdueAmount: 75000,
        totalProperties: 5,
        activeClients: 8,
        totalTransactions: 15,
        thisMonthRevenue: 350000
      },
      recentTransactions: [
        {
          id: 'finance-1',
          client_name: 'John Doe',
          amount: 500000,
          status: 'pending',
          due_date: '2025-09-15',
          property_name: 'Modern 3BHK Apartment'
        },
        {
          id: 'finance-2',
          client_name: 'Jane Smith', 
          amount: 1200000,
          status: 'paid',
          due_date: '2025-09-10',
          property_name: 'Luxury Villa'
        },
        {
          id: 'finance-3',
          client_name: 'Bob Johnson',
          amount: 75000,
          status: 'overdue',
          due_date: '2025-08-30',
          property_name: 'Modern 3BHK Apartment'
        }
      ],
      upcomingPayments: [
        {
          id: 'finance-4',
          client_name: 'Alice Brown',
          amount: 250000,
          due_date: '2025-09-20',
          property_name: 'Commercial Space'
        },
        {
          id: 'finance-5',
          client_name: 'Mike Wilson',
          amount: 180000,
          due_date: '2025-09-25',
          property_name: 'Studio Apartment'
        }
      ],
      monthlyRevenue: [
        { month: 'Jan', revenue: 450000, target: 500000 },
        { month: 'Feb', revenue: 380000, target: 500000 },
        { month: 'Mar', revenue: 520000, target: 500000 },
        { month: 'Apr', revenue: 410000, target: 500000 },
        { month: 'May', revenue: 390000, target: 500000 },
        { month: 'Jun', revenue: 460000, target: 500000 },
        { month: 'Jul', revenue: 480000, target: 500000 },
        { month: 'Aug', revenue: 350000, target: 500000 }
      ],
      paymentStatus: [
        { status: 'Paid', count: 8, amount: 1200000 },
        { status: 'Pending', count: 4, amount: 500000 },
        { status: 'Overdue', count: 2, amount: 75000 },
        { status: 'Partial', count: 1, amount: 0 }
      ],
      topClients: [
        { name: 'Jane Smith', totalPaid: 1200000, properties: 1 },
        { name: 'John Doe', totalPaid: 500000, properties: 1 },
        { name: 'Alice Brown', totalPaid: 250000, properties: 2 },
        { name: 'Mike Wilson', totalPaid: 180000, properties: 1 },
        { name: 'Bob Johnson', totalPaid: 75000, properties: 1 }
      ]
    }

    console.log('Financial dashboard data prepared')

    return NextResponse.json({
      ...dashboardData,
      message: 'Financial dashboard data retrieved successfully',
      note: 'Using mock financial dashboard data - replace with real calculations when database is stable'
    })

  } catch (error) {
    console.error('Finance dashboard API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}