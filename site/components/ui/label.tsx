import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("flex items-center gap-3 text-sm text-ink-2 select-none", className)}
      {...props}
    />
  )
}

export { Label }
