Always use the [ASD-STE100](https://github.com/danyuchn/asd-ste100-skill) skill to write PR descriptions, commit messages, and any other technical documentation and/or artifacts, including your responses. Make sure to always follow this rule

Use the [hallmark](https://github.com/nutlope/hallmark)  skill to do any UI and design related stuff.

This project is called .sct, look at the docs and github issues if necessary to check how this works and what it does

Every time you implement something, make sure that you're doing exactly what is asked of you and if any major change is incoming, always ensure with me as to what the change is and if you have any assumptions going into it. Do not make decisions for yourself at all. Always talk to me first.

Throughout implementing this project, always make sure to never use any shortcuts, at any point in time, for any reason whatsoever.


- Always run react doctor tests before finishing UI implementation to correct any issues that come up. Aim for a high score (100).
- Install all the skills required or look them up before doing tasks that require them.
- This MUST be a typescript project
- Avoid using the `any` type
- No shortcuts, at any point, for any reason, ever.
- Do not add tests unless I approve. We don't want ANY bloat.
- Where required and appropriate, try to make a shared types file instead of having a scattered type system.
- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood, and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.
- Reduce total variable count by inlining when a value is only used once.

```
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

## Implementation order

- Follow [the issue order and prerequisites](docs/architecture.md#implementation-order).
- Complete #32 runtime injection before relay setup.
- Require no .env file or equivalent secret-bearing file in the project folder.
- Develop relay sharing and local Agent Access independently after their local prerequisites pass.
- Keep local Agent Access free of direct and indirect relay dependencies.
- Build the sharing UI with delivery so users can test from both app windows.
- Use #33 for integration that requires both completed branches.
- Keep issue dependencies acyclic. Title prefixes show order, and GitHub issue IDs stay unchanged.

## Complex Logic

When a function has several validation branches or supporting details, make the main function show the successful path. Move supporting details into small helpers below the main function.

```ts
// Good
export function loadThing(input: unknown) {
  const config = requireConfig(input)
  const metadata = readMetadata(input)
  return createThing({ config, metadata })
}

function requireConfig(input: unknown) {
  // ...
}
```

- Keep helpers close to the code that they support. Place them below the main export when this improves readability.
- Do not create many single-use helpers for simple expressions. Extract a helper only when it names a real concept, such as `requireConfig` or `readMetadata`.
- Do not return `Effect` from a helper unless the helper performs effectful work. Keep synchronous parsing, validation, and option building synchronous.
- Prefer Effect schema helpers, such as `Schema.UnknownFromJsonString` and `Schema.decodeUnknownOption`, over manual `JSON.parse` calls wrapped in `Effect.try` for untrusted JSON strings.
- Add comments for constraints and surprising behavior. Do not add comments for obvious assignments or control flow.

## Checks

- Use Bun 1.4.4 or later for dependencies and project commands.
- Run `bun run check` from the repository root for the full lint and type check.
- During focused changes, run `bun typecheck` from the repository root. It checks the desktop app, `sdk/` SDK sources, and the `packages/relay` module.
  `packages/relay/package.json` lists no dependencies. The SpacetimeDB CLI requires it to detect the relay module.
- Run `bun run build:sdk` to check SDK declarations with the pinned official TypeScript compiler.
- Never run `tsc` directly. Use the repository scripts.
- The local `typecheck` script uses `bun check --no-script` for the Electron and renderer configurations.
  The flag selects Bun's type checker instead of the root `check` script.
- CI uses `bun run typecheck:tsc` with the pinned official TypeScript compiler under `@typescript/native`.
  Use this script before package publishing if publishing is added.
- If the checkers disagree, the official compiler is the source of truth. Reproduce with `bun run typecheck:tsc`.
- Bun 1.4.4 follows TypeScript 7.1 behavior despite reporting `7.0.2` in `process.versions.typescript`.
  See [oven-sh/bun#46536](https://github.com/oven-sh/bun/issues/46536).
- Report checker differences at [Bun issues](https://github.com/oven-sh/bun/issues) with a minimal reproduction that has no dependencies.
  Include both checkers' output and versions.
- `bun check` writes no declaration files. Declaration-only errors, including TS5088 and TS2883, can appear only in the official compiler.
  Do not report those errors as Bun checker differences.

## Design system

- Use Hallmark's Terminal theme from the supplied Burrow reference for all UI changes.
- Keep the supplied OKLCH palette in the renderer's CSS role tokens. Treat those tokens as the source of truth.
- Use three near-black paper levels with a green cast, pale phosphor ink, and one bright green accent.
  Do not introduce other hues, including red error backgrounds.
- Use Martian Mono for every glyph. Use weight 500 and width 112.5% for headings.
  Use weight 400, width 87.5%, and size 15–16px for body text.
  Use no more than three weights: 400, 500, and 700.
- Declare all colors and fonts through role tokens. Do not add literal colors or font families outside the token declarations.
- Use square surfaces with 1px rules. Do not use shadows, rounded corners, pills, or light sections.
- Use a solid green primary button with dark text. Use an outlined secondary button.
- Show keyboard focus immediately. Use stepped state changes and respect reduced-motion preferences.
- Do not add scanlines, glow, simulated terminal or operating-system frames, decorative status dots, eyebrows, or tracked capital labels.
- Use prompt glyphs only for real commands. Keep familiar forms, project lists, and the native folder picker.
- Keep the window simple. Do not add decorative panels or controls that the task does not require.

## Testing

- Avoid mocks as much as possible, you shouldn't be using globalThis.\* at all unless it's the only option.
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root; run from package directories such as `packages/core`.
- Use playwright tests to verify UI functionality after every single UI change
