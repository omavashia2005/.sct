# @sct/env

Load a registered project's `.sct` secrets into `process.env` and keep them current.
This package has no runtime dependencies. It supports server-side TypeScript on macOS with Node.js 22.18 or later and Bun.
It requires the installed `sct` command. Keychain access and decryption stay in the signed Electron main process.

## Install from this repository

Build the package in the .sct repository:

```sh
bun run build:sdk
```

Install it in your application:

```sh
bun add /absolute/path/to/.sct/sdk
```

The package is not published to npm yet. Use this local installation until a release exists.
Register your application's source folder and save its secrets in the .sct desktop app.
Follow the [CLI setup](../docs/runtime-injection.md) once to make `sct` available on `PATH`.

## Load before application imports

```ts
import { loadEnv } from '@sct/env'

await loadEnv()
await import('./server.js')
```

Use a bootstrap file so application modules evaluate after the first load.
Static imports evaluate before the calling module's body. Writing `await loadEnv()` above a static import does not delay that import.
Launch from the registered folder or a subfolder. The SDK selects the nearest registered parent folder.
Use `await loadEnv({ project: 'My project' })` to select an exact registered name from another folder.

Saved additions, updates, and deletions reach `process.env` within approximately 500 milliseconds while storage is available.
Project secrets override inherited variables with the same name. When you delete a managed key, the SDK restores the original inherited value. If no inherited value existed, the SDK deletes the variable.
The SDK changes only the calling process. It does not update other processes or previously copied strings.

Libraries that copy credentials into client objects need those clients to be recreated.
Use `onChange` to rebuild them after a successful update:

```ts
await loadEnv({
  onChange: () => rebuildClients(),
  onError: (error) => reportSecretAccessFailure(error)
})
```

The SDK calls `onChange` after later snapshots, not after the initial load.
Initial failures reject `loadEnv()`. Later read failures restore inherited values and call `onError`.
Without `onError`, the SDK writes a value-free diagnostic to stderr.
It keeps checking storage and applies the next available snapshot after recovery.

To stop updates and restore inherited values:

```ts
const stop = await loadEnv()
stop()
```

Call `loadEnv()` once during startup. Each call owns a helper process until it stops or the application exits.
The helper uses private process pipes. It opens no network port and creates no plaintext files.
The helper does not keep an otherwise finished application alive.

This SDK belongs in trusted server-side code. Browser bundles cannot use it.
Programs can copy or disclose their environment. Vite public prefixes can expose values in browser output.
Do not include private credentials in public build configuration.
