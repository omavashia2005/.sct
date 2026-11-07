import type { Metadata } from "next"
import { Martian_Mono } from "next/font/google"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

// The theme sets display text at 112.5% width and body text at 87.5%, so the width axis must ship with the font.
const martian = Martian_Mono({ subsets: ["latin"], axes: ["wdth"], variable: "--font-martian", display: "swap" })

export const metadata: Metadata = {
  title: ".sct",
  description: ".sct replaces .env files with a Keychain-backed vault on your Mac, loads secrets at runtime through the dotsct SDK, and sends them to teammates over AirDrop or an encrypted relay.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={martian.variable}>
      <body>
        <a href="#main" className="absolute -top-24 left-4 z-(--z-toast) bg-ink px-4 py-2 text-paper focus-visible:top-4">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
