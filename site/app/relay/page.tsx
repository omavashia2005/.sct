import type { Metadata } from "next"
import type { ReactNode } from "react"
import { InlineCode } from "@/components/code-block"

export const metadata: Metadata = {
  title: "Relay setup",
  description: "Use the hosted .sct relay or publish a SpacetimeDB relay for encrypted sharing.",
}

const sections = [
  { id: "hosted", title: "Use the hosted relay" },
  { id: "cli", title: "Install the CLI" },
  { id: "publish", title: "Publish a database" },
  { id: "connect", title: "Connect .sct" },
  { id: "verify", title: "Verify the relay" },
  { id: "credentials", title: "Protect credentials" },
]

const cliCommands = [
  { command: "curl -sSf https://install.spacetimedb.com | sh", note: "Installs the SpacetimeDB CLI." },
  { command: "spacetime version install 2.13.0", note: "Installs the version that this repository uses." },
  { command: "spacetime version use 2.13.0", note: "Selects that version for the publish command." },
]

const publishCommands = [
  { command: "spacetime login", note: "Opens the Maincloud sign-in page." },
  { command: "bun install", note: "Installs the repository dependencies." },
  { command: "spacetime publish <database> --module-path packages/relay --server maincloud", note: "Builds and publishes the relay module." },
]

export default function RelayPage() {
  return (
    <>
      <section className="border-b border-rule py-16">
        <div className="container grid grid-cols-[minmax(0,1fr)] items-end gap-x-8 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1>Relay setup</h1>
            <p className="lead mt-6 text-ink-2">Use the hosted relay, or publish a SpacetimeDB database that you control.</p>
          </div>
          <p className="text-ink-2 lg:col-span-5">The relay stores ciphertext and routing metadata. Secret names, values, and device private keys stay off the database.</p>
        </div>
      </section>

      <div className="container grid grid-cols-[minmax(0,1fr)] gap-x-8 pt-16 pb-(--section-gap-s) lg:grid-cols-12">
        <nav aria-label="On this page" className="max-lg:hidden lg:col-span-3">
          <ol className="sticky top-24 m-0 grid list-none gap-1 border-l border-rule p-0">
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`} className="-ml-px block border-l border-transparent py-2 pl-4 text-sm text-ink-2 no-underline hover:border-accent hover:text-ink active:bg-paper-2">{title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid min-w-0 gap-(--section-gap) lg:col-span-9">
          <Part id="hosted" title="Use the hosted relay" intro="The standard app connects to Maincloud at sct-relay. You need no relay account or configuration.">
            <dl className="m-0 border-t border-rule">
              <RelayFact name="Endpoint">https://maincloud.spacetimedb.com</RelayFact>
              <RelayFact name="Database">sct-relay</RelayFact>
              <RelayFact name="Transport">TLS with encrypted transfer payloads</RelayFact>
            </dl>
          </Part>

          <Part id="cli" title="Install the CLI" intro="Install the pinned SpacetimeDB version before you publish a separate database.">
            <CommandList commands={cliCommands} />
          </Part>

          <Part id="publish" title="Publish a database" intro="Run these commands from the .sct repository root. Replace &lt;database&gt; with a unique database name.">
            <CommandList commands={publishCommands} />
            <p className="text-sm text-muted">Use the same publish command for an update. Do not add --delete-data unless you intend to remove all relay data.</p>
          </Part>

          <Part id="connect" title="Connect .sct" intro="Set SCT_RELAY to the server URL and database name when you start the app.">
            <div className="border border-rule bg-paper-2 p-6">
              <InlineCode code="SCT_RELAY=https://maincloud.spacetimedb.com/<database> /Applications/sct.app/Contents/MacOS/sct" lang="shellscript" className="break-all" />
            </div>
            <p className="text-sm text-muted">Leave SCT_RELAY unset to use the hosted relay. Set it to off when you need an offline app session.</p>
          </Part>

          <Part id="verify" title="Verify the relay" intro="Describe the database without a deployment login. This checks TLS access and the published schema.">
            <div className="border border-rule bg-paper-2 p-6">
              <InlineCode code="spacetime describe <database> --server maincloud --anonymous" lang="shellscript" className="break-all" />
            </div>
          </Part>

          <Part id="credentials" title="Protect credentials" intro="The publish login and each app identity serve different purposes.">
            <dl className="m-0 border-t border-rule">
              <RelayFact name="Publish login">The CLI stores it in ~/.config/spacetime/cli.toml. Keep it out of Git, builds, and CI.</RelayFact>
              <RelayFact name="App identity">Each Mac receives its own relay token. .sct keeps that token in macOS Keychain.</RelayFact>
              <RelayFact name="Module changes">Run bun run relay:generate after a schema change. Commit the generated TypeScript bindings.</RelayFact>
            </dl>
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

function CommandList({ commands }: { commands: { command: string; note: string }[] }) {
  return (
    <ol className="m-0 list-none border-t border-rule p-0">
      {commands.map(({ command, note }) => (
        <li key={command} className="grid gap-2 border-b border-rule py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
          <InlineCode code={command} lang="shellscript" className="break-all" />
          <span className="text-ink-2">{note}</span>
        </li>
      ))}
    </ol>
  )
}

function RelayFact({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-rule py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-8">
      <dt className="font-medium text-ink">{name}</dt>
      <dd className="m-0 min-w-0 break-words text-ink-2">{children}</dd>
    </div>
  )
}
