




const TP_H = 46, TP_PAD = 93; 

const TP_HOURS = []; for (let h = 1; h <= 24; h++) TP_HOURS.push(h);

const TP_MINS = []; for (let mm = 0; mm < 60; mm++) TP_MINS.push(mm);


const TP_ADV_HOURS = [0, 1, 2, 3];

let tpCtx = null, tpWheelH = null, tpWheelM = null;

function buildWheel(col, values, initIdx, fmt) {
  const cycle = values.length, reps = 3;
  let html = '';
  for (let r = 0; r < reps; r++) {
    values.forEach(v => { html += `<div class="tp-item" data-v="${v}">${fmt(v)}</div>`; });
  }
  col.innerHTML = html;
  const mid = Math.floor(reps / 2) * cycle;
  let idx = mid + (((initIdx % cycle) + cycle) % cycle);
  const curIdx = () => Math.round((col.scrollTop + TP_PAD) / TP_H);
  col.scrollTop = idx * TP_H - TP_PAD;
  col._settled = idx;
  let timer = null;
  const mark = i => {
    const kids = col.children;
    for (let k = 0; k < kids.length; k++) {
      if (k === i) kids[k].classList.add('on'); else kids[k].classList.remove('on');
    }
  };
  const settle = () => {
    let i = curIdx();
    const lo = cycle, hi = (reps - 1) * cycle;
    if (i < lo || i > hi) {
      const w = ((i % cycle) + cycle) % cycle;
      i = mid + w;
      col.scrollTop = i * TP_H - TP_PAD;
    } else {
      col.scrollTo({ top: i * TP_H - TP_PAD, behavior: 'smooth' });
    }
    col._settled = i;
    mark(i);
  };
  col.addEventListener('scroll', () => {
    mark(curIdx());
    clearTimeout(timer);
    timer = setTimeout(settle, 110);
  });
  mark(idx);
  return {
    value() {
      const i = curIdx();
      return values[((i % cycle) + cycle) % cycle];
    }
  };
}


function openTimePicker(idx, type, cur) {
  const m = $('#tpModal');
  if (!m) return;
  tpCtx = { mode: 'section', idx, type };
  const parts = String(cur || '08:00').split(':');
  let hh = parseInt(parts[0], 10); if (!hh || hh > 24) hh = 8;
  let mm = parseInt(parts[1], 10); if (isNaN(mm)) mm = 0;
  const t = $('#tpTitle');
  if (t) t.textContent = '第' + (idx + 1) + '节 · ' + (type === 'start' ? '开始' : '结束') + '时间';
  m.classList.add('show');
  tpWheelH = buildWheel($('#wheelH'), TP_HOURS, TP_HOURS.indexOf(hh), v => v + '<span class="u">时</span>');
  tpWheelM = buildWheel($('#wheelM'), TP_MINS, mm, v => String(v).padStart(2, '0') + '<span class="u">分</span>');
}


function openAdvancePicker(curMinutes) {
  const m = $('#tpModal');
  if (!m) return;
  let total = Math.round(Number(curMinutes));
  if (!isFinite(total) || total < 0) total = 0;
  if (total > 180) total = 180;
  tpCtx = { mode: 'advance' };
  const t = $('#tpTitle');
  if (t) t.textContent = '上课前提醒';
  m.classList.add('show');
  tpWheelH = buildWheel($('#wheelH'), TP_ADV_HOURS, TP_ADV_HOURS.indexOf(Math.floor(total / 60)),
    v => v + '<span class="u">时</span>');
  tpWheelM = buildWheel($('#wheelM'), TP_MINS, total % 60,
    v => String(v).padStart(2, '0') + '<span class="u">分</span>');
}

function openDailyTimePicker(cur) {
  const m = $('#tpModal');
  if (!m) return;
  const parts = String(cur || '21:30').split(':');
  let hh = parseInt(parts[0], 10); if (!(hh >= 0 && hh <= 23)) hh = 21;
  let mm = parseInt(parts[1], 10); if (isNaN(mm) || mm < 0 || mm > 59) mm = 30;
  tpCtx = { mode: 'daily' };
  const t = $('#tpTitle');
  if (t) t.textContent = '每晚汇总时间';
  m.classList.add('show');
  tpWheelH = buildWheel($('#wheelH'), TP_HOURS, TP_HOURS.indexOf(hh), v => v + '<span class="u">时</span>');
  tpWheelM = buildWheel($('#wheelM'), TP_MINS, mm, v => String(v).padStart(2, '0') + '<span class="u">分</span>');
}


function closeTimePicker() {
  const m = $('#tpModal');
  if (m) m.classList.remove('show');
  tpCtx = null;
}

function confirmTimePicker() {
  if (!tpCtx || !tpWheelH || !tpWheelM) { closeTimePicker(); return; }


  if (tpCtx.mode === 'daily') {
    const hh = String(tpWheelH.value()).padStart(2, '0');
    const mm = String(tpWheelM.value()).padStart(2, '0');
    const dc = dailyCfg();
    dc.time = hh + ':' + mm;
    dc.last = '';
    save();
    closeTimePicker();
    if (typeof renderNotifyPage === 'function') renderNotifyPage();
    return;
  }

  if (tpCtx.mode === 'advance') {
    let mins = tpWheelH.value() * 60 + tpWheelM.value();
    if (mins > 180) mins = 180;
    reminderCfg().advance = mins;
    save();
    closeTimePicker();
    if (typeof restartReminderLoop === 'function') restartReminderLoop();
    if (typeof renderReminderPage === 'function') renderReminderPage();
    return;
  }


  const val = String(tpWheelH.value()).padStart(2, '0') + ':' + String(tpWheelM.value()).padStart(2, '0');
  const idx = tpCtx.idx, type = tpCtx.type;
  if (type === 'start') state.config.sectionStartTimes[idx] = val;
  else state.config.sectionEndTimes[idx] = val;
  save();
  closeTimePicker();
  renderImportSettings();
  renderTimetable();
  renderToday();
}
