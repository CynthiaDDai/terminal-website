# Development

This guide is for changing the code: how the pieces fit together, where things live, and how to test them. To use the site, the other guides are enough.

The design principles are short: the site is **terminal-inspired, not a terminal emulator**; **content comes first**, and every page works with plain links and without JavaScript; and **conventions beat compatibility**. Odd input, such as a file name with spaces, is rejected at build time with a clear message instead of being handled with extra code at runtime.

## Stack

- [Astro](https://astro.build) 7, static output only. No server rendering, no client framework.
- TypeScript in `src/`, plain ES modules in `scripts/`.
- KaTeX for math and Shiki for code highlighting, both at build time.
- Vitest for unit tests, Playwright for browser tests, `node:test` for build and server tests.

## Project layout

```text
src/
├── config/           site.json, themes.json
├── config.ts         typed access to site.json
├── content/          the website's pages
├── content.config.ts the content collection and frontmatter schema
├── themes/           one folder per theme
├── pages/            Astro routes: index, [...path], 404, rss.xml, sitemap.xml
├── layouts/          BaseLayout (head, data, theme bootstrap), PageLayout, ArticleLayout
├── components/       nav/ (top bar, edge index, mobile index), shell/ (prompt, command bar, search, panels), content/ (listings)
├── lib/
│   ├── content/      tree.ts: the content tree
│   ├── navigation/   filesystem.ts (paths), site-index.ts (loads the tree, checks names and site.json)
│   ├── terminal/     parser, command registry, completion, history, fastfetch
│   ├── theme/        Oh My Posh parser, adapter, template subset, prompt renderer, catalog, mobile
│   ├── search/       text extraction and ranking
│   └── site-config.ts site.json validation
├── scripts/site.ts   the only client script: commands, search, themes, panels
└── styles/           tokens, chrome, terminal, prose, mobile
scripts/              build-time helpers: theme discovery, rehype plugins, URL and link checks
tests/                unit/, browser/, dev/, build/, server/, fixtures/site/
nix/module.nix        NixOS service
default.nix           Nix package
shell.nix             development shell
```

## How a build works

1. **Content.** Astro's glob loader reads every `.md`/`.mdx` under `src/content/` (skipping `_` and `.` names) into one collection. `site-index.ts` first checks `site.json` and every file name, then `buildContentTree()` in `lib/content/tree.ts` turns the collection into a tree: documents, directories (explicit `index.md` or generated), drafts removed, children sorted, groups checked. Every conflict, such as a reserved path or a page and folder at one path, throws with the file name.
2. **Routes.** `pages/[...path].astro` creates one static page per tree node. Directories use `PageLayout` with a `ContentList`; documents use `ArticleLayout`.
3. **Shared data.** The tree's flat projection, `entries` (path, title, description, kind, tags, dates, search text), drives navigation, `ls`/`cd`/`open`, completion, search, `fastfetch`, the sitemap and RSS. `BaseLayout` embeds it in each page as `<script id="site-data" type="application/json">`, together with the profile and fastfetch style.
4. **Themes.** `scripts/theme-discovery.mjs` is a Vite plugin. It reads `src/themes/*/` and `themes.json` on the build machine and exposes them as the virtual module `virtual:site-themes`. `lib/theme/catalog.ts` parses each Oh My Posh file (`omp-parser.ts`), adapts it to website colors (`omp-adapter.ts`) and attaches mobile prompts (`mobile.ts`). The browser never reads the file system.
5. **Markdown.** `remark-math` and `rehype-katex`, then two local rehype plugins: `rehype-scroll-regions.mjs` makes wide code, tables and equations keyboard-scrollable, and `rehype-file-cards.mjs` turns standalone links to files in `public/` into cards.
6. **Fonts.** After the build, `scripts/subset-fonts.mjs` cuts every `*.subset.woff2` in `dist/` down to the characters found in the built HTML, XML and scripts.
7. **Checks.** `astro check` type-checks; after the build, `scripts/check-links.mjs` checks every internal `href` and `src` in `dist/`.

In development, the tree is rebuilt on every request, so content changes appear on refresh. The theme plugin watches `src/themes/` and `themes.json` and reloads the page when they change.

## In the browser

`src/scripts/site.ts` reads `site-data`, then wires up the command line, completion, search, theme switching, mobile panels and the edge index. Commands are pure functions over `entries` (`lib/terminal/registry.ts`) that return a result object; `site.ts` renders it with `textContent` or the escaped prompt renderer.

Browser storage is optional: the chosen theme (`localStorage`), home command history and previous path (`sessionStorage`). An inline script in `BaseLayout` applies the saved theme before the first paint.

### Add a command

Add an entry to `commands` in `src/lib/terminal/registry.ts`:

```ts
{ name: 'date', usage: 'date', description: 'Show today’s date.', execute: () => text(new Date().toDateString()) },
```

`help`, completion and the mobile command sheet (when `touchShortcut: true`) pick it up automatically. Return one of the existing `CommandResult` kinds so `site.ts` can render it, and add a unit test in `tests/unit/core.test.ts`.

## Tests

### The fixture site

Tests never build your own content. `tests/fixtures/site/` is a separate sample site with its own `content/` and `site.json`, including `placeholder-*` pages that exercise every feature: grouped listings, file cards, drafts, ignored names, nested sections, MDX, images.

The suites switch to it with three environment variables, which you can also use yourself:

| Variable | Default | Fixture |
| --- | --- | --- |
| `SITE_CONTENT_DIR` | `src/content` | `tests/fixtures/site/content` |
| `SITE_PROFILE` | `src/config/site.json` | `tests/fixtures/site/site.json` |
| `SITE_OUT_DIR` | `dist` | `.fixture-dist` |
| `SITE_THEMES_DIR` | `src/themes` | `tests/fixtures/site/themes` |
| `SITE_THEMES_CONFIG` | `src/config/themes.json` | `tests/fixtures/site/themes.json` |

The fixture's themes include Oh My Posh's `1_shell` and `if_tea`, which exercise palette-less colors, icons and diamond caps. Your real content and themes are checked by `npm run build` itself, so editing them cannot break the test suites.

### Suites

| Command | What it covers | Needs |
| --- | --- | --- |
| `npm test` | Unit tests: paths, parser, completion, search, content tree, `site.json` validation, fastfetch, theme parsing, templates, colors, escaping | Node |
| `npm run test:build` | Builds a temporary copy of the fixture site and checks routes, generated indexes, drafts, ignored names, naming errors, RSS, sitemap and canonical URLs | Node |
| `npm run test:browser` | Builds the fixture site, serves it on port 4322, and tests the home terminal, content pages, keyboard, search, mobile, themes, no-JavaScript reading and accessibility (axe) | Chromium |
| `npm run test:dev` | Runs a real development server on ports 4335/4336 and tests live theme and content changes | Chromium |
| `npm run test:caddy` | Runs the NixOS module's Caddy configuration against `dist/` | Nix, Caddy; run `npm run build` first |

Run `test:browser` and `test:dev` one after the other, not in parallel; they share Playwright's output folder.

On most systems, install Playwright's browser once with `npx playwright install chromium`. To use another Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

### NixOS

`shell.nix` provides Node.js 22, Chromium and Caddy, and points Playwright at that Chromium, since Playwright's own download doesn't run on NixOS:

```sh
nix-shell                                   # then npm ci, npm run dev, …
nix-shell shell.nix --run 'npm test'        # or one command at a time
nix-shell shell.nix --run 'npm run test:browser'
```

## Continuous integration

`.github/workflows/ci.yml` runs `npm test`, `npm run build`, `test:build`, `test:browser` and `test:dev` on every push and pull request, with Playwright's Chromium. `deploy.yml` publishes to GitHub Pages; see [Deploying](deploying.md).

## Known limits

- The site must be served from a domain root. Supporting a sub-path would need one place that prefixes every internal URL.
- The full-text search index is embedded in every page and grows with the amount of content. Moving it to a separately loaded file is the fix once that matters.
- The bundled Nerd Font (1.2 MB) is complete, so any icon in a new theme works. Renaming it to `*.subset.woff2` would cut it to the icons the installed themes use, since theme data is part of the built scripts.
- Search text for MDX pages is taken from the source, so JSX expressions are indexed as words.
- Astro prints an `use astro:head-inject` bundling warning for MDX. Static output is unaffected.
