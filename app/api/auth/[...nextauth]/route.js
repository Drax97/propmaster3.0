import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase, MASTER_EMAIL } from '@/lib/supabase'
import { ROLES, DEFAULT_ROLE, isMasterUser } from '@/lib/permissions'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('SignIn callback for:', user.email)
        
        // Always allow sign in - we'll handle user creation/update in JWT callback
        return true
      } catch (error) {
        console.error('SignIn callback error:', error)
        return true // Allow login even if there are issues
      }
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        // For new login, create/update user in database with automatic property viewing access
        const isUserMaster = isMasterUser(user.email)
        let existingUser = null
        
        try {
          console.log('Creating/updating user in database:', user.email)
          
          // First, try to get existing user to preserve their role
          try {
            const { data: existing, error: fetchError } = await supabase
              .from('users')
              .select('role')
              .eq('email', user.email)
              .single()
            
            if (!fetchError && existing) {
              existingUser = existing
            }
          } catch (fetchErr) {
            console.log('Could not fetch existing user:', fetchErr.message)
          }
          
          // Create or update user in Supabase - preserve existing role or set default
          const userData = {
            email: user.email,
            name: user.name,
            image: user.image,
            role: existingUser ? existingUser.role : (isUserMaster ? ROLES.MASTER : DEFAULT_ROLE),
            last_login: new Date().toISOString()
          }

          // Try to create/update user in database with enhanced error handling
          try {
            const { data, error } = await supabase
              .from('users')
              .upsert(userData, { 
                onConflict: 'email',
                ignoreDuplicates: false 
              })
              .select()
              .single()

            if (error) {
              console.log('Supabase upsert error:', error.message, 'Code:', error.code)
              
              // Handle specific error types
              if (error.code === 'PGRST205') {
                console.log('Schema cache error - user table exists but not in cache')
              } else if (error.code === 'PGRST116') {
                console.log('Users table not found - database setup required')
              }
              
              // Fallback: Set token values directly but still allow access
              token.role = userData.role
              token.userId = `fallback-${user.email.replace('@', '-').replace('.', '-')}`
              token.isMaster = isUserMaster
              token.dbConnectionStatus = 'fallback'
              
              console.log(`User ${user.email} authenticated with fallback values (role: ${token.role})`)
            } else {
              console.log('User successfully created/updated in Supabase:', data.email)
              
              // Use database values
              token.role = data.role
              token.userId = data.id
              token.isMaster = isUserMaster
              token.dbConnectionStatus = 'connected'
              
              console.log(`User ${user.email} authenticated from database (role: ${token.role})`)
            }
          } catch (dbError) {
            console.log('Database operation failed:', dbError.message)
            
            // Fallback values - still give access
            token.role = userData.role
            token.userId = `error-fallback-${Date.now()}`
            token.isMaster = isUserMaster
            token.dbConnectionStatus = 'error'
            
            console.log(`User ${user.email} authenticated with error fallback (role: ${token.role})`)
          }
          
          console.log(`User ${user.email} logged in with role: ${token.role}`)
          
        } catch (error) {
          console.error('JWT callback error:', error)
          
          // Final fallback: still give property viewing access
          // Try to preserve existing role, fallback to default only for new users
          token.role = existingUser ? existingUser.role : (isUserMaster ? ROLES.MASTER : DEFAULT_ROLE)
          token.userId = isUserMaster ? 'master-user-id' : `user-${Date.now()}`
          token.isMaster = isUserMaster
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role ?? DEFAULT_ROLE
      session.user.userId = token.userId
      session.user.isMaster = token.isMaster
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }