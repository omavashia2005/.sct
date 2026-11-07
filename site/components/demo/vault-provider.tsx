"use client"

import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react"
import { bootLog, SDK_POLL_MS, sampleSecrets, type LogLine, type Secret } from "@/lib/demo"

interface Vault {
  secrets: Secret[]
  // process.env inside the running sample app. It trails the vault by one SDK check.
  env: Secret[]
  // The id restarts the highlight when the same key changes twice.
  changed: { name: string; id: number } | null
  log: LogLine[]
  save: (secret: Secret) => void
  remove: (name: string) => void
}

const VaultContext = createContext<Vault | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [secrets, setSecrets] = useState(sampleSecrets)
  const [env, setEnv] = useState(sampleSecrets)
  const [changed, setChanged] = useState<Vault["changed"]>(null)
  const [log, setLog] = useState(bootLog)
  const changes = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  function commit(next: Secret[], name: string) {
    setSecrets(next)
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      setEnv(next)
      changes.current += 1
      setChanged({ name, id: changes.current })
      setLog((lines) => [...lines, { id: lines.length + 1, kind: "event", text: "process.env updated" }])
    }, SDK_POLL_MS)
    timers.current.add(timer)
  }

  const save = (secret: Secret) => {
    const exists = secrets.some((item) => item.name === secret.name)
    const next = exists
      ? secrets.map((item) => (item.name === secret.name ? secret : item))
      : [...secrets, secret].toSorted((a, b) => a.name.localeCompare(b.name))
    commit(next, secret.name)
  }

  const remove = (name: string) => commit(secrets.filter((item) => item.name !== name), name)

  return <VaultContext value={{ secrets, env, changed, log, save, remove }}>{children}</VaultContext>
}

export function useVault() {
  const vault = use(VaultContext)
  if (!vault) throw new Error("useVault needs a VaultProvider above it.")
  return vault
}
