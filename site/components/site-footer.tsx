import Link from "next/link"
import { links } from "@/lib/links"

const footLink = "text-ink-2 underline decoration-dotted hover:text-accent"

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="container py-16">
        <p className="max-w-[60ch] text-ink-2">
          The <span className="font-bold text-ink">.sct</span> source, docs and DMG builds are on <a href={links.repo} className={footLink}>GitHub</a>. Start with the{" "}
          <Link href="/sdk" className={footLink}>SDK guide</Link> or the <a href={links.video} className={footLink}>demo video</a>.
        </p>
      </div>
    </footer>
  )
}
