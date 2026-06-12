import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PrixPompe — Carburants en temps réel',
  description: 'Trouvez les stations les moins chères près de vous',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
