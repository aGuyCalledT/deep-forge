// Patch notes: patchnotes.json (newest first) is written for every release on the main branch. The More tab shows the
// newest one in short with its full list folded away, older ones folded too; a hint chip tells about a release once.
import { h } from './ui.js';

const KEY = 'deepforge.notesSeen';
let list = [];

export async function loadNotes() {
  try { list = await (await fetch('patchnotes.json', { cache: 'no-cache' })).json(); } catch { list = []; }
  return list;
}
export const latest = () => list[0] || null;
function seen() { try { return localStorage.getItem(KEY); } catch { return null; } }
/** The newest release, if this player has not looked at its notes yet. */
export function unseenNotes() { const n = latest(); return n && seen() !== n.version ? n : null; }
export function markNotesSeen() { const n = latest(); if (n) try { localStorage.setItem(KEY, n.version); } catch { /* fine */ } }

const full = (n) => n.details.map((d) => h('div', { class: 'notes-group' }, h('h4', null, d.head), h('ul', null, d.items.map((x) => h('li', null, x)))));

/** The "What's new" card for the More tab. */
export function notesView() {
  const n = latest();
  if (!n) return null;
  return h('div', { class: 'card notes' },
    h('p', { class: 'notes-head' }, h('b', null, `${n.version} · ${n.title}`), h('span', { class: 'small dim' }, n.date)),
    h('ul', { class: 'notes-short' }, n.short.map((x) => h('li', null, x))),
    h('details', { class: 'notes-more' }, h('summary', null, 'All changes'), ...full(n)),
    list.slice(1).map((o) => h('details', { class: 'notes-more' }, h('summary', null, `${o.version} · ${o.title}`),
      h('ul', { class: 'notes-short' }, o.short.map((x) => h('li', null, x))), ...full(o))));
}
