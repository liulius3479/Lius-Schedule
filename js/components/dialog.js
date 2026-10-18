









let udPending = null;   

function udRoot() {
  let el = document.getElementById('uiDialog');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'uiDialog';
  el.className = 'ui-dialog';
  el.innerHTML = '<div class="ud-mask" id="udMask"></div><div class="ud-card" id="udCard"></div>';
  document.body.appendChild(el);
  el.querySelector('#udMask').addEventListener('click', function () { udClose(null); });
  return el;
}

function udClose(result) {
  const root = document.getElementById('uiDialog');
  if (root) root.classList.remove('show');
  const fn = udPending;
  udPending = null;
  if (fn) fn(result);
}

function udOpen(html, onMount) {
  return new Promise(function (resolve) {

    if (udPending) { const old = udPending; udPending = null; old(null); }
    udPending = resolve;
    const root = udRoot();
    root.querySelector('#udCard').innerHTML = html;
    root.classList.add('show');
    if (onMount) onMount(root.querySelector('#udCard'));
  });
}

function udEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }


function uiAlert(msg, title) {
  const html =
    (title ? '<div class="ud-title">' + udEsc(title) + '</div>' : '') +
    '<div class="ud-msg">' + udEsc(msg).replace(/\n/g, '<br>') + '</div>' +
    '<div class="ud-btns"><button class="ud-ok" id="udOk">知道了</button></div>';
  const p = udOpen(html, function (card) {
    card.querySelector('#udOk').onclick = function () { udClose(true); };
  });
  return p;
}


function uiConfirm(msg, title, okText, cancelText) {
  const label = okText || '确定';
  const danger = /删除|清空|移除|卸载|覆盖/.test(label) ? ' danger' : '';
  const html =
    (title ? '<div class="ud-title">' + udEsc(title) + '</div>' : '') +
    '<div class="ud-msg">' + udEsc(msg).replace(/\n/g, '<br>') + '</div>' +
    '<div class="ud-btns">' +
      '<button class="ud-cancel ghost" id="udNo">' + udEsc(cancelText || '取消') + '</button>' +
      '<button class="ud-ok' + danger + '" id="udYes">' + udEsc(label) + '</button>' +
    '</div>';
  return udOpen(html, function (card) {
    card.querySelector('#udNo').onclick = function () { udClose(false); };
    card.querySelector('#udYes').onclick = function () { udClose(true); };
  });
}


function udFieldHtml(f) {
  const id = 'udf_' + f.key;
  const label = '<label class="ud-label" for="' + id + '">' + udEsc(f.label) + '</label>';
  let inner;
  if (f.type === 'checks') {
    const opts = (f.options || []).map(function (o) {
      const v = (o && o.value != null) ? o.value : o;
      const t = (o && o.label != null) ? o.label : o;
      const on = Array.isArray(f.value) && f.value.map(String).indexOf(String(v)) >= 0 ? ' on' : '';
      return '<button type="button" class="ud-check' + on + '" data-v="' + udEsc(v) + '">' + udEsc(t) + '</button>';
    }).join('');
    inner = '<div class="ud-checks" data-key="' + udEsc(f.key) + '">' + opts + '</div>';
  } else if (f.type === 'color') {
    const opts = (f.options || []).map(function (o) {
      const v = (o && o.value != null) ? o.value : o;
      const on = String(v).toLowerCase() === String(f.value == null ? '' : f.value).toLowerCase() ? ' on' : '';
      return '<button type="button" class="ud-color' + on + '" data-c="' + udEsc(v) + '" style="background:' + udEsc(v) + '"></button>';
    }).join('');
    inner = '<div class="ud-colors" data-key="' + udEsc(f.key) + '">' + opts + '</div>';
  } else if (f.type === 'select') {
    const opts = (f.options || []).map(function (o) {
      const v = (o && o.value != null) ? o.value : o;
      const t = (o && o.label != null) ? o.label : o;
      const sel = String(v) === String(f.value == null ? '' : f.value) ? ' selected' : '';
      return '<option value="' + udEsc(v) + '"' + sel + '>' + udEsc(t) + '</option>';
    }).join('');
    inner = '<select class="ud-input" id="' + id + '" data-key="' + udEsc(f.key) + '">' + opts + '</select>';
  } else {

    const isDate = f.type === 'date';
    const type = f.type === 'number' ? 'number' : (f.type === 'time' ? 'time' : 'text');
    let extra = '';
    if (type === 'number') {
      extra = ' inputmode="numeric"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '');
    }
    if (isDate) extra += ' data-date="1" data-label="' + udEsc(f.label) + '" readonly';
    inner = '<input class="ud-input' + (isDate ? ' date-readonly' : '') + '" id="' + id + '" data-key="' + udEsc(f.key) + '" type="' + type + '"' +
      ' value="' + udEsc(f.value == null ? '' : f.value) + '"' +
      ' placeholder="' + udEsc(isDate ? '点击选择日期' : (f.placeholder || '')) + '"' + extra + '>';
  }
  return '<div class="ud-field' + (f.half ? ' half' : '') + '">' + label + inner + '</div>';
}

function uiForm(title, fields) {
  const html =
    '<div class="ud-title">' + udEsc(title) + '</div>' +
    '<div class="ud-fields">' + (fields || []).map(udFieldHtml).join('') + '</div>' +
    '<div class="ud-err" id="udErr"></div>' +
    '<div class="ud-btns">' +
      '<button class="ud-cancel ghost" id="udNo">取消</button>' +
      '<button class="ud-ok" id="udYes">确定</button>' +
    '</div>';
  return udOpen(html, function (card) {
    card.querySelector('#udNo').onclick = function () { udClose(null); };
    card.querySelector('#udYes').onclick = function () {
      const out = {};
      let err = '';
      const list = card.querySelectorAll('.ud-input');
      for (let i = 0; i < list.length; i++) {
        const el = list[i];
        const key = el.dataset.key;
        const f = (fields || []).filter(function (x) { return x.key === key; })[0] || {};
        let v = String(el.value || '').trim();
        if (f.type === 'number' || el.type === 'number') {
          if (v === '') v = '';
          else {
            const n = parseInt(v, 10);
            if (isNaN(n)) { err = f.label + ' 需要填数字'; break; }
            if (f.min != null && n < f.min) { err = f.label + ' 不能小于 ' + f.min; break; }
            if (f.max != null && n > f.max) { err = f.label + ' 不能大于 ' + f.max; break; }
            v = n;
          }
        }
        if (f.required && (v === '' || v == null)) { err = '请填写' + f.label; break; }
        out[key] = v;
      }
      card.querySelectorAll('.ud-checks').forEach(function (grp) {
        const vals = [];
        grp.querySelectorAll('.ud-check.on').forEach(function (b) { vals.push(b.dataset.v); });
        out[grp.dataset.key] = vals;
      });
      card.querySelectorAll('.ud-colors').forEach(function (grp) {
        const on = grp.querySelector('.ud-color.on');
        out[grp.dataset.key] = on ? on.dataset.c : '';
      });
      if (err) { card.querySelector('#udErr').textContent = err; return; }
      udClose(out);
    };
    card.querySelectorAll('.ud-check').forEach(function (b) {
      b.onclick = function () { b.classList.toggle('on'); };
    });
    card.querySelectorAll('.ud-color').forEach(function (b) {
      b.onclick = function () {
        const grp = b.parentNode;
        grp.querySelectorAll('.ud-color').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
    });
    const first = card.querySelector('.ud-input:not([readonly])');
    if (first) { try { first.focus(); } catch (e) {} }

    if (typeof openDatePicker === 'function') {
      card.querySelectorAll('.ud-input[data-date]').forEach(function (el) {
        el.addEventListener('click', function () {
          openDatePicker({
            title: el.getAttribute('data-label') || '选择日期',
            value: el.value,
            clearable: false,
            onPick: function (v) {
              el.value = v;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            },
          });
        });
      });
    }
  });
}
