#!/usr/bin/env node
/**
 * build-wiki.mjs — generate self-contained static HTML "wiki" files
 * from markdown source.
 *
 * Usage:
 *
 *   node meta/teach-as-you-build/build-wiki.mjs                # all defaults
 *   node meta/teach-as-you-build/build-wiki.mjs path/to/doc.md  # one file
 *   node meta/teach-as-you-build/build-wiki.mjs a.md b.md       # several
 *
 * Defaults (when called with no args) — each path is resolved from the
 * current working directory. Missing files are skipped silently so the
 * same defaults work in a full project or a bare one:
 *
 *   BUILD_LOG.md                              → BUILD_LOG.html
 *   LEARN.md                                  → LEARN.html
 *   meta/teach-as-you-build/WORKFLOW.md       → meta/.../WORKFLOW.html
 *
 * Output:
 *   For each input X.md, write X.html in the same directory.
 *   The HTML is self-contained: inline CSS, inline JS for the sidebar
 *   TOC filter + scroll-spy, no network calls, no external assets.
 *   Open from any file manager.
 *
 * Re-run this script whenever the source markdown changes. The npm
 * script alias `npm run build:wiki` is the usual way to invoke it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, dirname, extname, resolve } from 'node:path'
import { marked, Marked } from 'marked'

const DEFAULT_SOURCES = [
  'BUILD_LOG.md',
  'LEARN.md',
  'meta/teach-as-you-build/WORKFLOW.md'
]

const args = process.argv.slice(2)
const sources = args.length > 0 ? args : DEFAULT_SOURCES

let wroteAny = false
for (const src of sources) {
  const absSrc = resolve(process.cwd(), src)
  if (!existsSync(absSrc)) {
    if (args.length > 0) {
      console.error(`[build-wiki] source not found: ${absSrc}`)
      process.exitCode = 1
    }
    continue
  }

  const md = readFileSync(absSrc, 'utf8')
  const html = renderWiki(md, deriveTitle(absSrc, md))
  const outPath = absSrc.replace(/\.md$/i, '.html')
  writeFileSync(outPath, html, 'utf8')
  wroteAny = true
  console.log(
    `Wrote ${outPath.replace(process.cwd(), '.')}  ` +
      `(${(html.length / 1024).toFixed(1)} KB)`
  )
}

if (!wroteAny && args.length === 0) {
  console.log(
    '[build-wiki] no default docs found at ' +
      DEFAULT_SOURCES.map((p) => `"${p}"`).join(', ')
  )
}

// -----------------------------------------------------------------
// Internals

/**
 * Pick a good title for the HTML page. Priority:
 *   1. First H1 in the markdown, with any trailing "— subtitle" stripped.
 *   2. The filename without extension.
 */
function deriveTitle(absPath, md) {
  const h1 = md.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim().replace(/\s*[—–-]\s*.*$/, '').trim()
  return basename(absPath, extname(absPath))
}

/**
 * Render one markdown source to a full standalone HTML document.
 *
 * Uses a custom marked renderer that gives each heading a stable slug
 * id so the sidebar TOC's anchor links work. Then extracts h2/h3
 * entries for the TOC via a regex against marked's output (stable
 * enough that regex parsing beats pulling in a DOM shim).
 */
function renderWiki(md, title) {
  const slugCounts = new Map()
  function slugify(text) {
    const base = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    const n = (slugCounts.get(base) ?? 0) + 1
    slugCounts.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }

  // Fresh marked instance per document so customizations don't leak.
  // Using Marked class (available in v5+) instead of the default shared
  // instance so multiple calls from this one script don't share slug
  // counters or renderer overrides.
  const m = new Marked({
    renderer: {
      heading({ tokens, depth }) {
        const text = tokens.map((t) => t.text ?? '').join('')
        const id = slugify(text)
        return `<h${depth} id="${id}">${m.parseInline(text)}</h${depth}>\n`
      }
    }
  })

  const bodyHtml = m.parse(md)

  const tocItems = []
  const headingRe = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h[23]>/g
  let match
  while ((match = headingRe.exec(bodyHtml)) !== null) {
    tocItems.push({
      level: Number(match[1]),
      id: match[2],
      text: stripHtml(match[3])
    })
  }

  const tocHtml = tocItems
    .map((item) => {
      const cls = `toc-l${item.level}`
      return `<a class="${cls}" href="#${item.id}">${escapeHtml(item.text)}</a>`
    })
    .join('\n        ')

  return wrapShell({ title, tocHtml, bodyHtml, tocCount: tocItems.length })
}

function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapShell({ title, tocHtml, bodyHtml, tocCount }) {
  const sourceNote = tocCount > 0
    ? `<code>${escapeHtml(title)}</code> wiki · ${tocCount} sections`
    : `<code>${escapeHtml(title)}</code> wiki`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0e0e10;
    --surface: #161618;
    --border: #2a2a2e;
    --fg: #eaeaea;
    --muted: #8d8d94;
    --accent: #6c8cff;
    --code-bg: #1a1a1d;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  .shell {
    display: grid;
    grid-template-columns: 290px 1fr;
    min-height: 100vh;
  }
  @media (max-width: 900px) {
    .shell { grid-template-columns: 1fr; }
    .sidebar { position: static !important; height: auto !important; max-height: none !important; border-right: 0; border-bottom: 1px solid var(--border); }
  }
  .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    max-height: 100vh;
    overflow-y: auto;
    padding: 1.5rem 1.25rem 2rem;
    background: var(--surface);
    border-right: 1px solid var(--border);
    font-size: 0.88rem;
  }
  .sidebar h1 { margin: 0 0 0.3rem; font-size: 1.05rem; color: var(--fg); }
  .sidebar .subtitle { margin: 0 0 1.4rem; font-size: 0.78rem; color: var(--muted); }
  .sidebar input[type="search"] {
    width: 100%;
    padding: 0.4rem 0.55rem;
    margin-bottom: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--code-bg);
    color: var(--fg);
    font-size: 0.85rem;
  }
  .toc { display: flex; flex-direction: column; gap: 0.15rem; }
  .toc a {
    color: var(--muted);
    text-decoration: none;
    padding: 0.25rem 0.35rem;
    border-radius: 3px;
    border-left: 2px solid transparent;
    transition: background 0.08s, color 0.08s;
  }
  .toc a:hover { color: var(--fg); background: rgba(108, 140, 255, 0.08); }
  .toc a.active { color: var(--fg); border-left-color: var(--accent); background: rgba(108, 140, 255, 0.12); }
  .toc a.toc-l2 { padding-left: 0.35rem; font-weight: 600; }
  .toc a.toc-l3 { padding-left: 1rem; font-weight: 400; color: var(--muted); }
  .toc a.hidden { display: none; }

  .content { padding: 2.5rem 3rem 5rem; max-width: 920px; width: 100%; }
  @media (max-width: 900px) { .content { padding: 1.5rem 1.25rem 3rem; } }

  h1 { font-size: 1.85rem; line-height: 1.2; margin: 2.5rem 0 0.8rem; }
  h1:first-child { margin-top: 0; }
  h2 { font-size: 1.4rem; line-height: 1.25; margin: 2.3rem 0 0.7rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--border); }
  h3 { font-size: 1.12rem; line-height: 1.3; margin: 1.7rem 0 0.5rem; }
  h4 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 1.3rem 0 0.4rem; }
  h1, h2, h3, h4 { scroll-margin-top: 1rem; }

  p { margin: 0 0 1rem; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  ul, ol { margin: 0 0 1rem; padding-left: 1.4rem; }
  ul li, ol li { margin-bottom: 0.25rem; }
  hr { border: 0; border-top: 1px solid var(--border); margin: 2rem 0; }

  code {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.88em;
    padding: 0.1em 0.35em;
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 3px;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 0.9rem 1rem;
    overflow-x: auto;
    line-height: 1.55;
    font-size: 0.87rem;
    margin: 0 0 1rem;
  }
  pre code { padding: 0; border: 0; background: transparent; font-size: inherit; }

  blockquote {
    margin: 0 0 1rem;
    padding: 0.35rem 1rem;
    border-left: 3px solid var(--accent);
    background: rgba(108, 140, 255, 0.06);
    color: var(--fg);
  }
  blockquote p { margin: 0.3rem 0; }

  table { border-collapse: collapse; width: 100%; margin: 0 0 1rem; font-size: 0.9rem; }
  table th, table td { border: 1px solid var(--border); padding: 0.4rem 0.65rem; text-align: left; vertical-align: top; }
  table th { background: var(--code-bg); font-weight: 600; }
  table tr:nth-child(even) td { background: rgba(255, 255, 255, 0.02); }

  strong { color: var(--fg); font-weight: 700; }
  em { color: #dcdce2; }

  .foot {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.78rem;
  }
  .foot code { font-size: 0.82rem; }
</style>
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">teach-as-you-build wiki</p>
    <input id="search" type="search" placeholder="Filter sections…" autocomplete="off" />
    <nav class="toc" id="toc">
        ${tocHtml}
    </nav>
  </aside>
  <main class="content" id="content">
    ${bodyHtml}
    <div class="foot">
      ${sourceNote}. Regenerate with <code>npm run build:wiki</code>.
    </div>
  </main>
</div>
<script>
  (function () {
    const search = document.getElementById('search')
    const tocLinks = Array.from(document.querySelectorAll('#toc a'))

    if (search) {
      search.addEventListener('input', function () {
        const q = search.value.trim().toLowerCase()
        tocLinks.forEach(function (a) {
          const match = !q || a.textContent.toLowerCase().includes(q)
          a.classList.toggle('hidden', !match)
        })
      })
    }

    const headingEls = tocLinks
      .map(function (a) { return document.querySelector(a.getAttribute('href')) })
      .filter(Boolean)

    function updateActive() {
      const y = window.scrollY + 80
      let activeIdx = 0
      for (let i = 0; i < headingEls.length; i++) {
        if (headingEls[i].offsetTop <= y) activeIdx = i
      }
      tocLinks.forEach(function (a, i) { a.classList.toggle('active', i === activeIdx) })
    }
    window.addEventListener('scroll', updateActive, { passive: true })
    updateActive()
  })()
</script>
</body>
</html>
`
}
