'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/ui/theme-provider'
import dynamic from 'next/dynamic'

const PWAInstallButton = dynamic(
  () => import('@/components/PWAInstallButton'),
  { 
    ssr: false,
    loading: () => null
  }
)

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster />
        <PWAInstallButton />
      </ThemeProvider>
    </SessionProvider>
  )
}