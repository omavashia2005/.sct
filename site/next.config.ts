import type { NextConfig } from "next"

// Cloudflare Pages serves the static export in out/. The site has no server routes.
const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    // The repository root has its own bun.lock for the desktop app. The site is a separate package.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
