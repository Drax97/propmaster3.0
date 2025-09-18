import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase, USER_ROLES, USER_STATUS, MASTER_EMAIL, isMasterUser } from '@/lib/supabase'

const handler = NextAuth({
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
        try {
          console.log('Creating/updating user in database:', user.email)
          
          const isMasterUser = user.email === MASTER_EMAIL
          
          // Create or update user in Supabase
          const userData = {
            email: user.email,
            name: user.name,
            image: user.image,
            role: isMasterUser ? USER_ROLES.MASTER : USER_ROLES.VIEWER,
            status: USER_STATUS.ACTIVE,
            permissions: JSON.stringify(
              isMasterUser ? 
                ['all_permissions'] : 
                ['dashboard_view', 'properties_view']
            ),
            last_login: new Date().toISOString()
          }

          // Try to create/update user in database
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
              console.log('Supabase upsert error (using fallback):', error.message)
              
              // Fallback: Set token values directly
              token.role = userData.role
              token.status = userData.status  
              token.permissions = userData.permissions
              token.userId = `user-${Date.now()}`
              token.isMaster = isMasterUser
            } else {
              console.log('User successfully created/updated in Supabase:', data.email)
              
              // Use database values
              token.role = data.role
              token.status = data.status
              token.permissions = data.permissions
              token.userId = data.id
              token.isMaster = isMasterUser
            }
          } catch (dbError) {
            console.log('Database operation failed, using fallback values:', dbError.message)
            
            // Fallback values - still give access
            token.role = userData.role
            token.status = userData.status
            token.permissions = userData.permissions
            token.userId = `user-${Date.now()}`
            token.isMaster = isMasterUser
          }
          
          console.log(`User ${user.email} logged in with role: ${token.role}`)
          
        } catch (error) {
          console.error('JWT callback error:', error)
          
          // Final fallback: still give property viewing access
          const isMasterUser = user.email === MASTER_EMAIL
          token.role = isMasterUser ? USER_ROLES.MASTER : USER_ROLES.VIEWER
          token.status = USER_STATUS.ACTIVE
          token.permissions = isMasterUser ? 
            JSON.stringify(['all_permissions']) : 
            JSON.stringify(['dashboard_view', 'properties_view'])
          token.userId = isMasterUser ? 'master-user-id' : `user-${Date.now()}`
          token.isMaster = isMasterUser
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      session.user.status = token.status
      session.user.permissions = token.permissions
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
})

export { handler as GET, handler as POST }