# CLI and TypeScript runtime injection

.sct gives a registered project its secrets without `.env` files or project-local manifests.
The CLI and the SDK work offline. They need no relay, no MCP server, and no agent.
In both paths, the signed Electron main process owns Keychain access and decryption.

## Set up one time

1. Build the signed app: `bun run package:mac`. If the build reports a missing identity, do the [local signing setup](macos-signing.md).
2. Install the `sct` command: `bun run install:cli`.
3. If the installer tells you that `~/.local/bin` is not in `PATH`, add this line to `~/.zshrc`:

   ```sh
   export PATH="$HOME/.local/bin:$PATH"
   ```

4. Open a new terminal.
5. Open `dist/sct-darwin-arm64/sct.app`. On an Intel Mac, use `sct-darwin-x64`.
6. Register your existing project folder.
7. Save the variables of the project under **Open secrets**.

Keep the vault outside the source folder. The project needs no `.sct` configuration file.
The desktop window can be open or closed during injection.

### The `sct` command script

The installer writes `~/.local/bin/sct` as a shell script. The script runs the signed executable with `exec`.
Electron finds its helper apps only from the real executable path. Thus the command is not a symbolic link.

- The installer replaces an earlier .sct symbolic link to the same executable.
- The installer keeps other commands. It rejects a script or a link for another application.
- After a rebuild, the script uses the same app location. If you move the app, install the command again.

## CLI: one command in your project

From the registered source folder or a subfolder, run:

```sh
sct run -- bun run dev
```

.sct selects the nearest registered parent folder. The command runs in the registered source folder.
To select a project by its exact name, run:

```sh
sct run "My project" -- npm run dev
```

The command receives the variables of the project before imports or package scripts run.

- Project secrets override inherited variables with the same name. Other inherited variables stay available.
- The parent environment does not change. Secrets of other projects do not go into this environment.
- Values keep spaces, quotes, dollar signs, equals signs, empty strings, Unicode, and newlines.
- The vault rejects null characters, because process environment values cannot contain them.

### Restarts

Keep the command running. When you add, update, or delete a saved key, .sct restarts the command with the current environment.
You do not run the command again or copy new values into a shell.

- `sct run` checks the encrypted file metadata every 500 milliseconds. It decrypts only when a revision changes.
- `sct run` keeps the selected project ID. It finds renamed projects and moved storage through the current registry and settings.
- `sct run` writes no plaintext file.

A restart interrupts the project, and its normal startup code runs again.
Use this behavior only for development commands whose restart side effects you accept.

1. .sct sends `SIGTERM` to the process group of the command.
2. .sct waits a maximum of two seconds for the group to stop. Then it stops the remaining members.
3. .sct starts the command again.

A process that moves to another session stays under the control of the program that started it.

### Input, signals, and exit codes

- Terminal input and output stay connected to the command.
- `Ctrl+C`, `SIGTERM`, and `SIGHUP` go to the process group of the command.
- When the command exits normally, `sct run` exits with the same code.
- When a signal ends the command, `sct run` returns `128 + signal number`.
- .sct does not start a command again after a normal exit or a crash.

### Failures

- If a missing prerequisite stops the first start, `sct run` fails immediately.
- If a later vault read fails, .sct stops the command and reports a diagnostic without values.
  .sct continues to check the storage. When the vault is readable again, .sct starts the command again.
- A new project needs at least one saved secret. The first secret makes the encrypted vault file.

## TypeScript SDK: load inside your code

The dependency-free [`@sct/env` SDK](../sdk/README.md) loads the same values inside your process.
It keeps `process.env` current without a restart.

- Build the SDK with `bun run build:sdk`.
- Install it with `bun add /absolute/path/to/.sct/sdk`.
- It needs macOS, Node.js 22.18 or later or Bun, and the installed `sct` command on `PATH`.

The SDK starts a signed helper through private stdin and stdout pipes. It receives only the values of the selected project.
It opens no local server and uses no network service.
The SDK guide tells you how to write the bootstrap file, use `onChange` and `onError`, and stop updates.

## Check your existing project

1. Save a variable named `API_KEY`.
2. Check that the variable is present. This command does not show the value:

   ```sh
   sct run -- node -e 'console.log("API_KEY present:", Object.hasOwn(process.env, "API_KEY"))'
   ```

   The correct result is `API_KEY present: true`. An empty value also counts as present.
3. Run your normal development command through `sct run`, or use the SDK bootstrap.
4. Change a saved value in the app. `sct run` restarts the project. The SDK updates the environment of its own process.

.sct does not import, delete, or change an existing `.env` file.
Move the values into .sct before you delete that file from the project.
A program that starts without the SDK and without `sct run` gets no values.

## Loader compatibility

Libraries read inherited environment variables through `process.env`. They do not read or decrypt `secrets.sct`.

- **dotenv:** The default load keeps existing environment variables. Code that needs a successful `.env` read must change when the file is absent.
  `dotenv.parse` parses the contents that you give it. It does not return inherited variables.
  Override modes can replace injected values with other contents. See [dotenv configuration](https://github.com/motdotla/dotenv#config).
- **Bun:** Bun scripts and package scripts get the environment before they run. The automatic `.env` load of Bun does not decrypt the vault.
  See [Bun environment variables](https://bun.sh/docs/runtime/environment-variables).
- **Vite:** Vite gives existing environment variables priority over `.env` values.
  The default `VITE_` prefix puts variables into browser code and build output. Do not use public prefixes or client build definitions for private credentials.
  `sct run` restarts Vite after a key change, so Vite starts with the new environment.
  An SDK update in a server process does not rebuild the browser output that Vite made before.
  See [Vite environment variables and modes](https://vite.dev/guide/env-and-mode).

The #32 loader checks used Node.js 22.23.1, dotenv 18.0.9, Bun 1.4.4, and Vite 8.3.5.
They checked literal values, the behavior without a `.env` file, and that client output contained no private value.
The #32 Python checks do not apply to the TypeScript SDK. The SDK has no Python integration.

## Storage and trust

- Vault files stay encrypted in the external `.sct/[project-name]/secrets.sct` folder.
- The vault clears decrypted Buffers and copied value keys after use. It deletes temporary environment references after use.
- `sct run` and the SDK make no plaintext secret file, project manifest, copied key, symbolic link, or FIFO in the project.
- The `sct` command script is in `~/.local/bin`, outside the project.
- The renderer API returns metadata only.

A program and its descendants can copy, print, save, or send their environment. Run only code that you trust.
An update or a deletion of a key cannot revoke copies that a program kept.
