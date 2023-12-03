import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Falar com Luzia.',
  description: 'Luzia: checagem dos fatos com inteligência artificial.'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="{inter.className}" style={{ backgroundColor: "#efede6", overflow: "visible" }}>{children}</body>
    </html>
  )
}
