"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DownloadLink } from "@/components/download-link"
import { links } from "@/lib/links"

const navLink = "flex items-center border-r border-rule px-4 text-sm text-ink-2 no-underline hover:bg-paper-3 hover:text-ink active:bg-paper-2 aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-accent)] sm:px-6"

export function SiteHeader() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-(--z-sticky-nav) border-b border-rule bg-paper-2">
      <div className="container flex min-h-16 items-stretch justify-between gap-4">
        <div className="flex items-stretch">
          <Link href="/" aria-label=".sct home" className="flex items-center bg-accent px-5 text-lg font-bold text-accent-ink no-underline">
            .sct
          </Link>
          <nav aria-label="Main" className="flex items-stretch">
            <Link href="/#how" className={`${navLink} max-sm:hidden`}>How it works</Link>
            <Link href="/sdk" className={navLink} aria-current={pathname === "/sdk" ? "page" : undefined}>SDK</Link>
            <Link href="/relay" className={`${navLink} max-md:hidden`} aria-current={pathname === "/relay" ? "page" : undefined}>Relay</Link>
            <a href={links.repo} className={navLink}>GitHub</a>
          </nav>
        </div>
        <DownloadLink compact className="self-center max-md:hidden" />
      </div>
    </header>
  )
}
