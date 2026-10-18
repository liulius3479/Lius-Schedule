

(function () {

  function on(sel, fn) { var el = $(sel); if (el) el.onclick = fn; }

  on('#ttTitle', openWeekPicker);
  on('#btnImportBack', function () { switchTab('page-mine'); });
  on('#mineAbout', function () { switchTab('page-about'); });
  on('#btnAboutBack', function () { switchTab('page-mine'); });
  on('#btnAnnounceBack', function () { switchTab(annReturnTab()); });
  on('#btnChangelogBack', function () { switchTab('page-mine'); });
  on('#mineImport', function () { switchTab('page-import'); });
  on('#mineAppearance', openThemePicker);
  on('#btnThemeBack', function () { switchTab('page-mine'); });
  on('#mineReminder', openReminderSettings);
  on('#tpCancel', closeTimePicker);
  on('#tpOk', confirmTimePicker);

  var tpModalEl = $('#tpModal');
  if (tpModalEl) tpModalEl.onclick = function (e) { if (e.target.id === 'tpModal') closeTimePicker(); };

  (function mountTempFab() {
    var old = document.getElementById('btnTempFab');
    if (old) old.remove();
    var b = document.createElement('button');
    b.className = 'today-fab';
    b.id = 'btnTempFab';
    b.title = '临时加课';
    b.setAttribute('aria-label', '临时加课');
    b.textContent = '+';
    b.onclick = function () { openTempCourse(state.viewDate); };
    document.body.appendChild(b);
  })();

  var bgInput = $('#bgInput');
  if (bgInput) bgInput.addEventListener('change', function (e) {
    handleBgFile(e.target.files[0]); e.target.value = '';
  });


  load();
  // 课程表默认定位到系统日期所在的周
  state.viewWeek = currentWeek();
  applyTheme();
  applyAccent();
  renderToday();
  renderImportSettings();
  switchTab('page-today');
  if (typeof renderMine === 'function') renderMine();
  checkFirstOpen();
  if (typeof maybeShowSplash === 'function') maybeShowSplash();


  if (typeof bindNoSelect === 'function') bindNoSelect();
  applyImmersive();
  bindBackKey();
  document.addEventListener('plusready', function () { applyImmersive(); bindBackKey(); }, false);


  startReminderLoop();
})();


/* 软键盘弹出会缩小 WebView 视口，fixed 元素会被一起顶上来；
   这里记录初始视口高度，resize 时用 translateY 抵消，让 dock 与悬浮球停在原地。 */
(function lockBottomBars() {
  var baseH = window.innerHeight;
  function apply() {
    var delta = window.innerHeight - baseH;
    var t = delta < -80 ? 'translateY(' + (-delta) + 'px)' : '';
    document.body.style.height = window.innerHeight + 'px';
    void document.body.offsetHeight;
    var tb = document.querySelector('.tabbar');
    var fab = document.getElementById('btnTempFab');
    if (tb && !tb.dataset.baseTransform) tb.dataset.baseTransform = getComputedStyle(tb).transform === 'none' ? '' : getComputedStyle(tb).transform;
    if (tb) tb.style.translate = t ? '0 ' + (-delta) + 'px' : '';
    if (fab) fab.style.translate = t ? '0 ' + (-delta) + 'px' : '';
    document.documentElement.style.setProperty('--kbd-offset', Math.max(0, -delta) + 'px');
  }
  window.addEventListener('resize', apply);
  apply();
})();
/* 让软键盘浮在页面之上：把 Activity 的软输入模式改成 ADJUST_NOTHING(48)，
   视口高度保持不变，dock 与页面完全不重排。 */
(function keepViewportOnKeyboard() {
  try {
    if (!window.plus || !plus.android) return;
    var main = plus.android.runtimeMainActivity();
    plus.android.importClass('android.view.WindowManager');
    main.getWindow().setSoftInputMode(48);
  } catch (e) {
    console.warn('setSoftInputMode failed', e);
  }
})();