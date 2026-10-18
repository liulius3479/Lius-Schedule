


function showDetail(index) {
  const c = state.courses[index];
  if (!c) return;
  const isTemp = !!c.date;
  const timeText = isTemp
    ? esc(c.date) + ' 第' + c.startSection + '-' + c.endSection + '节'
    : '周' + WD_CN[c.weekday] + ' 第' + c.startSection + '-' + c.endSection + '节';
  const weekText = isTemp ? '仅这一次' : formatWeeks(c.weeks);
  const skipText = (c.skip && c.skip.length) ? c.skip.join('、') : '';
  $('#modalBody').innerHTML = `
    <h3>${esc(c.name)}${isTemp ? ' <span style="font-size:12px;color:var(--accent);">临时</span>' : ''}</h3>
    <div class="kv"><span>教师</span><span>${esc(c.teacher) || '—'}</span></div>
    <div class="kv"><span>地点</span><span>${esc(c.location) || '—'}</span></div>
    <div class="kv"><span>时间</span><span>${timeText}</span></div>
    <div class="kv"><span>周次</span><span>${weekText}</span></div>
    ${skipText ? `<div class="kv"><span>停课</span><span>${esc(skipText)}</span></div>` : ''}
    <div class="row" style="margin-top:16px; justify-content: center; flex-wrap: wrap; gap: 8px;">
      <button class="ghost" id="btnEdit" style="background:rgba(91,124,250,0.12);color:var(--accent)">编辑</button>
      <button class="ghost" id="btnColor" style="background:rgba(91,124,250,0.10);color:var(--accent)">颜色</button>
      <button class="ghost" id="btnDel" style="background:#ffe9e9;color:#e5484d">删除这门课</button>
      <button class="ghost" id="btnClose">关闭</button>
    </div>
  `;
  $('#modal').classList.add('show');
  $('#btnClose').onclick = () => $('#modal').classList.remove('show');
  $('#btnEdit').onclick = () => openEditCourse(index);
  const colorBtn = $('#btnColor');
  if (colorBtn) colorBtn.onclick = () => {
    $('#modal').classList.remove('show');
    editCourseColor(c);
  };
  $('#btnDel').onclick = async () => {
    const ok = await uiConfirm('删除后这门课会从课表里彻底消失，无法撤销。', '删除「' + c.name + '」', '删除');
    if (!ok) return;
    state.courses.splice(index, 1);
    save(); renderToday(); renderTimetable();
    $('#modal').classList.remove('show');
  };
}
$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal') e.target.classList.remove('show');
});


function openEditCourse(index) {
  const c = state.courses[index];
  if (!c) return;
  const isTemp = !!c.date;
  const maxSec = (state.config.sectionStartTimes || []).length || 12;
  const wdOptions = [1, 2, 3, 4, 5, 6, 7].map(d =>
    '<option value="' + d + '"' + (c.weekday === d ? ' selected' : '') + '>周' + WD_CN[d] + '</option>'
  ).join('');

  $('#modalBody').innerHTML = `
    <h3>编辑课程</h3>
    <div class="edit-form">
      <label class="ef-row"><span>课程名称</span><input id="edName" value="${esc(c.name)}"></label>
      <label class="ef-row"><span>任课教师</span><input id="edTeacher" value="${esc(c.teacher || '')}" placeholder="可留空"></label>
      <label class="ef-row"><span>上课地点</span><input id="edLocation" value="${esc(c.location || '')}" placeholder="可留空"></label>
      ${isTemp
        ? `<label class="ef-row"><span>上课日期</span><input id="edDate" value="${esc(c.date)}" placeholder="YYYY-MM-DD"></label>`
        : `<label class="ef-row"><span>周几</span><select id="edWeekday">${wdOptions}</select></label>`}
      <div class="ef-row">
        <span>节次</span>
        <div style="display:flex;align-items:center;gap:8px;flex:1;">
          <input id="edStart" type="number" min="1" max="${maxSec}" value="${c.startSection}" style="width:70px;">
          <span style="color:var(--sub);">~</span>
          <input id="edEnd" type="number" min="1" max="${maxSec}" value="${c.endSection}" style="width:70px;">
        </div>
      </div>
    </div>
    <div class="row" style="margin-top:18px; justify-content: center; gap: 10px;">
      <button id="edSave">保存</button>
      <button class="ghost" id="edCancel">取消</button>
    </div>
  `;
  $('#modal').classList.add('show');
  if ($('#edDate') && typeof bindDateInput === 'function') bindDateInput($('#edDate'), { title: '上课日期', clearable: false });
  $('#edCancel').onclick = () => showDetail(index);
  $('#edSave').onclick = () => {
    const name = ($('#edName').value || '').trim();
    if (!name) { uiAlert('课程名不能为空'); return; }
    const s = parseInt($('#edStart').value, 10);
    const e2 = parseInt($('#edEnd').value, 10);
    if (!(s >= 1 && e2 >= s && e2 <= maxSec)) { uiAlert('节次不对：应在 1 ~ ' + maxSec + ' 之间，且结束不早于开始'); return; }

    c.name = name;
    c.teacher = ($('#edTeacher').value || '').trim();
    c.location = ($('#edLocation').value || '').trim();
    c.startSection = s;
    c.endSection = e2;

    if (isTemp) {
      const ds = ($('#edDate').value || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) { uiAlert('日期格式不对，应形如 2026-10-20'); return; }
      c.date = ds;
    } else {
      const wd = parseInt($('#edWeekday').value, 10);
      if (wd >= 1 && wd <= 7) c.weekday = wd;
    }

    save();
    renderToday();
    renderTimetable();
    showDetail(index);
    notifyLocal('课程已更新', name);
  };
}


$('#btnDeleteCourse').onclick = () => {
  if (!state.courses.length) { uiAlert('当前没有课程'); return; }

  const listHtml = state.courses.map((c, i) => `
    <div class="today-course-card" style="margin-bottom: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div style="text-align: left;">
        <div style="font-weight: 600; font-size: 14px;">${esc(c.name)}</div>
        <div style="font-size: 11px; color: var(--sub); margin-top: 4px;">周${WD_CN[c.weekday]} 第${c.startSection}-${c.endSection}节</div>
      </div>
      <button class="ghost" style="color:#e5484d; padding: 4px 10px;" onclick="deleteCourseFromModal(${i})">删除</button>
    </div>
  `).join('');

  $('#modalBody').innerHTML = `
    <h3>删除课程</h3>
    <div style="margin-top: 10px; max-height: 50vh; overflow-y: auto;">${listHtml}</div>
    <div class="row" style="margin-top:16px; justify-content: center;">
      <button class="ghost" id="btnClose">关闭</button>
    </div>
  `;
  $('#modal').classList.add('show');
  $('#btnClose').onclick = () => $('#modal').classList.remove('show');
};

window.deleteCourseFromModal = async (index) => {
  const name = state.courses[index] ? state.courses[index].name : '';
  const ok = await uiConfirm('删除后这门课会从课表里彻底消失，无法撤销。', '删除「' + name + '」', '删除');
  if (!ok) return;
  state.courses.splice(index, 1);
  save();
  renderToday();
  renderTimetable();
  $('#btnDeleteCourse').click();
};

function closeModal() {
  const m = $('#modal');
  if (m) m.classList.remove('show');
}

function openMoreMenu() {
  const wk = state.viewWeek ?? currentWeek();
  $('#modalBody').innerHTML = `
    <h3>更多</h3>
    <div style="margin-top:6px;">
      <div class="menu-item" data-act="week"><span>选择周次</span><span class="arrow">第 ${wk} 周 ›</span></div>
      <div class="menu-item" data-act="list"><span>本周课程清单</span><span class="arrow">›</span></div>
      <div class="menu-item" data-act="import"><span>导入 / 管理课程</span><span class="arrow">›</span></div>
      <div class="menu-item" data-act="theme"><span>外观主题</span><span class="arrow">›</span></div>
      <div class="menu-item" data-act="announce"><span>公告</span><span class="arrow">›</span></div>
      <div class="menu-item" data-act="clear" style="color:#e5484d;"><span>清空全部课程</span><span class="arrow">›</span></div>
    </div>
  `;
  $('#modal').classList.add('show');
  $('#modalBody').querySelectorAll('.menu-item').forEach(el => {
    el.onclick = () => {
      const act = el.dataset.act;
      closeModal();
      if (act === 'week') openWeekPicker();
      else if (act === 'list') showWeekList();
      else if (act === 'import') switchTab('page-import');
      else if (act === 'theme') openThemePicker();
      else if (act === 'announce') showAnnouncement(false);
      else if (act === 'clear') $('#btnClearAll').click();
    };
  });
}



