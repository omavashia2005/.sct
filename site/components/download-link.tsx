import { AppleLogoIcon } from "@phosphor-icons/react/dist/ssr"
import { buttonVariants } from "@/components/ui/button-variants"
import { links } from "@/lib/links"
import { cn } from "cn"

export function DownloadLink({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <a
      href={links.dmg}
      className={cn(buttonVariants(compact ? { variant: "outline", size: "sm" } : {}), className)}
    >
      <AppleLogoIcon weight="fill" aria-hidden="true" />
      {compact ? "Download" : "Download for Mac"}
    </a>
  )
}
