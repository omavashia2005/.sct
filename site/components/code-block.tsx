import { cn } from "cn"
import { CodeBlock, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockLine } from "@/components/ui/code-block"
import { highlightCode } from "@/lib/highlighter"

// Server components only: each one highlights at build time.

export async function SourceBlock({ file, children }: { file: string; children: string }) {
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <span>{file}</span>
        <CodeBlockCopyButton value={children} />
      </CodeBlockHeader>
      <CodeBlockContent>
        <SourceLines code={children} />
      </CodeBlockContent>
    </CodeBlock>
  )
}

export async function SourceLines({ code }: { code: string }) {
  const lines = await highlightCode(code, "typescript")
  return lines.map(({ key, nodes }) => <CodeBlockLine key={key}>{nodes}</CodeBlockLine>)
}

// One line of code inside prose or a table. Commands get the "$ " prompt.
export async function InlineCode({ code, lang, className }: { code: string; lang: "typescript" | "shellscript"; className?: string }) {
  const [line] = await highlightCode(code, lang)
  return <code className={cn(lang === "shellscript" && "prompt", className)}>{line.nodes}</code>
}
