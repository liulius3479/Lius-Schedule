function announcementStamp() {
  const a = String(APP_ANNOUNCEMENT || '');
  let h = 5381;
  for (let i = 0; i < a.length; i++) h = ((h * 33) ^ a.charCodeAt(i)) >>> 0;
  return APP_VERSION + '#' + h.toString(36) + '#' + a.length;
}

let annFromTab = 'page-mine';

function renderAnnouncementPage() {
  const el = $('#announcementBody');
  if (el) el.textContent = APP_ANNOUNCEMENT || '';
}

function renderChangelogPage() {
  const el = $('#changelogBody');
  if (el) el.textContent = (typeof APP_CHANGELOG !== 'undefined' ? APP_CHANGELOG : APP_ANNOUNCEMENT) || '';
}

function annReturnTab() {
  return annFromTab || 'page-mine';
}

function showAnnouncement(isAutoOpen) {
  const cur = currentTabId();
  if (cur !== 'page-announcement' && cur !== 'page-changelog') annFromTab = cur;
  if (isAutoOpen) {
    try { localStorage.setItem(VERSION_KEY, announcementStamp()); } catch (e) {}
  }
  switchTab('page-announcement');
}

function checkFirstOpen() {
  let last = null;
  try { last = localStorage.getItem(VERSION_KEY); } catch (e) {}
  if (last !== announcementStamp()) {
    setTimeout(() => showAnnouncement(true), 500);
  }
}
