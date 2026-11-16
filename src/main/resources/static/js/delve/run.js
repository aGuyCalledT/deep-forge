// The delve from the hold: an adventurer (Dwarves tab, job "adventurer") goes down into the mine and you play them.
// delveStart gives the run (seed, hearts, pick, damage, Delve.java), the game plays it in the browser, delveEnd
// reports it and the server decides what is kept. Started from the Mines tab or the "Delve" tool in the mine screen.
import { G, F, now, dur, fullName } from '../core/data.js';
import { bus, toast } from '../ui/ui.js';
import { look48 } from '../art/dwarves.js';
import { openDelve } from './ui.js';

/** Adventurers of the hold: who can go now, who is still hurt. */
export function adventurers() {
  const f = F();
  return f.dwarves.filter((d) => d.job === 'adventurer').map((d) => ({ d, rest: Math.max(0, (d.delveRest || 0) - now()), away: d.busy && d.busy !== 'delve' }));
}

/** Send an adventurer down (the first who is ready, or the one given). */
export async function delve(id) {
  const list = adventurers();
  if (!list.length) return toast('No adventurer yet. Give a dwarf the adventurer job in the Dwarves tab.', 'bad');
  const a = list.find((x) => (id == null || x.d.id === id) && !x.rest && !x.away);
  if (!a) {
    const r = list.filter((x) => x.rest).sort((p, q) => p.rest - q.rest)[0];
    return toast(r ? `${fullName(r.d)} is still hurt. Back in ${dur(r.rest)}.` : 'Every adventurer is away.', 'bad');
  }
  const s = await bus.act({ type: 'delveStart', dwarf: a.d.id });
  if (!s || !F().delve) return;
  const run = F().delve, d = F().dwarves.find((x) => x.id === run.dwarf);
  window.__delve = openDelve({
    run, data: G.data, look: look48(d, { hat: 'miner' }),
    onEnd: async (r) => {
      const res = await bus.act({ type: 'delveEnd', id: run.id, result: r.result, levels: r.levels, ore: r.ore }, true, true);
      const log = res && res.fortress.log;
      return { text: log && log.length ? log[log.length - 1].text : '' };
    },
    onClose: () => bus.render && bus.render(),
  });
}
