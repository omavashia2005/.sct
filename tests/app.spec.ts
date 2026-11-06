import { _electron as electron, expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

test('adds existing folders offline and restores projects after restart', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'sct-ui-')))
  const folder = join(root, 'Example project')
  const userData = join(root, 'app-data')
  await mkdir(folder)
  await mkdir(userData)
  // The vault root points into the temporary folder, so the test never creates ~/.sct.
  await writeFile(join(userData, 'settings.json'), JSON.stringify({ vaultRoot: root }))
  const launch = () => electron.launch({ args: [join(__dirname, 'electron-entry.cjs'), userData] })
  let application = await launch()

  try {
    const page = await application.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await expect(page).toHaveTitle('.sct')
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Your projects start here' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await page.screenshot({ path: test.info().outputPath('projects-empty.png') })
    expect(page.url()).toMatch(/^file:/)
    expect(await application.evaluate(({ app, BrowserWindow }) => app.getAppMetrics().find(
      (metric) => metric.pid === BrowserWindow.getAllWindows()[0].webContents.getOSProcessId()
    )?.sandboxed)).toBe(true)
    expect(await page.evaluate(() => ({ process: 'process' in window, require: 'require' in window })))
      .toEqual({ process: false, require: false })
    expect(await page.evaluate(() => Object.keys(window.sct).sort()))
      .toEqual(['acceptRelayTransfer', 'addProject', 'addSecret', 'chooseVaultLocation', 'confirmRelayPair', 'confirmSharingPeer',
        'deleteProject', 'deleteSecret', 'dismissTransfer', 'getAgentRequests', 'getRelayState', 'getSharingState',
        'getVaultLocation', 'hideAllRelayActivity', 'hideRelayActivity', 'importTransfer', 'listProjects', 'listSecrets', 'onAgentChanged', 'onRelayChanged',
        'onSharingChanged', 'pickDirectory', 'pickSharingPeer', 'pickTransfer', 'queueRelayTask', 'queueRelayTransfer', 'removeRelayPair', 'renameProject',
        'requestRelayPair', 'respondRelayTask', 'respondToAgent', 'shareDeviceCard', 'shareSecrets', 'updateSecret'])

    await page.getByRole('button', { name: 'Add a project', exact: true }).click()
    await application.evaluate(({ dialog }) => {
      Object.assign(dialog, { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) })
    })
    await page.getByRole('button', { name: 'Choose folder…' }).click()
    await expect(page.getByLabel('Folder path')).toHaveValue('')

    await application.evaluate(({ dialog }, selected) => {
      Object.assign(dialog, { showOpenDialog: async () => ({ canceled: false, filePaths: [selected] }) })
    }, folder)
    await page.getByRole('button', { name: 'Choose folder…' }).click()
    await expect(page.getByLabel('Folder path')).toHaveValue(folder)
    await expect(page.getByLabel('Project name')).toHaveValue('Example project')
    await page.screenshot({ path: test.info().outputPath('add-project.png') })
    await page.getByLabel('Folder path').fill(join(root, 'missing'))
    await page.getByRole('button', { name: 'Add project', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('existing folder')
    await page.getByLabel('Folder path').fill(folder)
    await page.getByRole('button', { name: 'Add project', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Projects' })).toContainText('Example project')
    await expect(page.getByRole('list', { name: 'Projects' })).toContainText(folder)
    await page.screenshot({ path: test.info().outputPath('projects-saved.png') })

    await page.getByRole('button', { name: 'Add a project', exact: true }).click()
    await page.getByLabel('Project name').fill('Duplicate')
    await page.getByLabel('Folder path').fill(folder)
    await page.getByRole('button', { name: 'Add project', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('already')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(errors).toEqual([])

    await application.close()
    application = await launch()
    const restored = await application.firstWindow()
    await expect(restored.getByRole('list', { name: 'Projects' })).toContainText('Example project')
    await expect(restored.getByRole('listitem')).toHaveCount(1)
  } finally {
    await application.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('manages secrets per project without rendering stored values', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'sct-secrets-ui-')))
  const folder = join(root, 'Demo folder')
  const userData = join(root, 'app-data')
  await mkdir(folder)
  await mkdir(userData)
  await writeFile(join(userData, 'settings.json'), JSON.stringify({ vaultRoot: root }))
  const value = `sk-test-${Date.now()}`
  const launch = () => electron.launch({ args: [join(__dirname, 'electron-entry.cjs'), userData] })
  let application = await launch()
  const messages: string[] = []
  const watch = (page: Page) => {
    page.on('pageerror', (error) => messages.push(`error: ${error.message}`))
    page.on('console', (message) => messages.push(`${message.type()}: ${message.text()}`))
  }

  try {
    let page = await application.firstWindow()
    watch(page)
    await page.getByRole('button', { name: 'Add a project', exact: true }).click()
    await page.getByLabel('Project name').fill('Demo')
    await page.getByLabel('Folder path').fill(folder)
    await page.getByRole('button', { name: 'Add project', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Projects' })).toContainText('0 secrets')
    expect(await readdir(join(root, '.sct'))).toEqual(['Demo'])

    await page.getByRole('link', { name: 'Open secrets' }).click()
    await expect(page.getByRole('heading', { name: 'Demo', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'No secrets in Demo' })).toBeVisible()
    await page.getByLabel('Name').fill('OPENAI_API_KEY')
    await expect(page.getByRole('button', { name: 'Save secret' })).toBeEnabled()
    await page.getByRole('button', { name: 'Save secret' }).click()
    await expect(page.getByRole('status').first()).toHaveText('OPENAI_API_KEY was saved in Demo.')
    await expect(page.getByLabel('Value', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Name')).toHaveValue('')
    await expect(page.getByRole('list', { name: 'Secrets in Demo' })).toContainText('OPENAI_API_KEY')
    const metadata = await page.evaluate(() => window.sct.listSecrets())
    expect(metadata).toHaveLength(1)
    expect(Object.keys(metadata[0]).sort()).toEqual(['id', 'name', 'projectId'])
    expect(metadata[0].name).toBe('OPENAI_API_KEY')
    await page.screenshot({ path: test.info().outputPath('project-secrets.png') })

    await page.getByLabel('Name').fill('OPENAI_API_KEY')
    await page.getByLabel('Value', { exact: true }).fill(value)
    await page.getByRole('button', { name: 'Save secret' }).click()
    await expect(page.getByRole('alert')).toContainText('already exists')
    await expect(page.getByLabel('Value', { exact: true })).toHaveValue('')

    await page.getByRole('button', { name: 'Update value' }).click()
    await expect(page.getByRole('button', { name: 'Save value' })).toBeEnabled()
    await page.getByRole('button', { name: 'Save value' }).click()
    await expect(page.getByRole('status').first()).toHaveText('The value of OPENAI_API_KEY was updated.')
    await page.getByRole('button', { name: 'Update value' }).click()
    await page.getByLabel('New value for OPENAI_API_KEY').fill(`${value}-updated`)
    await page.getByRole('button', { name: 'Save value' }).click()
    await expect(page.getByRole('status').first()).toHaveText('The value of OPENAI_API_KEY was updated.')

    const file = await readFile(join(root, '.sct', 'Demo', 'secrets.sct'))
    expect(file.includes(value) || file.includes('OPENAI_API_KEY')).toBe(false)
    expect(await page.content()).not.toContain(value)

    await page.getByRole('link', { name: 'All secrets' }).click()
    await expect(page.getByRole('heading', { name: 'All secrets', exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Secrets in Demo' })).toContainText('OPENAI_API_KEY')
    await page.screenshot({ path: test.info().outputPath('all-secrets.png') })

    await application.evaluate(({ dialog }, selected) => {
      Object.assign(dialog, { showOpenDialog: async () => ({ canceled: false, filePaths: [selected] }) })
    }, join(root, 'moved'))
    await mkdir(join(root, 'moved'))
    await page.getByRole('link', { name: 'Storage' }).click()
    await expect(page.getByRole('heading', { name: 'Storage', exact: true })).toBeVisible()
    await expect(page.getByText(join(root, '.sct'), { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Change location…' }).click()
    await expect(page.getByRole('status').first()).toHaveText(`The vault moved to ${join(root, 'moved', '.sct')}.`)
    expect(await readdir(join(root, 'moved', '.sct'))).toEqual(['Demo'])
    await page.screenshot({ path: test.info().outputPath('storage.png') })

    await application.close()
    application = await launch()
    page = await application.firstWindow()
    watch(page)
    await page.getByRole('link', { name: 'All secrets' }).click()
    await expect(page.getByRole('heading', { name: 'All secrets', exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Secrets in Demo' })).toContainText('OPENAI_API_KEY')

    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Rename' }).click()
    await page.getByLabel('New name for Demo').fill('Renamed')
    await page.getByRole('button', { name: 'Save name' }).click()
    await expect(page.getByRole('list', { name: 'Projects' })).toContainText('Renamed')
    expect(await readdir(join(root, 'moved', '.sct'))).toEqual(['Renamed'])

    const cli = spawn(application.process().spawnfile, [join(__dirname, 'electron-entry.cjs'), userData,
      'run', 'Renamed', '--', process.execPath, '-e', `
        const assert = require('node:assert/strict')
        assert.equal(require('node:crypto').createHash('sha256').update(process.env.OPENAI_API_KEY).digest('hex'), process.argv[1])
        assert.equal(process.cwd(), process.argv[2])
        assert.deepEqual(require('node:fs').readdirSync('.'), [])
        process.stdout.write('runtime-ok')
      `, createHash('sha256').update(`${value}-updated`).digest('hex'), folder])
    const output: string[] = []
    cli.stdout.on('data', (data: Buffer) => output.push(data.toString()))
    cli.stderr.on('data', (data: Buffer) => output.push(data.toString()))
    expect(await new Promise((resolve, reject) => { cli.once('close', resolve); cli.once('error', reject) })).toBe(0)
    expect(output.join('')).toContain('runtime-ok')
    expect(output.join('')).not.toContain(value)
    expect(await readdir(folder)).toEqual([])

    const interrupted = spawn(application.process().spawnfile, [join(__dirname, 'electron-entry.cjs'), userData,
      'run', 'Renamed', '--', process.execPath, '-e',
      "process.on('SIGTERM', () => process.exit(37)); console.log('ready'); setInterval(() => {}, 1000)"])
    const interruptedExit = new Promise((resolve, reject) => {
      interrupted.once('close', resolve)
      interrupted.once('error', reject)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        interrupted.stdout.once('data', () => resolve())
        interrupted.once('error', reject)
        interrupted.once('close', () => reject(new Error('The command exited before readiness.')))
      })
      interrupted.kill('SIGTERM')
      expect(await interruptedExit).toBe(37)
    } finally {
      interrupted.kill('SIGKILL')
    }

    await mkdir(join(root, 'sdk-bin'))
    await writeFile(join(root, 'sdk-bin', 'sct'), '#!/bin/sh\nexec "$SCT_TEST_ELECTRON" "$SCT_TEST_ENTRY" "$SCT_TEST_DATA" "$@"\n', { mode: 0o700 })
    await writeFile(join(root, 'sdk.mjs'), `
      import { loadEnv } from ${JSON.stringify(pathToFileURL(join(__dirname, '../packages/env/dist/index.js')).href)}
      import assert from 'node:assert/strict'
      import { createHash } from 'node:crypto'
      const alive = setInterval(() => {}, 1000)
      const stop = await loadEnv({ onChange() {
        assert.equal(createHash('sha256').update(process.env.OPENAI_API_KEY).digest('hex'), process.argv[3])
        console.log('sdk-updated')
        stop()
        clearInterval(alive)
      } })
      assert.equal(createHash('sha256').update(process.env.OPENAI_API_KEY).digest('hex'), process.argv[2])
      console.log('sdk-loaded')
    `)
    const sdk = spawn(process.execPath, [join(root, 'sdk.mjs'),
      createHash('sha256').update(`${value}-updated`).digest('hex'), createHash('sha256').update(`${value}-sdk`).digest('hex')], {
      cwd: folder,
      env: { ...process.env, PATH: `${join(root, 'sdk-bin')}:${process.env.PATH}`,
        SCT_TEST_ELECTRON: application.process().spawnfile, SCT_TEST_ENTRY: join(__dirname, 'electron-entry.cjs'), SCT_TEST_DATA: userData }
    })
    let sdkOutput = ''
    sdk.stdout.on('data', (data: Buffer) => { sdkOutput += data.toString() })
    sdk.stderr.on('data', (data: Buffer) => { sdkOutput += data.toString() })
    const sdkExited = new Promise((resolve, reject) => { sdk.once('close', resolve); sdk.once('error', reject) })
    try {
      await expect.poll(() => sdkOutput).toContain('sdk-loaded')
      await page.evaluate((secret) => window.sct.updateSecret(secret), { ...metadata[0], value: `${value}-sdk` })
      await expect.poll(() => sdkOutput).toContain('sdk-updated')
      expect(await sdkExited).toBe(0)
      expect(sdkOutput).not.toContain(value)
    } finally {
      sdk.kill('SIGTERM')
    }

    await page.getByRole('link', { name: 'Open secrets' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Delete secret' }).click()
    await expect(page.getByRole('heading', { name: 'No secrets in Renamed' })).toBeVisible()
    expect(await page.evaluate(() => window.sct.listSecrets())).toEqual([])

    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Delete project' })).toBeDisabled()
    await page.getByLabel('Type Renamed to confirm').fill('Renamed')
    await page.getByRole('button', { name: 'Delete project' }).click()
    await expect(page.getByRole('heading', { name: 'Your projects start here' })).toBeVisible()
    expect(await readdir(join(root, 'moved', '.sct'))).toEqual([])
    expect(messages.filter((message) => message.startsWith('error') || message.includes(value))).toEqual([])
  } finally {
    // The app deletes its own Keychain items. Keychain reads from this test process wait for a macOS access prompt.
    await (await application.firstWindow()).evaluate(async () => {
      for (const project of await window.sct.listProjects()) await window.sct.deleteProject(project.id)
    })
    await application.close()
    await rm(root, { recursive: true, force: true })
  }
})
