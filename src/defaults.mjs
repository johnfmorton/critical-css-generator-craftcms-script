/**
 * Default configuration values for critical-css-craftcms.
 *
 * These defaults target a standard Craft CMS + Vite project structure.
 * Override any value in your critical-css.config.mjs file.
 */
export const defaults = {
  /** Output directory for critical CSS files, relative to project root */
  outputDir: 'web/dist/criticalcss',

  /** Path to the Vite manifest file, relative to project root */
  manifestPath: 'web/dist/.vite/manifest.json',

  /** Key in the Vite manifest that contains the CSS entry */
  appEntry: 'src/js/app.ts',

  /** Directory Beasties resolves CSS files from, relative to project root */
  publicDir: 'web',

  /** URL prefix that maps to publicDir */
  publicPath: '/',

  /** Beasties constructor options */
  beasties: {
    reduceInlineStyles: true,
    preload: 'none',
    fonts: true,
    logLevel: 'info',
  },
}
