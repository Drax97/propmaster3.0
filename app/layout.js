import './globals.css'
import '../styles/dashboard.css'
import { Providers } from './providers'
import ServiceWorkerRegistrar from './ServiceWorkerRegistrar';

export const metadata = {
  title: 'PropMaster - Real Estate Management',
  description: 'Complete real estate management solution with property tracking, finance management, and secure sharing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#004481" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}