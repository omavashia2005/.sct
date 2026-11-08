import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { installCli } from '../src/main/cli-installer'

export { installCli } from '../src/main/cli-installer'

if (import.meta.main) {
  void runInstaller().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Cannot install the sct command.')
    process.exitCode = 1
  })
}

async function runInstaller(): Promise<void> {
  const destination = join(homedir(), '.local', 'bin', 'sct')
  await installCli(resolve(`dist/sct-darwin-${process.arch}/sct.app/Contents/MacOS/sct`), destination)
  console.log(`Installed ${destination}`)
  if (!(process.env.PATH ?? '').split(':').includes(dirname(destination))) {
    console.log('Add this line to ~/.zshrc, then open a new terminal:')
    console.log('export PATH="$HOME/.local/bin:$PATH"')
  }
}
