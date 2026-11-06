export type EnvironmentMessage = { values: Record<string, string> } | { error: string }

export function decodeMessage(line: string): EnvironmentMessage {
  let message: unknown
  try {
    message = JSON.parse(line)
  } catch {
    throw new Error('The .sct CLI returned an invalid response.')
  }
  if (typeof message !== 'object' || message === null) throw new Error('The .sct CLI returned an invalid response.')
  if ('error' in message && typeof message.error === 'string') return { error: message.error }
  if ('values' in message && typeof message.values === 'object' && message.values !== null && !Array.isArray(message.values)) {
    const values = message.values as Record<string, unknown>
    if (Object.entries(values).every(([name, value]) => /^[A-Za-z_][A-Za-z0-9_]{0,99}$/.test(name) &&
      typeof value === 'string' && value.length <= 65536 && !value.includes('\0'))) {
      return { values: values as Record<string, string> }
    }
  }
  throw new Error('The .sct CLI returned an invalid response.')
}
