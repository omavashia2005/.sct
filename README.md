# .sct

.sct is a macOS app that keeps project secrets out of project folders.
Your project needs no `.env` file.

- **Vault.** .sct keeps secrets in an encrypted local vault. Each value has its own key in macOS Keychain.
- **Runtime injection.** `sct run -- <command>` gives the command its secrets as environment variables.
- **SDK.** The dependency-free `@sct/env` package loads secrets into `process.env` and applies saved changes without a restart.
- **Sharing.** .sct sends encrypted secrets to a verified Mac through AirDrop or a relay.
- **Agent Access.** Coding agents use secrets through a CLI and an MCP server. Each request opens a local approval window. Agents never receive secret values.


Demo video: https://youtu.be/kQwLTeVe2OE

## Branches

`main` is the stable build. Each DMG release comes from `main`.
The [`experimental`](https://github.com/omavashia2005/.sct/tree/experimental) branch has all the features of `main`, and also experimental features, such as mock Wallet cards (sharing cards).
The `experimental` branch has no DMG release. To try it, build it from source.

## Download

Each push to `main` builds an Apple Silicon DMG. Get it from the [latest release](https://github.com/omavashia2005/.sct/releases/tag/latest).
The app has an ad-hoc signature and no notarization. Thus macOS blocks the first start.
Copy `sct.app` to Applications. Then right-click the app and select **Open**, or run:

```sh
xattr -dr com.apple.quarantine /Applications/sct.app
```

## Quick setup

Use macOS, Bun 1.4.4 or later, Node.js 22.18 or later, and the Xcode command line tools.

```sh
git clone https://github.com/omavashia2005/.sct.git
cd .sct
bun install
bun run dev
```

`bun run dev` opens the app. It needs no relay, cloud credentials, or environment variables.

To get the `sct` command, build the signed app. First, do the one-time Keychain setup in [macOS signing](docs/macos-signing.md).

```sh
bun run package:mac
bun run install:cli   # Installs ~/.local/bin/sct
```

Then, in the app, add a project folder and its secrets. Run the project from its folder:

```sh
sct run -- bun run dev
```

To load secrets in code, build the SDK and add it to your application. The SDK is not on npm yet.

```sh
bun run build:sdk
bun add /absolute/path/to/.sct/sdk   # Run this command in your application folder.
```

Load the secrets before the application imports:

```ts
import { loadEnv } from '@sct/env'

await loadEnv()
await import('./server.js')
```

See the [SDK guide](sdk/README.md).

## Share through the relay

The relay lets two Macs share secrets when they are not near each other.
The app connects to the hosted relay (SpacetimeDB Maincloud, database `sct-relay`) when it starts.
You need no account, login, or configuration. The relay stores ciphertext and routing metadata only.

This check is optional. It requires the [SpacetimeDB CLI](docs/relay.md#install-the-cli). To check that a Mac can reach the relay, run:

```sh
spacetime describe sct-relay --server maincloud --anonymous
```

Pair the two Macs one time. On both Macs, open **Sharing**, then the **Relay** tab.

1. On Mac B, copy the ID under **This device’s relay ID**. Send it to Mac A by any channel.
2. On Mac A, enter the relay ID and select **Request pairing**.
3. Both Macs show a pairing code. Compare the two codes in person or on a call.
4. If the codes are the same, select **I compared this code on both Macs** and **Confirm relay device** on each Mac.
   If the codes are different, select **Remove**.

To send secrets:

1. On the sending Mac, select a project, the paired recipient, and the secrets.
2. Optionally, set **Access expires**.
3. Select **Queue encrypted transfer**. The recipient Mac does not need to be online.

To receive secrets, open **Received transfers** on the recipient Mac. Select a local project and **Import and send receipt**.

AirDrop pairing and relay pairing are separate. A Mac that you verified through AirDrop must also pair on the **Relay** tab.
To use your own relay, see [relay setup](docs/relay.md).

## Agent setup prompt

Paste this prompt into your coding agent:

```text
Set up .sct on this Mac. Follow these steps in sequence:

1. Clone https://github.com/omavashia2005/.sct.git and open the cloned folder.
2. Read AGENTS.md and README.md.
3. Run `bun install`.
4. Run `security find-identity -v -p codesigning`.
   If the output does not show exactly one valid ".sct Development" identity, stop.
   Tell me to follow docs/macos-signing.md. Do not create, export, or change certificates.
5. Run `bun run package:mac`, then run `bun run install:cli`.
6. Add the MCP server "sct" with the command `~/.local/bin/sct` and the argument `mcp`.
7. Open the signed app from dist/. Tell me to choose a vault location outside every project folder.

Rules:
- Never read, print, or write a secret value.
- Never create a .env file or another secret file.
- Each .sct request opens an approval window. Wait for my decision. Do not retry a refused or expired request without my instruction.
```

## Docs

- [Runtime injection](docs/runtime-injection.md) and the [`@sct/env` SDK](sdk/README.md)
- [Sharing](docs/sharing.md) and [relay setup](docs/relay.md)
- [Agent Access](docs/agent-access.md) and the [Claude Code demo project](examples/claude-code/README.md)
- [Architecture](docs/architecture.md), [vault storage](docs/storage.md), and the [glossary](docs/glossary.md)

Contributors and agents follow [AGENTS.md](AGENTS.md).
