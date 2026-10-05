import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
// Browser suites build tests/fixtures/site into their own output, never the real content or dist/.
export const fixture = {
  SITE_CONTENT_DIR: 'tests/fixtures/site/content', SITE_PROFILE: 'tests/fixtures/site/site.json', SITE_OUT_DIR: '.fixture-dist',
  SITE_THEMES_DIR: 'tests/fixtures/site/themes', SITE_THEMES_CONFIG: 'tests/fixtures/site/themes.json',
};
const chromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/run/current-system/sw/bin/chromium') ? '/run/current-system/sw/bin/chromium' : undefined);
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4322',
    headless: true,
    launchOptions: chromium ? { executablePath: chromium } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4322 --ignore-lock',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
    timeout: 60000,
    env: fixture,
  },
});
