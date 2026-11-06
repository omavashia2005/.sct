import type { Project, ProjectInput, ProjectRename } from './projects'
import type { SecretInput, SecretMetadata, SecretReference, SecretUpdate } from './secrets'
import type { SharingAPI } from './sharing'
import type { RelayAPI } from './relay'
import type { AgentAPI } from './agent'

export interface SctAPI extends SharingAPI, RelayAPI, AgentAPI {
  listProjects: () => Promise<Project[]>
  pickDirectory: () => Promise<string | null>
  addProject: (input: ProjectInput) => Promise<Project>
  renameProject: (input: ProjectRename) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  listSecrets: () => Promise<SecretMetadata[]>
  addSecret: (input: SecretInput) => Promise<SecretMetadata>
  updateSecret: (input: SecretUpdate) => Promise<SecretMetadata>
  deleteSecret: (input: SecretReference) => Promise<void>
  getVaultLocation: () => Promise<string>
  chooseVaultLocation: () => Promise<string | null>
}

export type Reply<T> = { ok: true; value: T } | { ok: false; error: string }
