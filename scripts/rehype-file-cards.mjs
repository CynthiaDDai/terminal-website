import { statSync } from 'node:fs';
import { join } from 'node:path';

// A paragraph whose first line is only a link to a file in public/ becomes a file card.
// The link text is the card title; any further lines of the paragraph are its description.
// The link title, if any, is its status: "wip" marks a file still in progress.
//
//   [Why Linear Algebra](/assets/slides/whylinalg.pdf)
//   Motivating linear maps with a formula for the Fibonacci numbers.
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = value => ({ type: 'text', value });

function publicFile(href) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return;
  try {
    const stat = statSync(join(process.cwd(), 'public', decodeURI(href.split(/[?#]/)[0])));
    return stat.isFile() ? stat.size : undefined;
  } catch { return undefined; }
}

const textOf = node => node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');
// A card is named after its title: [Lecture Notes] is …/lecture-notes.
export const slug = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function card(link, size, description) {
  const name = decodeURI(link.properties.href).split('/').at(-1);
  const extension = name.includes('.') ? name.split('.').at(-1).toLowerCase() : '';
  const kind = extension.toUpperCase() || 'FILE';
  const kb = size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
  const cardName = slug(textOf(link)) || slug(name.replace(/\.[^.]*$/, ''));
  // Painted by the site script as the theme's transient prompt; the text is the no-JavaScript fallback.
  // A file is "behind": there is something to pull. A "wip" link title marks it as in progress.
  return el('div', { className: ['prompt-card', 'file-card'], dataCard: '', dataCardName: cardName, dataCardGit: link.properties.title === 'wip' ? 'working behind' : 'behind' }, [
    el('div', { className: ['card-prompt'], ariaHidden: 'true' }, [text(`…/${cardName}`)]),
    el('a', { className: ['card-link'], href: link.properties.href }, link.children),
    ...(description.length ? [el('p', { className: ['card-description'] }, description)] : []),
    el('p', { className: ['card-output'] }, [
      el('span', {}, [text(`${kind} · ${kb}`)]),
      el('a', { className: ['card-action'], href: link.properties.href, download: true, ariaLabel: `Download ${name}` }, [text('pull')]),
    ]),
  ]);
}

export default function fileCards() {
  return (tree, file) => {
    function visit(node) {
      node.children?.forEach((child, index) => {
        if (child.type !== 'element' || child.tagName !== 'p') return visit(child);
        // Split at the first soft line break: the first line must be the link alone.
        const parts = child.children;
        const breakAt = parts.findIndex(part => part.type === 'text' && part.value.includes('\n'));
        const first = (breakAt < 0 ? parts : parts.slice(0, breakAt + 1)).filter(part => part.type !== 'text' || part.value.split('\n')[0].trim());
        const link = first.length === 1 && first[0].tagName === 'a' ? first[0] : undefined;
        const size = link && publicFile(link.properties.href);
        if (size === undefined) return;
        const status = link.properties.title;
        if (status != null && status !== 'wip') throw new Error(`${file.path}: a file card's link title is its status, and can only be "wip" (in progress): ${link.properties.href} "${status}"`);
        const rest = breakAt < 0 ? [] : [text(parts[breakAt].value.slice(parts[breakAt].value.indexOf('\n') + 1)), ...parts.slice(breakAt + 1)];
        const description = rest.filter(part => part.type !== 'text' || part.value.trim());
        node.children[index] = card(link, size, description);
      });
    }
    visit(tree);
  };
}
