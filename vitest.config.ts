import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { themeCatalogPlugin } from './scripts/theme-discovery.mjs';
export default defineConfig({ plugins: [themeCatalogPlugin({ themes: 'tests/fixtures/site/themes', settings: 'tests/fixtures/site/themes.json' })], resolve: { alias: { '@site/profile': resolve('tests/fixtures/site/site.json') } }, test: { include: ['tests/unit/**/*.test.ts'] } });
