import Beasties from 'beasties'
import { mkdir, writeFile, readFile, readdir } from 'fs/promises'
import { dirname, join, resolve } from 'path'

async function fetchHtml(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

async function getBuiltCssInfo(config) {
  const { projectRoot, manifestPath, appEntry } = config
  const absoluteManifestPath = resolve(projectRoot, manifestPath)

  try {
    const manifest = JSON.parse(await readFile(absoluteManifestPath, 'utf-8'))
    const entry = manifest[appEntry]
    if (entry && entry.css && entry.css.length > 0) {
      const cssFile = entry.css[0]
      return {
        absolutePath: join(projectRoot, 'web/dist', cssFile),
        href: `/dist/${cssFile}`,
      }
    }
  } catch (error) {
    console.warn('Could not read Vite manifest, looking for CSS files directly')
  }

  // Fallback: look for any CSS file in the dist/assets directory
  const assetsDir = resolve(projectRoot, 'web/dist/assets')
  try {
    const files = await readdir(assetsDir)
    const cssFiles = files.filter(f => f.endsWith('.css'))
    if (cssFiles.length > 0) {
      const cssFile = `assets/${cssFiles[0]}`
      return {
        absolutePath: join(projectRoot, 'web/dist', cssFile),
        href: `/dist/${cssFile}`,
      }
    }
  } catch {
    // assets directory doesn't exist
  }

  throw new Error('No CSS files found in web/dist/. Run your Vite build first.')
}

/**
 * Generate critical CSS for the configured pages.
 *
 * @param {object} config - Fully resolved configuration object.
 * @param {string} config.projectRoot - Absolute path to the project root.
 * @param {string} config.baseUrl - Base URL to fetch pages from (no trailing slash).
 * @param {string} config.outputDir - Absolute path to the output directory.
 * @param {string} config.manifestPath - Manifest path relative to projectRoot.
 * @param {string} config.appEntry - Key in the Vite manifest for the app entry.
 * @param {string} config.publicDir - Public directory relative to projectRoot.
 * @param {string} config.publicPath - URL prefix mapping to publicDir.
 * @param {Array<{uri: string, template: string}>} config.pages - Pages to process.
 * @param {object} config.beasties - Beasties constructor options.
 * @returns {Promise<{results: Array, successful: number, failed: number}>}
 */
export async function generateCriticalCss(config) {
  const { baseUrl, pages, outputDir, projectRoot, publicDir, publicPath } = config

  console.log(`\nGenerating critical CSS from: ${baseUrl}\n`)

  await mkdir(outputDir, { recursive: true })

  const cssInfo = await getBuiltCssInfo(config)
  console.log(`Using CSS from: ${cssInfo.absolutePath}`)
  console.log(`CSS href: ${cssInfo.href}\n`)

  const beasties = new Beasties({
    path: resolve(projectRoot, publicDir),
    publicPath,
    ...config.beasties,
  })

  const results = []

  for (const page of pages) {
    const url = `${baseUrl}${page.uri}`
    const outputFilename = `${page.template}_critical.min.css`
    const outputPath = join(outputDir, outputFilename)

    try {
      console.log(`Processing: ${url} -> ${outputFilename}`)

      let html = await fetchHtml(url)

      // Remove existing <style> tags to avoid including them in output
      html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, () => {
        return '<!-- existing-style-placeholder -->'
      })

      // Remove existing CSS link tags
      html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')

      // Add CSS link tag that Beasties can resolve from the filesystem
      html = html.replace('</head>', `<link rel="stylesheet" href="${cssInfo.href}">\n</head>`)

      const processedHtml = await beasties.process(html)

      // Extract the critical CSS that Beasties inlined
      let criticalCss = ''
      const criticalStyleMatch = processedHtml.match(/<style[^>]*data-href[^>]*>([\s\S]*?)<\/style>/i)

      if (criticalStyleMatch) {
        criticalCss = criticalStyleMatch[1]
      } else {
        const newStyleMatches = processedHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
        for (const match of newStyleMatches) {
          if (!match[0].includes('existing-style-placeholder')) {
            criticalCss += match[1]
          }
        }
      }

      if (!criticalCss || criticalCss.trim().length === 0) {
        console.warn(`  Warning: No critical CSS extracted for ${page.template}`)
        console.warn(`  Beasties may not have found matching selectors in the HTML`)
        results.push({ page, success: false, error: 'No critical CSS extracted' })
        continue
      }

      criticalCss = criticalCss.trim()

      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, criticalCss, 'utf-8')

      const sizeKb = (Buffer.byteLength(criticalCss, 'utf-8') / 1024).toFixed(2)
      console.log(`  Created: ${outputFilename} (${sizeKb} KB)`)

      results.push({ page, success: true, size: sizeKb })
    } catch (error) {
      console.error(`  Error processing ${page.template}: ${error.message}`)
      results.push({ page, success: false, error: error.message })
    }
  }

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log('\n--- Summary ---')
  console.log(`Generated: ${successful.length}/${results.length} critical CSS files`)

  if (failed.length > 0) {
    console.log('\nFailed:')
    failed.forEach(r => console.log(`  - ${r.page.template}: ${r.error}`))
  }

  return { results, successful: successful.length, failed: failed.length }
}
