


function renderImportSettings() {
  $('#configStartDate').value = state.config.startDate || '';
  $('#configEndDate').value = state.config.endDate || '';

  const container = $('#timeConfigContainer');
  let html = '';
  const len = state.config.sectionStartTimes.length;

  for (let i = 0; i < len; i++) {
    const start = (state.config.sectionStartTimes && state.config.sectionStartTimes[i]) || '';
    const end = (state.config.sectionEndTimes && state.config.sectionEndTimes[i]) || '';
    const isNew = (i === lastAddedIndex);

    html += `
      <div class="input-row ${isNew ? 'new-row' : ''}">
        <label>第 ${i+1} 节</label>
        <button class="time-btn" data-idx="${i}" data-type="start">${start || '08:00'}</button>
        <span style="color: var(--sub);">~</span>
        <button class="time-btn" data-idx="${i}" data-type="end">${end || '08:45'}</button>
        <button class="del-btn" data-del="${i}">×</button>
      </div>
    `;
  }
  container.innerHTML = html;
  lastAddedIndex = -1;

  container.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openTimePicker(parseInt(btn.dataset.idx, 10), btn.dataset.type, btn.textContent.trim());
    });
  });

  container.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.del, 10);
      removeSection(idx);
    });
  });

  const btnAdd = $('#btnAddSection');
  if (state.config.sectionStartTimes.length >= 12) {
    btnAdd.disabled = true;
    btnAdd.style.opacity = '0.5';
    btnAdd.textContent = '已达上限 (12节)';
  } else {
    btnAdd.disabled = false;
    btnAdd.style.opacity = '1';
    btnAdd.textContent = '+ 添加一节课';
  }
}

$('#btnAddSection').onclick = () => {
  const stList = state.config.sectionStartTimes;
  const etList = state.config.sectionEndTimes;
  if (stList.length >= 12) return;
  let newStart = '08:00', newEnd = '08:45';
  const lastEnd = toMin(etList[etList.length - 1]);
  if (lastEnd != null) {
    newStart = fromMin(lastEnd + 10);
    newEnd = fromMin(lastEnd + 10 + 45);
  }
  stList.push(newStart);
  etList.push(newEnd);
  state.config.sectionsPerDay = stList.length;
  lastAddedIndex = stList.length - 1;
  save();
  renderImportSettings();
  renderTimetable();
  renderToday();

  const container = document.querySelector('.import-container');
  if (container) {
    setTimeout(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }), 100);
  }
};




function removeSection(index) {
  if (state.config.sectionStartTimes.length <= 1) {
    uiAlert('至少需要保留一节课的作息时间哦~');
    return;
  }
  uiConfirm(`确定要删除第 ${index + 1} 节课吗？\n删除后课表也会永久同步更新。`, '删除这节课', '删除').then((ok) => {
    if (!ok) return;
    state.config.sectionStartTimes.splice(index, 1);
    state.config.sectionEndTimes.splice(index, 1);
    state.config.sectionsPerDay = state.config.sectionStartTimes.length;
    save();
    renderImportSettings();
    renderTimetable();
    renderToday();
  });
}


if (typeof bindDateInput === 'function') {
  bindDateInput($('#configStartDate'), { title: '开学日期' });
  bindDateInput($('#configEndDate'), { title: '期末日期' });
}

$('#configStartDate').addEventListener('change', () => {
  state.config.startDate = $('#configStartDate').value;
  if (state.config.startDate && state.config.endDate) {
    const start = new Date(state.config.startDate);
    const end = new Date(state.config.endDate);
    const diff = end - start;
    state.config.totalWeeks = Math.max(1, Math.ceil(diff / (7 * 24 * 3600 * 1000)));
  } else state.config.totalWeeks = 20;
  save(); renderToday(); renderTimetable();
});

$('#configEndDate').addEventListener('change', () => {
  state.config.endDate = $('#configEndDate').value;
  if (state.config.startDate && state.config.endDate) {
    const start = new Date(state.config.startDate);
    const end = new Date(state.config.endDate);
    const diff = end - start;
    state.config.totalWeeks = Math.max(1, Math.ceil(diff / (7 * 24 * 3600 * 1000)));
  } else state.config.totalWeeks = 20;
  save(); renderToday(); renderTimetable();
});



let pending = [];

function renderPreview(list) {
  pending = list;
  const box = $('#preview');
  if (!list.length) {
    box.innerHTML = '<p class="bad">没有解析出课程。请检查粘贴内容，或改用手动添加。</p>';
    $('#confirmRow').style.display = 'none';
    return;
  }
  const rows = list.map((c, i) => `
    <tr data-i="${i}">
      <td contenteditable data-f="name">${esc(c.name)}</td>
      <td contenteditable data-f="teacher">${esc(c.teacher)}</td>
      <td contenteditable data-f="location">${esc(c.location)}</td>
      <td contenteditable data-f="weekday">${c.weekday || ''}</td>
      <td contenteditable data-f="startSection">${c.startSection || ''}</td>
      <td contenteditable data-f="endSection">${c.endSection || ''}</td>
      <td>${formatWeeks(c.weeks)}</td>
    </tr>`).join('');
  box.innerHTML = `
    <p class="hint">解析出 <b>${list.length}</b> 门课，点单元格可直接修改：</p>
    <table>
      <thead><tr><th>课程</th><th>教师</th><th>地点</th><th>周几</th><th>起</th><th>止</th><th>周次</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  box.querySelectorAll('td[contenteditable]').forEach(td => {
    td.addEventListener('blur', () => {
      const tr = td.closest('tr');
      const i = +tr.dataset.i;
      const f = td.dataset.f;
      const v = td.textContent.trim();
      if (['weekday','startSection','endSection'].includes(f)) {
        const n = parseInt(v, 10);
        pending[i][f] = isNaN(n) ? null : n;
      } else pending[i][f] = v;
    });
  });
  $('#confirmRow').style.display = 'flex';
}

function validateAndImport() {

  const valid = pending.filter(c => c.name && c.startSection >= 1 && c.endSection >= c.startSection
    && (c.date || (c.weekday >= 1 && c.weekday <= 7)));
  if (!valid.length) { uiAlert('没有有效的课程'); return; }
  state.courses = state.courses.concat(valid);
  save(); renderToday(); renderTimetable();
  pending = [];
  $('#preview').innerHTML = '';
  $('#confirmRow').style.display = 'none';
  $('#txtInput').value = '';
  uiAlert(`已导入 ${valid.length} 门课程`);
  switchTab('page-today');
}

$('#btnParseText').onclick = async () => {
  const text = $('#txtInput').value.trim();
  if (!text) { uiAlert('请先粘贴课表内容'); return; }
  const backup = tryParseJsonBackup(text);
  if (backup) {
    const m = backup.meta || {};
    const hasMeta = !!(m.startDate && m.sections && (m.sections.start || []).length);
    if (hasMeta) {
      const yes = await uiConfirm(
        '这是一份 JSON 备份。\n' +
        '开学日期 ' + m.startDate + '，' + (m.sections.start || []).length + ' 节课。\n\n' +
        '「一起还原」会覆盖当前的学期设置和作息时间。',
        '还原 JSON 备份', '一起还原', '只导入课程'
      );
      if (yes) {
        if (m.startDate) state.config.startDate = m.startDate;
        if (m.endDate) state.config.endDate = m.endDate;
        if (m.sections) {
          const s = m.sections.start || [];
          const e = m.sections.end || [];
          const n = Math.max(1, Math.min(12, s.length));
          state.config.sectionsPerDay = n;
          state.config.sectionStartTimes = s.slice(0, n);
          state.config.sectionEndTimes = e.slice(0, n);
        }
        save();
        renderImportSettings();
      }
    }
    renderPreview(backup.courses);
    return;
  }
  const list = parseAnyText(text).filter(c => c.name);
  renderPreview(list);
};
$('#btnConfirm').onclick = validateAndImport;
$('#btnCancel').onclick = () => { pending = []; $('#preview').innerHTML = ''; $('#confirmRow').style.display = 'none'; };
function weeksFromList(list) {
  const arr = (list || []).map(Number).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
  if (!arr.length) return { ranges: [[1, state.config.totalWeeks || 20]], parity: 'all' };
  const ranges = [];
  let start = arr[0];
  let prev = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === prev + 1) { prev = arr[i]; continue; }
    ranges.push([start, prev]);
    start = arr[i];
    prev = arr[i];
  }
  ranges.push([start, prev]);
  return { ranges: ranges, parity: 'all' };
}

$('#btnManual').onclick = async () => {
  const maxSec = state.config.sectionsPerDay || 12;
  const v = await uiForm('手动添加课程', [
    { key: 'name', label: '课程名称', type: 'text', required: true, placeholder: '例如 高等数学' },
    { key: 'weekday', label: '星期', type: 'select', value: 1, options: [
      { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
      { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' },
      { value: 7, label: '周日' }] },
    { key: 'startSection', label: '开始节次', type: 'number', value: 1, min: 1, max: maxSec, half: true },
    { key: 'endSection', label: '结束节次', type: 'number', value: 1, min: 1, max: maxSec, half: true },
    { key: 'weeks', label: '上课周次（可多选，不选=全学期）', type: 'checks', options: (function () { const a = []; const n = state.config.totalWeeks || 20; for (let i = 1; i <= n; i++) a.push({ value: i, label: String(i) }); return a; })() },
    { key: 'teacher', label: '教师', type: 'text', placeholder: '可留空', half: true },
    { key: 'location', label: '地点', type: 'text', placeholder: '可留空', half: true },
  ]);
  if (!v) return;
  const s = v.startSection, e2 = v.endSection;
  if (!(s >= 1 && e2 >= s)) { uiAlert('节次不对：结束节次不能早于开始'); return; }
  state.courses.push({ name: v.name, teacher: v.teacher, location: v.location, weekday: Number(v.weekday), startSection: s, endSection: e2, weeks: weeksFromList(v.weeks) });
  save(); renderToday(); renderTimetable();
  uiAlert('已添加「' + v.name + '」');
};
function ensureTempPage() {
  if (document.getElementById('page-temp')) return;
  const html = '<div class="page" id="page-temp">' +
    '<header><button class="back" id="btnTempBack">‹</button><h1>临时加课</h1></header>' +
    '<div class="temp-body">' +
      '<div class="temp-field"><label>课程名称</label><input id="tempName" class="ud-input" placeholder="例如 补课"></div>' +
      '<div class="temp-field"><label>上课日期</label><input id="tempDate" class="ud-input date-readonly" readonly placeholder="点击选择日期"></div>' +
      '<div class="temp-row">' +
        '<div class="temp-field"><label>开始节次</label><input id="tempStart" class="ud-input" type="number" inputmode="numeric" value="1"></div>' +
        '<div class="temp-field"><label>结束节次</label><input id="tempEnd" class="ud-input" type="number" inputmode="numeric" value="1"></div>' +
      '</div>' +
      '<div class="temp-row">' +
        '<div class="temp-field"><label>教师</label><input id="tempTeacher" class="ud-input" placeholder="可留空"></div>' +
        '<div class="temp-field"><label>地点</label><input id="tempLoc" class="ud-input" placeholder="可留空"></div>' +
      '</div>' +
      '<div class="temp-actions">' +
        '<button class="ghost" id="btnTempCancel">取消</button>' +
        '<button class="primary" id="btnTempSave">保存</button>' +
      '</div>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  bindDateInput($('#tempDate'));
  $('#btnTempBack').onclick = () => switchTab('page-today');
  $('#btnTempCancel').onclick = () => switchTab('page-today');
  $('#btnTempSave').onclick = () => {
    const maxSec = state.config.sectionsPerDay || 12;
    const v = {
      name: ($('#tempName').value || '').trim(),
      date: ($('#tempDate').value || '').trim(),
      startSection: parseInt($('#tempStart').value, 10),
      endSection: parseInt($('#tempEnd').value, 10),
      teacher: ($('#tempTeacher').value || '').trim(),
      location: ($('#tempLoc').value || '').trim(),
    };
    if (!v.name) { uiAlert('请填课程名称'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) { uiAlert('请选择上课日期'); return; }
    const s = v.startSection, e2 = v.endSection;
    if (!(s >= 1 && e2 >= s && e2 <= maxSec)) { uiAlert('节次不对：不能超过今天的节次上限'); return; }
    state.courses.push({
      name: v.name, teacher: v.teacher, location: v.location,
      date: v.date, startSection: s, endSection: e2, weeks: null, temp: true,
    });
    save(); renderToday(); renderTimetable();
    resetTempForm();
    switchTab('page-today');
  };
}

function resetTempForm() {
  const n = $('#tempName'); if (n) n.value = '';
  const t = $('#tempTeacher'); if (t) t.value = '';
  const l = $('#tempLoc'); if (l) l.value = '';
  const s = $('#tempStart'); if (s) s.value = '1';
  const e = $('#tempEnd'); if (e) e.value = '1';
}

function openTempCourse(defaultDate) {
  ensureTempPage();
  resetTempForm();
  $('#tempDate').value = defaultDate || formatLocalDate(new Date());
  switchTab('page-temp');
}
$('#btnClearAll').onclick = async () => {
  if (!state.courses.length) { uiAlert('当前没有课程'); return; }
  const ok = await uiConfirm('清空后所有课程都会消失，且无法恢复。\n建议先去下面「备份成 JSON」。', '清空全部课程', '清空', '再想想');
  if (!ok) return;
  state.courses = []; save(); renderToday(); renderTimetable();
  $('#preview').innerHTML = ''; $('#confirmRow').style.display = 'none';
};




const WEEKDAY_NAME = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function exportPayload() {
  return {
    app: 'Lius Schedule',
    version: APP_VERSION,
    exportedAt: formatLocalDate(new Date()),
    startDate: state.config.startDate || '',
    endDate: state.config.endDate || '',
    sections: {
      start: state.config.sectionStartTimes || [],
      end: state.config.sectionEndTimes || []
    },
    courses: state.courses
  };
}

function exportAsJson() {
  if (!state.courses.length) return '';
  return JSON.stringify(exportPayload(), null, 2);
}

function exportAsText() {
  if (!state.courses.length) return '';
  const out = [];
  const total = state.courses.length;
  out.push('课程表 · ' + formatLocalDate(new Date()) + ' 导出（共 ' + total + ' 门）');
  if (state.config.startDate) out.push('开学日期：' + state.config.startDate);
  out.push('');
  for (let wd = 1; wd <= 7; wd++) {
    const list = state.courses
      .filter(c => (c.date ? new Date(c.date + 'T00:00:00').getDay() || 7 : c.weekday) === wd)
      .sort((a, b) => a.startSection - b.startSection);
    if (!list.length) continue;
    out.push(WEEKDAY_NAME[wd]);
    list.forEach(c => {
      const bits = [
        '第' + c.startSection + '-' + c.endSection + '节',
        c.name,
        c.teacher,
        c.location,
        c.temp ? ('仅 ' + c.date) : formatWeeks(c.weeks)
      ].filter(Boolean);
      out.push('  ' + bits.join('  ·  '));
    });
    out.push('');
  }
  return out.join('\n').trim();
}

function showExport(text) {
  if (!text) { uiAlert('还没有课程可以导出'); return; }
  $('#exportBox').value = text;
  $('#exportOut').style.display = 'block';
  copyText(text, true);
}

function copyText(text, silent) {
  const done = () => { if (!silent) uiAlert('已复制到剪贴板'); };
  const fallback = () => {
    const box = $('#exportBox');
    if (box) { box.focus(); box.select(); }
    try {
      document.execCommand('copy');
      done();
    } catch (e) { if (!silent) uiAlert('复制失败，长按文本框手动复制吧'); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else fallback();
}

function saveExportFile(text, name) {
  if (window.plus && plus.io && plus.io.resolveLocalFileSystemURL) {
    plus.io.resolveLocalFileSystemURL('_doc/', function (entry) {
      entry.getFile(name, { create: true }, function (fileEntry) {
        fileEntry.createWriter(function (writer) {
          writer.onwrite = function () { uiAlert('已保存到应用目录：\n' + name); };
          writer.onerror = function () { uiAlert('保存失败，改用复制吧'); };
          writer.write(text);
        }, function () { uiAlert('保存失败，改用复制吧'); });
      }, function () { uiAlert('保存失败，改用复制吧'); });
    }, function () { uiAlert('拿不到应用目录，改用复制吧'); });
    return;
  }
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  } catch (e) { uiAlert('保存失败，改用复制吧'); }
}


function tryParseJsonBackup(text) {
  if (!/^\s*\{/.test(text)) return null;
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || !Array.isArray(data.courses)) return null;
  const courses = data.courses.filter(c => c && c.name && (c.weekday || c.date));
  if (!courses.length) return null;
  return { courses: courses, meta: data };
}

$('#btnExportJson').onclick = () => showExport(exportAsJson());
$('#btnExportText').onclick = () => showExport(exportAsText());
$('#btnCopyExport').onclick = () => {
  const v = $('#exportBox').value;
  if (!v) { uiAlert('先导出一份再复制'); return; }
  copyText(v, false);
};
$('#btnSaveExport').onclick = () => {
  const v = $('#exportBox').value;
  if (!v) { uiAlert('先导出一份再保存'); return; }
  const isJson = /^\s*\{/.test(v);
  saveExportFile(v, '课程表备份_' + formatLocalDate(new Date()) + (isJson ? '.json' : '.txt'));
};


