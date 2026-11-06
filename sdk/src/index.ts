import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { decodeMessage } from './protocol'

export interface LoadEnvOptions {
  project?: string
  onChange?: () => void
  onError?: (error: Error) => void
}

/** Load this project's .sct secrets and keep process.env current. The returned function stops updates and restores inherited values. */
export function loadEnv(options: LoadEnvOptions = {}): Promise<() => void> {
  const child = spawn('sct', ['_env', ...(options.project ? [options.project] : [])], { stdio: ['pipe', 'pipe', 'pipe'] })
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
  const inherited = new Map<string, string | undefined>()
  let loaded = false
  let stopped = false

  function apply(values: Record<string, string>): void {
    for (const [name, value] of inherited) {
      if (Object.hasOwn(values, name)) continue
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
      inherited.delete(name)
    }
    for (const [name, value] of Object.entries(values)) {
      if (!inherited.has(name)) inherited.set(name, process.env[name])
      process.env[name] = value
    }
  }

  function close(): void {
    if (stopped) return
    stopped = true
    process.off('exit', close)
    lines.close()
    child.stdin.end()
    child.kill()
    apply({})
  }

  process.once('exit', close)
  child.stderr.resume()
  return new Promise((resolve, reject) => {
    const failed = (error: Error) => {
      apply({})
      if (!loaded) {
        close()
        reject(error)
      } else if (options.onError) {
        options.onError(error)
      } else {
        console.error(error.message)
      }
    }
    child.once('error', () => failed(new Error('Cannot launch .sct. Install the sct CLI and make it available on PATH.')))
    child.once('close', () => {
      if (!stopped) {
        failed(new Error('The .sct secret connection closed. Call loadEnv() to connect again.'))
        close()
      }
    })
    lines.on('line', (line: string) => {
      if (stopped) return
      try {
        const message = decodeMessage(line)
        if ('error' in message) {
          failed(new Error(message.error))
          return
        }
        apply(message.values)
      } catch {
        failed(new Error('The .sct CLI returned an invalid response.'))
        close()
        return
      }
      if (loaded) {
        options.onChange?.()
      } else {
        loaded = true
        // Updates must not keep an otherwise finished application alive.
        child.unref()
        for (const stream of [child.stdin, child.stdout, child.stderr]) {
          if ('unref' in stream && typeof stream.unref === 'function') stream.unref()
        }
        resolve(close)
      }
    })
  })
}
