// common.js
// ==============================================
// פונקציות עזר כלליות לשימוש בכל המסכים
// ==============================================

// ניקוי תיבת לוג
function clearLog(logEl) {
  if (!logEl) return;
  logEl.hidden = true;
  logEl.textContent = '';
}

// הצגת הודעת שגיאה במסך + בקונסול
function showError(err, logEl) {
  if (!logEl) return;
  logEl.hidden = false;
  logEl.textContent = (err && err.message) ? err.message : String(err);
  console.error(err);
}

// הודעת סטטוס קצרה (אופציונלי – תוסף נוח)
function showStatus(msg, el) {
  if (!el) return;
  el.textContent = msg;
}
