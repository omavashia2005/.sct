import { createHighlighterCore } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

// From the shadcn code-block registry item. Pages call it at build time, so the static export sends no Shiki code to the browser.
const highlighter = createHighlighterCore({
  themes: [import("shiki/themes/github-dark-default.mjs")],
  langs: [import("shiki/langs/typescript.mjs"), import("shiki/langs/shellscript.mjs")],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
})

// Returns one entry per line. Each key is the line's character offset in the code, so it stays unique and stable.
export async function highlightCode(code: string, lang: "typescript" | "shellscript") {
  const { tokens } = (await highlighter).codeToTokens(code, { lang, theme: "github-dark-default" })
  let offset = 0
  return code.split("\n").map((text, index) => {
    const key = offset
    offset += text.length + 1
    return {
      key,
      nodes: (tokens[index] ?? []).map((token) => (
        <span key={token.offset} style={{ color: token.color }}>{token.content}</span>
      )),
    }
  })
}
