


function renderTimetable() {
  const cfg = state.config;
  const days = 5;
  const wk = state.viewWeek ?? currentWeek();
  const grid = $('#grid');
  const todayStr = formatLocalDate(new Date());

  $('#ttTitle').textContent = `第${wk}周`;
  const monday = getMondayOfWeek(wk);

  grid.style.setProperty('--days', days);
  grid.style.gridTemplateColumns = `52px repeat(${days}, minmax(0,1fr))`;
  grid.innerHTML = '';

  const rowH = [];
  const mk = (cls, html, row, col) => {
    const d = document.createElement('div');
    d.className = 'cell ' + cls;
    if (html !== undefined) d.innerHTML = html;
    if (row) d.style.gridRow = row;
    if (col) d.style.gridColumn = col;
    grid.appendChild(d);
    return d;
  };

  let row = 1;
  rowH.push('46px');
  mk('head', '', row, 1);
  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(monday);
    dateObj.setDate(dateObj.getDate() + (d - 1));
    const isToday = formatLocalDate(dateObj) === todayStr;
    const dateStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
    const headEl = mk('head', `
      <div class="weekday">周${WD_CN[d]}</div>
      <div class="date">${dateStr}</div>
      <div class="dot${isToday ? '' : ' hide'}"></div>
    `, row, d + 1);
    headEl.onclick = () => showDayCourses(d);
  }
  row++;

  const rowOfSec = {};
  for (let s = 1; s <= cfg.sectionsPerDay; s++) {
    rowOfSec[s] = row;
    rowH.push('76px');
    const st = fmtHm(cfg.sectionStartTimes && cfg.sectionStartTimes[s - 1]) || '';
    const et = fmtHm(cfg.sectionEndTimes && cfg.sectionEndTimes[s - 1]) || '';
    mk('time', `<div class="idx">第${CN_IDX[s - 1] || s}节</div><div class="t">${st}</div><div class="t">${et}</div>`, row, 1);
    for (let d = 1; d <= days; d++) mk('slot', '', row, d + 1);
    row++;
  }
  grid.style.gridTemplateRows = rowH.join(' ');

  let shown = 0;
  state.courses
    .filter(c => c.weekday <= days && expandWeeks(c.weeks).includes(wk))
    .forEach(c => {
      shown++;
      const sRow = rowOfSec[c.startSection] || rowOfSec[1];
      const eRow = rowOfSec[Math.min(c.endSection, cfg.sectionsPerDay)] || sRow;
      const b = document.createElement('div');
      b.className = 'course';
      b.style.gridRow = `${sRow} / ${eRow + 1}`;
      b.style.gridColumn = c.weekday + 1;
      if (c.color) {
        b.style.setProperty('--c-rgb', hexToRgbStr(c.color));
        b.setAttribute('data-ccolor', '1');
      }
      if (skipWeekOf(c) === (state.viewWeek ?? currentWeek())) {
        b.classList.add('skipped');
        b.innerHTML += '';
      }
      b.innerHTML = `
        <b>${esc(c.name)}</b>
        ${c.location ? `<small class="at">${esc(c.location)}</small>` : ''}
        ${c.teacher ? `<small class="teacher">${esc(c.teacher)}</small>` : ''}
        ${b.classList.contains('skipped') ? '<span class="skip-star">★</span>' : ''}
      `;
      b.addEventListener('click', () => showDetail(state.courses.indexOf(c)));
      (function () {
        let tm = 0, moved = false, sx = 0, sy = 0;
        b.addEventListener('pointerdown', e => {
          moved = false; sx = e.clientX; sy = e.clientY;
          clearTimeout(tm);
          tm = setTimeout(() => {
            if (!moved) { try { navigator.vibrate && navigator.vibrate(12); } catch (_) {}
              toggleSkipWeek(c); }
          }, 460);
        });
        b.addEventListener('pointermove', e => {
          if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) { moved = true; clearTimeout(tm); }
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(tn => b.addEventListener(tn, () => clearTimeout(tm)));
      })();
      grid.appendChild(b);
    });

  if (!shown) {
    $('#emptyTip').style.display = 'block';
    $('#emptyTip').innerHTML = `第 ${wk} 周没有课程`;
  } else {
    $('#emptyTip').style.display = 'none';
  }
}

function showDayCourses(weekday) {
  const wk = state.viewWeek ?? currentWeek();
  const dayCourses = state.courses.filter(c => 
    c.weekday === weekday && expandWeeks(c.weeks).includes(wk)
  ).sort((a, b) => a.startSection - b.startSection);

  if (dayCourses.length === 0) {
    uiAlert(`周${WD_CN[weekday]} 第 ${wk} 周 没有课程`);
    return;
  }

  const listHtml = dayCourses.map(c => {
    const st = fmtHm((state.config.sectionStartTimes && state.config.sectionStartTimes[c.startSection - 1])) || '';
    const et = fmtHm((state.config.sectionEndTimes && state.config.sectionEndTimes[c.endSection - 1])) || '';
    return `
      <div class="today-course-card" onclick="showDetail(${state.courses.indexOf(c)})" style="margin-bottom: 8px;">
        <div class="left-time" style="width: 60px;">
          <span class="start" style="font-size: 13px;">${st}</span>
          <span class="end" style="font-size: 10px;">${et}</span>
        </div>
        <div class="right-info">
          <span class="name" style="font-size: 14px;">${esc(c.name)}</span>
          <span class="loc" style="font-size: 11px;">${esc(c.location || '')} ${esc(c.teacher || '')}</span>
        </div>
      </div>
    `;
  }).join('');

  $('#modalBody').innerHTML = `
    <h3>周${WD_CN[weekday]} 课程 (第 ${wk} 周)</h3>
    <div style="margin-top: 10px;">${listHtml}</div>
    <div class="row" style="margin-top:16px; justify-content: center;">
      <button class="ghost" id="btnClose">关闭</button>
    </div>
  `;
  $('#modal').classList.add('show');
  $('#btnClose').onclick = () => $('#modal').classList.remove('show');
}

const COLOR_CACHE = new Map();

function editCourseColor(c) {
  const preset = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#22c55e'];
  const cur = (c.color || '').toLowerCase();
  const opts = [''].concat(preset.indexOf(cur) < 0 && cur ? [cur] : [], preset);
  uiForm('给「' + c.name + '」选颜色', [{
    key: 'color', label: '课程颜色（第 1 个是「无颜色」）', type: 'color', value: cur || '', options: opts,
  }]).then(function (res) {
    if (!res) return;
    if (res.color) c.color = res.color; else delete c.color;
    save();
    renderTimetable();
  });
}

function skipWeekOf(c) {
  const wk = state.viewWeek ?? currentWeek();
  if (Array.isArray(c.skipWeeks) && c.skipWeeks.indexOf(wk) >= 0) return wk;
  return 0;
}

function toggleSkipWeek(c) {
  const wk = state.viewWeek ?? currentWeek();
  if (!Array.isArray(c.skipWeeks)) c.skipWeeks = [];
  const i = c.skipWeeks.indexOf(wk);
  if (i >= 0) {
    c.skipWeeks.splice(i, 1);
    uiAlert('第 ' + wk + ' 周 星期' + WD_CN[c.weekday] + '「' + c.name + '」已取消标记，本周恢复上课');
  } else {
    c.skipWeeks.push(wk);
    uiAlert('第 ' + wk + ' 周 星期' + WD_CN[c.weekday] + '「' + c.name + '」已标记不上，本周不会提醒');
  }
  save();
  renderTimetable();
  renderToday();
}

function colorOf(name, custom) {
  return custom || '';
  const key = String(name || '');
  if (COLOR_CACHE.has(key)) return COLOR_CACHE.get(key);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  // 黄金角散列：相邻取值的色相相差约 137.5°，课程之间不容易撞色
  const hue = (h * 137.508) % 360;
  const color = hslHex(hue, 62, 54);
  COLOR_CACHE.set(key, color);
  return color;
}

function hslHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}

function shiftWeek(delta) {
  const cur = state.viewWeek ?? currentWeek();
  const total = Math.max(1, Math.min(40, state.config.totalWeeks || 20));
  const next = Math.max(1, Math.min(total, cur + delta));
  if (next === cur) return;
  state.viewWeek = next;
  renderTimetable();
  const g = $('#grid');
  if (g) {
    const cls = delta > 0 ? 'anim-left' : 'anim-right';
    g.classList.remove('anim-left', 'anim-right');
    void g.offsetWidth;
    g.classList.add(cls);
    setTimeout(() => g.classList.remove(cls), 340);
  }
}

function pickWeek(n) {
  state.viewWeek = Math.max(1, Math.min(40, n));
  closeModal();
  switchTab('page-timetable');
  renderTimetable();
}
