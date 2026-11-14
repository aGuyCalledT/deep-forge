// Sound effects, ambient loops and music.
// Every sound has an id. Its file is static/sounds/<file>.mp3 (or .ogg/.m4a/.wav). If the file is missing,
// the fallback id is played instead, or nothing. So placeholder ids work today and get their sound the
// moment a file with that name is dropped into the sounds folder (list: docs/AUDIO.md).
// Music: every file in static/music. The part before "-" is the mood (chill, industry, market, ...).

const KEY = 'deepforge-audio';
const EXT = ['mp3', 'ogg', 'm4a', 'wav'];

/** id -> { file, vol, fallback, cooldown (ms), max (seconds to play, then fade) } */
export const SFX = {
  // interface
  click: { file: 'click', vol: 0.35, cooldown: 40 },
  open: { file: 'pop', vol: 0.35 },
  close: { file: 'pop2', vol: 0.35 },
  error: { file: 'error', vol: 0.5, fallback: null },
  // fortress
  build: { file: 'build', vol: 0.55, fallback: 'anvil' },
  levelup: { file: 'level-up', vol: 0.6, fallback: 'fanfare' },
  fanfare: { file: 'fanfare', vol: 0.5 },
  chime: { file: 'table-chime', vol: 0.5 },
  coins: { file: 'coins', vol: 0.55, fallback: 'chime' },
  collect: { file: 'collect', vol: 0.6, fallback: 'fanfare' },
  bell: { file: 'bell2', vol: 0.5 },
  alarm: { file: 'bell', vol: 0.6 },
  death: { file: 'death-toll', vol: 0.6, fallback: null },
  cheer: { file: 'dwarf-cheer', vol: 0.5, fallback: null },
  door: { file: 'door-creak', vol: 0.5, fallback: null },
  // workshops
  anvil: { file: 'anvil-hit', vol: 0.45, cooldown: 300 },
  ignite: { file: 'igniting-fire', vol: 0.45, cooldown: 4000, max: 2.5 },
  bellows: { file: 'bellows-puff', vol: 0.4, fallback: null, cooldown: 90 },
  quench: { file: 'quench-hiss', vol: 0.55, fallback: null },
  pickaxe: { file: 'pickaxe-hit', vol: 0.3, cooldown: 400 },
  slosh: { file: 'barrel-slosh', vol: 0.4, fallback: 'click', cooldown: 120 },
  grind: { file: 'grind-scrape', vol: 0.3, fallback: null, cooldown: 600 },
  rune: { file: 'rune-tap', vol: 0.4, fallback: 'click' },
  shuttle: { file: 'shuttle-clack', vol: 0.4, fallback: 'click' },
  moo: { file: 'cow-moo', vol: 0.35, cooldown: 30000 },
  // war
  unsheathe: { file: 'unsheathing-sword', vol: 0.45 },
  unsheathe2: { file: 'unsheathing-sword2', vol: 0.45 },
  march: { file: 'armored-march', vol: 0.45, max: 4 },
  slash: { file: 'sword-slash', vol: 0.45, max: 1.2 },
  slash2: { file: 'medium-sword-slash', vol: 0.45 },
  slash3: { file: 'heavy-sword-slash', vol: 0.45 },
  parry: { file: 'sword-parry', vol: 0.45 },
  parry2: { file: 'heavy-sword-parry', vol: 0.45 },
  hit: { file: 'sword-armor-hit', vol: 0.45 },
  hit2: { file: 'heavy-sword-armor-hit', vol: 0.45 },
  monster: { file: 'monster-roar', vol: 0.55, fallback: 'parry2' },
  horn: { file: 'goblin-horn', vol: 0.55, fallback: 'alarm' },
  defeat: { file: 'defeat', vol: 0.55, fallback: 'hit2' },
  // trade & expeditions
  caravan: { file: 'caravan-depart', vol: 0.5, fallback: 'bell' },
  expedition: { file: 'expedition-depart', vol: 0.5, fallback: 'march' },
};

/** Ambient loops: id -> { file, vol, fallback } (fallback may be a one-shot id to repeat). */
export const LOOPS = {
  forge: { file: 'anvil-hit-continuous', vol: 0.22 },
  furnace: { file: 'furnace-roar', vol: 0.25 },
  grindstone: { file: 'grindstone-loop', vol: 0.25 },
  brewing: { file: 'brewing-bubbles', vol: 0.25 },
  tavern: { file: 'tavern-ambience', vol: 0.2 },
  mine: { file: 'mine-ambience', vol: 0.25 },
  night: { file: 'night-ambience', vol: 0.18 },
};

const files = { sounds: new Set(), music: [] };
const pools = new Map();
const lastPlay = new Map();
const loops = new Map();     // id -> Audio
let settings = { music: 0.35, sfx: 0.7, muted: false, auto: true, track: null };
let unlocked = false;
let mood = 'chill';
const music = new Audio();
music.preload = 'none';
let current = null;          // file name of the current track
let fadeTimer = null;
const listeners = new Set();

function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ } }
function notify() { for (const f of listeners) f(); }
export function onChange(f) { listeners.add(f); return () => listeners.delete(f); }

export function initAudio(manifest) {
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* ignore */ }
  for (const n of manifest.sounds || []) files.sounds.add(n);
  // one entry per track name; prefer mp3, then ogg, m4a, wav
  const byBase = new Map();
  for (const n of manifest.music || []) {
    const base = n.replace(/\.[a-z0-9]+$/, ''), ext = n.split('.').pop();
    const prev = byBase.get(base);
    if (!prev || EXT.indexOf(ext) < EXT.indexOf(prev.split('.').pop())) byBase.set(base, n);
  }
  files.music = [...byBase.values()].sort();
  music.addEventListener('ended', () => nextTrack());
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { music.pause(); for (const a of loops.values()) a.pause(); }
    else if (unlocked && !settings.muted) { if (current) music.play().catch(() => {}); for (const a of loops.values()) a.play().catch(() => {}); }
  });
}

function src(file, dir = 'sounds') {
  for (const e of EXT) if (files.sounds.has(file + '.' + e)) return `/${dir}/${file}.${e}`;
  return null;
}

/** The file for a sound id, following fallbacks. */
function resolve(id, seen = new Set()) {
  const s = SFX[id];
  if (!s || seen.has(id)) return null;
  seen.add(id);
  const url = src(s.file);
  if (url) return { url, s };
  return s.fallback ? resolve(s.fallback, seen) : null;
}

export function has(id) { return !!resolve(id); }

/** Play a sound effect. opts: { vol: multiplier, rate } */
export function sfx(id, opts = {}) {
  if (!unlocked || settings.muted || settings.sfx <= 0 || document.hidden) return;
  const r = resolve(id);
  if (!r) return;
  const nowMs = performance.now();
  const cd = SFX[id].cooldown ?? 60;
  if (nowMs - (lastPlay.get(id) || 0) < cd) return;
  lastPlay.set(id, nowMs);
  let pool = pools.get(r.url);
  if (!pool) { pool = []; pools.set(r.url, pool); }
  let a = pool.find((x) => x.paused || x.ended);
  if (!a) {
    if (pool.length >= 4) a = pool[0];
    else { a = new Audio(r.url); a.preload = 'auto'; pool.push(a); }
  }
  a.currentTime = 0;
  a.volume = Math.min(1, (r.s.vol ?? 0.5) * (opts.vol ?? 1) * settings.sfx);
  a.playbackRate = opts.rate ?? (0.94 + Math.random() * 0.12);
  a.play().catch(() => {});
  const max = SFX[id].max ?? r.s.max;
  if (max) {
    const v0 = a.volume;
    setTimeout(() => {
      let k = 0;
      const t = setInterval(() => { k++; a.volume = Math.max(0, v0 * (1 - k / 8)); if (k >= 8) { a.pause(); clearInterval(t); } }, 60);
    }, max * 1000);
  }
}

/** Play several sounds one after another (a fight, for example). */
export function sequence(ids, gap = 240) {
  ids.forEach((id, i) => setTimeout(() => sfx(id, { vol: 0.9 }), i * gap + Math.random() * 60));
}

export function battle(win) {
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const seq = ['unsheathe'];
  for (let i = 0; i < 4; i++) seq.push(pick(['slash', 'slash2', 'slash3', 'parry', 'parry2', 'hit', 'hit2']));
  seq.push(win ? 'cheer' : 'defeat');
  sequence(seq, 260);
}

/** Turn ambient loops on or off. wanted: Set of loop ids. */
export function setLoops(wanted) {
  for (const [id, a] of loops) if (!wanted.has(id) || settings.muted) { fade(a, 0, 600, () => a.pause()); loops.delete(id); }
  if (!unlocked || settings.muted || settings.sfx <= 0 || document.hidden) return;
  for (const id of wanted) {
    if (loops.has(id)) { loops.get(id).volume = LOOPS[id].vol * settings.sfx; continue; }
    const url = src(LOOPS[id].file);
    if (!url) continue;
    const a = new Audio(url);
    a.loop = true;
    a.volume = 0;
    a.play().catch(() => {});
    fade(a, LOOPS[id].vol * settings.sfx, 800);
    loops.set(id, a);
  }
}

function fade(a, to, ms, done) {
  const from = a.volume, steps = Math.max(1, Math.round(ms / 50));
  let k = 0;
  const t = setInterval(() => {
    k++;
    a.volume = Math.max(0, Math.min(1, from + (to - from) * (k / steps)));
    if (k >= steps) { clearInterval(t); if (done) done(); }
  }, 50);
}

// ------------------------------------------------------------------ music

export function trackTitle(name) {
  if (!name) return 'Nothing';
  const base = name.replace(/\.[a-z0-9]+$/, '');
  const [m, ...rest] = base.split('-');
  const t = rest.join(' ').replace(/track\s*(\d+)/i, 'track $1');
  return m[0].toUpperCase() + m.slice(1) + (t ? ' · ' + t[0].toUpperCase() + t.slice(1) : '');
}

export function moodOf(name) { return name.split('-')[0]; }

function playlist() {
  if (!settings.auto) return files.music;
  const l = files.music.filter((n) => moodOf(n) === mood);
  return l.length ? l : files.music;
}

function load(name) {
  current = name;
  music.src = '/music/' + name;
  music.volume = 0;
  if (!settings.muted && unlocked) music.play().then(() => fadeMusic(settings.music)).catch(() => {});
  notify();
}

function fadeMusic(to, done) {
  clearInterval(fadeTimer);
  const from = music.volume, steps = 20;
  let k = 0;
  fadeTimer = setInterval(() => {
    k++;
    music.volume = Math.max(0, Math.min(1, from + (to - from) * (k / steps)));
    if (k >= steps) { clearInterval(fadeTimer); if (done) done(); }
  }, 60);
}

function switchTo(name) {
  if (name === current && !music.paused) return;
  if (current && !music.paused) fadeMusic(0, () => load(name));
  else load(name);
}

function startMusic() {
  if (settings.muted || !files.music.length) return;
  if (!settings.auto && settings.track && files.music.includes(settings.track)) return switchTo(settings.track);
  const l = playlist();
  if (current && l.includes(current)) { music.play().catch(() => {}); fadeMusic(settings.music); return; }
  switchTo(l[Math.floor(Math.random() * l.length)]);
}

export function nextTrack(dir = 1) {
  const l = playlist();
  if (!l.length) return;
  const i = l.indexOf(current);
  const n = l[(i + dir + l.length) % l.length] || l[0];
  if (!settings.auto) settings.track = n;
  save();
  switchTo(n);
}

/** Called when the screen changes: in auto mode the music follows the mood. */
export function setMood(m) {
  if (m === mood) return;
  mood = m;
  if (settings.auto && unlocked && current && moodOf(current) !== m && files.music.some((n) => moodOf(n) === m)) startMusic();
  notify();
}

export function pickTrack(name) {
  settings.auto = false;
  settings.track = name;
  save();
  if (!unlocked) unlocked = true;
  if (settings.muted) { settings.muted = false; save(); }
  switchTo(name);
}

export function setAuto(on) {
  settings.auto = on;
  save();
  if (on) startMusic();
  notify();
}

export function togglePlay() {
  if (!unlocked) unlocked = true;
  if (music.paused || !current) { if (settings.muted) settings.muted = false; save(); startMusic(); }
  else fadeMusic(0, () => music.pause());
  setTimeout(notify, 1300);
}

export function setVolume(kind, v) {
  settings[kind] = v;
  save();
  if (kind === 'music' && !music.paused) music.volume = v;
  if (kind === 'sfx') for (const [id, a] of loops) a.volume = LOOPS[id].vol * v;
  notify();
}

export function setMuted(m) {
  settings.muted = m;
  save();
  if (m) { fadeMusic(0, () => music.pause()); setLoops(new Set()); }
  else { unlocked = true; startMusic(); }
  notify();
}

export function state() {
  return { ...settings, current, playing: !!current && !music.paused, mood, tracks: files.music, unlocked };
}

/** Which placeholder sounds still have no file (for the docs/settings screen). */
export function missing() {
  const out = [];
  for (const [id, s] of Object.entries(SFX)) if (!src(s.file)) out.push(s.file);
  for (const s of Object.values(LOOPS)) if (!src(s.file)) out.push(s.file);
  return [...new Set(out)];
}
