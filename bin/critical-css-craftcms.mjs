#!/usr/bin/env node

import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { defaults } from '../src/defaults.mjs'
import { generateCriticalCss } from '../src/generate.mjs'

// Opportunistically load dotenv if available in the consuming project
try { await import('dotenv/config') } catch {}

const cwd = process.cwd()

// --- Load config file ---

const configPath = resolve(cwd, 'critical-css.config.mjs')
let userConfig

try {
  const mod = await import(pathToFileURL(configPath).href)
  userConfig = mod.default
} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.error(`Error: Config file not found at ${configPath}`)
    console.error('')
    console.error('Create a critical-css.config.mjs in your project root:')
    console.error('')
    console.error('  export default {')
    console.error("    pages: [")
    console.error("      { uri: '/', template: 'index' },")
    console.error("    ],")
    console.error('  }')
    process.exit(1)
  }
  console.error(`Error: Failed to load ${configPath}`)
  console.error(error.message)
  process.exit(1)
}

if (!userConfig || typeof userConfig !== 'object') {
  console.error('Error: critical-css.config.mjs must have a default export that is an object.')
  console.error('')
  console.error('  export default {')
  console.error("    pages: [{ uri: '/', template: 'index' }],")
  console.error('  }')
  process.exit(1)
}

// --- Validate pages ---

const { pages } = userConfig

if (!Array.isArray(pages) || pages.length === 0) {
  console.error('Error: "pages" must be a non-empty array in critical-css.config.mjs.')
  console.error('')
  console.error('  export default {')
  console.error("    pages: [")
  console.error("      { uri: '/', template: 'index' },")
  console.error("      { uri: '/about', template: 'about/index' },")
  console.error("    ],")
  console.error('  }')
  process.exit(1)
}

for (const [i, page] of pages.entries()) {
  if (!page.uri || typeof page.uri !== 'string') {
    console.error(`Error: pages[${i}] is missing a "uri" string.`)
    console.error(`  Got: ${JSON.stringify(page)}`)
    process.exit(1)
  }
  if (!page.template || typeof page.template !== 'string') {
    console.error(`Error: pages[${i}] is missing a "template" string.`)
    console.error(`  Got: ${JSON.stringify(page)}`)
    process.exit(1)
  }
}

// --- Validate CRITICAL_URL ---

const baseUrl = process.env.CRITICAL_URL

if (!baseUrl) {
  console.error('Error: CRITICAL_URL environment variable is required.')
  console.error('')
  console.error('Set it in your .env file:')
  console.error('  CRITICAL_URL=https://your-site.ddev.site')
  console.error('')
  console.error('Or pass it inline:')
  console.error('  CRITICAL_URL=https://your-site.ddev.site npx critical-css-craftcms')
  process.exit(1)
}

const normalizedUrl = baseUrl.replace(/\/+$/, '')

// --- Merge config with defaults ---

const config = {
  projectRoot: cwd,
  baseUrl: normalizedUrl,
  outputDir: resolve(cwd, userConfig.outputDir ?? defaults.outputDir),
  manifestPath: userConfig.manifestPath ?? defaults.manifestPath,
  appEntry: userConfig.appEntry ?? defaults.appEntry,
  publicDir: userConfig.publicDir ?? defaults.publicDir,
  publicPath: userConfig.publicPath ?? defaults.publicPath,
  pages,
  beasties: {
    ...defaults.beasties,
    ...userConfig.beasties,
  },
}

// --- Run ---

try {
  const { failed } = await generateCriticalCss(config)
  process.exit(failed > 0 ? 1 : 0)
} catch (error) {
  console.error('Fatal error:', error.message)
  process.exit(1)
}
