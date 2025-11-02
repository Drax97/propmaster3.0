import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'PropMaster - Real Estate Management',
  description: 'Complete real estate management solution with property tracking, finance management, and secure sharing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}