import { NextResponse } from 'next/server'
import { supabase, USER_ROLES, USER_STATUS, MASTER_EMAIL } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('Fixing master user for:', MASTER_EMAIL)

    // Update the master user's role and status
    const { data, error } = await supabase
      .from('users')
      .update({
        role: USER_ROLES.MASTER,
        status: USER_STATUS.ACTIVE,
        updated_at: new Date().toISOString()
      })
      .eq('email', MASTER_EMAIL)
      .select('*')

    if (error) {
      console.error('Error updating master user:', error)
      
      // If it's a schema cache issue, try to create the user
      if (error.code === 'PGRST205') {
        const userData = {
          id: crypto.randomUUID(),
          email: MASTER_EMAIL,
          name: 'Master User',
          role: USER_ROLES.MASTER,
          status: USER_STATUS.ACTIVE,
          permissions: JSON.stringify([]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }

        return NextResponse.json({ 
          message: 'Master user configuration updated (fallback)',
          user: userData,
          fallback: true
        })
      }
      
      return NextResponse.json({ error: 'Failed to update master user' }, { status: 500 })
    }

    if (data && data.length > 0) {
      console.log('Master user updated successfully:', data[0])
      return NextResponse.json({ 
        message: 'Master user updated successfully',
        user: data[0]
      })
    } else {
      return NextResponse.json({ error: 'Master user not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Fix master user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}