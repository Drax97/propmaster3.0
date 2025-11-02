'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    setError(errorParam)
  }, [searchParams])

  const getErrorMessage = (errorType) => {
    switch (errorType) {
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'There was an issue with your authentication. This might be due to account permissions or a temporary system issue.',
          suggestion: 'Please try signing in again. If the problem persists, contact the system administrator.'
        }
      case 'Configuration':
        return {
          title: 'Configuration Error',
          message: 'There is a problem with the authentication configuration.',
          suggestion: 'Please contact the system administrator for assistance.'
        }
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'Unable to verify your account with the authentication provider.',
          suggestion: 'Please ensure you are using the correct Google account and try again.'
        }
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during authentication.',
          suggestion: 'Please try signing in again or contact support if the issue continues.'
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  const handleTryAgain = () => {
    router.push('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">PropMaster</h1>
        </div>

        {/* Error Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-900">
              {errorInfo.title}
            </CardTitle>
            <CardDescription>
              {errorInfo.message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                <strong>What happened:</strong> {errorInfo.suggestion}
              </p>
            </div>

            {error && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <strong>Error Code:</strong> {error}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleTryAgain}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Signing In Again
              </Button>

              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t text-center">
              <p className="text-xs text-gray-500">
                If you continue to experience issues, please contact the administrator at{' '}
                <a 
                  href="mailto:drax976779@gmail.com" 
                  className="text-blue-600 hover:underline"
                >
                  drax976779@gmail.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Debug Information (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify({
                  error: error,
                  timestamp: new Date().toISOString(),
                  userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}