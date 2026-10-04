import { resolve } from 'node:path';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';
import { createCssVariablesTheme } from '@shikijs/core';
import { resolveSiteUrl } from './scripts/site-url.mjs';
import { themeCatalogPlugin } from './scripts/theme-discovery.mjs';
import scrollRegions from './scripts/rehype-scroll-regions.mjs';
import fileCards from './scripts/rehype-file-cards.mjs';
import subsetFonts from './scripts/subset-fonts.mjs';

// The real site reads src/content and src/config/site.json; the test suites point these at tests/fixtures/site.
const profile = resolve(process.env.SITE_PROFILE || 'src/config/site.json');

const mathPlugins = {
  remarkPlugins: [remarkMath],
  rehypePlugins: [[rehypeKatex, { strict: 'warn', throwOnError: true }], scrollRegions, fileCards],
};

export default defineConfig({
  site: resolveSiteUrl(),
  outDir: process.env.SITE_OUT_DIR || './dist',
  trailingSlash: 'never',
  // /about is built as about.html, which GitHub Pages, Caddy and most static hosts serve at /about without a redirect
  // (a directory with index.html is redirected to /about/ instead). about.html and an about/ folder can coexist.
  build: { format: 'file' },
  devToolbar: { enabled: false },
  integrations: [mdx(), subsetFonts()],
  vite: { plugins: [themeCatalogPlugin()], resolve: { alias: { '@site/profile': profile } } },
  markdown: {
    processor: unified(mathPlugins),
    shikiConfig: {
      theme: createCssVariablesTheme(),
      wrap: true,
    },
  },
});
