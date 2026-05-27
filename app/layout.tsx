import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ROASify — Product ROAS Analytics for D2C Brands',
  description: 'Analyze return on ad spend at the product level. Built for Indian D2C brands.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)'  },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4F46E5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#FAFAF8]">
      <head>
        {/* Geist served locally via npm package – no external fetch needed */}
        <style>{`
          :root { --font-geist: ui-sans-serif, system-ui, -apple-system, sans-serif; }
          body { font-family: var(--font-geist); }
        `}</style>
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}