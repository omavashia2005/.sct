import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // bun run relay:generate rewrites src/main/relay. site/ is the Next.js landing page with its own lint config.
  { ignores: ['node_modules/**', 'out/**', '**/dist/**', 'test-results/**', 'playwright-report/**', 'src/main/relay/**', 'site/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  { languageOptions: { globals: globals.node } },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser }
  }
]
