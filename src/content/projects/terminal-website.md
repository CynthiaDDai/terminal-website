---
title: "A terminal-inspired personal website"
description: "A quiet, keyboard-friendly home on the web, built around real content and ordinary links."
date: 2026-10-03
tags: [astro, typescript, nixos]
status: active
example: true
---

A terminal is a useful way to move around. An article is a useful way to read. This site brings those two experiences together.

The home page starts with a two-line prompt drawn from an Oh My Posh theme. A small command vocabulary provides another way to navigate the same pages available through ordinary links.

## One set of paths

Every page has a normal URL and a corresponding virtual path. For example, `/projects/terminal-website` becomes `~/projects/terminal-website` in the prompt. Breadcrumbs, commands, search, and navigation all use the same site index.

<figure>
  <img src="/navigation-model.svg" alt="Terminal commands, breadcrumbs, and ordinary links all lead through one site index to a static content page." width="760" height="260" loading="lazy" />
  <figcaption>Different ways to navigate; one set of content.</figcaption>
</figure>

```text
ls
cd ~/blog
open the-shape-of-attention
cd ..
theme pine_ink
```

## Static where it matters

Astro generates the pages at build time. Markdown is rendered to semantic HTML, mathematical expressions are typeset with KaTeX, and code is highlighted with Shiki. The command UI is a small TypeScript module.

Ordinary navigation and article reading work without JavaScript. Press `:` to focus the command line above the content, or `s` to search the whole site. Command editing keys apply while the input has focus; Tab continues completing paths without leaving it. Home keeps a scrollable transcript; content pages show only the current result.

## A NixOS home

The development shell supplies Node.js and Chromium. Production builds produce a directory of static files in the Nix store. A NixOS module serves those files with Caddy, which manages HTTPS for the configured hostname.

The result needs no application server or database. New content is a Markdown file and another build.
