

const SPLASH_HTML = `
<div id="splash" class="splash">
  <div class="splash-inner">
    <div class="splash-icon">
      <img src="img/app-logo.png" alt="Lius Schedule">
    </div>
    <div class="splash-name">Lius Schedule</div>
  </div>
  <div class="splash-foot">
    <button id="splashGo" class="splash-btn">开始使用</button>
  </div>
</div>
`;

const MODAL_HTML = `
<div id="modal">
  <div class="sheet" id="modalBody"></div>
</div>
`;
const TABBAR_HTML = `
<div class="tabbar">
  <div class="tab-item active" data-tab="page-today" data-label="今日课程"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.2" y="4.6" width="17.6" height="15.6" rx="4.2"/><path d="M8 2.6v3.4M16 2.6v3.4" stroke-linecap="round"/><g fill="currentColor" stroke="none"><circle cx="8.6" cy="11.6" r="1.15"/><circle cx="12" cy="11.6" r="1.15"/><circle cx="15.4" cy="11.6" r="1.15"/><circle cx="8.6" cy="15.6" r="1.15"/><circle cx="12" cy="15.6" r="1.15"/><circle cx="15.4" cy="15.6" r="1.15"/></g></svg></div>
  <div class="tab-item" data-tab="page-timetable" data-label="总课程表"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4"/><path d="M7.6 9.3h8.8M7.6 13.7h5.2"/></svg></div>
  <div class="tab-item" data-tab="page-mine" data-label="我的页面"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4"/><circle cx="12" cy="10" r="2.8"/><path d="M6.9 18.2a5.3 5.3 0 0 1 10.2 0"/></svg></div>
  <div class="tab-glass" id="tabGlass" aria-hidden="true"></div>
</div>
`;
const BG_INPUT_HTML = `
<input type="file" id="bgInput" accept="image/*" hidden>
`;
const TP_MODAL_HTML = `
<div id="tpModal">
  <div class="tp-sheet">
    <div class="tp-title" id="tpTitle">时间</div>
    <div class="tp-body">
      <div class="tp-wheel" id="wheelH"></div>
      <div class="tp-colon">:</div>
      <div class="tp-wheel" id="wheelM"></div>
    </div>
    <div class="tp-actions">
      <button class="ghost" id="tpCancel">取消</button>
      <button id="tpOk">设置</button>
    </div>
  </div>
</div>
`;
const ABOUT_HTML = `
<div class="page" id="page-about">
  <header><button class="back" id="btnAboutBack" aria-label="返回">‹</button><h1>关于</h1></header>

  <div class="about-hero">
    <div class="about-icon">
      <img src="img/app-logo.png" alt="Lius Schedule">
    </div>
    <div class="about-name">Lius Schedule</div>
    <div class="about-ver" id="aboutVersion">--</div>
  </div>

  <div class="about-list">
    <div class="about-item" id="aboutChangelog">
      <span class="ai-label"><span class="ai-ic">📋</span>更新日志</span>
      <span class="chev">›</span>
    </div>
    <div class="about-item" id="aboutEnv">
      <span class="ai-label"><span class="ai-ic">📱</span>运行环境</span>
      <span class="ai-value" id="aboutEnvValue">--</span>
    </div>
    <div class="about-item">
      <span class="ai-label"><span class="ai-ic">💾</span>数据存储</span>
      <span class="ai-value">仅存本机</span>
    </div>
    <div class="about-item" id="aboutPrivacy">
      <span class="ai-label"><span class="ai-ic">🔒</span>隐私说明</span>
      <span class="chev">›</span>
    </div>
  </div>
</div>
`;
const IMPORT_HTML = `
<div class="page" id="page-import">
  <header><button class="back" id="btnImportBack" aria-label="返回">‹</button><h1>导入 / 导出课程</h1></header>
  <div class="import-container panel">

    <div class="section-title">📅 学期设置</div>
    <div class="hint">填上开学日期，自动算周次；期末日期可不填。</div>
    <div class="input-row">
      <label>开学日期</label>
      <input type="text" id="configStartDate" data-title="开学日期" placeholder="点击选择">
    </div>
    <div class="input-row">
      <label>期末日期</label>
      <input type="text" id="configEndDate" data-title="期末日期" placeholder="可不填">
    </div>

    <div class="section-title">⏰ 作息时间设置 (上限12节)</div>
    <div class="hint">按上一节结束时间自动顺延（休息 10 分钟 + 45 分钟课时）。</div>
    <div id="timeConfigContainer"></div>
    <div class="row" style="margin-top: 8px;">
      <button class="ghost" id="btnAddSection" style="width: 100%;">+ 添加一节课</button>
    </div>

    <div class="section-title">📚 导入课程</div>
    <div class="hint">
      整段粘贴课表就行，自动认出课程、教师、教室。
    </div>
    <textarea id="txtInput" placeholder="在此粘贴课表…"></textarea>
    <div class="row">
      <button id="btnParseText" style="width: 100%;">解析预览</button>
    </div>
    <div class="row" style="margin-top: 8px;">
      <button class="ghost" id="btnManual">手动添加一门课</button>
    </div>
    <div class="row" style="margin-top: 8px;">
      <button class="ghost" id="btnDeleteCourse" style="color:#e5484d;">删除课程</button>
    </div>

    <div id="preview"></div>
    <div class="row" id="confirmRow" style="display:none; margin-top: 12px;">
      <button id="btnConfirm">确认导入</button>
      <button class="ghost" id="btnCancel">取消</button>
    </div>

    <div class="section-title">📤 导出课程</div>
    <div class="hint">
      粘回上方输入框即可还原，换手机不用重排。<br>
      JSON 是完整备份，文本适合发给同学。
    </div>
    <div class="row">
      <button class="ghost" id="btnExportJson">备份成 JSON</button>
      <button class="ghost" id="btnExportText">导出为文本</button>
    </div>
    <div id="exportOut" style="display:none;">
      <textarea id="exportBox" readonly style="margin-top:10px; min-height:120px;"></textarea>
      <div class="row" style="margin-top: 8px;">
        <button id="btnCopyExport">复制</button>
        <button class="ghost" id="btnSaveExport">保存成文件</button>
      </div>
    </div>

    <div class="row" style="margin-top: 30px;">
      <button class="ghost" id="btnClearAll" style="color:#e5484d; width: 100%;">清空全部课程</button>
    </div>
  </div>
</div>
`;
const THEME_HTML = `
<div class="page" id="page-theme">
  <header><button class="back" id="btnThemeBack" aria-label="返回">‹</button><h1>个性化</h1></header>
  <div class="theme-page" id="themePageBody"></div>
</div>
`;
const ANNOUNCEMENT_PAGE_HTML = `
<div class="page" id="page-announcement">
  <header><button class="back" id="btnAnnounceBack" aria-label="返回">‹</button><h1>公告</h1></header>
  <div class="ann-page-body" id="announcementBody"></div>
</div>
`;
const CHANGELOG_PAGE_HTML = `
<div class="page" id="page-changelog">
  <header><button class="back" id="btnChangelogBack" aria-label="返回">‹</button><h1>开发日志</h1></header>
  <div class="ann-page-body" id="changelogBody"></div>
</div>
`;
const MINE_HTML = `
<div class="page" id="page-mine">
  <header><h1>我的</h1></header>
  <div class="mine-list">
    <div class="mine-item" id="mineImport">
      <span class="label"><span class="ic">📥</span>导入/导出课程</span><span class="chev">›</span>
    </div>
    <div class="mine-item" id="mineAppearance">
      <span class="label"><span class="ic">🎨</span>个性化</span><span class="chev">›</span>
    </div>
    <div class="mine-item" id="mineReminder">
      <span class="label"><span class="ic">⏰</span>上课提醒</span><span class="chev">›</span>
    </div>
    <div class="mine-item" id="mineAbout">
      <span class="label"><span class="ic">ℹ️</span>关于</span><span class="chev">›</span>
    </div>
  </div>

</div>
`;
const REMINDER_HTML = `
<div class="page" id="page-reminder">
  <header><button class="back" id="btnReminderBack" aria-label="返回">‹</button><h1>上课提醒</h1></header>

  <div class="remind-wrap">
    <div class="remind-card">
      <div class="remind-row" id="rrowSwitch">
        <div class="rr-main">
          <div class="rr-title">提醒开关</div>
          <div class="rr-sub">关掉后不再推任何上课通知</div>
        </div>
        <button class="pill-switch on" id="swReminder" role="switch" aria-checked="true">
          <span class="pill-knob"></span>
        </button>
      </div>

      <div class="remind-row" id="rrowAdvance">
        <div class="rr-main">
          <div class="rr-title">上课前提醒</div>
          <div class="rr-sub">提前多久推这条通知</div>
        </div>
        <button class="val-btn" id="btnAdvance">10 分钟</button>
      </div>

      <div class="remind-row" id="rrowNotify">
        <div class="rr-main">
          <div class="rr-title">通知与权限</div>
          <div class="rr-sub">系统通知 · 自启动 · 电池优化</div>
        </div>
        <span class="perm-badge" id="permBadge">检测中</span>
        <span class="chev">›</span>
      </div>
    </div>

    <div class="remind-tip" id="remindTip"></div>
  </div>
</div>
`;
const NOTIFY_HTML = `
<div class="page" id="page-notify">
  <header><button class="back" id="btnNotifyBack" aria-label="返回">‹</button><h1>通知与权限</h1></header>

  <div class="remind-wrap">
    <div class="section-title">🔔 通知权限</div>
    <div class="remind-card">
      <div class="remind-row">
        <div class="rr-main">
          <div class="rr-title">系统通知</div>
          <div class="rr-sub" id="permDesc">--</div>
        </div>
        <span class="perm-badge" id="permBadge2">检测中</span>
      </div>
      <div class="remind-row">
        <button class="val-btn wide" id="btnPerm">申请授权</button>
        <button class="val-btn wide ghostish" id="btnOpenSys">系统设置</button>
      </div>
    </div>

    <div class="section-title">🔄 后台运行</div>
    <div class="remind-card">
      <div class="remind-row">
        <div class="rr-main">
          <div class="rr-title">自启动 / 后台运行</div>
          <div class="rr-sub" id="autoDesc">--</div>
        </div>
        <button class="val-btn" id="btnAuto">去开启</button>
      </div>
      <div class="remind-row">
        <div class="rr-main">
          <div class="rr-title">电池优化</div>
          <div class="rr-sub" id="batDesc">--</div>
        </div>
        <span class="perm-badge" id="batBadge">检测中</span>
        <button class="val-btn" id="btnBat">去设置</button>
      </div>
    </div>

    <div class="section-title">🌙 每日课程汇总</div>
    <div class="remind-card">
      <div class="remind-row">
        <div class="rr-main">
          <div class="rr-title">每晚提醒第二天的课</div>
          <div class="rr-sub" id="dailyDesc">关</div>
        </div>
        <button class="pill-switch" id="swDaily" role="switch" aria-checked="false">
          <span class="pill-knob"></span>
        </button>
      </div>
      <div class="remind-row" id="dailyTimeRow" style="display:none;">
        <div class="rr-main">
          <div class="rr-title">提醒时间</div>
          <div class="rr-sub">每天到这个点，把第二天的课汇总成一条通知</div>
        </div>
        <button class="val-btn" id="btnDailyTime">21:30</button>
      </div>
    </div>

    <div class="remind-tip" id="notifyHint"></div>
  </div>
</div>
`;
const TIMETABLE_HTML = `
<div class="page" id="page-timetable">
  <div class="tt-scroll">
    <div class="tt-head">
      <h1 id="ttTitle">第 1 周</h1>
    </div>
    <div id="grid"></div>
    <div id="emptyTip" style="text-align: center; color: var(--sub); padding: 34px; display: none;">暂无课程</div>
  </div>
</div>
`;
const TODAY_HTML = `
<div class="page active" id="page-today">
  <div class="today-header">
    <div class="top-row">
      <div>
        <div class="big-date" id="todayDateNum">--</div>
        <div class="year-month" id="todayYearMonth">----年/--月/--日</div>
      </div>
      <div style="text-align: right;">
        <div class="weekday-badge" id="todayWeekday">星期-</div>
        <div style="font-size: 12px; color: var(--sub); margin-top: 4px;">今日课程数</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--text);" id="todayCourseCount">0</div>
        <button class="ghost" id="btnAnnouncement" style="margin-top: 8px; font-size: 12px; padding: 4px 10px;">公告</button>
      </div>
    </div>
    <div class="today-title" id="todayTitle">今日</div>
    <div class="week-info">
      <span id="todayWeekInfo">第 -- 教学周</span>
      <span id="todaySectionRange">第 -- 节 ~ 第 -- 节</span>
    </div>
  </div>

  <!-- 前一天 / 后一天按钮已取消：改为左右滑动 -->

  <div class="course-list" id="todayCourseList"></div>
</div>
`;

function injectTemplates() {
  document.body.insertAdjacentHTML('afterbegin', [
        TODAY_HTML,
    SPLASH_HTML,
    TIMETABLE_HTML,
    BG_INPUT_HTML,
    IMPORT_HTML,
    THEME_HTML,
    MODAL_HTML,
    TP_MODAL_HTML,
    MINE_HTML,
    REMINDER_HTML,
    NOTIFY_HTML,
    ABOUT_HTML,
    ANNOUNCEMENT_PAGE_HTML,
    CHANGELOG_PAGE_HTML,
    TABBAR_HTML
  ].join(''));
}

injectTemplates();
