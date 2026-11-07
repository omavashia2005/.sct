// Shared types and sample data for the in-page demos. Nothing here leaves the browser tab.

export interface Secret {
  name: string
  // The demo keeps only a value's length, so a pasted value is never held in state.
  length: number
}

export type Transport = "airdrop" | "relay"

export function isTransport(value: unknown): value is Transport {
  return value === "airdrop" || value === "relay"
}

export type LogKind = "command" | "output" | "event"

export interface LogLine {
  id: number
  kind: LogKind
  text: string
}

// The same rule as the desktop app: letters, digits and underscores, never a leading digit.
export const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

// The SDK checks the vault about every 500 ms, so the demo applies changes on the same delay.
export const SDK_POLL_MS = 500

export const sampleSecrets: Secret[] = [
  { name: "AUTH_SECRET", length: 32 },
  { name: "POSTGRES_URL", length: 48 },
  { name: "STRIPE_KEY", length: 32 },
]

export const bootLog: LogLine[] = [
  { id: 1, kind: "command", text: "ls -A" },
  { id: 2, kind: "output", text: "boot.ts  package.json" },
  { id: 3, kind: "command", text: "bun boot.ts" },
]

export const bootSource = `import { loadEnv } from 'dotsct'
import Stripe from 'stripe'

// Reads this project's secrets from macOS Keychain into process.env.
await loadEnv({
  onChange: () => console.log('process.env updated'),
})

export const stripe = new Stripe(process.env.STRIPE_KEY)`
