import { constants } from 'node:fs'
import { access, lstat, mkdir, readFile, readlink, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const marker = '# .sct command launcher'

// Electron finds its helper apps only from the real executable path. A symbolic link makes it exit before its window opens.
// `exec` replaces the shell, so the caller stays the parent process of .sct.
export async function installCli(executable: string, destination: string): Promise<void> {
  await access(executable, constants.X_OK)
  const command = `exec '${executable.replaceAll("'", `'\\''`)}' "$@"`
  if (await isInstalled(destination, executable, command)) return
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(`${destination}.tmp`, `#!/bin/sh\n${marker}\n${command}\n`, { mode: 0o755 })
  await rename(`${destination}.tmp`, destination)
}

// Accept a missing command and replace an earlier .sct launcher or link. Reject every other existing command.
async function isInstalled(destination: string, executable: string, command: string): Promise<boolean> {
  try {
    if ((await lstat(destination)).isSymbolicLink()) {
      if (resolve(dirname(destination), await readlink(destination)) === executable) return false
      throw new Error('The sct command points to another application. Remove that link before installing .sct.')
    }
    const current = await readFile(destination, 'utf8')
    if (!current.includes(marker)) throw new Error('The sct command already exists and is not an .sct launcher.')
    return current.includes(command)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}
