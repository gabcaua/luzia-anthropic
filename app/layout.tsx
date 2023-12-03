import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Antes de repassar, vamos checar.',
  description: 'Luzia: checagem dos fatos com inteligência artificial.'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="{inter.className}" style={{ backgroundColor: "#efede6" }}>{children}</body>
    </html>
  )
}
