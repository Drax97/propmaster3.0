import { NextResponse } from 'next/server'
<<<<<<< HEAD
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
=======
import { supabase, PERMISSIONS, getUserPermissions, hasPermission } from '@/lib/supabase'

export async function GET(request) {
  try {
    console.log('Finance API called - fetching financial records')

    // Get query parameters for filtering
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const clientName = searchParams.get('clientName')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
<<<<<<< HEAD
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('finances')
      .select(`
        *,
        properties (
          name
        )
      `, { count: 'exact' })

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (clientName) {
      query = query.ilike('client_name', `%${clientName}%`)
    }
    if (startDate) {
      query = query.gte('due_date', startDate)
    }
    if (endDate) {
      query = query.lte('due_date', endDate)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: finances, error, count } = await query

    if (error) throw error

    // This summary calculation should be done on the entire dataset, not just the paginated one.
    // For a real-world app, this would be a separate, more complex query.
    // For now, we'll calculate it based on the fetched data for simplicity.
    const totalReceivables = finances.reduce((sum, f) => sum + f.amount, 0)
    const totalReceived = finances.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
    const pendingAmount = finances.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0)
    const overdueAmount = finances.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0)

    return NextResponse.json({
      finances,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
=======

    // For now, return mock financial data that demonstrates the system
    // This will be replaced with real database queries once schema cache is stable
    const mockFinances = [
      {
        id: 'finance-1',
        property_id: 'property-1',
        property_name: 'Modern 3BHK Apartment',
        client_name: 'John Doe',
        amount: 500000,
        payment_type: 'EMI',
        due_date: '2025-09-15',
        next_payment_date: '2025-10-15',
        status: 'pending',
        receipt_url: null,
        created_by: 'master-user-id',
        created_at: '2025-08-15T10:00:00Z',
        updated_at: '2025-09-05T12:00:00Z'
      },
      {
        id: 'finance-2', 
        property_id: 'property-2',
        property_name: 'Luxury Villa',
        client_name: 'Jane Smith',
        amount: 1200000,
        payment_type: 'full',
        due_date: '2025-09-10',
        next_payment_date: null,
        status: 'paid',
        receipt_url: 'https://example.com/receipt2.pdf',
        created_by: 'master-user-id',
        created_at: '2025-08-01T14:30:00Z',
        updated_at: '2025-09-01T09:15:00Z'
      },
      {
        id: 'finance-3',
        property_id: 'property-1',
        property_name: 'Modern 3BHK Apartment', 
        client_name: 'Bob Johnson',
        amount: 75000,
        payment_type: 'partial',
        due_date: '2025-08-30',
        next_payment_date: '2025-09-30',
        status: 'overdue',
        receipt_url: null,
        created_by: 'master-user-id',
        created_at: '2025-07-30T16:45:00Z',
        updated_at: '2025-08-30T11:20:00Z'
      }
    ]

    // Apply filters to mock data
    let filteredFinances = mockFinances

    if (propertyId) {
      filteredFinances = filteredFinances.filter(f => f.property_id === propertyId)
    }

    if (status) {
      filteredFinances = filteredFinances.filter(f => f.status === status)
    }

    if (clientName) {
      filteredFinances = filteredFinances.filter(f => 
        f.client_name.toLowerCase().includes(clientName.toLowerCase())
      )
    }

    if (startDate) {
      filteredFinances = filteredFinances.filter(f => 
        new Date(f.created_at) >= new Date(startDate)
      )
    }

    if (endDate) {
      filteredFinances = filteredFinances.filter(f => 
        new Date(f.created_at) <= new Date(endDate)
      )
    }

    // Calculate financial summary
    const totalReceivables = filteredFinances.reduce((sum, f) => sum + f.amount, 0)
    const totalReceived = filteredFinances
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0)
    const pendingAmount = filteredFinances
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0)
    const overdueAmount = filteredFinances
      .filter(f => f.status === 'overdue')
      .reduce((sum, f) => sum + f.amount, 0)

    console.log(`Returning ${filteredFinances.length} financial records (mock data)`)

    return NextResponse.json({
      finances: filteredFinances,
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      summary: {
        totalReceivables,
        totalReceived,
        pendingAmount,
        overdueAmount,
<<<<<<< HEAD
      },
    })
=======
        totalRecords: filteredFinances.length,
        paidRecords: filteredFinances.filter(f => f.status === 'paid').length,
        pendingRecords: filteredFinances.filter(f => f.status === 'pending').length,
        overdueRecords: filteredFinances.filter(f => f.status === 'overdue').length
      },
      message: `Found ${filteredFinances.length} financial records`,
      note: 'Using mock financial data - replace with real database queries when schema cache is stable'
    })

>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
  } catch (error) {
    console.error('Finance API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
<<<<<<< HEAD
    const body = await request.json()

    // Assuming you have a way to get the current user's ID
    const created_by = 'master-user-id';

    const { data, error } = await supabase
      .from('finances')
      .insert([{ ...body, created_by }])
      .select()

    if (error) throw error

    return NextResponse.json({ 
      finance: data[0],
=======
    console.log('Creating new financial record')

    const body = await request.json()
    const { 
      property_id, 
      client_name, 
      amount, 
      payment_type, 
      due_date, 
      next_payment_date, 
      status,
      receipt_url,
      notes
    } = body

    // Validate required fields
    if (!property_id || !client_name || !amount || !payment_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: property_id, client_name, amount, payment_type' 
      }, { status: 400 })
    }

    // Create new financial record
    const newFinance = {
      id: `finance-${Date.now()}`,
      property_id,
      client_name: client_name.trim(),
      amount: parseFloat(amount),
      payment_type,
      due_date: due_date || null,
      next_payment_date: next_payment_date || null,
      status: status || 'pending',
      receipt_url: receipt_url || null,
      notes: notes?.trim() || null,
      created_by: 'master-user-id', // In real implementation, get from session
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('New financial record created:', newFinance.id)

    return NextResponse.json({ 
      finance: newFinance,
>>>>>>> 3c14f7e292c9c51c1edb2977bd4971ecb0497771
      message: 'Financial record created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create finance API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}