import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, symlinkSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { findBrokenLinks } from '../../scripts/check-links.mjs';

test('production builds derive routes, navigation and search from content without modifying sources', { timeout: 60000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'terminal-build-'));
  try {
    for (const name of ['src', 'scripts', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json', 'config.jsonc']) cpSync(name, join(root, name), { recursive: true });
    // Build the fixture site, not the real content.
    rmSync(join(root, 'src/content'), { recursive: true, force: true });
    cpSync('tests/fixtures/site/content', join(root, 'src/content'), { recursive: true });
    cpSync('tests/fixtures/site/site.json', join(root, 'src/config/site.json'));
    symlinkSync(join(process.cwd(), 'node_modules'), join(root, 'node_modules'), 'dir');
    writeFileSync(join(root, '.env'), 'PUBLIC_SITE_URL=https://build-audit.test\n');
    const content = join(root, 'src/content');
    const sourceSnapshot = (directory = content) => readdirSync(directory, { withFileTypes: true }).sort((first, second) => first.name.localeCompare(second.name)).flatMap(entry => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? [[path, 'directory'], ...sourceSnapshot(path)] : [[path, readFileSync(path).toString('base64')]];
    });
    const readPage = path => readFileSync(join(root, 'dist', `${path || 'index'}.html`), 'utf8');
    const htmlFiles = (directory = join(root, 'dist')) => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? htmlFiles(join(directory, entry.name)) : entry.name.endsWith('.html') ? [join(directory, entry.name)] : []);
    const pageData = html => JSON.parse(html.match(/<script id="site-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
    writeFileSync(join(content, 'foo.md'), 'Hello from a root document. Uniqueroottoken.\n');
    mkdirSync(join(content, 'research/machine-learning'), { recursive: true });
    mkdirSync(join(content, 'empty-section'), { recursive: true });
    mkdirSync(join(content, 'hobby'), { recursive: true });
    mkdirSync(join(content, 'mycat'), { recursive: true });
    mkdirSync(join(content, 'research/images'), { recursive: true });
    writeFileSync(join(content, 'research/images/figure.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    mkdirSync(join(content, 'foo'), { recursive: true });
    writeFileSync(join(content, 'foo/picture.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    mkdirSync(join(content, '_drafts'), { recursive: true });
    writeFileSync(join(content, '_drafts/wip.md'), 'Ignoredunderscoretoken.\n');
    writeFileSync(join(content, 'research/_scratch.md'), 'Ignoredunderscoretoken.\n');
    mkdirSync(join(content, '.obsidian'), { recursive: true });
    writeFileSync(join(content, '.obsidian/workspace.json'), '{}');
    writeFileSync(join(content, 'research/first.md'), 'Researchuniquetoken.\n\n![Research diagram](./diagram.svg)\n');
    writeFileSync(join(content, 'research/diagram.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>');
    writeFileSync(join(content, 'research/machine-learning/attention.md'), 'Nested research prose.\n');
    writeFileSync(join(content, 'hobby/index.md'), '---\ntitle: Pastimes\nshow_children: false\n---\nHobbylandingtoken.\n');
    writeFileSync(join(content, 'hobby/post.md'), 'An automatically routed hobby.\n');
    writeFileSync(join(content, 'mycat/portrait.md'), 'A cat portrait.\n');
    writeFileSync(join(content, 'secret.md'), '---\ndraft: true\n---\nSecrettoken.\n');
    mkdirSync(join(content, 'draft-section'), { recursive: true });
    writeFileSync(join(content, 'draft-section/index.md'), '---\ndraft: true\n---\nDraft section.\n');
    writeFileSync(join(content, 'draft-section/public.md'), 'Suppressed by draft directory.\n');
    for (const section of ['blog', 'projects', 'notes']) {
      const parent = join(root, 'src/content', section, 'topic/deep');
      mkdirSync(parent, { recursive: true });
      writeFileSync(join(parent, 'nested.md'), '---\ntitle: Nested fixture\ndescription: Published nested content\ndate: 2026-10-03\n---\nNested prose.\n');
      const draft = join(root, 'src/content', section, 'unpublished');
      mkdirSync(draft, { recursive: true });
      writeFileSync(join(draft, 'draft.md'), '---\ntitle: Draft fixture\ndescription: Private\ndate: 2026-10-03\ndraft: true\n---\nDraft prose.\n');
    }
    const env = { ...process.env };
    delete env.PUBLIC_SITE_URL;
    delete env.NODE_ENV;
    for (const name of Object.keys(env)) if (name.startsWith('SITE_')) delete env[name];
    const build = () => execFileSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--force'], { cwd: root, env, stdio: 'pipe' });
    const initialSources = sourceSnapshot();
    build();
    assert.deepEqual(sourceSnapshot(), initialSources);
    const home = readFileSync(join(root, 'dist/index.html'), 'utf8');
    assert.match(home, /rel="canonical" href="https:\/\/build-audit.test\/"/);
    const data = pageData(home);
    assert.match(readPage('foo'), /<h1>Foo<\/h1>/);
    assert.match(readPage('foo'), /Hello from a root document/);
    assert.match(readPage('foo'), /class="article-main"[\s\S]*Back to Home/);
    assert.deepEqual(findBrokenLinks(join(root, 'dist')), []);
    assert.match(home, /href="\/foo"/);
    assert.match(home, /href="\/research"/);
    assert.match(home, /research\//);
    assert.ok(data.entries.find(entry => entry.path === '/foo').searchText.includes('Uniqueroottoken'));
    assert.ok(data.entries.find(entry => entry.path === '/research/first').searchText.includes('Researchuniquetoken'));
    assert.ok(!data.entries.find(entry => entry.path === '/research').searchText?.includes('Researchuniquetoken'));
    assert.match(readPage('research'), /class="card-link" href="\/research\/first"/);
    assert.match(readPage('research'), /class="card-link" href="\/research\/machine-learning"/);
    assert.match(readPage('research/machine-learning'), /href="\/research\/machine-learning\/attention"/);
    assert.match(readPage('research/first'), /alt="Research diagram"/);
    assert.match(readPage('research/first'), /src="\/_astro\/diagram/);
    for (const path of ['/empty-section', '/research/images', '/foo/picture', '/_drafts', '/research/_scratch', '/.obsidian']) {
      assert.ok(!existsSync(join(root, 'dist', path.slice(1))), path);
      assert.ok(!data.entries.some(entry => entry.path === path), path);
    }
    assert.ok(!htmlFiles().some(file => readFileSync(file, 'utf8').includes('Ignoredunderscoretoken')));
    assert.match(readPage('hobby'), /Hobbylandingtoken/);
    assert.doesNotMatch(readPage('hobby'), /class="card-link" href="\/hobby\/post"/);
    assert.ok(existsSync(join(root, 'dist/hobby/post.html')));
    assert.ok(existsSync(join(root, 'dist/mycat/portrait.html')));
    assert.ok(!existsSync(join(root, 'dist/secret.html')) && !existsSync(join(root, 'dist/secret')));
    assert.ok(!htmlFiles().some(file => readFileSync(file, 'utf8').includes('Secrettoken')));
    assert.doesNotMatch(readFileSync(join(root, 'dist/sitemap.xml'), 'utf8'), /secret|draft-section/);
    assert.ok(!existsSync(join(root, 'dist/draft-section.html')) && !existsSync(join(root, 'dist/draft-section')));
    assert.ok(!data.entries.some(entry => entry.path.startsWith('/draft-section')));
    assert.ok(!data.entries.some(entry => entry.path.endsWith('/index')));
    for (const section of ['blog', 'projects', 'notes']) {
      for (const parent of ['topic', 'topic/deep']) {
        assert.ok(existsSync(join(root, 'dist', section, `${parent}.html`)));
        assert.equal(data.entries.find(entry => entry.path === `/${section}/${parent}`)?.kind, 'directory');
      }
      const article = readFileSync(join(root, 'dist', section, 'topic/deep/nested.html'), 'utf8');
      assert.match(article, new RegExp(`href="/${section}/topic/deep"`));
      assert.match(article, /Back to Deep/);
      const listing = readFileSync(join(root, 'dist', section, 'topic/deep.html'), 'utf8');
      assert.match(listing, new RegExp(`class="card-link" href="/${section}/topic/deep/nested"`));
      assert.ok(!existsSync(join(root, 'dist', section, 'unpublished')));
      assert.ok(!data.entries.some(entry => entry.path.includes('unpublished')));
    }
    assert.match(readFileSync(join(root, 'dist/rss.xml'), 'utf8'), /https:\/\/build-audit.test\/blog\/topic\/deep\/nested/);
    assert.match(readFileSync(join(root, 'dist/sitemap.xml'), 'utf8'), /https:\/\/build-audit.test\/blog\/topic\/deep/);
    writeFileSync(join(root, '.env.production'), 'PUBLIC_SITE_URL=https://production-audit.test\n');
    writeFileSync(join(content, 'research/index.md'), '---\ntitle: Research lab\ndescription: Experiments and observations\norder: 5\n---\nExplicitlandingtoken.\n');
    writeFileSync(join(content, 'index.md'), '---\ntitle: Welcome home\n---\nRootlandingtoken.\n');
    unlinkSync(join(content, 'foo.md'));
    writeFileSync(join(content, 'new-page.md'), 'Newdeploymenttoken.\n');
    const updatedSources = sourceSnapshot();
    build();
    assert.deepEqual(sourceSnapshot(), updatedSources);
    const updatedHome = readPage('');
    const updatedData = pageData(updatedHome);
    assert.match(updatedHome, /rel="canonical" href="https:\/\/production-audit.test\/"/);
    assert.match(updatedHome, /Rootlandingtoken/);
    assert.match(readPage('research'), /<h1>Research lab<\/h1>/);
    assert.match(readPage('research'), /Explicitlandingtoken/);
    assert.match(readPage('research'), /class="card-link" href="\/research\/first"/);
    assert.ok(updatedData.entries.find(entry => entry.path === '/research').searchText.includes('Explicitlandingtoken'));
    assert.ok(!updatedData.entries.some(entry => entry.path === '/foo'));
    assert.ok(!existsSync(join(root, 'dist/foo.html')));
    assert.ok(existsSync(join(root, 'dist/new-page.html')));
    assert.ok(!existsSync(join(root, 'dist/research/index.html')));
    const profilePath = join(root, 'src/config/site.json');
    const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
    profile.github = 'https://github.com/example';
    writeFileSync(profilePath, JSON.stringify(profile));
    build();
    assert.match(readPage('contact'), /Find me on GitHub/);
    assert.doesNotMatch(readPage('contact').split('<script id="site-data"')[0], /Public contact details haven’t been added yet/);
    assert.deepEqual(sourceSnapshot(), updatedSources);
    writeFileSync(join(content, 'new-page.md'), 'See [a sibling](./foo.md).\n');
    build();
    assert.deepEqual(findBrokenLinks(join(root, 'dist')), [{ page: '/new-page', link: './foo.md' }]);
    writeFileSync(join(content, 'notes/c#-tips.md'), 'Silently dropped by the loader.\n');
    mkdirSync(join(content, '研究'), { recursive: true });
    writeFileSync(join(content, '研究/hello world.md'), 'Not a valid path.\n');
    assert.throws(build, error => {
      const output = `${error.stdout}${error.stderr}`;
      return output.includes('src/content/notes/c#-tips.md') && output.includes('src/content/研究/hello world.md');
    });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
