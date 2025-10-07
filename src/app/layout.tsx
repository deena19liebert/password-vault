import './globals.css'

export const metadata = {
  title: 'Secure Vault - Password Manager',
  description: 'Your personal secure password vault',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}