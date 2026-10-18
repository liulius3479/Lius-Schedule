


const $ = (s) => document.querySelector(s);


const $$ = (s) => document.querySelectorAll(s);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

let lastAddedIndex = -1;

function formatLocalDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}



function toMin(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}

function fromMin(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function fmtHm(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? `${parseInt(m[1], 10)}:${m[2]}` : '';
}


function sectionRangeText(s) {
  const cfg = state.config;
  const st = fmtHm(cfg.sectionStartTimes && cfg.sectionStartTimes[s - 1]);
  const et = fmtHm(cfg.sectionEndTimes && cfg.sectionEndTimes[s - 1]);
  if (st && et) return `${st}-${et}`;
  return st || et || '';
}

function getMondayOfWeek(weekNum) {
  if (!state.config.startDate) return new Date();
  const start = new Date(state.config.startDate + 'T00:00:00');
  const day = start.getDay() === 0 ? 7 : start.getDay();
  const monday = new Date(start);
  monday.setDate(start.getDate() - (day - 1) + (weekNum - 1) * 7);
  return monday;
}



function expandWeeks(w) {
  if (!w) return Array.from({ length: 40 }, (_, i) => i + 1);
  let ranges = w.ranges;
  if (!ranges) ranges = [[ w.start ?? 1, w.end ?? 40 ]];
  const parity = w.parity || 'all';
  const set = new Set();
  for (const [a, b] of ranges) {
    for (let i = Math.max(1, a); i <= b; i++) {
      if (parity === 'odd' && i % 2 === 0) continue;
      if (parity === 'even' && i % 2 === 1) continue;
      set.add(i);
    }
  }
  return [...set].sort((x, y) => x - y);
}

function formatWeeks(w) {
  if (!w) return '每周';
  let ranges = w.ranges;
  if (!ranges) ranges = [[ w.start ?? 1, w.end ?? 40 ]];
  const parity = w.parity || 'all';
  const p = parity === 'odd' ? '(单)' : parity === 'even' ? '(双)' : '';
  const s = ranges.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(',');
  return `第${s}周${p}`;
}

function currentWeek() {
  if (!state.config.startDate) return 1;
  const start = new Date(state.config.startDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.floor((now - start) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

function calculateWeek(dateStr) {
  if (!state.config.startDate) return 1;
  const start = new Date(state.config.startDate + 'T00:00:00');
  // 对齐到开学那一周的周一，保证与课程表的自然周一致
  const startMon = new Date(start.getTime());
  startMon.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const d = new Date(dateStr + 'T00:00:00');
  const days = Math.floor((d - startMon) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

function hexToRgbStr(hex) {
  const h = String(hex).replace('#', '').trim();
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const int = parseInt(n, 16);
  if (isNaN(int)) return '91,124,250';
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
}

function bindSwipe(el, onLeft, onRight) {
  if (!el) return;
  let sx = 0, sy = 0, st = 0;
  el.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st > 900) return;
    if (Math.abs(dx) < 50) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.3) return;
    if (dx < 0) onLeft(); else onRight();
  }, { passive: true });
}







function bindNoSelect() {
  const editable = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return el.isContentEditable === true;
  };
  document.addEventListener('selectstart', (e) => {
    if (!editable(e.target)) e.preventDefault();
  }, true);
  document.addEventListener('contextmenu', (e) => {
    if (!editable(e.target)) e.preventDefault();
  }, true);
  document.addEventListener('dragstart', (e) => {
    if (!editable(e.target)) e.preventDefault();
  }, true);
}





function coursesOn(dateObj) {
  const ds = formatLocalDate(dateObj);
  const wd = dateObj.getDay() || 7;
  const wk = calculateWeek(ds);
  return state.courses.filter(c => {
    if (Array.isArray(c.skip) && c.skip.indexOf(ds) >= 0) return false;
    if (c.date) return c.date === ds;
    return c.weekday === wd && expandWeeks(c.weeks).indexOf(wk) >= 0;
  }).sort((a, b) => (a.startSection || 1) - (b.startSection || 1));
}
