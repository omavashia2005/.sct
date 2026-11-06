import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Project } from '../../shared/projects'
import type { SecretMetadata } from '../../shared/secrets'
import { AllSecretsView } from './AllSecretsView'
import { errorText } from './operation'
import { ProjectSecretsView } from './ProjectSecretsView'
import { ProjectsView } from './ProjectsView'
import { StorageView } from './StorageView'
import { SharingView } from './SharingView'
import { AgentAccessView } from './AgentAccessView'
import type { Loaded, SharingTab, UpdateProjects, UpdateSecrets } from './types'

type Route = { view: 'projects' } | { view: 'project'; id: string } | { view: 'secrets' } | { view: 'storage' } | { view: 'sharing'; projectId?: string; tab?: SharingTab } | { view: 'agent' }

export function App() {
  const route = parseRoute(useSyncExternalStore(subscribeToHash, () => window.location.hash))
  return route.view === 'agent' ? <AgentAccessView /> : <DesktopApp route={route} />
}

function DesktopApp({ route }: { route: Exclude<Route, { view: 'agent' }> }) {
  const [projects, setProjects] = useState<Loaded<Project[]>>({ state: 'loading' })
  const [secrets, setSecrets] = useState<Loaded<SecretMetadata[]>>({ state: 'loading' })

  useEffect(() => {
    let active = true
    window.sct.listProjects().then((value) => {
      if (active) setProjects({ state: 'ready', value })
    }).catch((cause: unknown) => {
      if (active) setProjects({ state: 'error', error: errorText(cause, 'Cannot load your projects.') })
    })
    window.sct.listSecrets().then((value) => {
      if (active) setSecrets({ state: 'ready', value })
    }).catch((cause: unknown) => {
      if (active) setSecrets({ state: 'error', error: errorText(cause, 'Cannot load your secrets.') })
    })
    return () => { active = false }
  }, [])

  useEffect(() => window.sct.onSharingChanged(() => {
    if (!window.location.hash.startsWith('#/sharing')) window.location.hash = '#/sharing'
  }), [])

  const updateProjects: UpdateProjects = (change) =>
    setProjects((current) => current.state === 'ready' ? { state: 'ready', value: change(current.value) } : current)
  const updateSecrets: UpdateSecrets = (change) =>
    setSecrets((current) => current.state === 'ready' ? { state: 'ready', value: change(current.value) } : current)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-start">
          <span className="wordmark">.sct</span>
          <nav aria-label="Main">
            <a href="#/" aria-current={route.view === 'projects' || route.view === 'project' ? 'page' : undefined}>Projects</a>
            <a href="#/secrets" aria-current={route.view === 'secrets' ? 'page' : undefined}>All secrets</a>
            <a href="#/sharing" aria-current={route.view === 'sharing' ? 'page' : undefined}>Sharing</a>
            <a href="#/storage" aria-current={route.view === 'storage' ? 'page' : undefined}>Storage</a>
          </nav>
        </div>
        <span className="local-label">On this Mac</span>
      </header>
      <main>
        {route.view === 'projects' && (
          <ProjectsView projects={projects} secrets={secrets} updateProjects={updateProjects} updateSecrets={updateSecrets} />
        )}
        {route.view === 'project' && (
          <ProjectSecretsView projectId={route.id} projects={projects} secrets={secrets} updateSecrets={updateSecrets} />
        )}
        {route.view === 'secrets' && <AllSecretsView projects={projects} secrets={secrets} />}
        {route.view === 'storage' && <StorageView />}
        {route.view === 'sharing' && (
          <SharingView key={route.projectId ?? 'sharing'} projectId={route.projectId}
            tab={route.tab} projects={projects} secrets={secrets} updateProjects={updateProjects} updateSecrets={updateSecrets} />
        )}
      </main>
    </div>
  )
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function parseRoute(hash: string): Route {
  const [view, id, projectId] = hash.replace(/^#\/?/, '').split('/')
  if (view === 'projects' && id) return { view: 'project', id: decodeURIComponent(id) }
  if (view === 'secrets') return { view: 'secrets' }
  if (view === 'storage') return { view: 'storage' }
  if (view === 'agent') return { view: 'agent' }
  if (view === 'sharing') {
    if (id === 'devices' || id === 'secrets' || id === 'receive' || id === 'relay') {
      return { view: 'sharing', tab: id, projectId: projectId ? decodeURIComponent(projectId) : undefined }
    }
    return { view: 'sharing', projectId: id ? decodeURIComponent(id) : undefined }
  }
  return { view: 'projects' }
}
