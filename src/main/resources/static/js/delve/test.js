// The test page for the delve (/delve.html): plays at once, without an account, and saves nothing. Only when the
// server allows it (CHEATS=true, /api/auth/info delveTest) or when it runs on this computer. A small panel sets seed,
// first layer, pick, hearts, god mode and the kit; N skips to the next level while playing.
import * as S from '../art/sprites.js';
import * as Art from '../art/scene.js';
import * as DW from '../art/dwarves.js';
import * as A from '../core/audio.js';
import { G, indexData } from '../core/data.js';
import { openDelve, HELP } from './ui.js';

const box = document.getElementById('setup');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const get = (u) => fetch('/api' + u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
const KEY = 'deepforge.delveTest';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* private mode */ }

async function boot() {
  let info = {};
  try { info = await get('/auth/info'); } catch { /* server too old or down */ }
  if (!info.delveTest && !local) {
    box.innerHTML = '<h2>Test delve</h2><p>The test delve is off on this server. Start it with <b>CHEATS=true</b>, or open it on your own computer.</p>';
    return;
  }
  try { await Promise.all(['16px "Jacquard 12"', '16px "Pixelify Sans"'].map((f) => document.fonts.load(f))); } catch { /* fine */ }
  const [data, audio] = await Promise.all([get('/data'), get('/audio').catch(() => ({})), S.loadArt(), Art.load('art/scene/'), DW.load()]);
  G.data = data; indexData(data);
  A.initAudio(audio);
  setup();
}

function setup() {
  const D = G.data.delve, layers = G.data.layers;
  const v = { seed: saved.seed || 1 + Math.floor(Math.random() * 99999), layer: saved.layer || 0, pick: saved.pick || 1, hearts: saved.hearts || D.baseHearts,
    god: !!saved.god, bright: !!saved.bright, kit: saved.kit ?? 2, random: saved.random ?? true };
  box.innerHTML = `<h2>Test delve</h2>
    <p class="dv-dim">Nothing here is saved. A fall only ends the test.</p>
    <form>
      <label for="seed">Seed</label><div class="dv-row" style="margin:0;justify-content:flex-start"><input id="seed" type="number" min="1" value="${v.seed}"><label><input id="random" type="checkbox" ${v.random ? 'checked' : ''}> new each time</label></div>
      <label for="layer">First layer</label><select id="layer">${layers.map((l, i) => `<option value="${i}" ${i === v.layer ? 'selected' : ''}>${l.name}</option>`).join('')}</select>
      <label for="pick">Pick hardness</label><select id="pick">${[1, 2, 3, 4, 5, 6, 7].map((h) => `<option ${h === v.pick ? 'selected' : ''}>${h}</option>`).join('')}</select>
      <label for="hearts">Hearts</label><input id="hearts" type="number" min="1" max="20" value="${v.hearts}">
      <label for="kit">Bombs and ropes</label><input id="kit" type="number" min="0" max="99" value="${v.kit}">
      <label for="god">God mode</label><div><input id="god" type="checkbox" ${v.god ? 'checked' : ''}></div>
      <label for="bright">Lights on</label><div><input id="bright" type="checkbox" ${v.bright ? 'checked' : ''}></div>
      <table class="dv-keys wide">${HELP.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}<tr><td>Next level (test)</td><td>N</td></tr></table>
      <div class="dv-row wide"><button class="btn primary big" type="submit">Delve</button></div>
    </form>`;
  box.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const q = (id) => box.querySelector('#' + id);
    const s = { seed: Math.max(1, +q('seed').value || 1), layer: +q('layer').value, pick: +q('pick').value, hearts: Math.max(1, +q('hearts').value || 2),
      kit: Math.max(0, +q('kit').value || 0), god: q('god').checked, bright: q('bright').checked, random: q('random').checked };
    saved = { ...s, seed: s.random ? 1 + Math.floor(Math.random() * 99999) : s.seed };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* private mode */ }
    play(s);
  };
}

function play(s) {
  let ui = null;
  const skip = (e) => { if (e.code === 'KeyN' && !e.repeat && ui) ui.game.skip(); };
  window.addEventListener('keydown', skip);
  ui = openDelve({
    run: { seed: s.seed, hearts: s.hearts, pick: s.pick, damage: 1 }, data: G.data, name: 'Test Delver', startLayer: s.layer, god: s.god, bright: s.bright, bombs: s.kit, ropes: s.kit,
    onEnd: async (r) => ({ text: `Test run, seed ${s.seed}: ${r.result} after ${r.levels} levels in ${Math.round(r.seconds)} s. Nothing is saved.` }),
    closeLabel: 'Done', onClose: () => { window.removeEventListener('keydown', skip); setup(); },
  });
  window.__delve = ui;
}

boot().catch((e) => { box.innerHTML = `<h2>Test delve</h2><p>Could not start: ${e.message}</p>`; console.error(e); });
