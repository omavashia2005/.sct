# .sct landing page

This folder is the .sct website. It has two pages:

- `/` shows the vault, runtime injection through `@sct/env`, and AirDrop and relay sharing. Visitors can use a live demo.
- `/sdk` is the `@sct/env` guide.

The site uses Next.js 16, Tailwind CSS 4, and shadcn components. The build is a static export. The site has no server code and needs no environment variables.

The demos run only in the browser tab. They keep secret names and value lengths. They do not keep a value, and they send nothing to a server.

## Run the site

Use Bun 1.4.4 or later. Run these commands in this folder:

```sh
bun install
bun run dev
```

## Check the site

```sh
bun run lint
bun run typecheck
bun run build
```

`bun run build` writes the static site to `out/`.

The root `bun run check` does not lint this folder. This folder has its own lint configuration.

## Design rules

The site uses the Hallmark Terminal theme from `AGENTS.md`.

- `app/tokens.css` declares every color and font as a role token.
- `app/base.css` contains the Hallmark base rules.
- The first lines of `app/globals.css` contain the Hallmark stamp. The stamp records each waiver and each dismissal with its reason.

This site removes the Hallmark slot rules from `base.css`. shadcn components use `data-slot` attributes, and the slot rules would style those components as pictures.

## Deploy to Cloudflare Pages

[docs/cloudflare-pages.md](../docs/cloudflare-pages.md) gives the full steps for Git integration, direct upload, and custom domains.

To preview the build in the local Pages runtime:

```sh
bun run preview
```

## Links on the page

`lib/links.ts` contains the DMG, repository, and demo video URLs. The SDK install commands show `@sct/env` from npm. The package is not on npm yet.
