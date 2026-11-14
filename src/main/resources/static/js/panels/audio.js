// The music and sound window.
import { h, img, openSheet, refreshSheet, ico } from '../ui/ui.js';
import * as A from '../core/audio.js';

const MOODS = { chill: 'in the hold, with your dwarves and on expeditions', industry: 'in the mines, the workshops and at war', market: 'when trading' };

export function openAudioSheet() {
  const off = A.onChange(() => refreshSheet());
  const sheet = document.getElementById('sheet');
  const obs = new MutationObserver(() => { if (sheet.hidden) { off(); obs.disconnect(); } });
  obs.observe(sheet, { attributes: true, attributeFilter: ['hidden'] });
  openSheet(() => {
    const s = A.state();
    const missing = A.missing();
    const slider = (kind, label) => h('label', null, `${label} ${Math.round(s[kind] * 100)}%`,
      h('input', { type: 'range', min: 0, max: 100, value: Math.round(s[kind] * 100), class: 'range',
        oninput: (e) => A.setVolume(kind, e.target.value / 100) }));
    return h('div', null,
      h('h2', null, 'Music and sound'),
      h('div', { class: 'card sub now-playing' },
        h('div', { class: 'small muted' }, s.playing ? 'Now playing' : 'Paused'),
        h('div', { class: 'np-title' }, ico('note'), ' ', A.trackTitle(s.current)),
        h('div', { class: 'row', style: { marginTop: '8px' } },
          h('button', { class: 'btn', 'aria-label': 'Previous track', onclick: () => A.nextTrack(-1) }, ico('prev')),
          h('button', { class: 'btn primary', 'aria-label': s.playing ? 'Pause music' : 'Play music', onclick: () => A.togglePlay() }, ico(s.playing ? 'pause' : 'play'), s.playing ? 'Pause' : 'Play'),
          h('button', { class: 'btn', 'aria-label': 'Next track', onclick: () => A.nextTrack(1) }, ico('next')))),
      h('label', { class: 'pick' + (s.auto ? ' on' : '') },
        h('input', { type: 'checkbox', checked: s.auto, onchange: (e) => A.setAuto(e.target.checked) }),
        h('span', { class: 'grow' }, h('b', null, 'Music fits the screen'), h('br'),
          h('span', { class: 'small muted' }, Object.entries(MOODS).filter(([m]) => s.tracks.some((t) => A.moodOf(t) === m)).map(([m, w]) => `${m[0].toUpperCase() + m.slice(1)} ${w}`).join('. ') + '.'))),
      h('h3', null, 'Tracks'),
      s.tracks.length ? h('div', { class: 'list' }, s.tracks.map((t) => h('button', { class: 'pick' + (t === s.current ? ' on' : ''), style: { width: '100%' }, onclick: () => A.pickTrack(t) },
        ico(t === s.current && s.playing ? 'speaker' : 'note'), h('span', { class: 'grow', style: { textAlign: 'left' } }, A.trackTitle(t)),
        h('span', { class: 'small muted' }, A.moodOf(t)))))
        : h('p', { class: 'muted' }, 'No music found. Put files into the music folder.'),
      h('p', { class: 'small dim' }, 'Picking a track turns "fits the screen" off. Then all tracks play in turn.'),
      h('h3', null, 'Volume'),
      slider('music', 'Music'), slider('sfx', 'Effects'),
      h('label', { class: 'pick' + (s.muted ? ' on' : '') },
        h('input', { type: 'checkbox', checked: s.muted, onchange: (e) => A.setMuted(e.target.checked) }),
        ico(s.muted ? 'speaker_off' : 'speaker'), h('span', { class: 'grow' }, 'Mute everything'), h('span', { class: 'small muted' }, 'key M')),
      missing.length ? h('details', { class: 'small', style: { marginTop: '10px' } },
        h('summary', { class: 'muted' }, `${missing.length} sound slots are still empty`),
        h('p', { class: 'dim' }, 'Drop a file with one of these names (mp3, ogg, m4a or wav) into the sounds folder and it plays from then on: '),
        h('p', null, missing.map((m) => h('span', { class: 'chip' }, m)))) : null);
  });
}
