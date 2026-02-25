import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  Cinzel,
  Courier_Prime,
  Lora,
} from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
})

const cinzel = Cinzel({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-cinzel',
})

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-courier',
})

const lora = Lora({
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-lora',
})

export const metadata: Metadata = {
  title: 'Mind Palace',
  description: 'AI-powered mind palace generator using the loci method',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${cinzel.variable} ${courierPrime.variable} ${lora.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
