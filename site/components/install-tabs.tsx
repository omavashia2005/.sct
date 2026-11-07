import { InlineCode } from "@/components/code-block"
import { CodeBlockCopyButton } from "@/components/ui/code-block"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const commands = [
  { manager: "npm", command: "npm install dotsct" },
  { manager: "pnpm", command: "pnpm add dotsct" },
  { manager: "bun", command: "bun add dotsct" },
  { manager: "yarn", command: "yarn add dotsct" },
]

export function InstallTabs() {
  return (
    <Tabs defaultValue="npm" className="well">
      <TabsList className="px-3">
        {commands.map(({ manager }) => (
          <TabsTrigger key={manager} value={manager}>{manager}</TabsTrigger>
        ))}
      </TabsList>
      {commands.map(({ manager, command }) => (
        <TabsContent key={manager} value={manager} className="flex items-center justify-between gap-4 py-2 pr-2 pl-6">
          <InlineCode code={command} lang="shellscript" className="min-w-0 overflow-x-auto text-md whitespace-nowrap sm:text-lg" />
          <CodeBlockCopyButton value={command} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
