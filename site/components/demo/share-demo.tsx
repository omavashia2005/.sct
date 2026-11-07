"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isTransport, type Transport } from "@/lib/demo"
import { useVault } from "./vault-provider"

type Stage = "idle" | "moving" | "waiting" | "arrived" | "imported"
type RiderAt = "start" | "middle" | "end"

// One leg of the stepped track transition in globals.css.
const LEG_MS = 900

const channel: Record<Transport, { label: string; send: string; code: string }> = {
  airdrop: { label: "AirDrop, Mac to Mac nearby", send: "Send with AirDrop", code: "7Q4M 2KX9 81TD" },
  relay: { label: "Relay on SpacetimeDB, over TLS", send: "Queue on the relay", code: "H3VP 6N0C 5RWA" },
}

export function ShareDemo() {
  const { secrets } = useVault()
  const [transport, setTransport] = useState<Transport>("airdrop")
  const [paired, setPaired] = useState<Record<Transport, boolean>>({ airdrop: false, relay: false })
  const [unselected, setUnselected] = useState<string[]>([])
  const [online, setOnline] = useState(true)
  const [stage, setStage] = useState<Stage>("idle")
  const [at, setAt] = useState<RiderAt>("start")
  const [sent, setSent] = useState<string[]>([])
  const [ciphertext, setCiphertext] = useState("")
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const skipped = new Set(unselected)
  const selected = secrets.filter((secret) => !skipped.has(secret.name)).map((secret) => secret.name)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const later = (run: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      run()
    }, LEG_MS)
    timers.current.add(timer)
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    setStage("idle")
    setAt("start")
  }

  const arrive = () => {
    setAt("end")
    later(() => setStage("arrived"))
  }

  const send = () => {
    setSent(selected)
    setCiphertext(randomCiphertext())
    setStage("moving")
    setAt("middle")
    later(() => {
      if (transport === "relay" && !online) setStage("waiting")
      else arrive()
    })
  }

  const changeOnline = (next: boolean) => {
    setOnline(next)
    if (next && stage === "waiting") {
      setStage("moving")
      arrive()
    }
  }

  return (
    <div className="well">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule p-6">
        <ToggleGroup
          aria-label="How to send"
          value={[transport]}
          onValueChange={([next]) => {
            if (!isTransport(next)) return
            setTransport(next)
            reset()
          }}
        >
          <ToggleGroupItem value="airdrop">AirDrop</ToggleGroupItem>
          <ToggleGroupItem value="relay">Relay</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted">{channel[transport].label}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,4fr)_minmax(0,4fr)_minmax(0,4fr)]">
        <section aria-label="Your Mac" className="border-rule p-6 max-lg:border-b lg:border-r">
          <h3 className="text-lg">Your Mac</h3>
          {paired[transport] ? (
            <SendForm
              transport={transport}
              names={secrets.map((secret) => secret.name)}
              selected={selected}
              busy={stage !== "idle" && stage !== "imported"}
              onToggle={(name, on) => setUnselected((list) => (on ? list.filter((item) => item !== name) : [...list, name]))}
              onSend={send}
            />
          ) : (
            <Pairing transport={transport} onConfirm={() => setPaired((state) => ({ ...state, [transport]: true }))} />
          )}
        </section>

        <section aria-label="In transit" className="flex flex-col justify-center gap-4 border-rule p-6 max-lg:border-b lg:border-r">
          <div className="track" aria-hidden="true">
            <div className="track-rider" data-at={at}>
              <span className="border border-accent bg-paper px-2 py-1 text-sm whitespace-nowrap text-accent">
                {sent.length || selected.length} {(sent.length || selected.length) === 1 ? "secret" : "secrets"}
              </span>
            </div>
          </div>
          <p aria-live="polite" className="text-sm text-ink-2">{transitText(transport, stage)}</p>
          {transport === "relay" && (
            <div className="border-t border-rule pt-4 text-sm">
              <p className="text-muted">What the relay stores</p>
              <p className="mt-2 break-all text-ink-2">{ciphertext || "nothing yet"}</p>
              <p className="mt-2 text-muted">plus sender, recipient and deadline</p>
            </div>
          )}
        </section>

        <section aria-label="Your teammate's Mac" className="flex flex-col gap-4 p-6">
          <h3 className="text-lg">Teammate&apos;s Mac</h3>
          {transport === "relay" && (
            <Label className="cursor-pointer">
              <Checkbox checked={online} onCheckedChange={changeOnline} />
              This Mac is online
            </Label>
          )}
          <Inbox stage={stage} transport={transport} names={sent} onImport={() => setStage("imported")} onRestart={reset} />
        </section>
      </div>
    </div>
  )
}

function Pairing({ transport, onConfirm }: { transport: Transport; onConfirm: () => void }) {
  const [compared, setCompared] = useState(false)
  return (
    <div className="mt-4 grid gap-4">
      <p className="text-sm text-ink-2">Your teammate sees this same code.</p>
      <p className="text-xl font-normal tracking-normal [font-stretch:var(--stretch-display)] sm:text-2xl">{channel[transport].code}</p>
      <Label className="cursor-pointer">
        <Checkbox checked={compared} onCheckedChange={setCompared} />
        I compared this code on both Macs
      </Label>
      <Button variant="outline" size="sm" className="justify-self-start" disabled={!compared} onClick={onConfirm}>
        Confirm device
      </Button>
    </div>
  )
}

interface SendFormProps {
  transport: Transport
  names: string[]
  selected: string[]
  busy: boolean
  onToggle: (name: string, on: boolean) => void
  onSend: () => void
}

function SendForm({ transport, names, selected, busy, onToggle, onSend }: SendFormProps) {
  const expiryId = useId()
  const chosen = new Set(selected)
  return (
    <div className="mt-4 grid gap-4">
      <fieldset className="m-0 grid gap-1 border-0 p-0">
        <legend className="mb-2 text-sm text-ink-2">Secrets to send</legend>
        {names.map((name) => (
          <Label key={name} className="min-h-11 cursor-pointer text-ink">
            <Checkbox checked={chosen.has(name)} onCheckedChange={(on) => onToggle(name, on)} disabled={busy} />
            <span className="truncate">{name}</span>
          </Label>
        ))}
      </fieldset>
      {transport === "relay" && (
        <div className="grid gap-2">
          <label htmlFor={expiryId} className="text-sm text-ink-2">Access expires</label>
          <select id={expiryId} name="expiry" disabled={busy} className="min-h-11 rounded-none border border-muted bg-paper px-3 text-ink outline-2 -outline-offset-3 outline-transparent focus-visible:outline-focus">
            <option>No limit</option>
            <option>In 1 hour</option>
            <option>In 24 hours</option>
          </select>
        </div>
      )}
      <Button variant="outline" size="sm" className="justify-self-start" disabled={busy || selected.length === 0} onClick={onSend}>
        {channel[transport].send}
      </Button>
    </div>
  )
}

interface InboxProps {
  stage: Stage
  transport: Transport
  names: string[]
  onImport: () => void
  onRestart: () => void
}

function Inbox({ stage, transport, names, onImport, onRestart }: InboxProps) {
  if (stage === "arrived") {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-ink-2">
          {transport === "airdrop" ? "A .sct-transfer file is in Downloads." : "The transfer arrived from the relay."} .sct checked the signature and the sender.
        </p>
        <Button variant="outline" size="sm" className="justify-self-start" onClick={onImport}>Import into existing-project</Button>
      </div>
    )
  }
  if (stage === "imported") {
    return (
      <div className="grid gap-4">
        <ul className="m-0 list-none border-t border-rule p-0 text-sm">
          {names.map((name) => (
            <li key={name} className="flex justify-between gap-3 border-b border-rule py-2">
              <span className="truncate">{name}</span>
              <span className="whitespace-nowrap text-muted">new Keychain key</span>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={onRestart}>Send again</Button>
      </div>
    )
  }
  return <p className="text-sm text-muted">Nothing received yet.</p>
}

function transitText(transport: Transport, stage: Stage) {
  if (stage === "idle") return "Encrypted for one Mac only."
  if (stage === "moving") return "Sealed with AES-256-GCM and signed with your device key."
  if (stage === "waiting") return "Waiting on the relay. It goes through when the Mac comes online."
  if (transport === "airdrop") return "Sent. macOS does not confirm AirDrop delivery to the sender."
  if (stage === "arrived") return "In the teammate's inbox. The relay holds it until they import."
  return "Imported. An encrypted receipt went back to your Mac."
}

// Decoration only: random bytes that stand in for the ciphertext the relay holds.
function randomCiphertext() {
  const bytes = crypto.getRandomValues(new Uint8Array(33))
  return btoa(String.fromCharCode(...bytes))
}
