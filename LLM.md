# LLM Guide: Convert a Node.js Script into an npm Package

Use this guide to convert a standalone Node.js utility script into an installable npm package with a config file. Originally designed for Craft CMS + Vite projects, but the pattern is framework-agnostic.

## Goal

Take a single-file Node.js script with hardcoded values and turn it into:

- An npm-installable package with a CLI command
- A config file (`<package-name>.config.mjs`) that consumers create in their project root
- Sensible defaults so the config file only needs required values
- A programmatic API for non-CLI usage

## The Pattern

### 1. Identify What Varies Per Project

Read through the script and find every hardcoded value that would differ between projects. These become config options. Split them into two categories:

- **Required** (no sensible default): things like page lists, project-specific routes
- **Optional** (has a default): paths, directories, tool options that follow framework conventions

### 2. Create the File Structure

```
<package-name>/
├── bin/
│   └── <package-name>.mjs    # CLI entry point
├── src/
│   ├── defaults.mjs           # Default config values
│   └── generate.mjs           # Core logic (rename to match your domain)
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

### 3. Create `src/defaults.mjs`

Export a single `defaults` object with all optional config values:

```javascript
export const defaults = {
  outputDir: 'web/dist/criticalcss',
  // ... other options with sensible defaults
}
```

No entry for required values -- those must come from the user's config file.

### 4. Create `src/generate.mjs` (Core Logic)

Refactor the script's main logic into an exported async function:

- Accept a single `config` object parameter (fully resolved, absolute paths)
- All file paths come from `config`, not from module-level constants
- Return a results object instead of calling `process.exit()`
- Throw errors instead of `process.exit()` so it works programmatically
- Replace heavy optional dependencies with built-in alternatives:
  - `glob` → `readdir` from `fs/promises`
  - `dotenv` → moved to CLI entry point as optional

### 5. Create `bin/<package-name>.mjs` (CLI Entry Point)

This file handles everything between "user runs the command" and "core logic executes":

```javascript
#!/usr/bin/env node

import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { defaults } from '../src/defaults.mjs'
import { generate } from '../src/generate.mjs'

// 1. Opportunistic dotenv loading
try { await import('dotenv/config') } catch {}

// 2. Load config file via dynamic import
const configPath = resolve(process.cwd(), '<package-name>.config.mjs')
const mod = await import(pathToFileURL(configPath).href)
const userConfig = mod.default

// 3. Validate required fields
//    - Config exists and is an object
//    - Required arrays/fields are present and well-formed
//    - Every error message tells the user exactly how to fix it

// 4. Read and validate environment variables

// 5. Merge user config with defaults
//    - Shallow merge for top-level keys
//    - One level deep spread for nested objects (e.g., tool options)
const config = {
  projectRoot: process.cwd(),
  someOption: userConfig.someOption ?? defaults.someOption,
  toolOptions: { ...defaults.toolOptions, ...userConfig.toolOptions },
}

// 6. Resolve relative paths to absolute
config.outputDir = resolve(process.cwd(), config.outputDir)

// 7. Call core logic and exit
const result = await generate(config)
process.exit(result.failed > 0 ? 1 : 0)
```

### 6. Create `package.json`

Key fields:

```json
{
  "name": "<package-name>",
  "version": "0.1.0",
  "type": "module",
  "bin": { "<package-name>": "./bin/<package-name>.mjs" },
  "exports": { ".": "./src/generate.mjs" },
  "files": ["bin/", "src/"],
  "engines": { "node": ">=20.0.0" }
}
```

- `type: module` -- use ESM throughout
- `bin` -- maps the CLI command name to the entry point
- `exports` -- exposes the core logic for programmatic use
- `files` -- only publish `bin/` and `src/` (excludes README, tests, config examples)
- Move optional/environment deps (like `dotenv`) out of `dependencies`
- Replace heavy deps with built-in Node.js APIs where practical

### 7. Error Messages

Every validation error in the CLI should include:

- What went wrong
- An example of the correct format
- Where to make the fix

```
Error: "pages" must be a non-empty array in <package-name>.config.mjs.

  export default {
    pages: [
      { uri: '/', template: 'index' },
    ],
  }
```

## Craft CMS Conventions

If the script targets Craft CMS + Vite projects, these defaults make sense:

| Option | Default | Why |
|---|---|---|
| `outputDir` | `web/dist/criticalcss` | Matches Craft Vite plugin's `criticalPath` |
| `manifestPath` | `web/dist/.vite/manifest.json` | Standard Vite manifest location in Craft |
| `appEntry` | `src/js/app.ts` | Common Vite entry point key |
| `publicDir` | `web` | Craft's web root |
| `publicPath` | `/` | Default public URL prefix |

Environment variable conventions:
- `CRITICAL_URL` -- base URL for fetching rendered HTML
- `DDEV_PRIMARY_URL` -- available in DDEV environments, can be used as a fallback

## Generalizing Beyond Craft CMS

The overall pattern works for any Node.js CLI tool:

- Replace Craft-specific defaults with framework-appropriate ones (e.g., `public/` for Next.js, `dist/` for plain Vite)
- The config file loading pattern (`<name>.config.mjs` + dynamic `import()`) works universally
- The `bin/` + `src/` structure, validation approach, and merge strategy are framework-agnostic
- Environment variables stay as env vars rather than going in the config file -- this keeps secrets out of committed files
- Opportunistic dotenv loading (`try { await import('dotenv/config') } catch {}`) lets consumers use `.env` files without making dotenv a hard dependency
