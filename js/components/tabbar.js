/* components/tabbar.js — 底部胶囊 dock 与切页。 */

const TAB_SEQ = ['page-today', 'page-timetable', 'page-mine'];
const SUBPAGES = ['page-import', 'page-about', 'page-reminder', 'page-notify', 'page-theme', 'page-announcement', 'page-changelog', 'page-temp'];
const PAGE_ANIMS = ['anim-in', 'anim-in-right', 'anim-in-left', 'anim-in-push', 'anim-in-pop'];

function syncFixedBack() {
  const page = document.querySelector('.page.active');
  if (!page) return;
  const h1 = page.querySelector('header h1');
  const btn = page.querySelector('header .back');
  if (!h1 || !btn) return;
  const r = h1.getBoundingClientRect();
  if (!r.height) return;
  const target = r.top + r.height / 2;
  btn.style.transform = 'none';
  btn.style.top = Math.round(target - 20) + 'px';
  for (let i = 0; i < 3; i++) {
    const b = btn.getBoundingClientRect();
    const delta = (b.top + b.height / 2) - target;
    if (Math.abs(delta) < 0.5) break;
    btn.style.top = (parseFloat(btn.style.top || 0) - delta) + 'px';
  }
}

function navAnimClass(fromId, toId) {
  if (!fromId) return 'anim-in-right';
  const fromSub = SUBPAGES.indexOf(fromId) >= 0;
  const toSub = SUBPAGES.indexOf(toId) >= 0;
  if (!fromSub && toSub) return 'anim-in-push';
  if (fromSub && !toSub) return 'anim-in-pop';
  const a = TAB_SEQ.indexOf(fromId);
  const b = TAB_SEQ.indexOf(toId);
  if (a >= 0 && b >= 0 && a !== b) return b > a ? 'anim-in-right' : 'anim-in-left';
  return 'anim-in-right';
}

function switchTab(tabId) {
  const page = $('#' + tabId);
  if (!page) return;

  if (typeof udClose === 'function') udClose(null);
  const cur = document.querySelector('.page.active');
  const fromId = cur ? cur.id : '';

  // 先渲染内容再起动画：新节点先进入布局完成一次 backdrop 采样，动画里就不会闪透明
  if (tabId === 'page-today') renderToday();
  if (tabId === 'page-timetable') renderTimetable();
  if (tabId === 'page-mine') renderMine();
  if (tabId === 'page-import') renderImportSettings();
  if (tabId === 'page-theme' && typeof renderThemePage === 'function') renderThemePage();
  if (tabId === 'page-about') renderMine();
  if (tabId === 'page-reminder' && typeof renderReminderPage === 'function') renderReminderPage();

  if (fromId !== tabId) {
    $$('.page').forEach(p => p.classList.remove('active'));
    PAGE_ANIMS.forEach(c => page.classList.remove(c));
    // 先隐藏布局一帧，让 backdrop-filter 完成首次采样，再显示并起动画
    page.style.visibility = 'hidden';
    page.classList.add('active');
    void page.offsetWidth;
    const animCls = navAnimClass(fromId, tabId);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      page.style.visibility = '';
      void page.offsetWidth;
      page.classList.add(animCls);
    }));


    if (page._animClear) page.removeEventListener('animationend', page._animClear);
    document.body.classList.add('page-animating');
    if (window.__animatingTimer) clearTimeout(window.__animatingTimer);
    window.__animatingTimer = setTimeout(function () {
      document.body.classList.remove('page-animating');
    }, 360);
    page._animClear = function (e) {
      if (e.target !== page) return;
      PAGE_ANIMS.forEach(c => page.classList.remove(c));
      document.body.classList.remove('page-animating');
    };
    page.addEventListener('animationend', page._animClear);
  }
  $$('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.body.classList.toggle('subpage', SUBPAGES.indexOf(tabId) >= 0);


  if (tabId === 'page-notify' && typeof renderNotifyPage === 'function') renderNotifyPage();
  if (SUBPAGES.indexOf(tabId) >= 0) {
    page.scrollTop = 0;
    requestAnimationFrame(syncFixedBack);
  }
  if (tabId === 'page-announcement' && typeof renderAnnouncementPage === 'function') renderAnnouncementPage();
  if (tabId === 'page-changelog' && typeof renderChangelogPage === 'function') renderChangelogPage();
  if (typeof glassSync === 'function') glassSync(tabId);
}

/* ============================================================================
   dock 长按液态玻璃遮罩
   · 长按 280ms 唤起遮罩（#tabGlass，独立元素）
   · 移动时遮罩中心严格跟随手指：rAF 合并 + transform 无过渡 = 跟手
   · 松手时按弹性曲线落到最近的 tab 上，落地后切换页面
   · dock 本体（.tabbar / .tab-item）全程不加类、不改变几何
   ========================================================================== */

const GLASS_LONGPRESS = 280;
const GLASS_SLOP = 8;
const GLASS_SWIPE = 15;
const GLASS_RATIO = 0.91;   // 仅作兜底，实际用固定宽
const GLASS_W_FIXED = 86;
const GLASS_W_EXTRA = 5;
const GLASS_V_INSET = 3;
const GLASS_V_EXTRA = 6;
const GLASS_SWIPE_RATIO = 0.42;
const GLASS_CLICK_GUARD = 450;

const glassBar = $('.tabbar');
const glassEl = $('#tabGlass');
const glass = {
  timer: 0,
  raf: 0,
  fallback: 0,
  pending: false,
  pressedLong: false,
  swiping: false,
  active: false,
  downX: 0,
  curX: 0,
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  downIdx: 0,
  pointerId: -1,
  barLeft: 0,
  items: [],
  guardUntil: 0
};

function glassRead() {
  if (!glassBar) return;
  const barRect = glassBar.getBoundingClientRect();
  glass.barLeft = barRect.left;
  const items = [];
  $$('.tab-item').forEach(function (el) {
    const r = el.getBoundingClientRect();
    items.push({
      id: el.dataset.tab,
      label: el.dataset.label || '',
      left: r.left - barRect.left,
      top: r.top - barRect.top,
      w: r.width,
      h: r.height
    });
  });
  glass.items = items;
  if (items.length) {
    glass.w = GLASS_W_FIXED;
    glass.h = Math.max(20, glassInnerHeight() - GLASS_V_INSET * 2);
    glass.y = items[0].top;
  }
}

// 遮罩在 dock 内垂直居中（相对 padding box）
function glassInnerHeight() {
  if (!glassBar) return 0;
  const r = glassBar.getBoundingClientRect();
  const cs = getComputedStyle(glassBar);
  const bt = parseFloat(cs.borderTopWidth) || 0;
  const bb = parseFloat(cs.borderBottomWidth) || 0;
  return Math.max(0, r.height - bt - bb);
}

function glassTop(h) {
  const inner = glassInnerHeight();
  return Math.max(0, (inner - h) / 2);
}

// dock 的 padding-box 宽度（遮罩横向可用的总空间）
function glassInnerWidth() {
  if (!glassBar) return 0;
  const r = glassBar.getBoundingClientRect();
  const cs = getComputedStyle(glassBar);
  const bl = parseFloat(cs.borderLeftWidth) || 0;
  const br = parseFloat(cs.borderRightWidth) || 0;
  return Math.max(0, r.width - bl - br);
}

function glassClamp(x) {
  const max = glassInnerWidth() - glass.w - GLASS_V_INSET;
  return Math.max(GLASS_V_INSET, Math.min(Math.max(GLASS_V_INSET, max), x));
}

// 首尾 tab 上让遮罩贴住 dock 边缘，留白和上下一样；中间 tab 居中
function glassCenterOf(t) {
  const items = glass.items;
  const idx = items.indexOf(t);
  if (idx === 0) return GLASS_V_INSET;
  if (idx === items.length - 1) {
    return Math.max(GLASS_V_INSET, glassInnerWidth() - glass.w - GLASS_V_INSET);
  }
  return t.left + (t.w - glass.w) / 2;
}

function glassHit(cx) {
  let best = null;
  let bestD = Infinity;
  glass.items.forEach(function (t) {
    const d = Math.abs(cx - (glass.barLeft + t.left + t.w / 2));
    if (d < bestD) { bestD = d; best = t; }
  });
  return best || glass.items[0];
}

function glassPaint(x, scale) {
  glassEl.style.transform = 'translate3d(' + x + 'px,0,0) scale(' + (scale || 1) + ')';
}

// 按当前 glass.w / glass.h 摆放遮罩盒子（胶囊形，圆角跟 dock 一样走全圆角）
function glassFitBox() {
  glassEl.style.width = glass.w + 'px';
  glassEl.style.height = glass.h + 'px';
  glassEl.style.top = glassTop(glass.h) + 'px';
  glassEl.style.borderRadius = '999px';
}

function glassShow(cx) {
  if (!glassEl || !glassBar) return;
  glassRead();
  if (!glass.items.length) return;
  const t = glassHit(cx);
  glass.active = true;
  glass.x = glassClamp(glassCenterOf(t));
  glassFitBox();
  glassEl.dataset.label = t.label;
  glassPaint(glass.x, 1.06);
  glassEl.classList.add('show');
  glassEl.classList.add('drag');
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
}

function glassDown(cx) {
  glass.downX = cx;
  glass.curX = cx;
  glass.pending = true;
  glass.pressedLong = false;
  glass.swiping = false;
  glass.downIdx = Math.max(0, TAB_SEQ.indexOf(currentTabId()));
  clearTimeout(glass.timer);
  glass.timer = setTimeout(function () {
    if (!glass.pending) return;
    glass.pending = false;
    glass.pressedLong = true;
    glassShow(glass.curX);
  }, GLASS_LONGPRESS);
}

function glassMove(cx) {
  glass.curX = cx;
  const dx = cx - glass.downX;

  if (glass.pending) {
    if (Math.abs(dx) <= GLASS_SLOP) return;
    glass.pending = false;
    clearTimeout(glass.timer);
  }

  if (!glass.active) {
    if (!glass.pressedLong && Math.abs(dx) >= GLASS_SWIPE && !glass.swiping) {
      glass.swiping = true;
      if (navigator.vibrate) { try { navigator.vibrate(6); } catch (e) {} }
    }
    return;
  }

  if (!glass.active || glass.raf) return;
  glass.raf = requestAnimationFrame(function () {
    glass.raf = 0;
    if (!glass.active) return;
    const t = glassHit(glass.curX);
    glass.x = glassClamp(glass.curX - glass.barLeft - glass.w / 2);
    if (t && glassEl.dataset.label !== t.label) glassEl.dataset.label = t.label;
    glassPaint(glass.x, 1.06);
  });
}

function glassUp(cx, doSwitch) {
  clearTimeout(glass.timer);
  glass.pointerId = -1;
  const wasSwiping = glass.swiping;
  glass.pending = false;
  glass.pressedLong = false;
  glass.swiping = false;

  const at = (typeof cx === 'number' && isFinite(cx)) ? cx : glass.curX;

  // 纯滑动（没经过长按）：按方向切相邻一页，遮罩不参与
  if (wasSwiping && !glass.active) {
    glass.guardUntil = Date.now() + GLASS_CLICK_GUARD;
    if (!doSwitch) return;
    if (Math.abs(at - glass.downX) < GLASS_SWIPE) return;
    const nextIdx = Math.max(0, Math.min(TAB_SEQ.length - 1, glass.downIdx + (at < glass.downX ? 1 : -1)));
    if (TAB_SEQ[nextIdx] !== currentTabId()) switchTab(TAB_SEQ[nextIdx]);
    return;
  }

  if (!glass.active) return;
  glass.active = false;
  if (glass.raf) { cancelAnimationFrame(glass.raf); glass.raf = 0; }
  glass.guardUntil = Date.now() + GLASS_CLICK_GUARD;

  const t = glassHit(at);
  const fromX = glass.x;
  const landX = glassClamp(glassCenterOf(t));
  glassEl.dataset.label = t.label;

  let done = false;
  const finish = function () {
    if (done) return;
    done = true;
    clearTimeout(glass.fallback);
    glassEl.style.transform = 'translate3d(' + landX + 'px,0,0) scale(1)';
    glassEl.classList.remove('drag');
    glassEl.classList.add('show');
    if (doSwitch && t.id) switchTab(t.id);
    else if (t.id) glassSync(t.id);
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  };

  if (glassEl.animate) {
    const anim = glassEl.animate([
      { transform: 'translate3d(' + fromX + 'px,0,0) scale(1.06)' },
      { transform: 'translate3d(' + landX + 'px,3px,0) scale(.985)', offset: .68 },
      { transform: 'translate3d(' + landX + 'px,0,0) scale(1.03)', offset: .87 },
      { transform: 'translate3d(' + landX + 'px,0,0) scale(1)' }
    ], { duration: 340, easing: 'cubic-bezier(.22,.9,.26,1.08)', fill: 'forwards' });
    anim.onfinish = function () { try { anim.cancel(); } catch (e) {} finish(); };
    glass.fallback = setTimeout(finish, 460);
  } else {
    finish();
  }
}

// 常驻态：把遮罩同步到当前页对应的 tab 上（切页后由 switchTab 调用）
function glassSync(tabId) {
  if (!glassBar || !glassEl) return;
  if (glass.active) return;
  glassRead();
  let t = null;
  for (let i = 0; i < glass.items.length; i++) {
    if (glass.items[i].id === tabId) { t = glass.items[i]; break; }
  }
  if (!t) return;
  glass.w = GLASS_W_FIXED;
  glass.h = Math.max(20, glassInnerHeight() - GLASS_V_INSET * 2);
  glassFitBox();

  // 首尾图标各往边缘让一点，让遮罩贴到最左/最右时正好罩住图标
  if (glass.items.length) {
    const first = glass.items[0];
    const bl = parseFloat(getComputedStyle(glassBar).borderLeftWidth) || 0;
    const tCenter = first.left + first.w / 2;
    const gCenter = bl + GLASS_V_INSET + glass.w / 2;
    const edgePad = Math.max(0, (tCenter - gCenter) * 2);
    glassBar.style.setProperty('--edge-pad', edgePad.toFixed(2) + 'px');
  }

  glassEl.dataset.label = t.label;
  glass.x = glassClamp(glassCenterOf(t));
  glassEl.style.transform = 'translate3d(' + glass.x + 'px,0,0) scale(1)';
  glassEl.classList.remove('drag');
  glassEl.classList.add('show');
}

$$('.tab-item').forEach(function (t) {
  t.onclick = function () {
    if (Date.now() < glass.guardUntil) return;
    switchTab(t.dataset.tab);
  };
});

// 手势从整条 dock 起手，但移动/抬起挂在 window 上：
// 不用 setPointerCapture —— 它会把合成 click 的目标改成 dock 容器，导致 tab 的点击失效。
if (glassBar) {
  glassBar.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    glass.pointerId = e.pointerId;
    glassDown(e.clientX);
  }, { passive: true });
}

window.addEventListener('pointermove', function (e) {
  if (glass.pointerId < 0 || e.pointerId !== glass.pointerId) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { glassUp(glass.curX, false); return; }
  glassMove(e.clientX);
}, { passive: true });

window.addEventListener('pointerup', function (e) {
  if (glass.pointerId < 0 || e.pointerId !== glass.pointerId) return;
  glassUp(e.clientX, true);
});

window.addEventListener('pointercancel', function (e) {
  if (glass.pointerId < 0 || e.pointerId !== glass.pointerId) return;
  glassUp(e.clientX, false);
});

document.addEventListener('visibilitychange', function () {
  if (!document.hidden) return;
  clearTimeout(glass.timer);
  glass.pending = false;
  if (glass.active) glassUp(glass.curX, false);
});

$('#btnAnnouncement').onclick = () => showAnnouncement(false);



function currentTabId() {
  const p = document.querySelector('.page.active');
  return p ? p.id : 'page-today';
}
