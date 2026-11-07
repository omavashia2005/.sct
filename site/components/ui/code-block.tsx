"use client"

import { CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { useEffect, useState, type ComponentProps } from "react"
import { Button } from "@/components/ui/button"

// The shadcn code-block, restyled to the Terminal theme: role tokens, square corners, and no hidden-until-hover actions.
function CodeBlock({ className, ...props }: ComponentProps<"figure">) {
  return (
    <figure
      data-slot="code-block"
      className={cn("well m-0 flex w-full min-w-0 flex-col text-sm text-ink-2 md:text-md", className)}
      {...props}
    />
  )
}

function CodeBlockHeader({ className, ...props }: ComponentProps<"figcaption">) {
  return (
    <figcaption
      data-slot="code-block-header"
      className={cn("flex min-w-0 items-center justify-between gap-4 border-b border-rule py-1 pr-2 pl-6 text-sm text-muted", className)}
      {...props}
    />
  )
}

function CodeBlockCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // The browser refused clipboard access, so the icon stays as it was.
      setCopied(false)
    }
  }

  return (
    <Button variant="ghost" size="icon" data-slot="code-block-copy-button" aria-label={copied ? "Copied" : "Copy"} onClick={copy}>
      {copied ? <CheckIcon aria-hidden="true" className="text-accent" /> : <CopyIcon aria-hidden="true" />}
    </Button>
  )
}

function CodeBlockContent({ className, children, ...props }: ComponentProps<"pre">) {
  return (
    <pre
      data-slot="code-block-content"
      dir="ltr"
      tabIndex={0}
      className={cn("m-0 min-w-0 scroll-fade-x overflow-x-auto p-6 leading-relaxed outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus", className)}
      {...props}
    >
      <code data-slot="code-block-code" className="grid min-w-max content-start">{children}</code>
    </pre>
  )
}

function CodeBlockLine({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span data-slot="code-block-line" className={cn("block min-h-lh", className)} {...props}>
      {/* An empty line holds a newline so copying a selection keeps blank lines. */}
      {Array.isArray(children) && children.length === 0 ? "\n" : children}
    </span>
  )
}

export { CodeBlock, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockLine }
