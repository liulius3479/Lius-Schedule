


function renderToday() {
  const viewDateObj = new Date(state.viewDate + 'T00:00:00');
  const y = viewDateObj.getFullYear();
  const m = viewDateObj.getMonth() + 1;
  const d = viewDateObj.getDate();
  const wd = viewDateObj.getDay() || 7;

  const todayStr = formatLocalDate(new Date());
  const todayDateObj = new Date(todayStr + 'T00:00:00');
  const diffDays = Math.round((viewDateObj - todayDateObj) / (1000 * 60 * 60 * 24));

  let title = '今日';
  const cnNum = ['天', '一', '二', '三', '四', '五', '六', '七'];
  if (diffDays > 0 && diffDays <= 7) {
    title = (cnNum[diffDays] === '七') ? '一周后' : `${cnNum[diffDays]}天后`;
  } else if (diffDays < 0 && diffDays >= -7) {
    const absDay = Math.abs(diffDays);
    title = (cnNum[absDay] === '七') ? '一周前' : `${cnNum[absDay]}天前`;
  }

  $('#todayDateNum').textContent = String(d).padStart(2, '0');
  $('#todayYearMonth').textContent = `${y}年/${String(m).padStart(2,'0')}月/${String(d).padStart(2,'0')}日`;
  $('#todayWeekday').textContent = `星期${WD_CN[wd]}`;
  $('#todayTitle').textContent = title;

  const wk = calculateWeek(state.viewDate);
  $('#todayWeekInfo').textContent = `第 ${wk} 教学周`;

  const todayCourses = coursesOn(viewDateObj);

  $('#todayCourseCount').textContent = todayCourses.length;

  const listEl = $('#todayCourseList');



  const dir = state._dayDir === 'right' ? -1 : (state._dayDir === 'left' ? 1 : 0);
  state._dayDir = null;
  const IN_X = 26;
  const OUT_MS = dir ? 150 : 0;
  if (dir) {
    // 只做位移，不做透明度：opacity 过渡会让玻璃卡片在淡出淡入时看起来是透明的
    listEl.style.transition = 'transform .15s ease';
    listEl.style.transform = 'translateX(' + (-dir * IN_X) + 'px)';
  } else {
    // 无方向切换时不要先置 opacity 0：卡片会淡入，玻璃在淡入过程中看起来是透明的
    listEl.style.transition = 'none';
  }

  setTimeout(() => {
    if (todayCourses.length === 0) {
      listEl.innerHTML = '<div class="empty-today">今日无课，好好休息~</div>';
      $('#todaySectionRange').textContent = '无课';
    } else {
      const minSec = Math.min(...todayCourses.map(c => c.startSection));
      const maxSec = Math.max(...todayCourses.map(c => c.endSection));
      $('#todaySectionRange').textContent = `第 ${minSec} 节 ~ 第 ${maxSec} 节`;

      const realNow = new Date();
      const nowStr = `${String(realNow.getHours()).padStart(2,'0')}:${String(realNow.getMinutes()).padStart(2,'0')}`;

      const GROUP_NAMES = ["上午课程", "下午课程", "晚上课程"];
      const sessionOf = (sec) => {
        const t = (state.config.sectionStartTimes && state.config.sectionStartTimes[sec - 1]) || "";
        const hh = parseInt(String(t).slice(0, 2), 10);
        if (isNaN(hh)) return 0;
        if (hh < 12) return 0;
        if (hh < 18) return 1;
        return 2;
      };

      const buckets = [[], [], []];
      todayCourses.forEach(c => buckets[sessionOf(c.startSection)].push(c));

      listEl.innerHTML = buckets.map((bucket, gi) => {
        if (!bucket.length) return "";
        const merged = [];
        bucket.forEach(c => {
          const last = merged[merged.length - 1];
          if (last && last.name === c.name && (last.location || "") === (c.location || "") && last.endSection + 1 === c.startSection) {
            last.endSection = c.endSection;
          } else {
            merged.push({ ref: c, name: c.name, location: c.location, teacher: c.teacher, startSection: c.startSection, endSection: c.endSection });
          }
        });
        const cards = merged.map(m => {
          const fixHm = (t) => (t && t.length === 4 && t.indexOf(":") === 1) ? ("0" + t) : t;
          const startTime = fixHm(fmtHm((state.config.sectionStartTimes && state.config.sectionStartTimes[m.startSection - 1]))) || "--:--";
          const endTime = fixHm(fmtHm((state.config.sectionEndTimes && state.config.sectionEndTimes[m.endSection - 1]))) || "--:--";
          let st = "future", stText = "未开始";
          if (state.viewDate === todayStr) {
            if (nowStr > endTime) { st = "done"; stText = "已结束"; }
            else if (nowStr >= startTime && nowStr <= endTime) { st = "ongoing"; stText = "进行中"; }
          }
          const secText = m.startSection === m.endSection ? ("第" + m.startSection + "节") : ("第" + m.startSection + "-" + m.endSection + "节");
          const parts = [secText];
          if (m.location) parts.push(m.location);
          if (m.teacher) parts.push(m.teacher);
          const tempTag = m.ref && m.ref.date ? '<span class="di-temp">临时</span>' : '';
          const skipped = m.ref && Array.isArray(m.ref.skipWeeks) && m.ref.skipWeeks.indexOf(calculateWeek(state.viewDate)) >= 0;
          const star = skipped ? '<span class="skip-star">★</span>' : '';
          return "<div class=\"day-item" + (skipped ? " skipped" : "") + "\" onclick=\"showDetail(" + state.courses.indexOf(m.ref) + ")\">" +
            star +
            "<div class=\"di-main\"><div class=\"di-name\">" + esc(m.name) + tempTag + "</div>" +
            "<div class=\"di-meta\">" + parts.map(p => esc(p)).join(" | ") + "</div></div>" +
            "<div class=\"di-right\"><div class=\"di-time\">" + startTime + " - " + endTime + "</div>" +
            "<div class=\"di-state " + st + "\">" + stText + "</div></div></div>";
        }).join("");
        return "<div class=\"day-group\"><div class=\"group-title\">" + GROUP_NAMES[gi] + "</div>" + cards + "</div>";
      }).join("");
    }

    
    listEl.style.transition = 'none';
    listEl.style.transform = 'translateX(' + (dir * IN_X) + 'px)';
    void listEl.offsetWidth;
    listEl.style.transition = 'transform .26s cubic-bezier(.22,.61,.36,1)';
    listEl.style.opacity = '1';
    listEl.style.transform = 'translateX(0)';
  }, OUT_MS);
}




function changeViewDate(offset) {
  let d = new Date(state.viewDate + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  const targetDateStr = formatLocalDate(d);
  const todayStr = formatLocalDate(new Date());
  const diffDays = Math.round((new Date(targetDateStr) - new Date(todayStr)) / 86400000);

  if (diffDays > 7) {
    uiAlert('最多只能预览未来7天的课程哦~');
    return;
  }
  if (diffDays < -7) {
    uiAlert('最多只能回看一周前的课程哦~');
    return;
  }
  state.viewDate = targetDateStr;
  state._dayDir = offset > 0 ? 'left' : 'right';
  renderToday();
}






function restAfter(section) {
  const cfg = state.config;
  const et = toMin(cfg.sectionEndTimes && cfg.sectionEndTimes[section - 1]);
  const st = toMin(cfg.sectionStartTimes && cfg.sectionStartTimes[section]);
  if (et == null || st == null) return null;
  if (st - et < 55) return null;
  return { label: st >= 18 * 60 ? '晚休' : '午休' };
}
