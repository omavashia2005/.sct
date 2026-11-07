import Link from "next/link"
import { InlineCode, SourceBlock, SourceLines } from "@/components/code-block"
import { RuntimeDemo } from "@/components/demo/runtime-demo"
import { ShareDemo } from "@/components/demo/share-demo"
import { VaultProvider } from "@/components/demo/vault-provider"
import { DownloadLink } from "@/components/download-link"
import { InstallTabs } from "@/components/install-tabs"
import { buttonVariants } from "@/components/ui/button-variants"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bootSource } from "@/lib/demo"

const textLink = "text-ink-2 underline decoration-dotted hover:text-accent"

// Each row is a file or folder. Depth sets the indent, and note is the muted text after the name.
const before = [
  { name: "existing-project/", depth: 0 },
  { name: ".env", depth: 1, note: "plaintext" },
  { name: "STRIPE_KEY=sk_live_…", depth: 2 },
  { name: ".env.local", depth: 1, note: "plaintext" },
  { name: ".gitignore", depth: 1, note: ".env*" },
  { name: "package.json", depth: 1 },
  { name: "server.ts", depth: 1 },
]

const after = [
  { name: "existing-project/", depth: 0 },
  { name: "boot.ts", depth: 1, note: "calls loadEnv()" },
  { name: "package.json", depth: 1 },
  { name: "server.ts", depth: 1 },
  { name: "~/.sct/existing-project/", depth: 0, gap: true },
  { name: "secrets.sct", depth: 1, note: "encrypted" },
  { name: "keys", depth: 1, note: "macOS Keychain" },
]

const safeguards = [
  { term: "Pair once", detail: "Compare one code on both Macs." },
  { term: "Encrypted on your Mac", detail: "AES-256-GCM, X25519 key wrap and an Ed25519 signature." },
  { term: "Relay sees ciphertext", detail: "Names and values stay encrypted on SpacetimeDB." },
  { term: "Access can end", detail: "Set when relay access ends. AirDrop packages expire in 24 hours." },
]

const needs = [
  { need: "macOS on Apple Silicon", why: "The DMG comes from the latest GitHub release." },
  { need: "Node.js 22.18 or later, or Bun", why: "The dotsct SDK runs in server-side code." },
  { need: "The sct command on PATH", why: "The SDK starts it. The SDK guide covers the setup." },
  { need: "A coding agent, if you use one", why: "Agents use secrets through the sct CLI or MCP server. Each request opens an approval window on your Mac, and the agent never sees a value." },
]

export default function Home() {
  return (
    <VaultProvider>
      <section className="container grid grid-cols-[minmax(0,1fr)] gap-y-10 py-12">
        <div>
          <h1 className="max-w-none text-[clamp(2.25rem,2.2vw+1rem,3rem)]">Never commit your&nbsp;secrets again.</h1>
          <p className="lead mt-6 max-w-none text-ink-2">Load secrets at runtime, manage them from one space, and share them securely with teammates.</p>
        </div>
        <RuntimeDemo source={<SourceLines code={bootSource} />} />
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <DownloadLink />
            <Link href="/sdk#install" className={buttonVariants({ variant: "outline" })}>Install the SDK</Link>
          </div>
          <p className="mt-4 text-sm text-muted">For Apple Silicon Macs.</p>
        </div>
      </section>

      <section id="how" className="border-t border-rule py-(--section-gap)">
        <div className="container grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <h2 className="max-w-none">1. Take .env out of the repo</h2>
            <p className="mt-6 text-ink-2">
              One vault in <code className="text-ink">~/.sct</code> holds them, outside every project folder.
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2 lg:col-span-12">
            <FolderPanel title="Before" rows={before} summary="Plaintext in the repo, one git add from a leak." />
            <FolderPanel title="After" rows={after} summary="No secret file in the project." />
          </div>
        </div>
      </section>

      <section className="border-t border-rule py-(--section-gap-l)">
        <div className="container grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-12 lg:grid-cols-12">
          <h2 className="max-w-none lg:col-span-12">2. Load secrets when the app starts</h2>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6 lg:col-span-5">
            <InstallTabs />
            <Link href="/sdk" className={`${textLink} justify-self-start`}>Read the SDK guide</Link>
          </div>
          <div className="min-w-0 lg:col-span-7">
            <SourceBlock file="boot.ts">{bootSource}</SourceBlock>
          </div>
        </div>
      </section>

      <section id="share" className="border-t border-rule py-(--section-gap)">
        <div className="container grid grid-cols-[minmax(0,1fr)] gap-12">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 lg:grid-cols-12 lg:items-end">
            <h2 className="max-w-none lg:col-span-12">3. Send them to a teammate</h2>
            <p className="text-ink-2 lg:col-span-12">
              AirDrop works nearby, and the relay works from anywhere.
            </p>
          </div>
          <ShareDemo />
          <dl className="m-0 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {safeguards.map(({ term, detail }) => (
              <div key={term} className="border-t border-rule pt-4">
                <dt className="font-medium text-ink">{term}</dt>
                <dd className="m-0 mt-2 text-ink-2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-rule py-(--section-gap-s)">
        <div className="container grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-10 lg:grid-cols-12">
          <h2 className="max-w-none lg:col-span-12">What you need</h2>
          <div className="lg:col-span-12">
            <Table>
              <TableHeader className="max-sm:sr-only">
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needs.map(({ need, why }) => (
                  <TableRow key={need} className="max-sm:grid max-sm:gap-1 max-sm:py-4">
                    <TableCell className="font-medium text-ink max-sm:p-0 lg:whitespace-nowrap">{need}</TableCell>
                    <TableCell className="text-ink-2 max-sm:p-0">{why}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="border-t border-rule bg-paper-2 py-(--section-gap-s)">
        <div className="container grid grid-cols-[minmax(0,1fr)] items-center gap-x-8 gap-y-10 lg:grid-cols-12">
          <h2 className="max-w-none lg:col-span-12">Get .sct for your Mac</h2>
          <div className="lg:col-span-5">
            <p className="text-ink-2">The build is not notarized, so macOS blocks the first launch until you clear the quarantine flag.</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <DownloadLink />
              <Link href="/sdk#install" className={buttonVariants({ variant: "outline" })}>Install the SDK</Link>
            </div>
          </div>
          <ol className="m-0 grid list-none gap-0 border border-rule bg-paper p-0 lg:col-span-7">
            <li className="border-b border-rule p-6 text-ink-2">Open sct-macos-arm64.dmg and drag sct.app to Applications.</li>
            <li className="border-b border-rule p-6"><InlineCode code="xattr -dr com.apple.quarantine /Applications/sct.app" lang="shellscript" className="break-all" /></li>
            <li className="p-6 text-ink-2">Open sct.app, add a project folder, and save its secrets.</li>
          </ol>
        </div>
      </section>
    </VaultProvider>
  )
}

interface FolderRow {
  name: string
  depth: number
  note?: string
  gap?: boolean
}

function FolderPanel({ title, rows, summary }: { title: string; rows: FolderRow[]; summary: string }) {
  return (
    <figure className="well m-0 flex min-w-0 flex-col">
      <figcaption className="border-b border-rule px-6 py-3 text-sm text-muted">{title}</figcaption>
      <ul className="m-0 list-none p-6 text-sm md:text-md">
        {rows.map(({ name, depth, note, gap }) => (
          <li
            key={name}
            className={`flex min-w-0 flex-wrap gap-x-4 py-1 ${gap ? "mt-6" : ""} ${depth === 0 ? "text-ink" : "text-ink-2"}`}
            style={{ paddingLeft: `${depth * 2}ch` }}
          >
            <span className="min-w-0 break-all">{name}</span>
            {note && <span className="text-muted">{note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-auto border-t border-rule px-6 py-4 text-sm text-ink-2">{summary}</p>
    </figure>
  )
}
