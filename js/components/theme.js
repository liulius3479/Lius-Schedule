





const THEME_PRESETS = [
  {
    id: 'furina',
    name: '芙芙',
    sub: '星海 · 芙宁娜',
    img: 'img/preset-furina.jpg',
    accent: '#8fb4ff',
    veil: '0.30',
    lum: 0.266
  },
  {
    id: 'catgirl',
    name: '金发猫娘',
    sub: '金发 · 猫耳',
    img: 'img/preset-catgirl.jpg',
    accent: '#e8b84b',
    veil: '0.05',
    lum: 0.78
  }
];

function getPreset(id) {
  if (!id) return null;
  for (let i = 0; i < THEME_PRESETS.length; i++) {
    if (THEME_PRESETS[i].id === id) return THEME_PRESETS[i];
  }
  return null;
}



function absAssetUrl(p) {
  if (!p) return '';
  if (/^(data:|blob:|https?:|file:|content:|\/)/i.test(p)) return p;
  try { return new URL(p, location.href).href; } catch (e) { return p; }
}


function currentBgSrc() {
  if ((state.config.theme || 'light') !== 'custom') return '';
  const p = getPreset(state.config.preset);
  if (p) return absAssetUrl(p.img);
  return state.config.bgImage || '';
}

function setGlassMode(mode) {
  state.config.glassMode = (mode === 'clear') ? 'clear' : 'frosted';
  save();
  applyTheme();
  renderThemePage();
}

function applyTheme() {
  const t = state.config.theme || 'light';
  const src = currentBgSrc();
  const preset = (t === 'custom') ? getPreset(state.config.preset) : null;
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-glass', state.config.glassMode === 'clear' ? 'clear' : 'frosted');
  const tcol = state.config.themeColor || '';
  document.documentElement.style.setProperty('--pick', tcol || '#2563eb');
  if (tcol) {
    document.documentElement.style.setProperty('--accent', tcol);
    document.documentElement.style.setProperty('--icon-color', tcol);
    document.documentElement.setAttribute('data-user-icon', '1');
  } else {
    document.documentElement.style.setProperty('--accent', '#4c7dff');
    document.documentElement.style.removeProperty('--icon-color');
    document.documentElement.removeAttribute('data-user-icon');
  }
  document.documentElement.style.setProperty('--bg-image', src ? `url("${src}")` : 'none');
  document.documentElement.style.setProperty('--bg-veil', preset ? preset.veil : '0.34');
  document.body.classList.toggle('has-bg', !!src);
  document.body.classList.toggle('has-preset', !!preset);
  if (preset) document.body.setAttribute('data-preset', preset.id);
  else document.body.removeAttribute('data-preset');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = (t === 'light') ? '#f2f3f7' : '#0e1016';
  $$('[data-theme-pick]').forEach(el => el.classList.toggle('on', el.dataset.themePick === t));
  $$('[data-preset-pick]').forEach(el => el.classList.toggle('on', (el.dataset.presetPick || '') === (preset ? preset.id : '')));
  updateBgTip();
  renderAccentRow();
  syncStatusBar();
  syncTextTone(src, preset);
  applyPickBorder();
}

function applyPickBorder() {
  const cards = document.querySelectorAll('.theme-card, .preset-card');
  for (let i = 0; i < cards.length; i++) {
    cards[i].classList.remove('on');
    cards[i].style.removeProperty('border');
    cards[i].style.removeProperty('box-shadow');
  }
  const c = state.config || {};
  const pick = c.themeColor || '#2563eb';
  const mark = function (el) {
    if (!el) return;
    el.classList.add('on');
    el.style.setProperty('border', '1.5px solid ' + pick, 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
  };
  mark(document.querySelector('[data-glass-pick="' + (c.glassMode || 'frosted') + '"]'));
  mark(document.querySelector('[data-theme-color="' + (c.themeColor || '') + '"]'));
  const hasPreset = !!(c.preset || c.myPresetId);
  if (hasPreset) {
    if (c.myPresetId) mark(document.querySelector('[data-my-pick="' + c.myPresetId + '"]'));
    else mark(document.querySelector('[data-preset-pick="' + c.preset + '"]'));
    mark(document.querySelector('[data-tone-pick="' + (c.bgTone || 'auto') + '"]'));
  } else if (c.theme === 'light' || c.theme === 'dark') {
    mark(document.querySelector('[data-theme-pick="' + c.theme + '"]'));
  }
}





const TONE_THRESHOLD = 0.46;   
let toneSeq = 0;               

function measureImageLuminance(src) {
  return new Promise(function (resolve) {
    if (!src) { resolve(null); return; }
    const im = new Image();
    im.onload = function () {
      try {
        const W = 48, H = 48;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.drawImage(im, 0, 0, W, H);
        const d = ctx.getImageData(0, 0, W, H).data;
        let sum = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          n++;
        }
        resolve(n ? sum / n : null);
      } catch (e) {

        resolve(null);
      }
    };
    im.onerror = function () { resolve(null); };
    im.src = src;
  });
}

function applyTextTone(lum) {
  const html = document.documentElement;
  const veil = parseFloat(getComputedStyle(html).getPropertyValue('--bg-veil')) || 0.34;
  const manual = state.config.bgTone || 'auto';

  const eff = lum == null ? null : lum * (1 - veil) + 0.03 * veil;
  const autoBright = eff != null && eff > TONE_THRESHOLD;
  const bright = manual === 'light' ? true : (manual === 'dark' ? false : autoBright);

  if (bright) html.setAttribute('data-onbg', 'light');
  else html.setAttribute('data-onbg', 'dark');
  const tip = $('#textToneTip');
  if (tip) {
    tip.textContent = '当前检测：' + (manual === 'light' ? '浅色背景' : manual === 'dark' ? '深色背景' : (lum == null ? '深色背景' : (bright ? '浅色背景' : '深色背景')));
  }
  syncStatusBar();
}

function setBgTone(v) {
  state.config.bgTone = v || 'auto';
  try { save(); } catch (e) {}
  syncTextTone(currentBgSrc(), getPreset(state.config.preset));
  renderThemePage();
}

function syncTextTone(src, preset) {
  const seq = ++toneSeq;
  if (!src) {
    document.documentElement.setAttribute('data-onbg', 'dark');
    const tip = $('#textToneTip');
    if (tip) tip.textContent = '';
    syncStatusBar();
    return;
  }
  if (preset && preset.lum != null) { applyTextTone(preset.lum); return; }
  measureImageLuminance(src).then(function (lum) {
    if (seq !== toneSeq) return;
    applyTextTone(lum);
  });
}





function syncStatusBar() {
  if (!window.plus || !plus.navigator || !plus.navigator.setStatusBarStyle) return;
  try {

    const bright = document.documentElement.getAttribute('data-onbg') === 'light';
    const darkText = (state.config.theme || 'light') === 'light' || bright;
    plus.navigator.setStatusBarStyle(darkText ? 'dark' : 'light');
  } catch (e) {}
}

function updateBgTip() {
  const tip = $('#bgTip');
  if (!tip) return;
  const p = getPreset(state.config.preset);
  if (p) tip.textContent = '当前预设：' + p.name + '（内置图，不占本地存储）。';
  else if (state.config.bgImage) tip.textContent = '已设置背景图（只存在手机本地，不会外传）。';
  else tip.textContent = '还没选背景：用内置预设，或从相册挑一张。';
}



function setTheme(t) {
  state.config.theme = t;
  if (t === 'light' || t === 'dark') {
    state.config.preset = '';
    state.config.myPresetId = null;
    state.config.bgImage = '';
  }
  save();
  applyTheme();
  syncPresetBox();
}


function applyPreset(id) {
  const p = getPreset(id);
  if (!p) return;
  state.config.theme = 'custom';
  state.config.myPresetId = null;
  state.config.preset = p.id;
  if (p.accent) state.config.accent = p.accent;
  try { save(); } catch (e) {}
  applyAccent();
  applyTheme();
  syncPresetBox();
}

function clearPreset() {
  if (!state.config.preset) return;
  state.config.preset = '';
  try { save(); } catch (e) {}
  applyTheme();
  syncPresetBox();
}


function pickOwnBg() {
  clearPreset();
  pickBg();
}

function pickBg() {


  if (window.plus && plus.gallery && plus.gallery.pick) {
    try {
      plus.gallery.pick(function (path) {
        if (!path) return;
        var done = false;
        var timer = setTimeout(function () {
          if (!done) { done = true; uiAlert('这张图读得太慢了，可能原图太大，换一张小一点的试试'); }
        }, 15000);
        var finish = function (dataUrl, errMsg) {
          if (done) return;
          done = true; clearTimeout(timer);
          if (dataUrl) { handleBgData(dataUrl); return; }
          var tip = errMsg || '这张图读不出来，换一张试试';
          uiConfirm(tip + '\n\n诊断路径：' + String(path).slice(0, 90), '换一张试试？', '用系统选择器', '算了').then(function (yes) {
            if (!yes) return;
            var inp = $('#bgInput'); if (inp) inp.click();
          });
        };

        var byPlus = function (entry) {
          if (!entry) { finish('', '这张图读不出来，换一张试试'); return; }
          try {
            var fr = new plus.io.FileReader();
            fr.onloadend = function (e) { finish((e && e.target) ? e.target.result : '', ''); };
            fr.onerror = function () { finish('', '这张图读不出来，换一张试试'); };
            fr.readAsDataURL(entry);
          } catch (e2) { finish('', '这张图读不出来，换一张试试'); }
        };

        var byEntry = function (p) {
          var abs = p;
          try { if (plus.io.convertLocalFileSystemURL) abs = plus.io.convertLocalFileSystemURL(p) || p; } catch (e) {}
          try {
            plus.io.resolveLocalFileSystemURL(abs, function (entry) {
              try {
                entry.file(function (file) {
                  try {
                    var r = new FileReader();
                    r.onload = function () { finish(r.result, ''); };
                    r.onerror = function () { byPlus(entry); };
                    r.readAsDataURL(file);
                  } catch (e3) { byPlus(entry); }
                }, function () { byPlus(entry); });
              } catch (e4) { byPlus(entry); }
            }, function () { byPlus(null); });
          } catch (e5) { byPlus(null); }
        };


        try {
          var im = new Image();
          im.onload = function () {
            var d = compressBg(im, 2560, 0.92);
            if (d) finish(d, ''); else byEntry(path);
          };
          im.onerror = function () { byEntry(path); };
          im.src = path;
        } catch (e7) { byEntry(path); }
      }, function () {}, { filter: 'image', multiple: false });
      return;
    } catch (e) {}
  }
  const input = $('#bgInput');
  if (input) input.click();
}





const BG_MAX_EDGE = 4096;     

const BG_MAX_PIXELS = 16e6;   

function compressBg(img, maxW, quality) {
  const iw = img.naturalWidth || img.width || 0;
  const ih = img.naturalHeight || img.height || 0;
  if (!iw || !ih) return '';
  let scale = Math.min(1, maxW / iw);
  const longEdge = Math.max(iw, ih);
  if (longEdge * scale > BG_MAX_EDGE) scale = BG_MAX_EDGE / longEdge;
  if (iw * ih * scale * scale > BG_MAX_PIXELS) scale = Math.sqrt(BG_MAX_PIXELS / (iw * ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  try { ctx.drawImage(img, 0, 0, w, h); } catch (e) { return ''; }
  try {
    const d = cv.toDataURL('image/jpeg', quality);
    if (d && d.length > 32 && d.indexOf('data:image/jpeg') === 0) return d;
  } catch (e) {}

  try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
}

function handleBgData(dataUrl) {
  if (!dataUrl) { uiAlert('图片读取失败：没有拿到图片数据，换一张试试'); return; }
  const oldPreset = state.config.preset;
  state.config.preset = '';   
  const img = new Image();
  img.onload = () => {



    const tries = [[2560, 0.80], [2200, 0.75], [1920, 0.72], [1600, 0.68], [1440, 0.65],
                   [1280, 0.62], [1080, 0.58], [960, 0.55], [800, 0.50], [640, 0.45], [480, 0.42]];
    const oldBg = state.config.bgImage, oldTheme = state.config.theme;
    let lastErr = '';
    for (let i = 0; i < tries.length; i++) {
      const data = compressBg(img, tries[i][0], tries[i][1]);
      if (!data) { lastErr = '这张图的格式读不出来，换一张 JPG / PNG / WebP 试试'; continue; }
      state.config.bgImage = data;
      state.config.theme = 'custom';
      try {
        save();
        applyTheme();
        setTimeout(function () {
          if (state.config.bgImage) {
            saveMyPreset({ theme: oldTheme, preset: oldPreset, bgImage: oldBg });
          }
        }, 420);
        return;
      } catch (err) {
        const msg = String((err && err.message) || err || '');
        lastErr = (/quota|exceed/i.test(msg) || (err && err.name === 'QuotaExceededError'))
          ? '手机本地存储放不下了，先清掉一些别的数据再试'
          : ('保存失败：' + msg);
      }
    }
    state.config.bgImage = oldBg;
    state.config.theme = oldTheme;
    applyTheme();
    uiAlert('这张图用不了。' + (lastErr || '从大到小试了好几档尺寸都存不下，换一张小一点的吧。'));
  };
  img.onerror = () => uiAlert('这张图读不出来。\n\n支持 JPG、PNG、WebP、GIF、BMP 这些常见格式；\n苹果或部分手机拍的 HEIC 照片，要先在相册里导出成 JPG 再用。');
  img.src = dataUrl;
}

function handleBgFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => handleBgData(reader.result);
  reader.readAsDataURL(file);
}

const THEME_COLORS = [
  { name: '蓝', v: '#2563eb' },
  { name: '青', v: '#0d9488' },
  { name: '紫', v: '#7c3aed' },
  { name: '橙', v: '#ea580c' },
  { name: '红', v: '#dc2626' },
  { name: '绿', v: '#15803d' }
];

const ACCENTS = [
  { name: '默认', v: '' },
  { name: '青', v: '#0fb9a3' },
  { name: '紫', v: '#8b5cf6' },
  { name: '橙', v: '#f2994a' },
  { name: '玫红', v: '#f43f5e' },
  { name: '墨绿', v: '#2f8f6b' }
];



function accentDotsHtml() {
  const cur = state.config.accent || '';
  const p = (state.config.theme || 'light') === 'custom' ? getPreset(state.config.preset) : null;
  const presetDot = p
    ? `<div class="accent-dot${cur === p.accent ? ' on' : ''}" data-accent="${p.accent}" title="预设配色" style="background:${p.accent}"></div>`
    : '';
  return presetDot + ACCENTS.map(a => '<div class="accent-dot' + ((a.v || '') === cur ? ' on' : '') +
    '" data-accent="' + a.v + '" title="' + a.name + '" style="background:' + (a.v || '#4c7dff') + '"></div>').join('');
}


function themeDotsHtml() {
  const cur = state.config.themeColor || '';
  return THEME_COLORS.map(a => {
    const cls = 'accent-dot' + (a.v ? '' : ' none') + ((a.v || '') === cur ? ' on' : '');
    const style = a.v ? ' style="background:' + a.v + '"' : '';
    return '<div class="' + cls + '" data-theme-color="' + a.v + '" title="' + a.name + '"' + style + '></div>';
  }).join('');
}

function setThemeColor(v) {
  state.config.themeColor = v || '';
  save();
  applyTheme();
  renderThemePage();
}

function renderAccentRow() {
  const row = document.querySelector('#themePageBody .accent-row');
  if (!row) return;
  row.innerHTML = accentDotsHtml();
  row.querySelectorAll('[data-accent]').forEach(el => {
    el.onclick = () => setAccent(el.dataset.accent);
  });
}


function openThemePicker() {
  switchTab('page-theme');
}

function myPresets() {
  if (!Array.isArray(state.config.myPresets)) state.config.myPresets = [];
  return state.config.myPresets;
}

function myPresetThumb(m) {
  if (m.bgImage) return m.bgImage;
  const p = getPreset(m.preset);
  return p ? absAssetUrl(p.img) : '';
}

function todayPresetName() {
  const d = new Date();
  const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}

function saveMyPreset(restoreOnCancel) {
  const list = myPresets();
  if (list.length >= 3) { uiAlert('最多存 3 个个人模板，先删掉一个再存吧'); return; }
  if (!(state.config.preset || state.config.bgImage)) {
    uiAlert('先选一个预设、或者从相册挑一张背景图，再保存成模板');
    return;
  }
  uiForm('保存为个人模板', [
    { key: 'name', label: '模板名称（留空就用今天日期）', type: 'text' }
  ]).then(function (v) {
    if (v === null) {
      // 取消：不保存，并回到导入前的主题；若那个主题本来就是空的，就落回浅色
      if (restoreOnCancel) {
        state.config.theme = restoreOnCancel.theme;
        state.config.preset = restoreOnCancel.preset;
        state.config.bgImage = restoreOnCancel.bgImage;
        if (!state.config.preset && !state.config.bgImage) state.config.theme = 'light';
        try { save(); } catch (e) {}
        applyTheme();
        renderThemePage();
      }
      return;
    }
    const raw = String(v.name || '').trim();
    const name = (raw || todayPresetName()).slice(0, 12);
    const item = {
      id: 'my' + Date.now(),
      name: name,
      theme: state.config.theme || 'custom',
      preset: state.config.preset || '',
      bgImage: state.config.bgImage || '',
      accent: state.config.accent || ''
    };
    list.push(item);
    try { save(); } catch (e) {
      list.pop();
      uiAlert('手机本地存储放不下了，这个模板存不下。可以先删掉别的模板，或者换一张小一点的背景图。');
      return;
    }
    renderThemePage();
  });
}

function applyMyPreset(id) {
  const m = myPresets().filter(function (x) { return x.id === id; })[0];
  if (!m) return;
  state.config.theme = m.theme || 'custom';
  state.config.myPresetId = m.id;
  state.config.preset = m.preset || '';
  state.config.bgImage = m.bgImage || '';
  state.config.accent = m.accent || '';
  try { save(); } catch (e) {}
  applyTheme();
  if (typeof applyAccent === 'function') applyAccent();
  renderThemePage();
}

function removeMyPreset(id) {
  const list = myPresets();
  const m = list.filter(function (x) { return x.id === id; })[0];
  if (!m) return;
  uiConfirm('删除模板「' + m.name + '」？', '删除模板', '删除', '取消').then(function (ok) {
    if (!ok) return;
    const i = list.indexOf(m);
    if (i >= 0) list.splice(i, 1);
    // 删空了：回落到内置预设（内置模板不可删），没有内置预设才回浅色
    if (!list.length && (state.config.theme || 'light') === 'custom') {
      const first = THEME_PRESETS[0];
      if (first) {
        state.config.preset = first.id;
        state.config.bgImage = '';
      } else {
        state.config.theme = 'light';
        state.config.preset = '';
        state.config.bgImage = '';
      }
    }
    try { save(); } catch (e) {}
    applyTheme();
    renderThemePage();
  });
}

function bindLongPress(el, fn) {
  let timer = 0;
  let fired = false;
  el.addEventListener('pointerdown', function () {
    fired = false;
    clearTimeout(timer);
    timer = setTimeout(function () { fired = true; fn(); }, 480);
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
    el.addEventListener(t, function () { clearTimeout(timer); }, { passive: true });
  });
  el.addEventListener('click', function (e) {
    if (!fired) return;
    fired = false;
    e.stopPropagation();
    e.preventDefault();
    setTimeout(function () { fired = false; }, 400);
  }, true);
}

function renameMyPreset(id) {
  const m = myPresets().filter(function (x) { return x.id === id; })[0];
  if (!m) return;
  uiForm('自定义名称', [
    { key: 'name', label: '模板名称', type: 'text', required: true, value: m.name }
  ]).then(function (v) {
    if (!v) return;
    const name = String(v.name || '').trim().slice(0, 12);
    if (!name) { uiAlert('名字不能为空'); return; }
    m.name = name;
    try { save(); } catch (e) {}
    renderThemePage();
  });
}

function myPresetMenu(id) {
  const m = myPresets().filter(function (x) { return x.id === id; })[0];
  if (!m) return;
  const html =
    '<div class="ud-title">' + udEsc(m.name) + '</div>' +
    '<div class="ud-btns" style="flex-direction:column;gap:8px;margin-top:6px;">' +
      '<button class="ud-ok" id="mpRename" style="width:100%;">自定义名称</button>' +
      '<button class="ud-ok danger" id="mpDelete" style="width:100%;">删除模板</button>' +
      '<button class="ud-cancel ghost" id="mpCancel" style="width:100%;">取消</button>' +
    '</div>';
  udOpen(html, function (card) {
    card.querySelector('#mpCancel').onclick = function () { udClose(null); };
    card.querySelector('#mpRename').onclick = function () { udClose(null); renameMyPreset(id); };
    card.querySelector('#mpDelete').onclick = function () { udClose(null); removeMyPreset(id); };
  });
}

function renderThemePage() {
  const t = state.config.theme || 'light';
  const dots = accentDotsHtml();
  const themeDots = themeDotsHtml();

  const presetCards = THEME_PRESETS.map(p => `
      <div class="preset-card${!state.config.myPresetId && state.config.preset === p.id ? ' on' : ''}" data-preset-pick="${p.id}">
        <div class="pthumb" style="background-image:url('${absAssetUrl(p.img)}')"></div>
        <div class="pname">${p.name}</div>
        <div class="psub">${p.sub}</div>
      </div>`).join('');
  const myCards = myPresets().map(m => `
      <div class="preset-card${state.config.myPresetId === m.id ? ' on' : ''}" data-my-pick="${m.id}">
        <div class="pthumb" style="background-image:url('${myPresetThumb(m)}')"></div>
        <div class="pname">${udEsc(m.name)}</div>
        <div class="psub">个人模板</div>
        <button class="pdel" data-my-del="${m.id}" aria-label="删除">×</button>
      </div>`).join('');
  const body = $('#themePageBody');
  if (!body) return;
  const glass = state.config.glassMode || 'frosted';
  body.innerHTML = `
    <div class="section-title" style="margin-top:0;">主题特效</div>
    <div class="theme-grid theme-grid-2" style="margin-top:2px;">
      <div class="theme-card${glass === 'frosted' ? ' on' : ''}" data-glass-pick="frosted"><div class="swatch sw-frost"></div>磨砂玻璃</div>
      <div class="theme-card${glass === 'clear' ? ' on' : ''}" data-glass-pick="clear"><div class="swatch sw-clear"></div>透明玻璃</div>
    </div>
    <div class="hint">磨砂玻璃会模糊背景，滑动时可能有一瞬重采样；透明玻璃不模糊，滑动最稳。</div>

    <div class="section-title">外观颜色</div>
    <div class="theme-grid theme-grid-2" style="margin-top:2px;">
      <div class="theme-card${t === 'light' ? ' on' : ''}" data-theme-pick="light"><div class="swatch sw-light"></div>浅色</div>
      <div class="theme-card${t === 'dark' ? ' on' : ''}" data-theme-pick="dark"><div class="swatch sw-dark"></div>深色</div>
    </div>
    <div class="hint" id="wallTip"></div>

    <div class="section-title">预设模板</div>
    <div class="preset-grid">
      ${presetCards}
    </div>

    <div class="section-title">个人模板</div>
    <div class="preset-grid">
      ${myCards}
      <div class="preset-card own" id="presetOwn">
        <div class="pthumb pthumb-own">＋</div>
        <div class="pname">自己的图</div>
        <div class="psub">选图后取名保存</div>
      </div>
    </div>

    <div class="section-title">自定义外观颜色</div>
    <div class="theme-grid" style="margin-top:2px;">
      <div class="theme-card${(state.config.bgTone || 'auto') === 'auto' ? ' on' : ''}" data-tone-pick="auto"><div class="swatch sw-custom"></div>自动检测</div>
      <div class="theme-card${state.config.bgTone === 'light' ? ' on' : ''}" data-tone-pick="light"><div class="swatch sw-light"></div>浅色背景</div>
      <div class="theme-card${state.config.bgTone === 'dark' ? ' on' : ''}" data-tone-pick="dark"><div class="swatch sw-dark"></div>深色背景</div>
    </div>

    <div class="section-title">主题颜色</div>
    <div class="accent-row">${themeDots}</div>
    <div class="hint" id="textToneTip"></div>
    <div class="mine-row">
      <button class="ghost" id="btnClearBg">移除背景图</button>
    </div>
  `;
  body.querySelectorAll('[data-glass-pick]').forEach(el => {
    el.onclick = () => setGlassMode(el.dataset.glassPick);
  });
  body.querySelectorAll('[data-theme-pick]').forEach(el => {
    el.onclick = () => setTheme(el.dataset.themePick);
  });
  body.querySelectorAll('[data-accent]').forEach(el => {
    el.onclick = () => setAccent(el.dataset.accent);
  });
  body.querySelectorAll('[data-theme-color]').forEach(el => {
    el.onclick = () => setThemeColor(el.dataset.themeColor);
  });
  body.querySelectorAll('[data-tone-pick]').forEach(el => {
    el.onclick = () => setBgTone(el.dataset.tonePick);
  });
  body.querySelectorAll('[data-preset-pick]').forEach(el => {
    el.onclick = () => applyPreset(el.dataset.presetPick);
  });
  const wt = $('#wallTip');
  if (wt) {
    if (t === 'custom') wt.textContent = '当前使用壁纸外观（选壁纸后自动切到这里）';
    else wt.textContent = '';
  }
  $('#presetOwn').onclick = pickOwnBg;
  body.querySelectorAll('[data-my-pick]').forEach(el => {
    el.onclick = () => applyMyPreset(el.dataset.myPick);
    bindLongPress(el, function () { myPresetMenu(el.dataset.myPick); });
  });
  body.querySelectorAll('[data-my-del]').forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); removeMyPreset(el.dataset.myDel); };
  });
  $('#btnClearBg').onclick = () => {
    const hasAny = !!(state.config.preset || state.config.bgImage);
    if (!hasAny) { uiAlert('还没有设置背景图'); return; }
    state.config.preset = '';
    state.config.bgImage = '';
    if (state.config.theme === 'custom') state.config.theme = 'light';
    try { save(); } catch (e) {}
    applyTheme();
    syncPresetBox();
  };
  syncPresetBox();
  applyPickBorder();
}


function syncPresetBox() {
  const box = $('#presetBox');
  if (box) box.classList.add('show');

  const clearBtn = $('#btnClearBg');
  if (clearBtn) clearBtn.style.display = (state.config.preset || state.config.bgImage) ? '' : 'none';
  $$('[data-preset-pick]').forEach(el => el.classList.toggle('on', (el.dataset.presetPick || '') === (state.config.preset || '')));
  updateBgTip();
  applyPickBorder();
}

function applyAccent() {
  const a = state.config.accent || '';
  document.documentElement.style.setProperty('--accent', a || '#4c7dff');
}

function setAccent(v) {
  state.config.accent = v || '';
  save();
  applyAccent();
  $$('[data-accent]').forEach(el => el.classList.toggle('on', (el.dataset.accent || '') === (state.config.accent || '')));
}


bindSwipe($('#page-timetable'), () => shiftWeek(1), () => shiftWeek(-1));
bindSwipe($('#page-today'), () => changeViewDate(1), () => changeViewDate(-1));
