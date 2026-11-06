import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { ProjectStore } from '../src/main/projects.ts'
import { Vault } from '../src/main/vault.ts'
import { installCli } from '../scripts/install-cli.ts'
import { decodeMessage } from '../sdk/src/protocol.ts'

async function fixture(t: TestContext) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'sct-runtime-')))
  const projects = new ProjectStore(join(root, 'projects.json'))
  const service = `.sct-test-${randomUUID()}`
  const vault = new Vault(projects, join(root, 'settings.json'), root, service)
  await vault.start()
  await mkdir(join(root, 'project'))
  const project = await vault.addProject({ name: 'Demo', directory: join(root, 'project') })
  t.after(async () => {
    await vault.deleteProject(project.id)
    await rm(root, { recursive: true, force: true })
  })
  await writeFile(join(root, 'entry.ts'), `
    import { ProjectStore } from ${JSON.stringify(join(__dirname, '../src/main/projects.ts'))}
    import { Vault } from ${JSON.stringify(join(__dirname, '../src/main/vault.ts'))}
    import { runProject } from ${JSON.stringify(join(__dirname, '../src/main/launch.ts'))}
    import { streamEnvironment } from ${JSON.stringify(join(__dirname, '../src/main/runtime.ts'))}
    const projects = new ProjectStore(${JSON.stringify(join(root, 'projects.json'))})
    const vault = new Vault(projects, ${JSON.stringify(join(root, 'settings.json'))}, ${JSON.stringify(root)}, ${JSON.stringify(service)})
    await vault.start()
    if (process.argv[2] === '_env') await streamEnvironment(projects, vault, process.argv[3])
    else process.exit(await runProject(projects, vault, process.argv.slice(2)))
  `)
  return { root, vault, project }
}

function watchOutput(child: ChildProcess) {
  let output = ''
  let closed = false
  child.stdout?.on('data', (data: Buffer) => { output += data.toString() })
  child.stderr?.on('data', (data: Buffer) => { output += data.toString() })
  child.once('close', () => { closed = true })
  return async (text: string) => {
    const deadline = Date.now() + 8000
    while (!output.includes(text)) {
      if (closed || Date.now() >= deadline) assert.fail(`Missing fixture result ${text}. Output: ${output}`)
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    return output
  }
}

test('the CLI installer creates an idempotent launcher and preserves existing commands', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'sct-install-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const target = join(root, 'bin', 'sct')
  await mkdir(join(root, 'bin'))
  await symlink(process.execPath, target)
  await installCli(process.execPath, target)
  await installCli(process.execPath, target)
  assert.equal((await lstat(target)).isSymbolicLink(), false)
  assert.equal(await readFile(target, 'utf8'), `#!/bin/sh\n# .sct command launcher\nexec '${process.execPath}' "$@"\n`)
  assert.equal(execFileSync(target, ['-e', 'process.stdout.write("launched")'], { encoding: 'utf8' }), 'launched')
  await rm(target)
  await writeFile(target, 'existing-command')
  await assert.rejects(installCli(process.execPath, target), /already exists/)
  assert.equal(await readFile(target, 'utf8'), 'existing-command')
})

test('SDK protocol errors cannot include plaintext response contents', () => {
  for (const message of ['private-invalid-json', '{"values":{"BAD-NAME":"private"}}', '{"values":{"TOKEN":3}}']) {
    assert.throws(() => decodeMessage(message), { message: 'The .sct CLI returned an invalid response.' })
  }
  assert.deepEqual(decodeMessage('{"values":{"EMPTY":"","TOKEN":"literal $=\\nvalue"}}'), {
    values: { EMPTY: '', TOKEN: 'literal $=\nvalue' }
  })
})

test('CLI selection follows cwd and saved changes restart the whole command group', { timeout: 20_000 }, async (t) => {
  const { root, vault, project } = await fixture(t)
  const secret = await vault.addSecret({ projectId: project.id, name: 'TOKEN', value: 'first-fixture' })
  await writeFile(join(project.directory, 'server.cjs'), `
    const worker = require('node:child_process').spawn(process.execPath, ['-e', "setInterval(() => {}, 1000)"], { stdio: 'inherit' })
    console.log('worker:' + worker.pid)
    console.log(process.env.TOKEN === 'first-fixture' ? 'first-ready' : process.env.TOKEN === 'second-fixture' ? 'second-ready' : 'deleted-ready')
    setInterval(() => {}, 1000)
  `)
  const child = spawn(process.execPath, [join(root, 'entry.ts'), 'run', '--', 'node', 'server.cjs'], {
    cwd: project.directory, stdio: ['ignore', 'pipe', 'pipe']
  })
  const exited = new Promise((resolve) => child.once('close', resolve))
  const waitFor = watchOutput(child)
  t.after(() => { child.kill('SIGTERM') })
  const worker = Number((await waitFor('first-ready')).match(/worker:(\d+)/)?.[1])
  assert.ok(worker)
  await vault.updateSecret({ ...secret, value: 'second-fixture' })
  await waitFor('second-ready')
  await waitForWorkerExit(worker)
  await vault.renameProject({ id: project.id, name: 'Renamed' })
  await mkdir(join(root, 'moved'))
  await vault.moveTo(join(root, 'moved'))
  await vault.deleteSecret(secret)
  const output = await waitFor('deleted-ready')
  child.kill('SIGTERM')
  assert.equal(await exited, 143)
  await Promise.all([...output.matchAll(/worker:(\d+)/g)].map((match) => waitForWorkerExit(Number(match[1]))))
})

async function waitForWorkerExit(pid: number): Promise<void> {
  const deadline = Date.now() + 2000
  for (;;) {
    try { process.kill(pid, 0) } catch (error) {
      assert.equal((error as NodeJS.ErrnoException).code, 'ESRCH')
      return
    }
    assert.ok(Date.now() < deadline, 'The command worker must exit after its command stops.')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

test('the SDK loads and refreshes values through the real vault without holding a finished app open', { timeout: 20_000 }, async (t) => {
  const { root, vault, project } = await fixture(t)
  const secret = await vault.addSecret({ projectId: project.id, name: 'TOKEN', value: 'first-fixture' })
  await vault.addSecret({ projectId: project.id, name: 'EMPTY', value: '' })
  await mkdir(join(root, 'bin'))
  await writeFile(join(root, 'bin', 'sct'), `#!/bin/sh\nexec '${process.execPath}' '${join(root, 'entry.ts')}' "$@"\n`)
  await chmod(join(root, 'bin', 'sct'), 0o700)
  await writeFile(join(project.directory, 'app.ts'), `
    import assert from 'node:assert/strict'
    import { loadEnv } from ${JSON.stringify(join(__dirname, '../sdk/src/index.ts'))}
    const keepAlive = setInterval(() => {}, 1000)
    const stop = await loadEnv({ onChange() {
      if (process.env.TOKEN === 'first-fixture') console.log('recovered-ready')
      if (process.env.TOKEN === 'second-fixture') console.log('updated-ready')
      if (process.env.TOKEN === 'parent-fixture') {
        console.log('deleted-ready')
        stop()
        clearInterval(keepAlive)
      }
    }, onError() {
      assert.equal(process.env.TOKEN, 'parent-fixture')
      assert.equal(process.env.EMPTY, undefined)
      console.log('unavailable-ready')
    } })
    assert.equal(process.env.EMPTY, '')
    assert.equal(process.env.TOKEN, 'first-fixture')
    console.log('loaded-ready')
  `)
  const child = spawn(process.execPath, [join(project.directory, 'app.ts')], {
    cwd: project.directory, env: { ...process.env, TOKEN: 'parent-fixture', PATH: `${join(root, 'bin')}:${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const exited = new Promise((resolve) => child.once('close', resolve))
  t.after(() => { child.kill('SIGTERM') })
  const waitFor = watchOutput(child)
  await waitFor('loaded-ready')
  const filename = join(root, '.sct', project.name, 'secrets.sct')
  const ciphertext = await readFile(filename)
  await rm(filename)
  await waitFor('unavailable-ready')
  await writeFile(filename, ciphertext, { mode: 0o600 })
  await waitFor('recovered-ready')
  await vault.updateSecret({ ...secret, value: 'second-fixture' })
  await waitFor('updated-ready')
  await vault.deleteSecret(secret)
  await waitFor('deleted-ready')
  assert.equal(await exited, 0)
  await writeFile(join(project.directory, 'once.ts'), `
    import { loadEnv } from ${JSON.stringify(join(__dirname, '../sdk/src/index.ts'))}
    await loadEnv()
    console.log('finished-ready')
  `)
  const once = spawn(process.execPath, [join(project.directory, 'once.ts')], {
    cwd: project.directory, env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` }, stdio: ['ignore', 'pipe', 'pipe']
  })
  t.after(() => { once.kill('SIGTERM') })
  const onceExited = new Promise((resolve) => once.once('close', resolve))
  await watchOutput(once)('finished-ready')
  assert.equal(await onceExited, 0)
})
