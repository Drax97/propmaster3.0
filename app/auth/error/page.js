'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, RefreshCw, ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const errorType = searchParams?.get('error') || null

  // Determine error type from URL search params during client-side rendering
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

  // Provide a default error state for static generation
  const errorInfo = getErrorMessage(errorType || 'Default')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PropMaster</h1>
        </div>

        {/* Error Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl text-red-900 dark:text-red-400">
              {errorInfo.title}
            </CardTitle>
            <CardDescription>
              {errorInfo.message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {errorInfo.suggestion}
            </p>
            
            <div className="flex justify-center space-x-4">
              <Button variant="outline" asChild>
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                </Link>
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading error page...</div>}>
      <AuthErrorContent />
    </Suspense>
  )
}