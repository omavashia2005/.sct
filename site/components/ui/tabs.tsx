"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "cn"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex items-stretch overflow-x-auto border-b border-rule", className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm whitespace-nowrap text-muted transition-[color,border-color] duration-(--dur-micro) ease-[steps(1)] outline-none hover:text-ink active:text-ink-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-active:border-accent data-active:text-ink",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
