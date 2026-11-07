import { cva } from "class-variance-authority"

const toggleVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-none border border-rule px-4 text-sm whitespace-nowrap text-ink-2 transition-[background-color,color] duration-(--dur-micro) ease-[steps(1)] outline-none hover:bg-paper-3 hover:text-ink focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-55 data-pressed:bg-accent-wash data-pressed:text-ink [&_svg]:size-4 [&_svg]:shrink-0"
)

export { toggleVariants }
