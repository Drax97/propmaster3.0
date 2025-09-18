import { NextResponse } from 'next/server'
import { supabase, PERMISSIONS, getUserPermissions, hasPermission, handleSupabaseError } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { canViewAllFinances, canManageOwnFinances, getUserRole } from '@/lib/permissions'

export async function GET(request) {
  try {
    console.log('Finance API called - fetching financial records')

    // Get user session for role-based access control
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized access. Please sign in to view financial records.',
        finances: [],
        summary: {}
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    const userId = session.user.userId

    // Check if user has permission to view finances
    if (!canViewAllFinances(userRole) && !canManageOwnFinances(userRole)) {
      return NextResponse.json({ 
        error: 'Access denied. You do not have permission to view financial records.',
        finances: [],
        summary: {}
      }, { status: 403 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const clientName = searchParams.get('clientName')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const createdBy = searchParams.get('createdBy')
    const userIdParam = searchParams.get('userId') // New parameter for user-specific reports

    // Build Supabase query with role-based filtering
    let query = supabase
      .from('finances')
      .select(`
        *,
        properties:property_id(id, name)
      `)
      .order('updated_at', { ascending: false })

    // Apply role-based filtering
    if (userRole === 'editor') {
      // Editors can only see their own financial records
      query = query.eq('created_by', userId)
    }
    // Masters can see all records or specific user's records
    // Viewers are blocked above

    // If a specific userId is provided, filter by that user
    if (userIdParam && (canViewAllFinances(userRole) || userIdParam === session.user.userId)) {
      query = query.eq('created_by', userIdParam)
    }

    // Apply additional filters
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (clientName) {
      query = query.ilike('client_name', `%${clientName}%`)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Master-only filter by creator
    if (userRole !== 'editor' && createdBy) {
      query = query.eq('created_by', createdBy)
    }

    // Execute query
    const { data: finances, error } = await query

    if (error) {
      const errorInfo = handleSupabaseError(error, 'finances fetch')
      console.error('Database error fetching finances:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type,
        finances: [],
        message: 'Failed to fetch financial records from database'
      }, { status: 500 })
    }

    // Calculate financial summary
    const totalReceivables = finances.reduce((sum, f) => sum + (f.amount || 0), 0)
    const totalReceived = finances
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + (f.amount || 0), 0)
    const pendingAmount = finances
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0)
    const overdueAmount = finances
      .filter(f => f.status === 'overdue')
      .reduce((sum, f) => sum + (f.amount || 0), 0)

    console.log(`Successfully fetched ${finances.length} financial records from database for user role: ${userRole}`)

    return NextResponse.json({
      finances: finances || [],
      summary: {
        totalReceivables,
        totalReceived,
        pendingAmount,
        overdueAmount,
        totalRecords: finances?.length || 0,
        paidRecords: finances?.filter(f => f.status === 'paid').length || 0,
        pendingRecords: finances?.filter(f => f.status === 'pending').length || 0,
        overdueRecords: finances?.filter(f => f.status === 'overdue').length || 0
      },
      message: `Found ${finances?.length || 0} financial records`,
      source: 'database',
      userRole: userRole
    })

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
    console.log('Creating new financial record')

    // Get user session for role-based access control
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized access. Please sign in to create financial records.'
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    const userId = session.user.userId

    // Check if user has permission to create finances
    if (!canViewAllFinances(userRole) && !canManageOwnFinances(userRole)) {
      return NextResponse.json({ 
        error: 'Access denied. You do not have permission to create financial records.'
      }, { status: 403 })
    }

    const body = await request.json()
    const { 
      property_id, 
      client_name,
      client_id, 
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

    // Prepare financial data for database
    const financeData = {
      property_id,
      client_name: client_name.trim(),
      client_id: client_id?.trim() || null,
      amount: parseFloat(amount),
      payment_type,
      due_date: due_date || null,
      next_payment_date: next_payment_date || null,
      status: status || 'pending',
      receipt_url: receipt_url || null,
      created_by: userId // Use actual user ID from session
    }

    // Only include notes if provided - for backward compatibility with older schema
    if (notes?.trim()) {
      financeData.notes = notes.trim()
    }

    // Try to create financial record in database
    const { data: finance, error } = await supabase
      .from('finances')
      .insert([financeData])
      .select(`
        *,
        properties:property_id(id, name)
      `)
      .single()

    if (error) {
      const errorInfo = handleSupabaseError(error, 'finance creation')
      console.error('Database error creating financial record:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type,
        message: 'Failed to create financial record in database'
      }, { status: 500 })
    }

    console.log('New financial record created in database:', finance.id)

    return NextResponse.json({ 
      finance,
      message: 'Financial record created successfully',
      source: 'database'
    }, { status: 201 })

  } catch (error) {
    console.error('Create finance API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}