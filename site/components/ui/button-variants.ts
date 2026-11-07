import { cva } from "class-variance-authority"

// Terminal controls: square, 1px rules, and colour changes in steps(1) instead of eased fades.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-none border font-medium whitespace-nowrap no-underline transition-[background-color,border-color,color] duration-(--dur-micro) ease-[steps(1)] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-accent bg-accent text-accent-ink hover:border-ink hover:bg-ink active:border-ink-2 active:bg-ink-2",
        outline: "border-ink-2 bg-transparent text-ink hover:bg-paper-3 active:bg-paper-2",
        ghost: "border-transparent bg-transparent text-ink-2 hover:bg-paper-3 hover:text-ink active:bg-paper-2",
      },
      size: {
        default: "min-h-12 px-6 text-md [&_svg]:size-5",
        sm: "min-h-11 px-4 text-sm [&_svg]:size-4",
        icon: "size-11 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export { buttonVariants }
