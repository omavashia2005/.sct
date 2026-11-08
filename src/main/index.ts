import { app, BrowserWindow, dialog, ipcMain, nativeTheme, powerMonitor } from 'electron'
import type { IpcMainInvokeEvent, OpenDialogOptions } from 'electron'
import { execFile } from 'node:child_process'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rmSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { ProjectStore } from './projects'
import { Vault } from './vault'
import { demoOutcome, runProject, startFixedDemo } from './launch'
import { runAgent, writeCliOutput } from './agent'
import { AgentAccess } from './agent-access'
import { identifyCaller } from './caller'
import { streamEnvironment } from './runtime'
import { Sharing } from './sharing'
import { installCli } from './cli-installer'
import type { Relay } from './relay-connection'
import type { Reply } from '../shared/api'

let mainWindow: BrowserWindow | null = null
const launchArguments = process.argv.slice(process.defaultApp ? 2 : 1)
const incomingFiles: string[] = []
let sharing: Sharing | undefined
let openingFiles = false

// macOS can deliver a document before the app and its renderer are ready.
app.on('open-file', (event, path) => {
  event.preventDefault()
  incomingFiles.push(path)
  if (sharing && !mainWindow) void createWindow().catch(reportStartupError)
  else void openIncomingFiles()
})

function handle(channel: string, operation: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]): Promise<Reply<unknown>> => {
    if (!isAppRequest(event)) return { ok: false, error: '.sct rejected this request.' }
    try {
      return { ok: true, value: await operation(...args) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'The operation failed.' }
    }
  })
}

// Requests come only from the app page in the top frame of the main window. The page check stays if a navigation is not blocked.
function isAppRequest(event: IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame
  if (event.sender !== mainWindow?.webContents || !frame || frame !== event.sender.mainFrame || !URL.canParse(frame.url)) return false
  const page = new URL(frame.url)
  return !app.isPackaged && process.env.ELECTRON_RENDERER_URL
    ? page.origin === URL.parse(process.env.ELECTRON_RENDERER_URL)?.origin
    : page.protocol === 'file:' && page.pathname === pathToFileURL(rendererPage()).pathname
}

function rendererPage(): string {
  return join(__dirname, '../renderer/index.html')
}

async function createWindow(hash = incomingFiles.length ? '/sharing' : undefined): Promise<void> {
  const window = new BrowserWindow({
    title: '.sct',
    width: 1000,
    height: 720,
    minWidth: 640,
    minHeight: 520,
    backgroundColor: '#040805',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  mainWindow = window
  window.once('ready-to-show', () => { if (!window.isDestroyed()) window.show() })
  window.webContents.on('did-finish-load', () => { void openIncomingFiles() })
  window.on('closed', () => { mainWindow = null })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  window.webContents.session.setPermissionCheckHandler(() => false)

  let closing = false
  window.once('close', () => { closing = true })
  try {
    if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
      await window.loadURL(`${process.env.ELECTRON_RENDERER_URL}${hash ? `#${hash}` : ''}`)
    } else {
      await window.loadFile(rendererPage(), { hash })
    }
  } catch (error) {
    // Closing a window during its first load cancels loading without a startup failure.
    if (!closing) throw error
  }
}

async function pickDirectory(options: OpenDialogOptions): Promise<string | null> {
  if (!mainWindow) throw new Error('The .sct window is unavailable.')
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result.canceled ? null : result.filePaths[0] ?? null
}

function reportStartupError(error: unknown): void {
  console.error('.sct could not start.', error)
  dialog.showErrorBox('.sct could not start', error instanceof Error ? error.message : 'The application window could not load. Check the development terminal for details.')
  app.quit()
}

app.setName('.sct')
nativeTheme.themeSource = 'dark'
app.whenReady().then(async () => {
  if (launchArguments[0] === 'install') {
    if (launchArguments.length !== 1) throw new Error('Usage: sct install. Install this app as the sct command.')
    app.dock?.hide()
    const destination = join(homedir(), '.local', 'bin', 'sct')
    await installCli(process.execPath, destination)
    await writeCliOutput(`Installed ${destination}`)
    app.exit(0)
    return
  }
  if (launchArguments[0] === 'agent' || launchArguments[0] === 'mcp') {
    app.dock?.hide()
    app.exit(await runAgentSession())
    return
  }
  if (launchArguments[0] === 'skills') {
    if (launchArguments.length !== 1) throw new Error('Usage: sct skills. Return the bundled skill directory and names.')
    await writeCliOutput(JSON.stringify({ directory: skillsDirectory(), skills: (await readdir(skillsDirectory())).filter((name) => name.startsWith('sct-')) }))
    app.exit(0)
    return
  }
  const projects = new ProjectStore(join(app.getPath('userData'), 'projects.json'))
  const vault = new Vault(projects, join(app.getPath('userData'), 'settings.json'), homedir())
  await vault.start()
  if (launchArguments[0] === 'run' || launchArguments[0] === '_env') {
    app.dock?.hide()
    if (launchArguments[0] === '_env') {
      await streamEnvironment(projects, vault, launchArguments[1])
      app.exit(0)
    } else {
      app.exit(await runProject(projects, vault, launchArguments))
    }
    return
  }
  const service = new Sharing(join(app.getPath('userData'), 'sharing'), vault, hostname().slice(0, 100))
  sharing = service
  await service.cleanOutbox()
  const { Relay, relayServer } = await import('./relay-connection')
  // Only this process writes relay files and runs remote tasks. Agent sessions open a passive relay.
  const relay = new Relay(relayServer(), join(app.getPath('userData'), 'relay'), async () => service,
    () => mainWindow?.webContents.send('relay:changed'), {
      runTask: async (projectId, grantId) => demoOutcome(await vault.withGrantSecrets(projectId, grantId,
        (project, values) => startFixedDemo(project, values, process.execPath, demoFile()))),
      cleanupGrants: () => vault.cleanupExpiredGrants()
    })
  await relay.start()
  await relay.queueGrantExpiryNotifications(await vault.grantCleanupOutcomes())
  const cleanExpiredGrants = async () => {
    await relay.queueGrantExpiryNotifications(await vault.cleanupExpiredGrants())
  }
  const cleanupTimer = setInterval(() => {
    void cleanExpiredGrants().catch((error: unknown) => console.error('Scheduled grant cleanup failed.', error))
  }, 60_000)
  powerMonitor.on('resume', () => {
    void cleanExpiredGrants().catch((error: unknown) => console.error('Resume grant cleanup failed.', error))
  })
  app.on('will-quit', () => {
    clearInterval(cleanupTimer)
    relay.stop()
  })
  handle('relay:state', () => relay.state())
  handle('relay:request-pair', (identity) => relay.requestPair(identity))
  handle('relay:confirm-pair', (input) => relay.confirmPair(input))
  handle('relay:remove-pair', (pairId) => relay.removePair(pairId))
  handle('relay:queue-transfer', (input) => relay.queueTransfer(input))
  handle('relay:accept-transfer', (input) => relay.acceptRelayTransfer(input))
  handle('relay:queue-task', (grantId) => relay.queueTask(grantId))
  handle('relay:respond-task', (input) => relay.respondTask(input))
  handle('relay:hide-activity', (input) => relay.hideActivity(input))
  handle('relay:hide-all-activity', () => relay.hideAllActivity())
  handle('projects:list', () => projects.list())
  handle('projects:add', (input) => vault.addProject(input))
  handle('projects:rename', (input) => vault.renameProject(input))
  handle('projects:delete', (id) => vault.deleteProject(id))
  handle('projects:pick-directory', () => pickDirectory({
    title: 'Add a project',
    buttonLabel: 'Select folder',
    properties: ['openDirectory']
  }))
  handle('secrets:list', () => vault.listSecrets())
  handle('secrets:add', (input) => vault.addSecret(input))
  handle('secrets:update', (input) => vault.updateSecret(input))
  handle('secrets:delete', (input) => vault.deleteSecret(input))
  handle('vault:location', () => vault.location())
  handle('vault:choose-location', async () => {
    const root = await pickDirectory({
      title: 'Choose a storage location',
      buttonLabel: 'Move vault here',
      properties: ['openDirectory', 'createDirectory']
    })
    return root ? vault.moveTo(root) : null
  })
  registerSharing(service)
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow().catch(reportStartupError)
  })
}).catch((error: unknown) => {
  if (['install', 'run', '_env', 'agent', 'mcp', 'skills'].includes(launchArguments[0])) {
    console.error(error instanceof Error ? error.message : 'The project command could not start.')
    app.exit(1)
  } else {
    reportStartupError(error)
  }
})

async function runAgentSession(): Promise<number> {
  let access: AgentAccess | undefined
  let loading: Promise<AgentAccess> | undefined
  let sessionSharing: Sharing | undefined
  let sharingReady: Promise<void> | undefined
  let relay: Promise<Relay> | undefined
  const caller = identifyCaller()
  // The agent session relay is passive. It reads relay rows and files, and writes only new task requests.
  const getRelay = () => relay ??= (async () => {
    const { Relay, relayServer } = await import('./relay-connection')
    const service = new Relay(relayServer(), join(app.getPath('userData'), 'relay'), getSharing, () => undefined)
    await service.start()
    return service
  })()
  const getSharing = async () => {
    await getAccess()
    if (!sessionSharing) throw new Error('The local sharing service is unavailable.')
    await (sharingReady ??= sessionSharing.cleanOutbox())
    return sessionSharing
  }
  const getAccess = async (): Promise<AgentAccess> => {
    loading ??= (async () => {
      const projects = new ProjectStore(join(app.getPath('userData'), 'projects.json'))
      const vault = new Vault(projects, join(app.getPath('userData'), 'settings.json'), homedir())
      await vault.start()
      sessionSharing = new Sharing(join(app.getPath('userData'), 'sharing'), vault, hostname().slice(0, 100))
      access = new AgentAccess(projects, vault, {
        review: async () => {
          if (!mainWindow) await createWindow('/agent')
          mainWindow?.show()
          mainWindow?.focus()
        },
        changed: () => mainWindow?.webContents.send('agent:changed'),
        sharing: getSharing,
        shareFile: sendToNearbyMac,
        caller,
        relayState: async () => (await getRelay()).state(),
        requestRemoteDemo: async (grantId) => (await getRelay()).requestTask(grantId),
        executable: process.execPath,
        demo: demoFile()
      })
      return access
    })().catch((error: unknown) => { loading = undefined; throw error })
    return loading
  }
  handle('agent:requests', () => access?.views() ?? [])
  handle('agent:respond', async (input) => {
    if (!access) throw new Error('No agent request is awaiting approval.')
    await access.respond(input)
  })
  app.on('window-all-closed', () => access?.cancelAll())
  try {
    const submit = async (input: unknown, signal?: AbortSignal) => (await getAccess()).submit(input, signal)
    if (launchArguments[0] === 'agent') return await runAgent(launchArguments, submit)
    await (await import('./mcp')).runMcp(launchArguments, submit, skillsDirectory())
    return 0
  } finally {
    access?.disconnect()
    if (relay) (await relay.catch(() => undefined))?.stop()
    mainWindow?.destroy()
  }
}

function demoFile(): string {
  return app.isPackaged ? join(process.resourcesPath, 'demo', 'index.cjs') : join(__dirname, '../demo/index.cjs')
}

function skillsDirectory(): string {
  return app.isPackaged ? join(process.resourcesPath, 'skills') : join(__dirname, '../../skills')
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function registerSharing(service: Sharing): void {
  handle('sharing:state', () => service.state())
  handle('sharing:device-card', async () => sendToNearbyMac(await service.deviceCardFile()))
  handle('sharing:pick-peer', async () => {
    const path = await pickDirectory({ title: 'Verify a recipient device', properties: ['openFile'], defaultPath: app.getPath('downloads'),
      filters: [{ name: '.sct device card', extensions: ['sct-device'] }] })
    return path ? service.previewPeer(path) : null
  })
  handle('sharing:confirm-peer', async (token) => {
    const peer = await service.confirmPeer(token)
    sharingChanged()
    return peer
  })
  handle('sharing:send', async (input) => sendToNearbyMac(await service.exportSecrets(input)))
  handle('sharing:pick-transfer', async () => {
    const path = await pickDirectory({ title: 'Choose a received .sct transfer', properties: ['openFile'], defaultPath: app.getPath('downloads'),
      filters: [{ name: '.sct transfer', extensions: ['sct-transfer'] }] })
    if (!path) return null
    const preview = await service.openTransfer(path)
    sharingChanged()
    return preview
  })
  handle('sharing:import', async (input) => {
    const metadata = await service.importTransfer(input)
    sharingChanged()
    return metadata
  })
  handle('sharing:dismiss', async (id) => {
    await service.dismissTransfer(id)
    sharingChanged()
  })
  app.on('will-quit', () => {
    rmSync(join(app.getPath('userData'), 'sharing', 'outbox'), { recursive: true, force: true })
  })
}

function sendToNearbyMac(path: string): Promise<void> {
  if (process.platform !== 'darwin') return Promise.reject(new Error('Sending to a nearby Mac requires macOS.'))
  return new Promise((resolve, reject) => {
    // The helper opens only the AirDrop picker and exits when it closes. macOS reports no delivery or cancel state.
    execFile(app.isPackaged ? join(process.resourcesPath, 'airdrop') : join(__dirname, '../airdrop'), [path], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || 'Cannot open the nearby Mac picker.'))
      else resolve()
    })
  })
}

function sharingChanged(): void {
  mainWindow?.webContents.send('sharing:changed')
}

async function openIncomingFiles(): Promise<void> {
  if (openingFiles || !sharing || !mainWindow || mainWindow.webContents.isLoading()) return
  const path = incomingFiles.shift()
  if (!path) return
  openingFiles = true
  try {
    await sharing.openTransfer(path)
    mainWindow?.show()
    sharingChanged()
  } catch (error) {
    dialog.showErrorBox('Cannot open this .sct transfer', error instanceof Error ? error.message : 'The transfer could not be opened.')
  } finally {
    openingFiles = false
    if (incomingFiles.length) void openIncomingFiles()
  }
}
