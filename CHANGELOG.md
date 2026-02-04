# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-02-04

### Added

- CLI tool (`npx critical-css-craft`) for generating critical CSS files
- Config file support (`critical-css.config.mjs`) for per-project page and path configuration
- Programmatic API via `import { generateCriticalCss } from '@johnfmorton/critical-css-craft'`
- Default configuration targeting Craft CMS + Vite project conventions
- Opportunistic dotenv loading (works if `dotenv` is installed in the consuming project)
- Actionable error messages for missing config, missing pages, and missing `CRITICAL_URL`
- Vite manifest reading with fallback to filesystem CSS file discovery
- MIT license

[Unreleased]: https://github.com/johnfmorton/critical-css-craft/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/johnfmorton/critical-css-craft/releases/tag/v0.1.0
