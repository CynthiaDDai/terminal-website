import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Exercises the placeholder content and site.json values (files named placeholder-*).
// When real content replaces them, update or delete this file together with them.

async function command(page: Page, value: string) {
  await expect(page.locator('html')).toHaveAttribute('data-site-ready', 'true');
  await page.keyboard.press(':');
  const input = page.getByRole('textbox', { name: 'Site command' });
  await input.fill(value); await input.press('Enter');
}

test('feed and sitemap follow site.json feed directories, drafts and examples', async ({ request }) => {
  const rss = await (await request.get('/rss.xml')).text();
  expect(rss).toMatch(/\/blog\/placeholder-hello<\/link>/);
  expect(rss).toMatch(/\/research\/placeholder-study<\/link>/);
  expect(rss).not.toMatch(/the-shape-of-attention|placeholder-draft|projects\/|notes\//);
  expect(rss).not.toMatch(/placeholder-hello\/<\/link>/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toMatch(/\/notes\/placeholder-topic\/placeholder-detail<\/loc>/);
  expect(sitemap).toMatch(/\/blog\/placeholder-hello<\/loc><lastmod>2026-09-28<\/lastmod>/);
  for (const path of ['/blog/placeholder-draft', '/_drafts/placeholder-scratch', '/_drafts', '/blog/_assets']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test('profile values fill the wordmark, footers, contact page and fastfetch', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-wordmark')).toHaveText('mira’s space');
  await expect(page.locator('.home-caption')).toHaveText('a personal space');
  await expect(page.locator('.home-footer > span').first()).toHaveText('writing · building · thinking三思而行');
  await command(page, 'fastfetch');
  const network = page.locator('.fastfetch-block').nth(3);
  await expect(network.locator('a[href="mailto:hello@placeholder.test"]')).toBeVisible();
  await expect(network.locator('a[href="https://github.com/placeholder-mira"]')).toBeVisible();
  await expect(network.locator('a[href="https://social.placeholder.test/@mira"]')).toBeVisible();
  await command(page, 'ssh');
  await expect(page.locator('.command-rows dt').filter({ hasText: /^placeholder-friend$/ })).toHaveCount(1);
  await page.goto('/contact');
  await expect(page.locator('.prose a[href="mailto:hello@placeholder.test"]')).toBeVisible();
  await expect(page.locator('.prose')).toContainText('Find me on GitHub');
  await expect(page.locator('.prose')).toContainText('Mastodon');
  await expect(page.locator('.prose')).not.toContainText('haven’t been added yet');
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A path less travelled.');
  await expect(page.locator('.page-footer-line')).toHaveText(/^(Take your time\.|Read slowly\.)$/);
});

test('the theme switch and wordmark sit in the same place on every page', async ({ page }) => {
  for (const width of [1440, 820]) {
    await page.setViewportSize({ width, height: 900 });
    const places = new Set<string>();
    for (const path of ['/', '/blog', '/blog/placeholder-hello', '/no-such-page']) {
      await page.goto(path);
      const theme = await page.getByRole('button', { name: 'Switch color theme' }).boundingBox();
      const wordmark = await page.locator('.home-wordmark, .site-wordmark').boundingBox();
      places.add([theme!.x, theme!.y, wordmark!.x, wordmark!.y].map(Math.round).join(','));
    }
    expect([...places]).toHaveLength(1);
  }
});

test('the theme switch shows each theme’s label from site.json, or its name', async ({ page }) => {
  await page.goto('/blog');
  const toggle = page.getByRole('button', { name: 'Switch color theme' });
  const label = toggle.locator('[data-theme-label]:visible');
  await expect(toggle).toHaveAttribute('title', 'Night and day');
  await expect(label).toHaveText('dusk夜');
  await toggle.click();
  await expect(label).toHaveText('dawn');
  await page.reload();
  await expect(label).toHaveText('dawn');
  await toggle.click();
  await expect(label).toHaveText('Paper');
});

test('decorative mottos stay out of the accessible text, and every content page shares one footer', async ({ page }) => {
  await page.goto('/blog');
  const motto = page.locator('h1 .paired-motto');
  await expect(motto).toHaveText('且听风吟');
  await expect(motto).toHaveAttribute('aria-hidden', 'true');
  await expect(motto).toHaveAttribute('lang', 'zh');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Blog');
  await expect(page.locator('.edge-paired .paired-motto')).toHaveText('开卷如晤');
  await expect(page.locator('.edge-handle')).toHaveAccessibleName('Explore the site');
  await expect(page.locator('#search-title')).toHaveText('Search this space寻寻觅觅');
  for (const path of ['/blog', '/blog/placeholder-hello', '/no-such-page']) {
    await page.goto(path);
    const footer = page.locator('.page-footer');
    await expect(footer.getByRole('link', { name: '~ / mira’s space' })).toHaveAttribute('href', '/');
    await expect(footer.getByRole('link', { name: 'RSS ↗' })).toHaveAttribute('href', '/rss.xml');
    await expect(footer.locator('.page-footer-line')).toHaveText(/^(Take your time\.|Read slowly\.)$/);
  }
  await page.goto('/blog/placeholder-hello');
  await expect(page.locator('.toc-label .paired-motto')).toHaveText('按图索骥');
});

test('every document uses the article layout and returns to its parent by title', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('main.article-main')).toBeVisible();
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page.getByRole('link', { name: '← Back to Home' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/notes/placeholder-topic/placeholder-detail');
  await expect(page.locator('.article-meta time')).toHaveText('September 5, 2026');
  await page.getByRole('link', { name: '← Back to Placeholder topic' }).click();
  await expect(page).toHaveURL('/notes/placeholder-topic');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await page.goto('/projects/placeholder-tool');
  await expect(page.locator('.status')).toHaveText('prototype');
  await expect(page.getByRole('link', { name: 'Source code ↗' })).toHaveAttribute('href', 'https://github.com/placeholder-mira/placeholder-tool');
  await expect(page.getByRole('link', { name: 'Visit project ↗' })).toBeVisible();
});

test('code uses the bundled monospace font, and no page downloads a large font file', async ({ page }) => {
  const requested = new Set<string>();
  page.on('request', request => { if (request.url().includes('/fonts/')) requested.add(new URL(request.url()).pathname); });
  for (const path of ['/', '/blog/placeholder-hello']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
  }
  const downloaded = await Promise.all([...requested].map(async path => ({ path, size: (await (await page.request.get(path)).body()).length })));
  expect(downloaded.map(font => font.path)).toContain('/fonts/maple-mono-regular.woff2');
  // A complete CJK font is megabytes; fonts named *.subset.woff2 are cut down at build time.
  expect(downloaded.filter(font => font.size > 1.5 * 1024 * 1024)).toEqual([]);
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable'); await session.send('CSS.enable');
  const { root } = await session.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.prose pre code .line span' });
  const { fonts: rendered } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(rendered.some(font => font.isCustomFont && font.familyName === 'Maple Mono' && font.glyphCount > 0)).toBe(true);
  await session.detach();
});

test('on wide screens the table of contents sits beside the article and marks the section being read', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/blog/the-shape-of-attention');
  await expect(page.locator('html')).toHaveAttribute('data-site-ready', 'true');
  const toc = page.getByRole('navigation', { name: 'Table of contents' });
  const links = toc.getByRole('link');
  const [tocBox, proseBox] = [await toc.boundingBox(), await page.locator('.prose').boundingBox()];
  expect(tocBox!.x + tocBox!.width).toBeLessThan(proseBox!.x);
  await page.locator('#a-weighted-conversation').evaluate(heading => heading.scrollIntoView());
  await expect(links.filter({ hasText: 'A weighted conversation' })).toHaveAttribute('aria-current', 'location');
  await expect(toc.locator('[aria-current]')).toHaveCount(1);
  await expect(toc).toBeInViewport();
  await page.setViewportSize({ width: 1000, height: 900 });
  const narrow = await toc.boundingBox();
  expect(narrow!.y).toBeLessThan((await page.locator('.prose').boundingBox())!.y);
});

test('a placeholder post renders its asset, math, contents, footnote and absolute links', async ({ page }) => {
  await page.goto('/blog/placeholder-hello');
  const image = page.getByRole('img', { name: 'Placeholder diagram' });
  await expect(image).toBeVisible();
  expect(await image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.katex').first()).toBeVisible();
  const toc = page.getByRole('navigation', { name: 'Table of contents' });
  await expect(toc.getByRole('link')).toHaveText(['├First section', '└Second section']);
  await expect(toc).not.toContainText('Footnotes');
  await expect(page.locator('.footnotes')).toContainText('A placeholder footnote.');
  await expect(page.locator('.updated time')).toHaveText('September 28, 2026');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'placeholder topic' }).click();
  await expect(page).toHaveURL('/notes/placeholder-topic');
  await expect(page.locator('.prose')).toContainText('introduced by its own');
  await expect(page.locator('.content-list a[href="/notes/placeholder-topic/placeholder-detail"]')).toBeVisible();
  await page.goto('/notes');
  await command(page, 'ls');
  const row = page.locator('[data-transcript] a[href="/notes/placeholder-topic"]');
  await expect(row).toContainText('placeholder-topic/');
  await expect(row).toContainText('Dummy nested section with its own index.');
});

test('a grouped directory lists works under status headings with their own links', async ({ page }) => {
  await page.goto('/papers');
  await expect(page.locator('.content-group')).toHaveText(['Publications· 1', 'Preprints· 1']);
  const work = page.locator('.prompt-card').filter({ hasText: 'Placeholder: a published work' });
  // Each work is the theme's transient prompt for …/name, with its group's git state (storm: ✓ clean, ~ working changes).
  await expect(work.locator('.card-prompt')).toContainText('…/placeholder-published');
  await expect(work.locator('.card-title-text')).toHaveText('placeholder-published');
  await expect(work.locator('.card-prompt')).toContainText('✓');
  await expect(page.locator('.prompt-card').filter({ hasText: 'Placeholder: a preprint' }).locator('.card-prompt')).toContainText('~');
  await expect(work.locator('.card-name')).toHaveText('Placeholder: a published work');
  await expect(work.locator('.card-output')).toContainText('2025-06-01 · Mira Placeholder, A. Coauthor · Journal of Placeholders');
  await expect(work.getByRole('link', { name: 'arXiv ↗' })).toHaveAttribute('href', 'https://arxiv.org/abs/0000.00000');
  await expect(work.getByRole('link', { name: 'Placeholder: a published work' })).toHaveAttribute('href', '/papers/placeholder-published');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  // The extra link stays clickable above the stretched title link; the rest of the row opens the work.
  await work.getByRole('link', { name: 'Notes' }).click();
  await expect(page).toHaveURL('/notes/placeholder-topic');
  await page.goBack();
  await work.click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL('/papers/placeholder-published');
  await expect(page.locator('.article-byline')).toHaveText('Mira Placeholder, A. Coauthor');
  await expect(page.locator('.article-meta')).toContainText('Journal of Placeholders');
  await expect(page.locator('.project-links').getByRole('link', { name: 'arXiv ↗' })).toBeVisible();
  // An ordinary listing uses the same prompts; a directory's path ends in /, and a title its path already says is not repeated.
  await page.goto('/notes');
  const topic = page.locator('.prompt-card').filter({ has: page.locator('a[href="/notes/placeholder-topic"]') });
  await expect(topic.locator('.card-prompt')).toContainText('…/placeholder-topic/');
  await expect(topic.locator('.card-prompt')).not.toContainText('✓');
  await expect(topic.locator('.card-name')).toHaveCount(0);
});

test('a standalone link to a public file becomes a card, with the following lines as its description', async ({ page }) => {
  await page.goto('/notes/placeholder-files');
  const cards = page.locator('.file-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first().getByRole('link', { name: 'Placeholder diagram' })).toHaveAttribute('href', '/navigation-model.svg');
  await expect(cards.first().locator('.card-description')).toContainText('standing in for one sentence');
  await expect(cards.first().locator('.card-description .katex')).toBeVisible();
  // The card is named after its title; ⇣ marks something to pull, and a "wip" title working changes.
  await expect(cards.first().locator('.card-prompt')).toContainText('…/placeholder-diagram');
  await expect(cards.first().locator('.card-prompt')).toContainText('✓ ⇣');
  await expect(cards.nth(1).locator('.card-prompt')).toContainText('~ ⇣');
  await expect(cards.first().locator('.card-output')).toContainText('SVG · 1 KB');
  await expect(cards.nth(1).locator('.card-description')).toHaveCount(0);
  await expect(cards.nth(1).getByRole('link', { name: 'Download favicon.svg' })).toHaveAttribute('download', '');
  await expect(cards.nth(1).getByRole('link', { name: 'Download favicon.svg' })).toHaveText('pull');
  await expect(page.locator('.prose > p > a[href="/favicon.svg"]')).toHaveText('this icon');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
