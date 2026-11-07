# .sct glossary

The docs use some words with one fixed meaning:

- **Check** — Software tests a value, a signature, a schema, or a deadline.
- **Verify** — A user compares the pairing code and accepts a device. The UI uses this word.
- **Start** — Start a process.
- **Delete** — Delete stored data, for example a file, a Keychain item, or a project.

## Local

**.sct** — The Electron, React, and TypeScript app in this repository. It manages local secrets and encrypted handoffs between Macs.

**Signing identity** — The `.sct Development` certificate and private key in Keychain. A stable signature keeps Keychain access after rebuilds. See [macOS signing](macos-signing.md).

**Keychain** — The macOS service that protects value keys, file keys, device private keys, and the relay token.

**Local vault** — The encrypted `secrets.sct` files and their Keychain keys. It works offline. See [vault storage](storage.md).

**Electron main process** — The trusted process for vault access, encryption, child process starts, sharing, relay connections, and Agent Access. .sct runs no separate daemon.

**Renderer** — The sandboxed process that shows the React UI. It receives metadata only and never a stored value.

**IPC** — The narrow preload bridge from the renderer to main-process operations. The main process accepts calls only from the app page.

**Injection** — Passing project secrets into a child process environment before it starts. The process and its descendants can read or copy the values.

**CLI** — The `sct` command. `sct run -- <command>` injects secrets. `sct agent` sends Agent Access requests.

**TypeScript SDK** — The dependency-free `dotsct` package. `await loadEnv()` keeps `process.env` current. `onChange` lets an app recreate clients that keep credentials.

**Loader compatibility** — Existing loaders read inherited environment variables. A `.env` parser cannot read `secrets.sct`.

## Agent Access

**Agent Access** — Local operations that an agent requests through the CLI or MCP. Each request needs local approval. It has no relay dependency.

**MCP** — Model Context Protocol. `sct mcp` exposes the nine operations as tools, prompts, and skill resources.

**Caller authentication** — .sct finds the first listed agent among the parent processes and checks its code signature. .sct rejects an impostor. An unverified caller needs an extra statement from the user in the approval window.

**Local approval** — The user's decision in the .sct window. It applies to one request. An agent or relay message cannot approve its own request.

**Secret boundary** — The rules that limit which processes receive secret values. An approved process can copy a value that it receives.

## Sharing

**Device identity** — A Mac's X25519 encryption key and Ed25519 signing key. The private keys stay in Keychain.

**Device card** — A `.sct-device` file with a device's public keys. It contains no secret.

**Pairing** — Both users compare a code derived from both devices' keys. Each device then saves the verified peer keys.

**Transfer package** — A `.sct-transfer` file. It holds selected secrets, encrypted and signed for one verified device. It expires after 24 hours.

**AirDrop** — The macOS transport for transfer packages and device cards. .sct opens only the AirDrop picker.

**Relay** — Cloud-hosted SpacetimeDB that persists and routes ciphertext. It never receives the keys that decrypt payloads. See [relay setup](relay.md).

**Subscription** — A relay connection that receives the rows that server-side authorization permits.

**TLS** — Protects each relay connection. Payload encryption separately protects contents from the relay.

## Relay delivery

These terms describe Phase 2 relay delivery and the remote demo tasks of issue #33. See the [architecture](architecture.md).

**Admin** — The user who publishes a secret.

**Encrypted handoff** — A signed envelope for one or more recipients. Phase 2 carries secrets, grants, and acknowledgments. Issue #33 adds tasks and results.

**Message key** — A new random key for one message. The sender encrypts it for each recipient. That copy is the wrapped key.

**Message ID** — A stable ID that retries reuse. Receipt records prevent a second import.

**Correlation ID** — The original handoff ID in a reply.

**Delivery acknowledgment** — An encrypted, authenticated reply that reports durable receipt. It does not report execution.

**Grant** — An authorization for a recipient, a credential, a permitted operation, and an absolute deadline.

**Injection-only grant** — A received grant that permits approved injection only. It denies reveal, copy, and reshare.

**Message expiry** — After this deadline, a message cannot be delivered or executed. It cannot revoke a delivered credential.

**Access expiry** — After this deadline, a grant blocks new vault use. Cleanup in #19 will delete grant material when .sct starts or the Mac wakes. It cannot delete external copies.

**Execution claim** — A durable record that .sct writes before a remote task starts. A claim without an outcome after a crash needs local review.

**Execution result** — An encrypted reply with an approved outcome. It contains no credential or unrestricted log.

**Replay attack** — A repeated delivery of an old message. Deadlines, receipt records, and execution records block it.

**Redaction** — Deleting recognized secret values from output. It does not make arbitrary output safe.

**Droid** — Factory's coding agent. Its integration is post-MVP work in #23.
