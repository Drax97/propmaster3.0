import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase, supabaseAdmin, handleSupabaseError } from '@/lib/supabase'
import { canViewAllFinances, canManageOwnFinances, getUserRole, can } from '@/lib/permissions'

export async function GET(request, { params }) {
  try {
    const { financeId } = params
    console.log('Fetching financial record:', financeId)

    // Get user session for role-based access control
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized access. Please sign in to view financial records.'
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    const userId = session.user.userId

    // Check if user has permission to view finances
    if (!canViewAllFinances(userRole) && !canManageOwnFinances(userRole)) {
      return NextResponse.json({ 
        error: 'Access denied. You do not have permission to view financial records.'
      }, { status: 403 })
    }

    // Fetch finance record from database
    let query = supabase
      .from('finances')
      .select(`
        *,
        properties:property_id(id, name)
      `)
      .eq('id', financeId)

    // Apply role-based filtering
    if (userRole === 'editor') {
      // Editors can only see their own financial records
      query = query.eq('created_by', userId)
    }

    const { data: finance, error } = await query.single()

    if (error) {
      const errorInfo = handleSupabaseError(error, 'finance fetch')
      console.error('Database error fetching finance record:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type
      }, { status: error.code === 'PGRST116' ? 404 : 500 })
    }

    if (!finance) {
      return NextResponse.json({ 
        error: 'Financial record not found or access denied.'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      finance: finance
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

    // Get user session for role-based access control
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized access. Please sign in to update financial records.'
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    const userId = session.user.userId

    // Check if user has permission to update finances
    if (!canViewAllFinances(userRole) && !canManageOwnFinances(userRole)) {
      return NextResponse.json({ 
        error: 'Access denied. You do not have permission to update financial records.'
      }, { status: 403 })
    }

    // First, fetch the existing record to check ownership and lock status
    let fetchQuery = supabase
      .from('finances')
      .select('id, created_by, status, created_at')
      .eq('id', financeId)

    // Apply role-based filtering for editors
    if (userRole === 'editor') {
      fetchQuery = fetchQuery.eq('created_by', userId)
    }

    const { data: existingFinance, error: fetchError } = await fetchQuery.single()

    if (fetchError || !existingFinance) {
      return NextResponse.json({ 
        error: 'Financial record not found or access denied.'
      }, { status: 404 })
    }

    // Phase 3 Rule: Lock entries after creation for Editors
    if (userRole === 'editor') {
      return NextResponse.json({ 
        error: 'Access denied. Financial records cannot be edited after creation. Please contact an administrator for changes.'
      }, { status: 403 })
    }

    // Only masters can update financial records
    if (userRole !== 'master') {
      return NextResponse.json({ 
        error: 'Access denied. Only administrators can update financial records.'
      }, { status: 403 })
    }

    // Update the financial record
    const { data: updatedFinance, error: updateError } = await supabase
      .from('finances')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', financeId)
      .select(`
        *,
        properties:property_id(id, name)
      `)
      .single()

    if (updateError) {
      const errorInfo = handleSupabaseError(updateError, 'finance update')
      console.error('Database error updating finance record:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type
      }, { status: 500 })
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

    // Get user session for role-based access control
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized access. Please sign in to delete financial records.'
      }, { status: 401 })
    }

    const userRole = getUserRole(session.user)
    const userId = session.user.userId

    console.log('Delete request from user:', {
      email: session.user.email,
      role: userRole,
      userId: userId,
      canDelete: can(userRole, 'delete')
    })

    // Only masters can delete financial records
    if (!can(userRole, 'delete')) {
      console.log('Delete access denied for user:', session.user.email, 'with role:', userRole)
      return NextResponse.json({ 
        error: 'Access denied. Only administrators can delete financial records.'
      }, { status: 403 })
    }

    // First check if the record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('finances')
      .select('id, client_name')
      .eq('id', financeId)
      .single()

    if (checkError || !existingRecord) {
      console.log('Record not found for deletion:', financeId, checkError)
      return NextResponse.json({ 
        error: 'Financial record not found'
      }, { status: 404 })
    }

    console.log('Deleting finance record:', { id: financeId, client: existingRecord.client_name })

    // Delete the financial record using admin client to bypass RLS
    const dbClient = supabaseAdmin || supabase
    const { error: deleteError } = await dbClient
      .from('finances')
      .delete()
      .eq('id', financeId)
    
    if (!supabaseAdmin) {
      console.warn('Using anon client for delete - may fail due to RLS policies. Consider setting SUPABASE_SERVICE_ROLE_KEY')
    }

    console.log('Delete operation result:', { deleteError })

    if (deleteError) {
      const errorInfo = handleSupabaseError(deleteError, 'finance deletion')
      console.error('Database error deleting finance record:', errorInfo.message)
      
      return NextResponse.json({ 
        error: errorInfo.message,
        type: errorInfo.type,
        details: deleteError
      }, { status: 500 })
    }

    console.log('Financial record successfully deleted:', financeId)

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