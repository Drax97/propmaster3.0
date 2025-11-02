import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Fetch user data
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, role, status, permissions')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching user info:', error)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(userData)

  } catch (error) {
    console.error('User info API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}