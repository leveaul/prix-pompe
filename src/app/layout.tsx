import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PrixPompe — Carburants en temps réel',
  description: 'Trouvez les stations les moins chères près de vous',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
