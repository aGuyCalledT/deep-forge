// The own account (change password, delete account) and the admins' list of every account. All under More.
import { G, ago } from '../core/data.js';
import { h, openSheet, closeSheet, toast, statusIco, bus } from '../ui/ui.js';
import { api, setToken } from '../core/api.js';

const row = (...kids) => h('div', { class: 'row', style: { marginTop: '12px' } }, kids);

/** A form in a window: fields, one line for what went wrong, the buttons. `send` returns after the server said yes. */
function formSheet(title, lead, fields, button, send) {
  const err = h('p', { class: 'error', role: 'alert' });
  const go = h('button', { class: 'btn ' + (button.cls || 'primary'), type: 'submit' }, button.text);
  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      err.textContent = '';
      go.disabled = true;
      try { await send(); } catch (x) { err.textContent = x.message; }
      go.disabled = false;
    },
  }, lead ? h('p', { class: 'small muted' }, lead) : null, fields, err,
    row(go, h('button', { class: 'btn', type: 'button', onclick: closeSheet }, 'Cancel')));
  const win = h('div', null, h('h2', null, title), form);   // the first heading of a window becomes its nameplate
  openSheet(() => win, null, 'neutral');
}

const field = (label, input) => h('label', null, label, input);
const pw = (autocomplete) => h('input', { type: 'password', autocomplete, required: true, minLength: 8, maxLength: 200 });

export function openPasswordSheet() {
  const old = pw('current-password'), neu = pw('new-password'), again = pw('new-password');
  formSheet('Change password', 'Other devices are logged out. This one stays in.',
    [field('Current password', old), field('New password (8 or more characters)', neu), field('New password again', again)],
    { text: 'Change password' },
    async () => {
      if (neu.value !== again.value) throw new Error('The two new passwords differ. Type them again.');
      const r = await api.post('/account/password', { old: old.value, password: neu.value });
      setToken(r.token);
      closeSheet();
      toast('Password changed.', 'good');
    });
}

export function openDeleteSheet() {
  const pass = pw('current-password');
  formSheet('Delete account',
    `This removes ${G.me ? G.me.name : 'your account'} and the whole hold for good: dwarves, stores, artifacts. Nobody can bring it back.`,
    [field('Your password, to be sure', pass)],
    { text: 'Delete my account', cls: 'danger' },
    async () => {
      await api.post('/account/delete', { password: pass.value });
      setToken(null);
      location.reload();
    });
}

// ------------------------------------------------------------------ admins

function resetSheet(name) {
  const neu = h('input', { type: 'text', autocomplete: 'off', required: true, minLength: 8, maxLength: 200 });
  formSheet('New password for ' + name, 'Tell them the new password. They are logged out everywhere.',
    [field('New password (8 or more characters)', neu)], { text: 'Set password' },
    async () => {
      await api.post('/admin/password', { name, password: neu.value });
      closeSheet();
      toast(`${name} has a new password.`, 'good');
      stale();
    });
}

function removeSheet(a) {
  formSheet('Delete ' + a.name + '?',
    `${a.hold ? a.hold + ' (level ' + a.level + ', ' + a.dwarves + ' dwarves)' : 'This account'} is removed for good. Nobody can bring it back.`,
    null, { text: 'Delete ' + a.name, cls: 'danger' },
    async () => {
      await api.post('/admin/delete', { name: a.name });
      closeSheet();
      toast(`${a.name} is deleted.`, 'good');
      stale();
    });
}

function accountRow(a) {
  const me = G.me && G.me.name === a.name;
  const seen = a.lastVisit ? 'seen ' + ago(a.lastVisit) : a.hold ? 'never looked in' : 'no hold yet';
  return h('div', { class: 'account' },
    h('div', { class: 'account-who' },
      h('b', null, a.name), a.admin ? h('span', { class: 'chip gold' }, 'admin') : null, me ? h('span', { class: 'chip' }, 'you') : null,
      h('div', { class: 'small muted' }, a.broken ? [statusIco('warn', 'icon s'), ' save cannot be read'] : a.hold ? `${a.hold} · level ${a.level} · ${a.dwarves} dwarves` : 'No hold'),
      h('div', { class: 'small dim' }, `${seen} · joined ${ago(a.created)} · ${a.sessions} device${a.sessions === 1 ? '' : 's'} logged in`)),
    h('div', { class: 'account-btns' },
      h('button', { class: 'btn small', onclick: () => resetSheet(a.name) }, 'Password'),
      h('button', {
        class: 'btn small', disabled: !a.sessions || me, title: me ? 'Use Log out under Settings.' : '',
        onclick: async () => {
          try { await api.post('/admin/logout', { name: a.name }); toast(`${a.name} is logged out everywhere.`, 'good'); stale(); } catch (e) { toast(e.message, 'bad'); }
        },
      }, 'Log out'),
      h('button', { class: 'btn small danger', disabled: me, title: me ? 'Delete your own account under Settings.' : '', onclick: () => removeSheet(a) }, 'Delete')));
}

// The More tab is drawn anew with every poll: keep the last list and ask the server again only now and then.
let known = null, askedAt = 0;
const stale = () => { askedAt = 0; bus.render(); };

/** Every account with its hold: reset a password, log a player out everywhere, delete an account. */
export function adminSection() {
  const box = h('div', { class: 'card accounts' });
  const draw = () => box.replaceChildren(
    h('p', { class: 'small muted' }, `${known.length} account${known.length === 1 ? '' : 's'}.`),
    ...known.map(accountRow));
  if (known) draw(); else box.append(h('p', { class: 'muted' }, 'Loading...'));
  if (Date.now() - askedAt > 30000) {
    askedAt = Date.now();
    api.get('/admin/users').then((list) => { known = list; draw(); })
      .catch((e) => { askedAt = 0; if (!known) box.replaceChildren(h('p', { class: 'bad-t' }, e.message + ' Open More again to retry.')); });
  }
  return box;
}
