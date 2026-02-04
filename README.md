# critical-css-craft

Generate critical CSS for Craft CMS projects that use the [Craft Vite plugin](https://nystudio107.com/docs/vite/) by [nystudio107](https://github.com/nystudio107). Uses [Beasties](https://github.com/danielroe/beasties) for pure Node.js CSS extraction -- no Puppeteer or headless Chrome required.

A drop-in replacement for [rollup-plugin-critical](https://github.com/nystudio107/rollup-plugin-critical). Your existing [`config/vite.php`](https://nystudio107.com/docs/vite/#the-config-php-file) stays the same -- the tool outputs critical CSS files in the exact format the Craft Vite plugin already expects (`criticalPath` and `criticalSuffix`). You only need to swap how the files are generated, not how they are consumed.

## Install

```bash
npm install --save-dev critical-css-craft
```

## Setup

### 1. Create a config file

Add `critical-css.config.mjs` to your project root:

```javascript
export default {
  pages: [
    { uri: '/', template: 'index' },
    { uri: '/about', template: 'about/index' },
    { uri: '/services', template: '_pages/services' },
  ],
}
```

Each entry maps a URL path (`uri`) to a Craft template name (`template`). The template name determines the output filename -- `about/index` produces `about/index_critical.min.css`.

Add one entry per unique template layout. Pages sharing the same template only need one entry.

### 2. Set the environment variable

The `CRITICAL_URL` environment variable tells the tool where to fetch rendered HTML from. Add it to your `.env`:

```
CRITICAL_URL=https://your-site.ddev.site
```

### 3. Run

```bash
npx critical-css-craft
```

Or pass the URL inline:

```bash
CRITICAL_URL=https://your-site.ddev.site npx critical-css-craft
```

### npm scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "generate-critical": "critical-css-craft",
    "build:critical": "npm run build && critical-css-craft"
  }
}
```

## Configuration Reference

All options except `pages` have defaults targeting a standard Craft CMS + Vite project structure.

| Option | Default | Description |
|---|---|---|
| `pages` | **(required)** | Array of `{ uri, template }` objects |
| `outputDir` | `'web/dist/criticalcss'` | Output directory, relative to project root |
| `manifestPath` | `'web/dist/.vite/manifest.json'` | Vite manifest path, relative to project root |
| `appEntry` | `'src/js/app.ts'` | Key in the Vite manifest for the CSS entry |
| `publicDir` | `'web'` | Directory Beasties resolves CSS from, relative to project root |
| `publicPath` | `'/'` | URL prefix that maps to `publicDir` |
| `beasties` | `{ reduceInlineStyles: true, preload: 'none', fonts: true, logLevel: 'info' }` | [Beasties constructor options](https://github.com/danielroe/beasties#options) |

### Full config example

```javascript
export default {
  pages: [
    { uri: '/', template: 'index' },
    { uri: '/about', template: 'about/index' },
  ],
  outputDir: 'web/dist/criticalcss',
  manifestPath: 'web/dist/.vite/manifest.json',
  appEntry: 'src/js/app.ts',
  publicDir: 'web',
  publicPath: '/',
  beasties: {
    reduceInlineStyles: true,
    preload: 'none',
    fonts: true,
    logLevel: 'info',
  },
}
```

## Programmatic Usage

```javascript
import { generateCriticalCss } from 'critical-css-craft'

const { results, successful, failed } = await generateCriticalCss({
  projectRoot: process.cwd(),
  baseUrl: 'https://your-site.ddev.site',
  outputDir: '/absolute/path/to/web/dist/criticalcss',
  manifestPath: 'web/dist/.vite/manifest.json',
  appEntry: 'src/js/app.ts',
  publicDir: 'web',
  publicPath: '/',
  pages: [
    { uri: '/', template: 'index' },
  ],
  beasties: {
    reduceInlineStyles: true,
    preload: 'none',
    fonts: true,
    logLevel: 'info',
  },
})
```

## Craft CMS Integration

### Vite Plugin Configuration

In `config/vite.php`, add the `criticalPath` and `criticalSuffix` settings:

```php
<?php

use craft\helpers\App;

return [
  'checkDevServer' => true,
  'devServerInternal' => 'http://localhost:3000',
  'devServerPublic' => Craft::getAlias('@web') . ':3000',
  'errorEntry' => 'src/js/app.ts',
  'manifestPath' => Craft::getAlias('@webroot') . '/dist/.vite/manifest.json',
  'serverPublic' => Craft::getAlias('@web') . '/dist/',
  'useDevServer' => (bool) App::env('VITE_USE_DEV_SERVER'),
  'criticalPath' => '@webroot/dist/criticalcss',
  'criticalSuffix' => '_critical.min.css',
];
```

### Twig Templates

In your base layout template (e.g., `templates/_base/_layout.twig`):

```twig
{{ craft.vite.includeCriticalCssTags() }}
```

This automatically matches the current template to its critical CSS file using the `criticalSuffix` naming convention.

## Why Beasties over Puppeteer?

`rollup-plugin-critical` depends on Puppeteer, which downloads and runs a ~300MB headless Chromium binary. This creates CI/CD complexity, large dependency footprints, and fragile browser-based extraction.

Beasties analyzes HTML and CSS purely in Node.js with no browser process.

## Troubleshooting

### "No CSS files found in web/dist/"

Run your Vite build before generating critical CSS. The tool reads the compiled output.

### "CRITICAL_URL environment variable is required"

Set it in your `.env` or pass it inline:

```bash
CRITICAL_URL=https://your-site.ddev.site npx critical-css-craft
```

### "No critical CSS extracted" warning

Beasties couldn't match any CSS selectors to elements in the fetched HTML. Check that:

- The URL is accessible and returns rendered HTML
- The CSS file is being found (check console output)
- The page has visible above-the-fold content

## License

MIT
