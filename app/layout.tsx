

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import './globals.css'
import AmigoWalletProvider from "@/providers/AmigoWalletProvider"
import { Providers } from "./provider";
import { AccountProvider } from "@/context/AccountContext"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Amigo Exchange",
  description: "Seamless Crypto to Fiat Exchange Platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AccountProvider>
          <AmigoWalletProvider>
          <ThemeProvider defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        </AmigoWalletProvider>

        </AccountProvider>
        
      </body>
    </html>
  )
}






