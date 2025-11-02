'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, Mail, LogOut, Building2, Shield } from 'lucide-react'

export default function AccessPending() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    
    // If user has access, redirect to dashboard
    if (session?.user?.status === 'active' && session?.user?.role !== 'pending') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleContactMaster = () => {
    const subject = encodeURIComponent('PropMaster Access Request')
    const body = encodeURIComponent(`Hi,

I have signed up for PropMaster and would like to request access to the platform.

My details:
- Name: ${session.user.name}
- Email: ${session.user.email}
- Signed up: ${new Date().toLocaleDateString()}

Please grant me appropriate access permissions.

Thank you!`)
    
    window.open(`mailto:drax976779@gmail.com?subject=${subject}&body=${body}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PropMaster</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={session.user.image} />
                  <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-sm text-orange-600 font-medium">Access Pending</p>
                </div>
              </div>
              
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Pending Access Card */}
          <Card className="text-center">
            <CardHeader className="pb-6">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Access Pending</CardTitle>
              <CardDescription className="text-lg">
                Your account is waiting for administrator approval
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="text-left">
                    <h3 className="font-medium text-orange-900">Security Notice</h3>
                    <p className="text-orange-700 text-sm mt-1">
                      For security reasons, all new users must be approved by the system administrator 
                      before gaining access to PropMaster features.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-left bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Your Information:</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Name:</span> {session.user.name}</p>
                    <p><span className="font-medium">Email:</span> {session.user.email}</p>
                    <p><span className="font-medium">Status:</span> Pending Approval</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">What's Next?</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>1. Your request has been automatically submitted to the administrator</p>
                    <p>2. You will receive email notification once approved</p>
                    <p>3. Contact the administrator directly if you need urgent access</p>
                  </div>
                </div>

                <Button 
                  onClick={handleContactMaster}
                  className="w-full"
                  size="lg"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Administrator
                </Button>

                <p className="text-xs text-gray-500">
                  This will open your email client with a pre-filled message
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
              What you'll get access to:
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Property Management</h4>
                    <p className="text-sm text-gray-600">Manage properties, photos, and documents</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Finance Tracking</h4>
                    <p className="text-sm text-gray-600">Track payments and financial records</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}