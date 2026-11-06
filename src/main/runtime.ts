import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, sep } from 'node:path'
import type { ProjectStore } from './projects'
import type { Vault } from './vault'
import type { EnvironmentMessage } from '../../sdk/src/protocol'

export async function resolveProject(projects: ProjectStore, name?: string) {
  const saved = await projects.list()
  if (name) {
    const project = saved.find((project) => project.name === name)
    if (!project) throw new Error('This project is not in your project list. Use its exact registered name.')
    return project
  }
  const directory = await realpath(process.cwd())
  const project = saved.filter((project) => {
    const path = relative(project.directory, directory)
    return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`)
  }).sort((a, b) => b.directory.length - a.directory.length)[0]
  if (!project) throw new Error('Register this project folder in .sct first, or specify its registered name.')
  return project
}

export async function watchProject(vault: Vault, projectId: string, changed: () => Promise<void>, failed: (error: unknown) => Promise<void>) {
  let revision = await vault.projectRevision(projectId)
  await changed()
  let active = true
  let checking: Promise<void> | undefined
  let invalid = false
  const timer = setInterval(() => {
    if (checking || !active) return
    checking = vault.projectRevision(projectId).then(async (current) => {
      if (!active || (current === revision && !invalid)) return
      await changed()
      revision = current
      invalid = false
    }).catch(async (error: unknown) => {
      if (active && !invalid) {
        invalid = true
        await failed(error)
      }
    }).finally(() => { checking = undefined })
  }, 500)
  return async () => { active = false; clearInterval(timer); await checking }
}

export async function streamEnvironment(projects: ProjectStore, vault: Vault, name?: string): Promise<void> {
  if (process.stdout.isTTY || process.stdin.isTTY) throw new Error('The SDK transport requires private process pipes.')
  const project = await resolveProject(projects, name)
  const stop = await watchProject(vault, project.id,
    () => vault.withProjectSecrets(project.id, (_project, values) => {
      process.stdout.write(`${JSON.stringify({ values } satisfies EnvironmentMessage)}\n`)
    }),
    async () => { process.stdout.write(`${JSON.stringify({ error: 'Cannot refresh .sct secrets. Check the project, storage, and Keychain.' })}\n`) }
  )
  try {
    process.stdin.resume()
    await new Promise<void>((resolve) => process.stdin.once('end', resolve))
  } finally {
    await stop()
  }
}
