import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-none border border-muted bg-paper px-3 text-md text-ink outline-2 -outline-offset-3 outline-transparent placeholder:text-muted focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
