import type { Metadata } from "next"
import type { ReactNode } from "react"
import { InlineCode, SourceBlock } from "@/components/code-block"
import { InstallTabs } from "@/components/install-tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bootSource } from "@/lib/demo"

export const metadata: Metadata = {
  title: "@sct/env SDK guide",
  description: "Install @sct/env, load a project's .sct secrets into process.env before your app imports, and react to saved changes without a restart.",
}

const sections = [
  { id: "setup", title: "Set up sct once" },
  { id: "load", title: "Load before imports" },
  { id: "changes", title: "React to changes" },
  { id: "stop", title: "Stop updates" },
  { id: "options", title: "Options" },
  { id: "loaders", title: "Other loaders" },
]

const setup = [
  { command: "bun run package:mac", note: "Builds the signed app from the repo." },
  { command: "bun run install:cli", note: "Writes the sct command to ~/.local/bin." },
  { command: "open dist/sct-darwin-arm64/sct.app", note: "Register the folder and save its secrets." },
]

const options = [
  { name: "project", type: "string", detail: "An exact registered project name. Without it, the SDK uses the nearest registered parent folder." },
  { name: "onChange", type: "() => void", detail: "Runs after each later update, never after the first load." },
  { name: "onError", type: "(error: Error) => void", detail: "Runs when a later read fails. Without it, a message with no values goes to stderr." },
]

const loaders = [
  { name: "dotenv", detail: "Keeps injected variables. Code that requires a .env read must handle the missing file." },
  { name: "Bun", detail: "Its automatic .env load does not read the vault. process.env already holds the values." },
  { name: "Vite", detail: "VITE_ variables reach browser code. Keep private credentials out of public prefixes." },
]

const changesSource = `await loadEnv({
  onChange: () => rebuildClients(),
  onError: (error) => reportSecretAccessFailure(error),
})`

const stopSource = `const stop = await loadEnv()

// Ends the helper and puts inherited values back.
stop()`

export default function SdkPage() {
  return (
    <>
      <section className="border-b border-rule py-16">
        <div className="container grid grid-cols-[minmax(0,1fr)] items-end gap-x-8 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h1>@sct/env</h1>
            <p className="lead mt-6 text-ink-2">Loads a project&apos;s .sct secrets into process.env and keeps them current.</p>
          </div>
          <div id="install" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:col-span-6">
            <InstallTabs />
            <p className="text-sm text-muted">Needs macOS, Node.js 22.18+ or Bun, and sct on PATH.</p>
          </div>
        </div>
      </section>

      <div className="container grid grid-cols-[minmax(0,1fr)] gap-x-8 pt-16 pb-(--section-gap-s) lg:grid-cols-12">
        <nav aria-label="On this page" className="max-lg:hidden lg:col-span-3">
          <ol className="sticky top-24 m-0 grid list-none gap-1 border-l border-rule p-0">
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`} className="-ml-px block border-l border-transparent py-2 pl-4 text-sm text-ink-2 no-underline hover:border-accent hover:text-ink">{title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid min-w-0 gap-(--section-gap) lg:col-span-9">
          <Part id="setup" title="Set up sct once" intro="The SDK starts the sct command. Install it first.">
            <ol className="m-0 list-none border-t border-rule p-0">
              {setup.map(({ command, note }) => (
                <li key={command} className="grid gap-2 border-b border-rule py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
                  <InlineCode code={command} lang="shellscript" className="break-all" />
                  <span className="text-ink-2">{note}</span>
                </li>
              ))}
            </ol>
          </Part>

          <Part id="load" title="Load before imports" intro="Static imports run before loadEnv(). Import modules that read process.env on load after it.">
            <SourceBlock file="boot.ts">{bootSource}</SourceBlock>
          </Part>

          <Part id="changes" title="React to changes" intro="Saved changes reach process.env in about 500 ms. Rebuild clients that copied a credential.">
            <SourceBlock file="boot.ts">{changesSource}</SourceBlock>
          </Part>

          <Part id="stop" title="Stop updates" intro="Call loadEnv() once at startup. Each call owns one helper until it stops or the app exits.">
            <SourceBlock file="boot.ts">{stopSource}</SourceBlock>
          </Part>

          <Part id="options" title="Options" intro="Project secrets override inherited variables. Deleting a key restores the inherited value.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>What it does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map(({ name, type, detail }) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium text-ink">{name}</TableCell>
                    <TableCell className="whitespace-nowrap"><InlineCode code={type} lang="typescript" /></TableCell>
                    <TableCell className="min-w-[24ch] text-ink-2">{detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Part>

          <Part id="loaders" title="Other loaders" intro="Libraries read process.env. They never read or decrypt the vault file.">
            <dl className="m-0 border-t border-rule">
              {loaders.map(({ name, detail }) => (
                <div key={name} className="grid gap-2 border-b border-rule py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-8">
                  <dt className="font-medium text-ink">{name}</dt>
                  <dd className="m-0 text-ink-2">{detail}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted">The SDK belongs in trusted server code. Browser bundles cannot use it.</p>
          </Part>
        </div>
      </div>
    </>
  )
}

function Part({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid min-w-0 gap-8">
      <div>
        <h2 id={`${id}-title`}>{title}</h2>
        <p className="mt-4 text-ink-2">{intro}</p>
      </div>
      {children}
    </section>
  )
}
