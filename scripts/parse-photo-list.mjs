#!/usr/bin/env node
/**
 * Parse the loose narrative output a chat UI produced from book photos
 * (when the model added IMAGE headings, indented sub-lists, bracketed
 * unreadable spines, and series-only mentions instead of obeying the
 * strict pipe-delimited format).
 *
 * Output: scripts/enrich-books.mjs-compatible "Title | Authors | ISBN".
 *
 * Usage:
 *   node scripts/parse-photo-list.mjs <input.txt> <output.txt>
 *
 * Rules:
 *   - Lines starting with "- " or "* " are candidates.
 *   - Lines containing only "[bracketed]" notes are skipped (unreadable
 *     spine, no real title).
 *   - Lines mentioning "series" with a count and no specific title are
 *     skipped (series-only mention, no individual book identified).
 *   - When a parent line introduces a sub-list ("Multiple Alice Hoffman
 *     novels:"), child "* Title" lines inherit the author from the
 *     parent.
 *   - "Title by Author" → split on " by " (last occurrence).
 *   - Bracketed annotations after the author are stripped.
 *   - Duplicate (title, author) pairs are deduped.
 *   - Output: lowercase-trimmed for dedup, original case kept for
 *     display.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/parse-photo-list.mjs <input.txt> <output.txt>');
  process.exit(1);
}

const text = readFileSync(inputPath, 'utf8');
const lines = text.split(/\r?\n/);

const out = [];
const seen = new Set();
const skipped = [];

let inheritedAuthor = '';
let lastListWasSubItems = false;

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const trimmed = raw.trim();
  if (!trimmed) continue;

  // Detect parent-line patterns that introduce indented lists, e.g.:
  //   - Multiple Alice Hoffman novels:
  //   - Margaret Atwood titles:
  //   - George R.R. Martin works:
  //   - Pullman's His Dark Materials:
  //   - Cassandra Clare's Clockwork Series:
  const parentAuthorMatch = trimmed.match(
    /^[-*]\s+(?:Multiple\s+)?(?:[A-Z][^:]*?)\s+(?:novels|titles|works|trilogy|series|chronicles)\s*:\s*$/i,
  );
  if (parentAuthorMatch) {
    // Pull author from the line.
    const stripped = trimmed
      .replace(/^[-*]\s+/, '')
      .replace(/^Multiple\s+/i, '')
      .replace(/(?:'s)?\s+(?:novels|titles|works|trilogy|series|chronicles)\s*:\s*$/i, '');
    inheritedAuthor = stripped.trim();
    lastListWasSubItems = true;
    continue;
  }

  // Sub-item lines (typically indented "* Title" or "  * Title")
  if (/^\*\s+/.test(trimmed) && lastListWasSubItems) {
    const title = trimmed.replace(/^\*\s+/, '').trim();
    if (!isReal(title)) { skipped.push({ kind: 'bracketed', line: trimmed }); continue; }
    const cleaned = stripBrackets(title);
    if (!cleaned) continue;
    pushBook(cleaned, inheritedAuthor);
    continue;
  }

  // Top-level list items
  if (/^[-*]\s+/.test(trimmed)) {
    // Reset inherited author on a top-level dash unless it itself names one
    const body = trimmed.replace(/^[-*]\s+/, '').trim();

    // Skip pure-bracketed lines (no real book name)
    if (/^\[/.test(body)) { skipped.push({ kind: 'bracketed', line: trimmed }); continue; }

    // Skip series-mention lines without a specific title:
    //   - Complete Dune series by Frank Herbert (3 books)
    //   - Fablehaven series by Brandon Mull (5 books)
    //   - Complete Harry Potter series by J.K. Rowling
    if (/\bseries\b/i.test(body) && /\(\d+\s*books?\)/i.test(body)) {
      skipped.push({ kind: 'series-mention', line: trimmed });
      continue;
    }
    if (/^Complete\s+.*\bseries\b/i.test(body) || /^.*\bseries\b\s+by\s+/i.test(body)) {
      skipped.push({ kind: 'series-mention', line: trimmed });
      continue;
    }

    // Bullet-like wrappers e.g. "- Frederick Backman (multiple)" → skip
    if (/\((multiple|various)\)/i.test(body)) {
      skipped.push({ kind: 'vague-mention', line: trimmed });
      continue;
    }

    // Skip catch-all lines that aren't book titles, e.g.:
    //   - Psychological thrillers and contemporary bestsellers
    //   - Classic literature mixed with contemporary bestsellers
    if (/\bbestsellers\b|\bpsychological thrillers\b/i.test(body) && !/\bby\b/i.test(body)) {
      skipped.push({ kind: 'vague-mention', line: trimmed });
      continue;
    }

    // "Cookbooks: A, B, C, D" — explode into individual titles
    if (/^Cookbooks?:\s*/i.test(body)) {
      const list = body.replace(/^Cookbooks?:\s*/i, '');
      for (const t of list.split(',').map((s) => s.trim()).filter(Boolean)) {
        pushBook(stripBrackets(t), '');
      }
      lastListWasSubItems = false;
      continue;
    }

    const parsed = splitTitleAuthor(body);
    if (!parsed.title) { skipped.push({ kind: 'unparsed', line: trimmed }); continue; }

    pushBook(parsed.title, parsed.author);
    lastListWasSubItems = false;
    continue;
  }

  // Lines that aren't list items but might still be a title (Image 1 was
  // formatted as "IMAGE 1: A Sound of Thunder by Ray Bradbury (...)").
  const imageMatch = trimmed.match(/^IMAGE\s+\d+\s*:\s*(.+)$/i);
  if (imageMatch && / by /i.test(imageMatch[1])) {
    const parsed = splitTitleAuthor(imageMatch[1]);
    if (parsed.title) pushBook(parsed.title, parsed.author);
  }
}

function pushBook(rawTitle, author) {
  const title = stripBrackets(rawTitle).trim();
  const a = stripBrackets(author).trim();
  if (!title) return;
  const key = `${title.toLowerCase()}::${a.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(`${title} | ${a} |`);
}

function splitTitleAuthor(s) {
  // Find the LAST " by " — "by" at the start of a word, surrounded by spaces.
  const matches = [...s.matchAll(/\s+by\s+/gi)];
  if (matches.length === 0) {
    return { title: stripBrackets(s).trim(), author: '' };
  }
  const last = matches[matches.length - 1];
  const splitIdx = last.index;
  const title = s.slice(0, splitIdx);
  const after = s.slice(splitIdx + last[0].length);
  // After-author bracketed annotation: "Joe Hill [Black]" → strip
  const author = stripBrackets(after).split('(')[0].trim();
  return { title: stripBrackets(title).trim(), author };
}

function stripBrackets(s) {
  return s
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isReal(s) {
  const t = s.trim();
  if (t.startsWith('[') && t.endsWith(']')) return false;
  return t.length > 0;
}

writeFileSync(outputPath, out.join('\n') + '\n');

console.log(`Wrote ${out.length} unique books → ${outputPath}`);
console.log(`Skipped ${skipped.length} lines:`);
const breakdown = skipped.reduce((m, s) => ((m[s.kind] = (m[s.kind] || 0) + 1), m), {});
for (const [kind, count] of Object.entries(breakdown)) {
  console.log(`  ${kind}: ${count}`);
}
