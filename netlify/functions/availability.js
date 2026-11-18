// Villa Oceania: live availability feed.
// Reads the VRBO calendar (and an optional Airbnb calendar) on the server and returns
// only the booked date ranges. Guest names and every other field are dropped here,
// so they never reach the browser.
//
// Response: { "updated": "<ISO time>", "booked": [ { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } ] }
// "end" is the check-out date, so it is NOT a booked night.
// On any problem: HTTP 200 with { "booked": [], "error": true } so the page still loads.

const DEFAULT_VRBO_ICAL_URL =
  'https://www.vrbo.com/icalendar/4d6ded289a214137a435065a0a286d25.ics?nonTentative';

const OK_CACHE = 'public, max-age=300, s-maxage=900';
// Errors are cached briefly so a short VRBO outage clears itself within a minute.
const ERROR_CACHE = 'public, max-age=60, s-maxage=60';

function json(body, cache) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
    },
    body: JSON.stringify(body),
  };
}

async function fetchCalendar(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/calendar, text/plain, */*', 'User-Agent': 'VillaOceania-Availability/1.0' },
    });
    if (!res.ok) throw new Error('Calendar request failed with status ' + res.status);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('Response is not an iCal calendar');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// "20261128" or "20261128T150000Z" -> "2026-11-28"
function toISODate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value || '');
  if (!m) return null;
  return m[1] + '-' + m[2] + '-' + m[3];
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Pull DTSTART / DTEND out of every VEVENT. Nothing else is read.
function parseCalendar(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/); // unfold long lines first
  const ranges = [];
  let inEvent = false;
  let start = null;
  let end = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; start = null; end = null; continue; }
    if (line === 'END:VEVENT') {
      if (inEvent && start) {
        let e = end;
        if (!e || e <= start) e = addDays(start, 1); // a date with no end blocks one night
        ranges.push({ start: start, end: e });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(';')[0].toUpperCase();
    const value = line.slice(colon + 1).trim();
    if (name === 'DTSTART') start = toISODate(value);
    else if (name === 'DTEND') end = toISODate(value);
  }
  return ranges;
}

// Sort, drop stays that are already over, and join overlapping or back-to-back stays.
function mergeRanges(ranges, todayISO) {
  const sorted = ranges
    .filter((r) => r.end > todayISO)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) {
      if (r.end > last.end) last.end = r.end;
    } else {
      out.push({ start: r.start, end: r.end });
    }
  }
  return out;
}

exports.handler = async function () {
  const urls = [process.env.VRBO_ICAL_URL || DEFAULT_VRBO_ICAL_URL];
  if (process.env.AIRBNB_ICAL_URL) urls.push(process.env.AIRBNB_ICAL_URL);

  try {
    const calendars = await Promise.all(urls.map(fetchCalendar));
    const all = [];
    for (const text of calendars) all.push(...parseCalendar(text));
    const todayISO = new Date().toISOString().slice(0, 10);
    return json({ updated: new Date().toISOString(), booked: mergeRanges(all, todayISO) }, OK_CACHE);
  } catch (err) {
    console.error('availability: ' + (err && err.message ? err.message : err));
    return json({ booked: [], error: true }, ERROR_CACHE);
  }
};

// Exposed for local tests only.
exports._internal = { parseCalendar, mergeRanges, toISODate };
