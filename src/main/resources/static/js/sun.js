// Real time of day in Essen (51.46 N, 7.01 E), whatever time zone the device is in.
// Sun elevation from the usual NOAA approximation: good to a fraction of a degree.
const LAT = 51.4556, LON = 7.0116;
const rad = Math.PI / 180;

export function sun(date = new Date()) {
  const ms = date.getTime();
  const day = ms / 86400000 + 2440587.5 - 2451545.0;          // days since J2000
  const g = (357.529 + 0.98560028 * day) * rad;                 // mean anomaly
  const q = 280.459 + 0.98564736 * day;                         // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * day) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * day) % 24;
  const ha = ((gmst * 15 + LON) * rad - ra);
  const elev = Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
  // hour angle in -180..180: negative before noon (east), positive after (west)
  let h = (ha / rad) % 360; if (h > 180) h -= 360; if (h < -180) h += 360;
  return { elev, hourAngle: h };
}

/** 0 at night, 1 in full daylight, smooth through civil twilight. */
export function daylight(elev) {
  return Math.max(0, Math.min(1, (elev + 6) / 14));
}

/** Clock in Germany (Europe/Berlin). */
export function berlinHour(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Berlin' }).formatToParts(date);
  const hh = +p.find((x) => x.type === 'hour').value, mm = +p.find((x) => x.type === 'minute').value;
  return hh + mm / 60;
}

export function berlinTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(date);
}

/** Sky colours for an elevation: top and horizon. */
export function skyColors(elev) {
  const keys = [
    [-18, '#141a33', '#25264a'], [-6, '#252a52', '#5a4a72'], [-2, '#4a4d82', '#e0907a'], [3, '#6f9fd0', '#f2c49a'],
    [12, '#7fb4e2', '#cfe6f2'], [40, '#78b0e4', '#d8ecf4']];
  if (elev <= keys[0][0]) return { top: keys[0][1], bottom: keys[0][2] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, t1, b1] = keys[i], [b, t2, b2] = keys[i + 1];
    if (elev <= b) { const k = (elev - a) / (b - a); return { top: mixHex(t1, t2, k), bottom: mixHex(b1, b2, k) }; }
  }
  return { top: keys[keys.length - 1][1], bottom: keys[keys.length - 1][2] };
}

function mixHex(a, b, t) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * t);
  return '#' + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('');
}
