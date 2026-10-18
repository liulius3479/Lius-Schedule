






const REMIND_DEFAULT = { enabled: true, advance: 10 };


const REMIND_ADV_MIN = 0;
const REMIND_ADV_MAX = 180;

let _remindTimer = null;
let _remindFired = {};        
let _permAskedThisRound = false;  



function reminderCfg() {
  if (!state.config.reminder || typeof state.config.reminder !== 'object') {
    state.config.reminder = { enabled: REMIND_DEFAULT.enabled, advance: REMIND_DEFAULT.advance };
  }
  const r = state.config.reminder;
  if (typeof r.enabled !== 'boolean') r.enabled = REMIND_DEFAULT.enabled;
  const n = Number(r.advance);
  r.advance = (isFinite(n) && n >= REMIND_ADV_MIN && n <= REMIND_ADV_MAX)
    ? Math.round(n) : REMIND_DEFAULT.advance;
  return r;
}


function coursesOfDay(dateObj) {
  const wk = calculateWeek(formatLocalDate(dateObj));
  return coursesOn(dateObj).filter(function (c) {
    return !(Array.isArray(c.skipWeeks) && c.skipWeeks.indexOf(wk) >= 0);
  });
}


function sectionStartMinutes(sec) {
  const t = (state.config.sectionStartTimes || [])[sec - 1];
  if (!t) return null;
  return toMin(t);
}



function isAndroidApp() {
  return !!(window.plus && plus.os && String(plus.os.name).toLowerCase() === 'android');
}

function isIn5App() {
  return !!window.plus;
}


function detectRomName() {
  if (!isAndroidApp()) return '';
  try {
    const main = plus.android.runtimeMainActivity();
    const Build = plus.android.importClass('android.os.Build');
    const brand = String(Build.BRAND || '') + ' ' + String(Build.MANUFACTURER || '');
    const b = brand.toLowerCase();
    if (b.indexOf('xiaomi') >= 0 || b.indexOf('redmi') >= 0) return 'MIUI / HyperOS';
    if (b.indexOf('huawei') >= 0 || b.indexOf('honor') >= 0) return 'HarmonyOS / EMUI';
    if (b.indexOf('oppo') >= 0 || b.indexOf('realme') >= 0 || b.indexOf('oneplus') >= 0) return 'ColorOS';
    if (b.indexOf('vivo') >= 0 || b.indexOf('iqoo') >= 0) return 'OriginOS';
    if (b.indexOf('samsung') >= 0) return 'One UI';
    if (b.indexOf('meizu') >= 0) return 'Flyme';
    return String(Build.MANUFACTURER || '');
  } catch (e) { return ''; }
}




const ANDROID_NOTIF_PERM = 'android.permission.POST_NOTIFICATIONS';

function notifPermState() {
  if (!isIn5App()) {

    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'blocked';
    return 'denied';
  }
  if (!isAndroidApp()) return 'unsupported';
  try {
    const main = plus.android.runtimeMainActivity();
    plus.android.importClass(main);
    const Build = plus.android.importClass('android.os.Build');
    const Context = plus.android.importClass('android.content.Context');


    try {
      const nm = main.getSystemService(Context.NOTIFICATION_SERVICE);
      plus.android.importClass(nm);
      if (nm && typeof nm.areNotificationsEnabled === 'function' && !nm.areNotificationsEnabled()) {
        return 'blocked';
      }
    } catch (e) {  }


    if (Build.VERSION.SDK_INT >= 33) {
      const r = plus.android.invoke(main, 'checkSelfPermission', ANDROID_NOTIF_PERM);
      return (Number(r) === 0) ? 'granted' : 'denied';   /* 0 = PERMISSION_GRANTED */
    }
    return 'granted';
  } catch (e) {
    console.warn('通知权限检测失败', e);
    return 'unknown';
  }
}


function requestNotifPerm(cb) {
  const done = () => { const s = notifPermState(); if (typeof cb === 'function') cb(s); };
  if (!isIn5App()) {
    if (typeof Notification === 'undefined') { done(); return; }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') { done(); return; }
    try {
      const p = Notification.requestPermission(done);
      if (p && typeof p.then === 'function') p.then(done);
      return;
    } catch (e) { done(); return; }
  }
  if (!isAndroidApp()) { done(); return; }
  try {
    const main = plus.android.runtimeMainActivity();
    plus.android.importClass(main);
    const Build = plus.android.importClass('android.os.Build');
    if (Build.VERSION.SDK_INT >= 33 && notifPermState() === 'denied') {
      plus.android.invoke(main, 'requestPermissions', [ANDROID_NOTIF_PERM], 10086);
    }
  } catch (e) {
    console.warn('申请通知权限失败', e);
  }

  let tries = 0;
  const tick = () => {
    tries++;
    const s = notifPermState();
    if (s === 'granted' || tries >= 12) { done(); return; }
    setTimeout(tick, 500);
  };
  setTimeout(tick, 500);
}


function openAppNotifSettings() {
  if (!isAndroidApp()) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      uiAlert('浏览器里通知被禁用了，请在地址栏左侧的站点设置里把「通知」改成允许。');
    }
    return false;
  }
  try {
    const main = plus.android.runtimeMainActivity();
    plus.android.importClass(main);
    const Intent = plus.android.importClass('android.content.Intent');
    const Settings = plus.android.importClass('android.provider.Settings');
    const Uri = plus.android.importClass('android.net.Uri');
    const pkg = main.getPackageName();


    try {
      const it = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
      it.putExtra('android.provider.extra.APP_PACKAGE', pkg);
      main.startActivity(it);
      return true;
    } catch (e) {  }

    try {
      const it2 = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      it2.setData(Uri.parse('package:' + pkg));
      main.startActivity(it2);
      return true;
    } catch (e) {  }

    const it3 = new Intent(Settings.ACTION_SETTINGS);
    main.startActivity(it3);
    return true;
  } catch (e) {
    console.warn('打开通知设置失败', e);
    return false;
  }
}


function batteryOptIgnoring() {
  if (!isAndroidApp()) return null;
  try {
    const main = plus.android.runtimeMainActivity();
    plus.android.importClass(main);
    const Context = plus.android.importClass('android.content.Context');
    const pm = main.getSystemService(Context.POWER_SERVICE);
    plus.android.importClass(pm);
    const pkg = main.getPackageName();
    if (pm && typeof pm.isIgnoringBatteryOptimizations === 'function') {
      return !!pm.isIgnoringBatteryOptimizations(pkg);
    }
    return null;
  } catch (e) { return null; }
}

function openBatterySettings() {
  if (!isAndroidApp()) return false;
  try {
    const main = plus.android.runtimeMainActivity();
    plus.android.importClass(main);
    const Intent = plus.android.importClass('android.content.Intent');
    const Settings = plus.android.importClass('android.provider.Settings');
    const Uri = plus.android.importClass('android.net.Uri');
    const pkg = main.getPackageName();
    try {
      const it = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
      it.setData(Uri.parse('package:' + pkg));
      main.startActivity(it);
      return true;
    } catch (e) {  }
    try {
      const it2 = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
      main.startActivity(it2);
      return true;
    } catch (e) {  }
    const it3 = new Intent(Settings.ACTION_SETTINGS);
    main.startActivity(it3);
    return true;
  } catch (e) {
    console.warn('打开电池优化设置失败', e);
    return false;
  }
}


const AUTOSTART_COMPONENTS = [
  ['com.miui.securitycenter', 'com.miui.permcenter.autostart.AutoStartManagementActivity'],        /* MIUI / HyperOS */
  ['com.huawei.systemmanager', 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity'], /* EMUI */
  ['com.hihonor.systemmanager', 'com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity'],
  ['com.coloros.safecenter', 'com.coloros.safecenter.startupapp.StartupAppListActivity'],          /* ColorOS */
  ['com.oppo.safe', 'com.oppo.safe.permission.startup.StartupAppListActivity'],
  ['com.vivo.permissionmanager', 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity'],   /* OriginOS */
  ['com.iqoo.secure', 'com.iqoo.secure.ui.phoneoptimize.BgStartUpManager'],
  ['com.samsung.android.lool', 'com.samsung.android.sm.ui.battery.BatteryActivity'],               /* One UI */
  ['com.meizu.safe', 'com.meizu.safe.permission.SmartBGActivity'],                                 /* Flyme */
  ['com.letv.android.letvsafe', 'com.letv.android.letvsafe.AutobootManageActivity']
];

function openAutoStartSettings() {
  if (!isAndroidApp()) return false;
  try {
    const main = plus.android.runtimeMainActivity();
    plus.android.importClass(main);
    const Intent = plus.android.importClass('android.content.Intent');
    const ComponentName = plus.android.importClass('android.content.ComponentName');
    for (let i = 0; i < AUTOSTART_COMPONENTS.length; i++) {
      const pkg = AUTOSTART_COMPONENTS[i][0];
      const cls = AUTOSTART_COMPONENTS[i][1];
      try {
        const it = new Intent();
        it.setComponent(new ComponentName(pkg, cls));
        it.addFlags(0x10000000); /* FLAG_ACTIVITY_NEW_TASK */
        main.startActivity(it);
        return true;
      } catch (e) {  }
    }

    return openAppNotifSettings();
  } catch (e) {
    console.warn('打开自启动设置失败', e);
    return false;
  }
}





function notifyLocal(title, content) {
  const t = String(title || '课程表');
  const c = String(content || '');

  if (isIn5App() && isAndroidApp()) {



    try {
      if (nativeNotify(t, c)) return true;
    } catch (e) { console.warn('原生通知失败', e); }
    return false;
  }

  if (!isIn5App() && typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      try { new Notification(t, { body: c, tag: 'course-remind' }); return true; } catch (e) { }
    }
    return false;
  }
  console.log('[通知] ' + t + ' — ' + c);
  return false;
}


function nativeNotify(title, content) {
  const main = plus.android.runtimeMainActivity();
  plus.android.importClass(main);
  const Context = plus.android.importClass('android.content.Context');
  const Build = plus.android.importClass('android.os.Build');
  const nm = main.getSystemService(Context.NOTIFICATION_SERVICE);
  plus.android.importClass(nm);

  const NotificationChannel = plus.android.importClass('android.app.NotificationChannel');
  const CH_ID = 'course-remind-v2';
  if (Build.VERSION.SDK_INT >= 26) {
    const ch = new NotificationChannel(CH_ID, '上课提醒', 4 /* IMPORTANCE_HIGH */);
    plus.android.importClass(ch);
    ch.setDescription('上课前提醒；有新版本通道会重建以应用提示音');
    try {
      const RingtoneManager = plus.android.importClass('android.media.RingtoneManager');
      const uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
      ch.setSound(uri, null);
    } catch (e) { console.log('[通知] 设置提示音失败', e); }
    try {
      ch.enableVibration(true);
      ch.setVibrationPattern([0, 220, 120, 220]);
    } catch (e) {}
    try { ch.setLockscreenVisibility(1 /* PUBLIC */); } catch (e) {}
    nm.createNotificationChannel(ch);
  }

  const Intent = plus.android.importClass('android.content.Intent');
  const PendingIntent = plus.android.importClass('android.app.PendingIntent');
  const Intent2 = new Intent(main, plus.android.runtimeMainActivity().getClass());
  Intent2.setFlags(0x20000000 | 0x04000000); /* FLAG_ACTIVITY_SINGLE_TOP | FLAG_ACTIVITY_CLEAR_TOP */
  const pi = PendingIntent.getActivity(main, 0, Intent2, 0x04000000 /* FLAG_IMMUTABLE */);

  const Builder = plus.android.importClass('android.app.Notification$Builder');
  const b = new Builder(main, 'course-remind-v2');
  plus.android.invoke(b, 'setContentTitle', title);
  plus.android.invoke(b, 'setContentText', content);
  let smallIcon = 0;
  try {
    const res = plus.android.invoke(main, 'getResources');
    smallIcon = plus.android.invoke(res, 'getIdentifier', 'stat_notify_chat', 'drawable', 'android');
  } catch (e) { smallIcon = 0; }
  if (!smallIcon) {
    try {
      const res2 = plus.android.invoke(main, 'getResources');
      smallIcon = plus.android.invoke(res2, 'getIdentifier', 'ic_dialog_info', 'drawable', 'android');
    } catch (e) { smallIcon = 0; }
  }
  if (!smallIcon) throw new Error('no small icon');
  plus.android.invoke(b, 'setSmallIcon', smallIcon);
  plus.android.invoke(b, 'setAutoCancel', true);
  plus.android.invoke(b, 'setContentIntent', pi);
  plus.android.invoke(b, 'setPriority', 2 /* PRIORITY_MAX */);
  try { plus.android.invoke(b, 'setDefaults', 7 /* DEFAULT_ALL */); } catch (e) {}
  try { plus.android.invoke(b, 'setVisibility', 1 /* VISIBILITY_PUBLIC */); } catch (e) {}
  const n = plus.android.invoke(b, 'build');
  plus.android.invoke(nm, 'notify', 20261017, n);
  return true;
}




function dailyCfg() {
  if (!state.config.dailySummary || typeof state.config.dailySummary !== 'object') {
    state.config.dailySummary = { on: false, time: '21:30', last: '' };
  }
  return state.config.dailySummary;
}

function checkDailySummary() {
  const d = dailyCfg();
  if (!d.on) return;
  const now = new Date();
  const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const today = formatLocalDate(now);
  if (d.last === today) return;
  if (hm < d.time) return;
  d.last = today;
  try { save(); } catch (e) {}
  let list = [];
  try { list = coursesOn(new Date(now.getTime() + 86400000)) || []; } catch (e) { list = []; }
  let content;
  if (!list.length) content = '明天没有课，安心睡吧。';
  else content = list.slice(0, 6).map(function (c) {
    return '第' + c.startSection + '-' + c.endSection + '节 ' + c.name + (c.location ? ' @' + c.location : '');
  }).join('；');
  notifyLocal('明天的课', content);
}

function checkReminders() {
  checkDailySummary();
  const cfg = reminderCfg();
  if (!cfg.enabled) return;
  const now = new Date();
  const dateStr = formatLocalDate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  coursesOfDay(now).forEach(c => {
    const start = sectionStartMinutes(c.startSection);
    if (start == null) return;
    const remindAt = start - cfg.advance;
    if (nowMin < remindAt || nowMin >= start) return;      
    const key = dateStr + '|' + c.name + '|' + c.startSection;
    if (_remindFired[key]) return;
    _remindFired[key] = 1;
    fireCourseNotice(c, start - nowMin);
  });
}


function fireCourseNotice(c, minutesLeft) {
  const loc = c.location ? ' · ' + c.location : '';
  const when = minutesLeft <= 0 ? '马上开始' : minutesLeft + ' 分钟后上课';
  notifyLocal(c.name, when + loc);
}


function restartReminderLoop() {
  if (_remindTimer) { clearInterval(_remindTimer); _remindTimer = null; }
  _remindFired = {};
  if (!reminderCfg().enabled) return;
  checkReminders();
  _remindTimer = setInterval(checkReminders, 20000);
}

function startReminderLoop() {
  if (_remindTimer) return;
  restartReminderLoop();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkReminders();
  });
  plusReady(() => restartReminderLoop());
}

function plusReady(fn) {
  if (window.plus) { setTimeout(fn, 0); return; }
  document.addEventListener('plusready', fn, false);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}




function openReminderSettings() {
  switchTab('page-reminder');
}

function advText(mins) {
  const n = Number(mins) || 0;
  if (n <= 0) return '上课时';
  if (n < 60) return n + ' 分钟';
  const h = Math.floor(n / 60), m = n % 60;
  return h + ' 小时' + (m ? ' ' + m + ' 分钟' : '');
}

function permText(s) {
  if (s === 'granted') return '已授权';
  if (s === 'denied') return '未授权';
  if (s === 'blocked') return '已被系统关闭';
  if (s === 'unsupported') return '当前环境不支持';
  return '检测中';
}

function permBadgeClass(s) {
  if (s === 'granted') return 'perm-badge ok';
  if (s === 'blocked') return 'perm-badge bad';
  if (s === 'denied') return 'perm-badge warn';
  return 'perm-badge';
}

function renderReminderPage() {
  const cfg = reminderCfg();

  const sw = $('#swReminder');
  if (sw) {
    sw.classList.toggle('on', !!cfg.enabled);
    sw.setAttribute('aria-checked', cfg.enabled ? 'true' : 'false');
    const row = $('#rrowSwitch');
    if (row) row.classList.toggle('off', !cfg.enabled);
  }

  const btnAdv = $('#btnAdvance');
  if (btnAdv) btnAdv.textContent = advText(cfg.advance);
  const rowAdv = $('#rrowAdvance');
  if (rowAdv) rowAdv.classList.toggle('off', !cfg.enabled);


  const s0 = notifPermState();
  paintPermBadge(s0);

  const tip = $('#remindTip');
  if (tip) {
    if (!cfg.enabled) {
      tip.innerHTML = '提醒已关闭。打开开关后会按当前作息时间推系统通知。';
    } else if (cfg.advance <= 0) {
      tip.innerHTML = '一到上课时间就推一条系统通知。通知走系统通知栏，' +
        '不是应用内弹窗 —— 这就要求通知权限、后台运行都得放开，否则系统会把提醒拦掉。';
    } else {
      tip.innerHTML = '上课前 <b>' + advText(cfg.advance) + '</b>推一条系统通知。通知走系统通知栏，' +
        '不是应用内弹窗 —— 这就要求通知权限、后台运行都得放开，否则系统会把提醒拦掉。';
    }
  }


  if (cfg.enabled && s0 !== 'granted' && s0 !== 'unsupported' && s0 !== 'unknown' && !_permAskedThisRound) {
    _permAskedThisRound = true;
    requestNotifPerm(s => paintPermBadge(s));
  }
}

function paintPermBadge(s) {
  const badge = $('#permBadge');
  if (badge) {
    badge.className = permBadgeClass(s);
    badge.textContent = permText(s);
  }
  const desc = $('#permRowDesc');
  if (desc) {
    desc.textContent = (s === 'granted')
      ? '系统通知已放行，可以正常收到提醒'
      : (s === 'blocked'
        ? '系统里把本应用的通知关掉了，点进去重新打开'
        : '没拿到通知权限，提醒发不出去，点进去授权');
  }
}



function openNotifySettings() {
  switchTab('page-notify');
}

function renderNotifyPage() {
  const s = notifPermState();
  const rom = detectRomName();

  const badge = $('#permBadge2');
  if (badge) { badge.className = permBadgeClass(s); badge.textContent = permText(s); }

  const permDesc = $('#permDesc');
  if (permDesc) {
    permDesc.textContent = (s === 'granted')
      ? '通知权限正常'
      : (s === 'unsupported'
        ? '当前运行环境（浏览器/预览器）不支持系统通知，装成 App 后才生效'
        : '通知权限缺失，提醒会被系统直接丢弃');
  }

  const btnPerm = $('#btnPerm');
  if (btnPerm) {
    btnPerm.textContent = (s === 'blocked') ? '去系统设置' : '发测试通知';
    btnPerm.disabled = (s === 'unsupported');
    btnPerm.style.opacity = btnPerm.disabled ? '.45' : '1';
  }

  const ignores = batteryOptIgnoring();
  const batBadge = $('#batBadge');
  if (batBadge) {
    batBadge.className = 'perm-badge ' + (ignores === true ? 'ok' : (ignores === null ? '' : 'warn'));
    batBadge.textContent = (ignores === true) ? '已放行' : (ignores === null ? '未知' : '受限制');
  }
  const batDesc = $('#batDesc');
  if (batDesc) {
    batDesc.textContent = (ignores === true)
      ? '系统不会再为省电掐掉后台'
      : '系统会为省电限制后台，提醒可能延后或吞掉';
  }

  const autoDesc = $('#autoDesc');
  if (autoDesc) {
    autoDesc.textContent = rom
      ? '在 ' + rom + ' 里允许本应用自启动 / 后台运行'
      : '允许本应用自启动 / 后台运行';
  }

  const hint = $('#notifyHint');
  if (hint) {
    hint.innerHTML =
      '为什么必须走系统通知：应用内弹窗只有 App 在前台时看得见，锁屏和后台等于没有提醒。<br>' +
      '系统通知由' + (rom ? rom + ' ' : '') + '按自家通知卡片渲染，不需要 App 醒着。<br>' +
      '但通知被拦有几层：<b>通知权限</b> → <b>自启动/后台运行</b> → <b>电池优化</b>，' +
      '三层都放开才算真的收得到。';
  }

  // 每日课程汇总
  const dc = dailyCfg();
  const swDaily = $('#swDaily');
  if (swDaily) {
    swDaily.classList.toggle('on', !!dc.on);
    swDaily.setAttribute('aria-checked', dc.on ? 'true' : 'false');
    swDaily.onclick = () => {
      dc.on = !dc.on;
      dc.last = '';
      save();
      renderNotifyPage();
    };
  }
  const rowDaily = $('#dailyTimeRow');
  if (rowDaily) rowDaily.style.display = dc.on ? '' : 'none';
  const dd = $('#dailyDesc');
  if (dd) dd.textContent = dc.on ? ('每天 ' + dc.time + ' 汇总第二天的课') : '关';
  const btnDailyTime = $('#btnDailyTime');
  if (btnDailyTime) {
    btnDailyTime.textContent = dc.time;
    btnDailyTime.onclick = () => openDailyTimePicker(dc.time);
  }

}



(function bindReminderPageEvents() {
  const sw = $('#swReminder');
  if (sw) {
    sw.onclick = () => {
      const c = reminderCfg();
      c.enabled = !c.enabled;
      save();
      restartReminderLoop();
      renderReminderPage();
      if (c.enabled && notifPermState() !== 'granted') {
        _permAskedThisRound = true;
        requestNotifPerm(s => paintPermBadge(s));
      }
    };
  }

  const btnAdv = $('#btnAdvance');
  if (btnAdv) btnAdv.onclick = () => openAdvancePicker(reminderCfg().advance);

  const rowNotify = $('#rrowNotify');
  if (rowNotify) rowNotify.onclick = () => { switchTab('page-notify'); };

  const btnPerm = $('#btnPerm');
  if (btnPerm) {
    btnPerm.onclick = () => {
      const s = notifPermState();
      if (s === 'granted') {
        notifyLocal('课程表 · 测试提醒', '能看到这条，说明系统通知是通的');
        return;
      }
      if (s === 'unsupported') { uiAlert('当前环境不支持系统通知，装成 App 之后再测。'); return; }
      if (s === 'blocked') { openAppNotifSettings(); return; }
      requestNotifPerm(ns => {
        renderNotifyPage();
        paintPermBadge(ns);
        if (ns === 'granted') notifyLocal('课程表 · 测试提醒', '能看到这条，说明系统通知是通的');
        else openAppNotifSettings();
      });
    };
  }

  const btnOpenSys = $('#btnOpenSys');
  if (btnOpenSys) btnOpenSys.onclick = () => openAppNotifSettings();

  const btnBat = $('#btnBat');
  if (btnBat) btnBat.onclick = () => {
    const ok = openBatterySettings();
    if (!ok) uiAlert('这台机器没有可直接打开的电池优化页，请到「设置 → 电池 → 电池优化」里把本应用设为不优化。');
    setTimeout(renderNotifyPage, 600);
  };

  const btnAuto = $('#btnAuto');
  if (btnAuto) btnAuto.onclick = () => {
    const ok = openAutoStartSettings();
    if (!ok) uiAlert('这台机器没有可直接打开的自启动页，请到「设置 → 应用管理 → 本应用 → 自启动/后台运行」里手动允许。');
  };

  const back1 = $('#btnReminderBack');
  if (back1) back1.onclick = () => switchTab('page-mine');
  const back2 = $('#btnNotifyBack');
  if (back2) back2.onclick = () => switchTab('page-reminder');
})();
