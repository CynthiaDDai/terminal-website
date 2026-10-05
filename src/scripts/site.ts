import { site as config, friends } from '../config';
import { virtualPath, breadcrumbs, type SiteEntry } from '../lib/navigation/filesystem';
import { themes, ThemeController } from '../lib/theme/registry';
import { renderCardPrompt, renderPrompt } from '../lib/theme/prompt-renderer';
import { executeCommand, type CommandResult } from '../lib/terminal/registry';
import { CommandHistory } from '../lib/terminal/history';
import { autocomplete, commonCompletionPrefix } from '../lib/terminal/autocomplete';
import { searchEntries } from '../lib/search';
import { fastfetchColor, type FastfetchTheme } from '../lib/theme/fastfetch-parser';
import { mobilePrompt } from '../lib/theme/mobile';

const touchView = window.matchMedia('(max-width: 700px), (pointer: coarse)');

const data = JSON.parse(document.getElementById('site-data')!.textContent!) as { entries: SiteEntry[]; path: string; fastfetch: FastfetchTheme };
const theme = new ThemeController();
let previousPath: string | null = null;
try {
  const last = sessionStorage.getItem('site-current-path');
  if (last && last !== data.path && data.entries.some(entry => entry.path === last)) {
    previousPath = last;
    sessionStorage.setItem('site-previous-path', last);
  } else previousPath = sessionStorage.getItem('site-previous-path');
  sessionStorage.setItem('site-current-path', data.path);
} catch { /* Navigation still works without persistent state. */ }

function navigate(path: string) {
  if (data.entries.some(entry => entry.path === path)) window.location.assign(path);
}
function back() {
  let internalReferrer = false;
  try { internalReferrer = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch { /* Invalid referrer. */ }
  if (internalReferrer && window.history.length > 1) window.history.back();
  else navigate(previousPath && data.entries.some(entry => entry.path === previousPath) ? previousPath : '/');
}
function setLink(link: HTMLAnchorElement, path: string) {
  if (path.startsWith('/') && !path.startsWith('//')) { link.href = path; return; }
  try {
    const url = new URL(path);
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      link.href = url.href;
      if (url.protocol !== 'mailto:') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    }
  } catch { /* Invalid configured links are rendered as text. */ }
}

function outputNode(result: CommandResult): HTMLElement {
  const element = document.createElement('div');
  if (result.kind === 'text' || result.kind === 'error') {
    const p = document.createElement('p');
    p.className = result.kind === 'error' ? 'command-text command-error' : 'command-text';
    p.textContent = result.text;
    element.append(p);
  } else if (result.kind === 'list') {
    if (result.heading) {
      const heading = document.createElement('p'); heading.className = 'result-heading'; heading.textContent = result.heading; element.append(heading);
    }
    const ul = document.createElement('ul'); ul.className = 'command-list';
    for (const entry of result.entries) {
      const li = document.createElement('li');
      const a = document.createElement('a'); setLink(a, entry.path);
      const title = document.createElement('span'); title.className = 'result-title';
      title.textContent = entry.kind === 'directory' ? entry.path === '/' ? '~/' : `${entry.path.split('/').at(-1)}/` : entry.title;
      const description = document.createElement('span'); description.className = 'result-description'; description.textContent = entry.description;
      a.append(title, description); li.append(a); ul.append(li);
    }
    element.append(ul);
  } else if (result.kind === 'rich') {
    const dl = document.createElement('dl'); dl.className = 'command-rows';
    for (const row of result.rows) {
      const dt = document.createElement('dt'); dt.textContent = row.label;
      const dd = document.createElement('dd');
      if (row.path) { const a = document.createElement('a'); setLink(a, row.path); a.textContent = row.value; dd.append(a); }
      else dd.textContent = row.value;
      dl.append(dt, dd);
    }
    element.append(dl);
  } else if (result.kind === 'fastfetch') {
    element.className = `fastfetch${result.theme.logo ? ' with-logo' : ''}`;
    if (result.theme.logo?.type === 'text') {
      const logo = document.createElement('pre'); logo.className = 'fastfetch-logo'; logo.textContent = result.theme.logo.source; logo.setAttribute('aria-hidden', 'true'); element.append(logo);
    } else if (result.theme.logo?.type === 'image') {
      const logo = document.createElement('img'); logo.className = 'fastfetch-logo'; logo.src = result.theme.logo.source; logo.alt = ''; element.append(logo);
    }
    const sections = document.createElement('div'); sections.className = 'fastfetch-sections';
    result.sections.forEach((section, index) => {
      const block = document.createElement('section'); block.className = 'fastfetch-block';
      const style = result.theme.sections[index];
      block.style.setProperty('--fetch-color', fastfetchColor(style.color));
      const heading = document.createElement('h2'); heading.className = 'fastfetch-heading';
      const marker = document.createElement('span'); marker.setAttribute('aria-hidden', 'true'); marker.textContent = `${style.marker} `;
      heading.append(marker, document.createTextNode(section.name)); block.append(heading);
      const dl = document.createElement('dl'); dl.className = 'command-rows fastfetch-rows';
      section.rows.forEach((row, rowIndex) => {
        const dt = document.createElement('dt');
        const tree = document.createElement('span'); tree.setAttribute('aria-hidden', 'true'); tree.className = 'fastfetch-tree';
        tree.textContent = `${rowIndex === section.rows.length - 1 ? result.theme.lastBranch : result.theme.branch} `;
        dt.append(tree, document.createTextNode(row.label));
        const dd = document.createElement('dd');
        const separator = document.createElement('span'); separator.className = 'fastfetch-separator'; separator.setAttribute('aria-hidden', 'true'); separator.textContent = result.theme.separator; dd.append(separator);
        if (row.path) { const link = document.createElement('a'); setLink(link, row.path); link.textContent = row.value; dd.append(link); }
        else dd.append(document.createTextNode(row.value));
        dl.append(dt, dd);
      });
      block.append(dl); sections.append(block);
    });
    element.append(sections);
  } else if (result.kind === 'external') {
    const link = document.createElement('a'); setLink(link, result.url); link.textContent = `${result.name} ↗`; element.append(link);
  }
  return element;
}

let commandReturnFocus: HTMLElement | null = null;
function focusCommand() {
  if (touchView.matches) {
    openTouchPanel('#mobile-command-panel');
    const manual = document.querySelector<HTMLDetailsElement>('[data-manual-command]')!;
    manual.open = true;
    document.querySelector<HTMLTextAreaElement>('#mobile-custom-command')!.focus();
    return;
  }
  const input = document.querySelector<HTMLTextAreaElement>('.command-form .command-input');
  if (!input) return;
  if (document.activeElement instanceof HTMLElement && document.activeElement !== input) commandReturnFocus = document.activeElement;
  input.focus({ preventScroll: true });
  input.scrollIntoView({ block: 'nearest' });
}

document.querySelectorAll<HTMLElement>('[data-shell-surface], [data-mobile-shell]').forEach(surface => {
  const mobile = surface.hasAttribute('data-mobile-shell');
  const form = surface.querySelector<HTMLFormElement>('[data-command-form]')!;
  const input = form.querySelector<HTMLTextAreaElement>('.command-input')!;
  const transcript = surface.querySelector<HTMLElement>('[data-transcript], [data-mobile-transcript]')!;
  const completions = surface.querySelector<HTMLElement>('[data-completions], [data-mobile-completions]')!;
  const output = surface.querySelector<HTMLElement>('[data-mobile-output]');
  const history = surface.dataset.history === 'full' ? new CommandHistory() : null;
  let status: 'ok' | 'error' = 'ok';
  const resizeInput = () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; };
  const setInput = (value: string) => {
    input.value = value; resizeInput(); input.setSelectionRange(value.length, value.length);
  };
  resizeInput();
  window.addEventListener('resize', resizeInput);
  surface.querySelector('[data-manual-command]')?.addEventListener('toggle', resizeInput);
  const getCompletions = (value: string) => autocomplete(value, data.path, data.entries, themes.map(theme => theme.id), {
    friends: friends.map(friend => friend.alias),
  });
  const showCompletions = (values: string[]) => {
    completions.replaceChildren();
    for (const value of values) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = value; button.title = value;
      button.setAttribute('aria-label', `Complete ${value}`);
      button.addEventListener('click', () => { setInput(value); completions.replaceChildren(); if (!mobile) input.focus(); });
      button.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const next = event.key === 'ArrowDown' ? button.nextElementSibling : button.previousElementSibling;
          if (next instanceof HTMLButtonElement) next.focus(); else input.focus();
        } else if (event.key === 'Escape') { event.preventDefault(); completions.replaceChildren(); input.focus(); }
      });
      completions.append(button);
    }
  };
  const repaintPrompt = () => {
    const lines = renderPrompt(mobile ? mobilePrompt(theme.current) : theme.current.terminal, { user: config.user, host: config.host, cwd: virtualPath(data.path), status, pathLinks: breadcrumbs(data.path) });
    const rows = form.querySelector<HTMLElement>('[data-prompt]')!;
    rows.replaceChildren();
    for (const line of lines.slice(0, -1)) {
      const div = document.createElement('div'); div.className = `prompt-line ${line.alignment}`;
      // renderPrompt returns only escaped literals and validated theme markup.
      div.innerHTML = line.html; rows.append(div);
    }
    form.querySelector<HTMLElement>('[data-prompt-tail]')!.innerHTML = lines.at(-1)?.html || '';
  };
  repaintPrompt();
  document.addEventListener('site:theme', repaintPrompt);

  const run = (value: string) => {
    const command = value.trim();
    if (!command) return;
    history?.add(command);
    const result = executeCommand(command, {
      cwd: data.path, previousPath, entries: data.entries, friends, fastfetch: data.fastfetch,
      owner: config.owner, host: config.host, bio: config.bio, email: config.email, github: config.github,
      socials: config.socials, activityLimit: config.activityLimit,
      theme: { current: theme.current, set: id => theme.set(id), available: themes },
    });
    setInput(''); completions.replaceChildren();
    if (result.kind === 'navigation') { navigate(result.path); return; }
    if (result.kind === 'external') window.open(result.url, '_blank', 'noopener,noreferrer');
    if (result.kind === 'back') { back(); return; }
    if (result.kind === 'clear') {
      transcript.replaceChildren(); if (output) output.hidden = true; surface.classList.remove('has-output'); status = 'ok'; repaintPrompt(); return;
    }
    status = result.kind === 'error' ? 'error' : 'ok';
    const entry = document.createElement('section'); entry.className = 'transcript-entry';
    if (history) {
      const submitted = document.createElement('p'); submitted.className = 'transcript-command';
      submitted.append(document.createTextNode(`└─[${virtualPath(data.path)}] > `));
      const text = document.createElement('span'); text.className = 'command-value'; text.textContent = command;
      submitted.append(text); entry.append(submitted);
    }
    entry.append(outputNode(result));
    if (history) transcript.append(entry); else transcript.replaceChildren(entry);
    if (output) {
      output.hidden = false;
      surface.querySelector<HTMLElement>('[data-mobile-output-title]')!.textContent = command;
      requestAnimationFrame(() => output.scrollIntoView({ block: 'nearest' }));
    }
    surface.classList.add('has-output'); repaintPrompt();
    requestAnimationFrame(() => { transcript.scrollTop = transcript.scrollHeight; });
  };
  form.addEventListener('submit', event => { event.preventDefault(); run(input.value); if (mobile) input.blur(); else input.focus(); });
  input.addEventListener('input', () => { resizeInput(); completions.replaceChildren(); });
  const completeInput = () => {
    const results = getCompletions(input.value);
    if (results.length === 1) {
      setInput(results[0]);
      showCompletions(results[0].endsWith('/') ? getCompletions(results[0]) : []);
    } else {
      const prefix = commonCompletionPrefix(results);
      if (prefix.length > input.value.trimStart().length) setInput(prefix);
      showCompletions(results);
    }
    if (!results.length) {
      const note = document.createElement('p'); note.textContent = 'No completions for this input.'; completions.append(note);
    }
  };
  surface.querySelector('[data-complete-command]')?.addEventListener('click', completeInput);
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); form.requestSubmit();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const buttons = completions.querySelectorAll<HTMLButtonElement>('button');
      if (buttons.length) { event.preventDefault(); buttons[event.key === 'ArrowDown' ? 0 : buttons.length - 1].focus(); }
      else if (history) { event.preventDefault(); setInput(history.move(event.key === 'ArrowUp' ? -1 : 1, input.value)); completions.replaceChildren(); }
    } else if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      completeInput();
    } else if (event.key === 'Escape') {
      event.preventDefault(); completions.replaceChildren(); input.blur();
      if (mobile && surface instanceof HTMLDialogElement) surface.close();
      else if (!history) { transcript.replaceChildren(); surface.classList.remove('has-output'); status = 'ok'; repaintPrompt(); }
      if (commandReturnFocus?.isConnected) commandReturnFocus.focus({ preventScroll: true });
      commandReturnFocus = null;
    } else if (event.ctrlKey && !event.shiftKey && !event.metaKey && event.key.toLowerCase() === 'l') {
      event.preventDefault(); transcript.replaceChildren(); surface.classList.remove('has-output'); status = 'ok'; repaintPrompt();
    } else if (event.ctrlKey && event.key.toLowerCase() === 'c' && input.selectionStart === input.selectionEnd) {
      event.preventDefault(); setInput(''); completions.replaceChildren();
    }
  });
  surface.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button => {
    button.addEventListener('click', () => { run(button.dataset.command!); if (!mobile) input.focus(); });
  });
  // Links and text selection keep their normal behavior.
  surface.addEventListener('click', event => {
    if (!mobile && event.target instanceof Element && !event.target.closest('a, button, textarea, [data-transcript]') && !window.getSelection()?.toString()) input.focus();
  });
});
document.querySelectorAll('[data-focus-command]').forEach(button => button.addEventListener('click', focusCommand));

const searchDialog = document.querySelector<HTMLDialogElement>('#site-search')!;
const searchInput = searchDialog.querySelector<HTMLInputElement>('#site-search-input')!;
const searchResults = searchDialog.querySelector<HTMLElement>('[data-search-results]')!;
const searchStatus = searchDialog.querySelector<HTMLElement>('[data-search-status]')!;
function updateSearch() {
  const results = searchEntries(searchInput.value, data.entries);
  searchStatus.textContent = !searchInput.value.trim() ? 'Start typing to search the whole site.' : results.length ? `${results.length} ${results.length === 1 ? 'page' : 'pages'} found.` : 'No matching pages. Try another word.';
  searchResults.replaceChildren();
  if (results.length) searchResults.append(outputNode({ kind: 'list', entries: results }));
}
function openSearch() {
  closeTouchPanels();
  if (!searchDialog.open) searchDialog.showModal();
  updateSearch(); searchInput.focus(); searchInput.select();
}
searchInput.addEventListener('input', updateSearch);
searchInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' && searchResults.querySelector('a')) {
    event.preventDefault(); searchResults.querySelector<HTMLAnchorElement>('a')!.focus();
  }
});
searchResults.addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const links = [...searchResults.querySelectorAll<HTMLAnchorElement>('a')];
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (index < 0) return;
  event.preventDefault();
  const next = links[index + (event.key === 'ArrowDown' ? 1 : -1)];
  if (next) next.focus(); else searchInput.focus();
});
searchDialog.querySelector('[data-search-form]')!.addEventListener('submit', event => {
  event.preventDefault();
  const result = searchEntries(searchInput.value, data.entries)[0];
  if (result) navigate(result.path);
});
document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', openSearch));
searchDialog.querySelector('[data-close-search]')!.addEventListener('click', () => searchDialog.close());
searchDialog.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.isComposing) {
    // Catch Escape before the search input consumes it to clear a nonempty query.
    event.preventDefault(); event.stopPropagation(); searchDialog.close();
  }
}, { capture: true });
searchDialog.addEventListener('cancel', event => { event.preventDefault(); searchDialog.close(); });
searchDialog.addEventListener('click', event => {
  if (event.target !== searchDialog) return;
  const rect = searchDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) searchDialog.close();
});
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
  if (event.key === ':') { event.preventDefault(); focusCommand(); }
  else if (event.key === 's' && !event.shiftKey) { event.preventDefault(); openSearch(); }
});

function updateThemeLabels() {
  document.querySelectorAll('[data-theme-name]').forEach(element => { element.textContent = theme.current.name; });
  document.querySelectorAll<HTMLElement>('[data-select-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.selectTheme === theme.current.id)));
  // Cards are prompts for their items; renderCardPrompt returns only escaped literals and validated theme markup.
  document.querySelectorAll<HTMLElement>('[data-card]').forEach(card => {
    const git = card.dataset.cardGit;
    card.querySelector('.card-prompt')!.innerHTML = renderCardPrompt(theme.current.terminal, card.dataset.cardName!,
      git === undefined ? undefined : { working: git.includes('working'), behind: git.includes('behind') });
  });
}
updateThemeLabels();
document.addEventListener('site:theme', updateThemeLabels);
document.querySelectorAll('[data-cycle-theme]').forEach(button => button.addEventListener('click', () => {
  theme.set(themes[(themes.findIndex(item => item.id === theme.current.id) + 1) % themes.length].id);
}));

function closeTouchPanels() {
  document.querySelectorAll<HTMLDialogElement>('.touch-panel[open]').forEach(panel => panel.close());
}
function openTouchPanel(selector: string) {
  const panel = document.querySelector<HTMLDialogElement>(selector)!;
  if (panel.open) return;
  closeTouchPanels();
  if (searchDialog.open) searchDialog.close();
  panel.showModal();
}
document.querySelectorAll('[data-open-command]').forEach(button => button.addEventListener('click', () => openTouchPanel('#mobile-command-panel')));
document.querySelectorAll('[data-open-themes]').forEach(button => button.addEventListener('click', () => openTouchPanel('#mobile-theme-panel')));
document.querySelectorAll<HTMLButtonElement>('[data-select-theme]').forEach(button => button.addEventListener('click', () => theme.set(button.dataset.selectTheme!)));
document.querySelectorAll<HTMLDialogElement>('.touch-panel').forEach(panel => {
  panel.querySelector('[data-close-panel]')!.addEventListener('click', () => panel.close());
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); panel.close(); }
  });
  panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const rect = panel.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) panel.close();
  });
  panel.addEventListener('close', () => {
    const manual = panel.querySelector<HTMLDetailsElement>('[data-manual-command]');
    if (manual) manual.open = false;
  });
});
touchView.addEventListener('change', () => {
  closeTouchPanels();
  if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur();
});

document.querySelectorAll<HTMLButtonElement>('[data-toggle-edge]').forEach(button => {
  const menu = button.closest<HTMLElement>('.edge-menu')!;
  const edge = menu.closest<HTMLElement>('.edge-navigation')!;
  const seenKey = 'site-index-seen';
  let pinned = false;
  try { if (!localStorage.getItem(seenKey)) edge.classList.add('nudge'); } catch {}
  const sync = () => {
    const expanded = pinned || menu.classList.contains('is-open') || menu.matches(':focus-within');
    button.setAttribute('aria-expanded', String(expanded));
    if (!expanded || !edge.classList.contains('nudge')) return;
    edge.classList.remove('nudge');
    try { localStorage.setItem(seenKey, '1'); } catch {}
  };
  button.addEventListener('click', () => { pinned = !pinned; menu.classList.toggle('is-expanded', pinned); sync(); });
  // Hover opens at once and closes after a short grace period, so a pointer that slips off for a moment
  // (a shaky hand, or browser UI sliding over the window edge) does not make the menu flicker.
  let closing = 0;
  menu.addEventListener('mouseenter', () => { clearTimeout(closing); menu.classList.add('is-open'); sync(); });
  menu.addEventListener('mouseleave', () => { closing = window.setTimeout(() => { menu.classList.remove('is-open'); sync(); }, 250); });
  menu.addEventListener('focusin', sync);
  menu.addEventListener('focusout', () => queueMicrotask(sync));
});

// The table of contents marks the section being read: the last heading above the upper third of the window.
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
const tocTargets = tocLinks.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
let tocFrame = 0;
const markSection = () => {
  tocFrame = 0;
  const current = tocTargets.findLastIndex(target => target && target.getBoundingClientRect().top < innerHeight / 3);
  tocLinks.forEach((link, index) => index === current ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
};
if (tocLinks.length) {
  addEventListener('scroll', () => { tocFrame ||= requestAnimationFrame(markSection); }, { passive: true });
  markSection();
}
document.documentElement.dataset.siteReady = 'true';
