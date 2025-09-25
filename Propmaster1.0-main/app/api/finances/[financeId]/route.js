import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { financeId } = params
    console.log('Fetching financial record:', financeId)

    // Mock single finance record
    const mockFinance = {
      id: financeId,
      property_id: 'property-1',
      property_name: 'Modern 3BHK Apartment',
      client_name: 'John Doe',
      amount: 500000,
      payment_type: 'EMI',
      due_date: '2025-09-15',
      next_payment_date: '2025-10-15',
      status: 'pending',
      receipt_url: null,
      notes: 'Monthly EMI payment for property purchase',
      created_by: 'master-user-id',
      created_at: '2025-08-15T10:00:00Z',
      updated_at: '2025-09-05T12:00:00Z'
    }

    return NextResponse.json({ 
      finance: mockFinance
    })

  } catch (error) {
    console.error('Get finance API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { financeId } = params
    const body = await request.json()
    
    console.log('Updating financial record:', financeId)

    // Mock update - in real implementation, update database
    const updatedFinance = {
      id: financeId,
      ...body,
      updated_at: new Date().toISOString()
    }

    console.log('Financial record updated:', financeId)

    return NextResponse.json({ 
      finance: updatedFinance,
      message: 'Financial record updated successfully'
    })

  } catch (error) {
    console.error('Update finance API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { financeId } = params
    console.log('Deleting financial record:', financeId)

    // Mock deletion - in real implementation, delete from database
    console.log('Financial record deleted:', financeId)

    return NextResponse.json({ 
      message: 'Financial record deleted successfully'
    })

  } catch (error) {
    console.error('Delete finance API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}