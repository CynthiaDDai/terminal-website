import { normalizePath, virtualPath, type SiteEntry } from '../navigation/filesystem';
import { searchableText } from '../search';

export interface ContentMetadata {
  title?: string;
  description?: string;
  order?: number;
  date?: Date;
  updated?: Date;
  tags?: string[];
  draft?: boolean;
  show_children?: boolean;
  groups?: Record<string, string>;
  status?: string;
  authors?: string;
  venue?: string;
  links?: Record<string, string>;
  example?: boolean;
  motto?: string;
  [key: string]: unknown;
}

export interface ContentSource {
  id: string;
  filePath?: string;
  body?: string;
  rendered?: { html: string };
  data: ContentMetadata;
}

interface BaseNode extends SiteEntry {
  slug: string;
  parentPath: string | null;
  frontmatter: ContentMetadata;
}

export interface DocumentNode extends BaseNode {
  kind: 'page';
  sourceId: string;
  sourcePath: string;
}

export interface DirectoryNode extends BaseNode {
  kind: 'directory';
  children: ContentNode[];
  index: { source: 'generated' } | { source: 'explicit'; document: DocumentNode };
}

export type ContentNode = DocumentNode | DirectoryNode;
export interface ContentTree { root: DirectoryNode; nodes: ContentNode[]; entries: SiteEntry[]; }

export function derivedTitle(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/(^|\s)\S/g, character => character.toUpperCase());
}

function documentNode(source: ContentSource, path: string): DocumentNode {
  const slug = path.split('/').at(-1) || '';
  return {
    path, slug, parentPath: path === '/' ? null : normalizePath('..', path), kind: 'page',
    title: source.data.title ?? (path === '/' ? 'Home' : derivedTitle(slug)),
    description: source.data.description ?? '', tags: source.data.tags ?? [],
    date: source.data.date?.toISOString(), updated: (source.data.updated ?? source.data.date)?.toISOString(),
    order: source.data.order, example: source.data.example,
    searchText: searchableText(source.rendered?.html ?? source.body ?? ''), frontmatter: source.data,
    sourceId: source.id, sourcePath: source.filePath ?? `src/content/${source.id}`,
  };
}

const contentName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Names starting with . or _ (editor folders, assets, scratch files) are never routed.
export const ignoredContentName = (name: string) => name.startsWith('.') || name.startsWith('_');

// Every folder and document name must be lowercase ASCII words joined by hyphens.
export function invalidContentPaths(files: string[]): string[] {
  return files.filter(file => !file.replace(/\.mdx?$/, '').split('/').every(part => contentName.test(part)));
}

export function buildContentTree(sources: ContentSource[]): ContentTree {
  const contentId = (source: ContentSource) => source.id.replace(/\.(md|mdx)$/, '');
  const indexPath = (id: string) => id === 'index' ? '/' : `/${id.slice(0, -'/index'.length)}`;
  const isIndex = (id: string) => id === 'index' || id.endsWith('/index');
  const draftDirectories = sources.filter(source => isIndex(contentId(source)) && source.data.draft).map(source => indexPath(contentId(source)));
  // A draft root index would leave a site with no pages; that is never what was meant.
  const rootDraft = sources.find(source => contentId(source) === 'index' && source.data.draft);
  if (rootDraft) throw new Error(`${rootDraft.filePath ?? rootDraft.id}: draft: true on the root index.md would exclude the whole site. Remove it, or mark individual pages and folders as drafts.`);
  const blocked = (path: string) => draftDirectories.some(parent => path === parent || path.startsWith(`${parent}/`));
  const legacyHidden = sources.find(source => 'hidden' in source.data);
  if (legacyHidden) throw new Error(`${legacyHidden.filePath ?? legacyHidden.id}: "hidden" is no longer supported. Use draft: true to keep a page out of the site.`);
  const published = sources.filter(source => !source.data.draft && !blocked(`/${contentId(source)}`));
  const nodes = new Map<string, ContentNode>();
  const addDirectory = (path: string): DirectoryNode => {
    if (/^\/(?:404|rss\.xml|sitemap[^/]*\.xml|_astro)(?:\/|$)/.test(path)) {
      throw new Error(`Content path ${path} is reserved for a site system route.`);
    }
    const existing = nodes.get(path);
    if (existing) {
      if (existing.kind !== 'directory') throw new Error(`Content path ${path} is both a document and a directory (${existing.sourcePath}).`);
      return existing;
    }
    const slug = path.split('/').at(-1) || '';
    const directory: DirectoryNode = {
      path, slug, parentPath: path === '/' ? null : normalizePath('..', path), kind: 'directory',
      title: path === '/' ? 'Home' : derivedTitle(slug),
      description: path === '/' ? 'Back to the beginning.' : `Explore ${virtualPath(path)}.`,
      tags: [], frontmatter: {}, children: [], index: { source: 'generated' },
    };
    nodes.set(path, directory);
    return directory;
  };
  addDirectory('/');
  for (const source of published) {
    const id = contentId(source);
    const path = isIndex(id) ? indexPath(id) : `/${id}`;
    if (/^\/(?:404|rss\.xml|sitemap[^/]*\.xml|_astro)(?:\/|$)/.test(path)) {
      throw new Error(`Content path ${path} is reserved for a site system route (${source.filePath ?? source.id}).`);
    }
    const document = documentNode(source, path);
    if (isIndex(id)) {
      const directory = addDirectory(path);
      if (directory.index.source === 'explicit') throw new Error(`Multiple index documents at ${path}.`);
      Object.assign(directory, {
        title: document.title, description: document.description, tags: document.tags,
        order: document.order, date: document.date, updated: document.updated,
        example: document.example, searchText: document.searchText,
        frontmatter: document.frontmatter, index: { source: 'explicit', document },
      });
    } else {
      if (nodes.has(path)) throw new Error(`Multiple content sources occupy ${path} (${document.sourcePath}).`);
      nodes.set(path, document);
    }
  }
  for (const node of [...nodes.values()]) {
    let parent = node.parentPath;
    while (parent) {
      const directory = addDirectory(parent);
      parent = directory.parentPath;
    }
  }
  for (const node of nodes.values()) {
    if (node.parentPath) addDirectory(node.parentPath).children.push(node);
  }
  const root = nodes.get('/') as DirectoryNode;
  const ordered: ContentNode[] = [];
  const visit = (node: ContentNode) => {
    ordered.push(node);
    if (node.kind !== 'directory') return;
    const chronological = node.children.filter(child => child.kind === 'page').every(child => child.date);
    node.children.sort((first, second) => {
      if (first.order !== undefined || second.order !== undefined) {
        const order = (first.order ?? Infinity) - (second.order ?? Infinity);
        if (order) return order;
      }
      const kind = Number(second.kind === 'directory') - Number(first.kind === 'directory');
      if (kind) return kind;
      if (chronological && first.kind === 'page' && second.kind === 'page') {
        const date = (second.date ?? '').localeCompare(first.date ?? '');
        if (date) return date;
      }
      return first.path < second.path ? -1 : first.path > second.path ? 1 : 0;
    });
    for (const child of node.children) visit(child);
  };
  visit(root);
  // A directory with `groups` lists its children under one heading per status, so every child needs a listed status.
  const ungrouped = ordered.flatMap(node => {
    const groups = node.kind === 'directory' ? node.frontmatter.groups : undefined;
    if (!groups || node.kind !== 'directory') return [];
    return node.children.filter(child => !Object.hasOwn(groups, child.frontmatter.status ?? ''))
      .map(child => `  ${child.kind === 'page' ? child.sourcePath : child.path}: status ${JSON.stringify(child.frontmatter.status ?? null)} is not one of ${Object.keys(groups).join(', ')}`);
  });
  if (ungrouped.length) throw new Error(`Children of a directory with groups need one of its statuses:\n${ungrouped.join('\n')}`);
  const entries = ordered.map(node => ({
    path: node.path, title: node.title, description: node.description, kind: node.kind, tags: node.tags,
    date: node.date, updated: node.updated, order: node.order,
    example: node.example, searchText: node.searchText,
  }));
  return { root, nodes: ordered, entries };
}
