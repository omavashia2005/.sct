# @sct/env

Load a registered project's `.sct` secrets into `process.env` and keep them current.
This package has no runtime dependencies. It supports server-side TypeScript on macOS with Node.js 22.18 or later and Bun.
It requires the installed `sct` command. Keychain access and decryption stay in the signed Electron main process.

## Install

```sh
npm install @sct/env
```

Or, with Bun:

```sh
bun add @sct/env
```

To use the source from the [.sct repository](https://github.com/omavashia2005/.sct) instead of the npm release, build it in a clone of the repository:

```sh
bun run build:sdk                        # Run this command in the .sct folder.
bun add /absolute/path/to/.sct/sdk       # Run this command in your application folder.
```

## Before you start

1. Install the .sct desktop app.
2. Follow the [CLI setup](https://github.com/omavashia2005/.sct/blob/main/docs/runtime-injection.md) one time to put `sct` on `PATH`.
3. In the app, register the source folder of your application and save its secrets.

## Quick example

```ts
// bootstrap.ts
import { loadEnv } from '@sct/env'

await loadEnv()
await import('./server.js')
```

Start your application from `bootstrap.ts`. Then `process.env` contains the saved secrets of the project. The SDK applies saved changes without a restart.

## Load before application imports

Use a bootstrap file so application modules evaluate after the first load.
Static imports evaluate before the calling module's body. Writing `await loadEnv()` above a static import does not delay that import.
Start the application from the registered folder or a subfolder. The SDK selects the nearest registered parent folder.
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
