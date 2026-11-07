"use client"

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { CodeBlockContent } from "@/components/ui/code-block"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bootLog, SECRET_NAME, type LogLine } from "@/lib/demo"
import { useVault } from "./vault-provider"

// The page highlights boot.ts at build time and passes it in as source.
export function RuntimeDemo({ source }: { source: ReactNode }) {
  return (
    <figure aria-label="Live demo: save a secret and watch process.env" className="well m-0 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <VaultPane />
      <RuntimePane source={source} />
    </figure>
  )
}

function VaultPane() {
  const { secrets, save, remove } = useVault()
  const [name, setName] = useState("")
  const [status, setStatus] = useState("")
  const valueRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const valueId = useId()
  const exists = secrets.some((secret) => secret.name === name)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = valueRef.current
    if (!value) return
    if (!SECRET_NAME.test(name)) {
      setStatus("Use letters, digits and underscores, and start with a letter or underscore.")
      return
    }
    save({ name, length: value.value.length })
    // The desktop app clears the value field after each save. The demo does the same and keeps only the length.
    value.value = ""
    setStatus(`Saved ${name} to the vault.`)
    setName("")
  }

  const edit = (secretName: string) => {
    setName(secretName)
    setStatus("")
    valueRef.current?.focus()
  }

  return (
    <section aria-label="The .sct vault" className="flex flex-col gap-5 border-rule p-6 max-md:border-b md:border-r">
      <header>
        <h3 className="text-lg">existing-project</h3>
        <p className="mt-1 text-xs text-muted">~/.sct/existing-project/<wbr />secrets.sct</p>
      </header>
      <ul className="m-0 list-none border-t border-rule p-0">
        {secrets.map((secret) => (
          <li key={secret.name} className="flex items-center gap-2 border-b border-rule py-1">
            <span className="min-w-0 flex-1 truncate text-sm">{secret.name}</span>
            <Button variant="ghost" size="icon" onClick={() => edit(secret.name)} aria-label={`Edit ${secret.name}`}>
              <PencilSimpleIcon aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(secret.name)} aria-label={`Delete ${secret.name}`}>
              <TrashIcon aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <label htmlFor={nameId} className="text-sm text-ink-2">Name</label>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value.toUpperCase())}
          placeholder="OPENAI_API_KEY"
          autoComplete="off"
          spellCheck={false}
        />
        <label htmlFor={valueId} className="text-sm text-ink-2">Value</label>
        <Input id={valueId} ref={valueRef} name="value" type="password" placeholder="sk-example" autoComplete="off" />
        <Button type="submit" variant="outline" size="sm" className="mt-1 justify-self-start">
          {exists ? "Update in Keychain" : "Save to Keychain"}
        </Button>
        <p aria-live="polite" className="min-h-[1lh] text-sm text-muted">{status}</p>
      </form>
      <p className="mt-auto text-sm text-muted">
        Each value has its own key in macOS Keychain. <a href="#share" className="text-ink-2 underline decoration-dotted hover:text-accent">Send these to a teammate</a>.
      </p>
    </section>
  )
}

function RuntimePane({ source }: { source: ReactNode }) {
  const { env, changed, log } = useVault()
  return (
    <section aria-label="The running app" className="flex min-w-0 flex-col">
      <Tabs defaultValue="source">
        <TabsList className="px-3">
          <TabsTrigger value="source">boot.ts</TabsTrigger>
          <TabsTrigger value="terminal">terminal</TabsTrigger>
        </TabsList>
        <TabsContent value="source">
          <CodeBlockContent className="min-h-56 text-sm md:text-md">{source}</CodeBlockContent>
        </TabsContent>
        <TabsContent value="terminal">
          <Session log={log} />
        </TabsContent>
      </Tabs>
      <div className="mt-auto border-t border-rule p-6">
        <h3 className="text-sm text-muted">process.env inside the app</h3>
        <table className="mt-3 w-full border-collapse text-sm">
          <tbody>
            {env.map((secret) => (
              <tr
                key={changed?.name === secret.name ? `${secret.name}-${changed.id}` : secret.name}
                className={changed?.name === secret.name ? "flash border-b border-rule" : "border-b border-rule"}
              >
                <th scope="row" className="py-2 pr-4 text-left font-normal text-ink">{secret.name}</th>
                <td className="py-2 text-right whitespace-nowrap text-muted">{secret.length} chars</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Session({ log }: { log: LogLine[] }) {
  return (
    <div className="min-h-56 overflow-x-auto p-6 text-sm leading-relaxed" role="log" aria-label="Terminal output">
      {log.map((line, index) => (
        <p
          key={line.id}
          className={`whitespace-pre ${line.id <= bootLog.length ? "type-in" : ""} ${lineColor[line.kind]}`}
          style={{ "--i": index } as CSSProperties}
        >
          {line.kind === "command" ? <>~/code/existing-project <span className="text-muted">$</span> {line.text}</> : line.text}
        </p>
      ))}
      <span className="caret" aria-hidden="true" />
    </div>
  )
}

const lineColor: Record<LogLine["kind"], string> = {
  command: "text-ink",
  output: "text-ink-2",
  event: "text-accent",
}
