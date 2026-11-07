# Deploy the website to Cloudflare Pages

The website in `site/` is a static Next.js export.
`bun run build` writes the complete site to `site/out/`.
Cloudflare Pages serves those files. The site has no server code, no Pages Functions, and no environment variables that hold secrets.

`site/wrangler.toml` sets these values:

| Key | Value |
|---|---|
| `name` | `sct` |
| `pages_build_output_dir` | `./out` |
| `compatibility_date` | `2026-11-06` |

You can deploy in two ways:

- **Git integration.** Cloudflare builds the site after each push. Use this method for the public site.
- **Direct upload.** You build the site on your Mac and upload `out/` with Wrangler. Use this method for a quick test or a one-time deploy.

Do not use both methods for one project. A Pages project made by direct upload cannot connect to Git later.

## Check the build first

Run these commands in `site/`:

```sh
bun install
bun run lint
bun run typecheck
bun run build
```

To test the build in the local Pages runtime, run this command:

```sh
bun run preview
```

Open the URL that Wrangler prints. The default is `http://localhost:8788`.
Check `/`, `/sdk`, and a missing path such as `/missing`. The missing path must show the 404 page.

## Deploy with Git integration

1. Push the repository to GitHub.
2. Open the Cloudflare dashboard. Go to **Workers & Pages**.
3. Select **Create application**. Select the **Pages** tab.
4. Select **Connect to Git**. Authorize Cloudflare for the `omavashia2005/.sct` repository.
5. Enter these build settings:

   | Setting | Value |
   |---|---|
   | Project name | `sct` |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Root directory | `site` |
   | Build command | `bun install --frozen-lockfile && bun run build` |
   | Build output directory | `out` |

6. Open **Environment variables**. Add these variables for both Production and Preview:

   | Variable | Value |
   |---|---|
   | `BUN_VERSION` | `1.4.4` |
   | `NODE_VERSION` | `22` |

7. Select **Save and Deploy**.

The `Next.js (Static HTML Export)` preset also builds this site, but it fills in npm commands. The `None` preset keeps the Bun commands from the table.

`BUN_VERSION` and `NODE_VERSION` make the Cloudflare build use the same versions as this repository. Without them, the build image uses its own default versions.

The build command installs the dependencies from `site/bun.lock` before the build. The step does not depend on how the Pages build image detects the lockfile.

After the first deploy:

- Each push to `main` updates the production site.
- Each push to another branch makes a preview deployment at `<branch>.<project>.pages.dev`.
- A pull request shows its preview URL in the Cloudflare check on GitHub.

## Deploy with direct upload

1. Log in to Cloudflare from `site/`:

   ```sh
   bunx wrangler login
   ```

2. Make the project once:

   ```sh
   bunx wrangler pages project create sct --production-branch main
   ```

3. Build the site and upload it to production:

   ```sh
   bun run deploy -- --branch main
   ```

Wrangler reads the project name and the output folder from `wrangler.toml`.
Without `--branch main`, Wrangler uses your current Git branch. On a branch other than `main`, the upload becomes a preview deployment, not the production site.

## Add a custom domain

1. Open the `sct` project in **Workers & Pages**.
2. Select **Custom domains**, then **Set up a custom domain**.
3. Enter the domain. Follow the DNS steps that Cloudflare shows.

If the domain uses Cloudflare DNS, Cloudflare adds the record for you.
For other DNS providers, add the `CNAME` record that Cloudflare shows. Point it to `<project>.pages.dev`.

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| The site URL is not `sct.pages.dev` | Another Cloudflare account uses the `sct` subdomain. Cloudflare adds a suffix to the subdomain. The project still works at the URL that the dashboard shows. |
| The build uses a different Bun or Node.js version | `BUN_VERSION` or `NODE_VERSION` is missing for that environment. Add it for Production and Preview, then retry the deploy. |
| The deploy shows the old favicon or old styles | The browser cached the old files. Reload the page without the cache, or open it in a private window. |
| The build log says that the output directory is missing | The root directory or the output directory is wrong. Set the root directory to `site` and the output directory to `out`. |
