import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function discoverThemeFolders(root, settings = {}) {
  const sources = {}, overrides = {}, mobiles = {};
  /** @type {Record<string, string[]>} */
  const warnings = {};
  const read = path => {
    try { return JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { throw new Error(`Cannot read theme JSON ${path}: ${error.message}`); }
  };
  for (const folder of readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(folder.name)) throw new Error(`Invalid theme folder name: ${folder.name}`);
    const files = readdirSync(join(root, folder.name), { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => entry.name);
    const native = files.filter(name => name.endsWith('.omp.json'));
    if (native.length !== 1) throw new Error(`Theme folder ${folder.name} must contain exactly one .omp.json file.`);
    const key = `/themes/${folder.name}/${native[0]}`;
    sources[key] = read(join(root, folder.name, native[0]));
    const readCompanion = (name, destination) => {
      if (!files.includes(name)) return;
      try { destination[key] = read(join(root, folder.name, name)); }
      catch (error) {
        if (settings.fallback?.invalidCompanion === 'error') throw error;
        (warnings[key] ||= []).push(`${error.message} Using the configured companion fallback.`);
      }
    };
    const web = native[0].replace(/\.omp\.json$/, '.web.json');
    readCompanion(web, overrides);
    readCompanion('theme_mobile.json', mobiles);
  }
  return { sources, overrides, mobiles, warnings };
}

// Discover directories on the server, then ship only normalized JSON to browser consumers.
// The site uses src/themes and src/config/themes.json; the test suites point these at tests/fixtures/site.
export function themeCatalogPlugin({ themes = process.env.SITE_THEMES_DIR || 'src/themes', settings = process.env.SITE_THEMES_CONFIG || 'src/config/themes.json' } = {}) {
  const id = 'virtual:site-themes';
  const resolvedId = `\0${id}`;
  let root, settingsPath;
  return {
    name: 'site-theme-folders',
    configResolved(config) {
      root = resolve(config.root, themes);
      settingsPath = resolve(config.root, settings);
    },
    resolveId(source) { if (source === id) return resolvedId; },
    load(source) {
      if (source !== resolvedId) return;
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      const catalog = discoverThemeFolders(root, settings);
      // In Vite dev, addWatchFile also becomes an import dependency. Watch directories
      // through the server instead, so absent optional companions never become imports.
      return `export default ${JSON.stringify({ ...catalog, settings })};`;
    },
    configureServer(server) {
      server.watcher.add([root, settingsPath]);
      const refresh = path => {
        if (path !== root && !path.startsWith(root + '/') && path !== settingsPath) return;
        for (const environment of Object.values(server.environments)) {
          const module = environment.moduleGraph?.getModuleById(resolvedId);
          if (module) environment.moduleGraph.invalidateModule(module);
          environment.hot.send({ type: 'full-reload' });
        }
      };
      server.watcher.on('add', refresh).on('unlink', refresh).on('change', refresh).on('addDir', refresh).on('unlinkDir', refresh);
      server.httpServer?.once('close', () => {
        for (const event of ['add', 'unlink', 'change', 'addDir', 'unlinkDir']) server.watcher.off(event, refresh);
      });
    },
  };
}
