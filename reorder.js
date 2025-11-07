// משתמשים ב-http, SUPABASE_URL, ANON_KEY שהוגדרו ב-config.js
// baseURL כבר מוגדר כ: `${SUPABASE_URL}/rest/v1`
// לכן אין להוסיף "/" בתחילת הנתיבים

const TBL_WORKOUTS  = 'workouts';
const TBL_EXERCISES = 'exercises';
const RPC_NAME      = 'reorder_exercises_copy_replace';

let workoutId = null;
let exercises = [];
let localOrder = [];
let isDirty = false;

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

function markDirty(flag) {
  isDirty = !!flag;
  document.getElementById('dirtyBadge').classList.toggle('d-none', !isDirty);
}

function goBackToEdit(id) {
  window.location.href = `edit.html?id=${encodeURIComponent(id)}`;
}

async function loadData() {
  const qs = new URLSearchParams(location.search);
  workoutId = qs.get('id') ? Number(qs.get('id')) : null;
  if (!workoutId || Number.isNaN(workoutId)) {
    alert('חסר או לא תקין: ?id=');
    return;
  }

  // אימון לכותרת
  const wRes = await http.get(`${TBL_WORKOUTS}?id=eq.${workoutId}&select=name,type,workout_date`);
  const wRow = Array.isArray(wRes.data) ? wRes.data[0] : null;
  document.getElementById('workoutTitle').textContent =
    [wRow?.name || `אימון #${workoutId}`, wRow?.type, wRow?.workout_date].filter(Boolean).join(' • ');

  // תרגילים לפי id
  const eRes = await http.get(
    `${TBL_EXERCISES}?workout_id=eq.${workoutId}&select=id,name_he,name_en,body_area,reps_load,instructions,gif_url&order=id.asc`
  );
  exercises = Array.isArray(eRes.data) ? eRes.data : [];
  localOrder = exercises.map(x => x.id);

  renderTable();
  markDirty(false);
}

function renderTable() {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  const byId = new Map(exercises.map(x => [x.id, x]));

  localOrder.forEach((id) => {
    const ex = byId.get(id);
    const tr = document.createElement('tr');
    tr.className = 'reorder-row';
    tr.draggable = true;
    tr.tabIndex = 0;
    tr.dataset.id = String(id);

    tr.innerHTML = `
      <td>${id}</td>
      <td>${escapeHtml(ex?.name_he)}</td>
      <td dir="ltr">${escapeHtml(ex?.name_en)}</td>
      <td>${escapeHtml(ex?.body_area)}</td>
    `;

    attachDnD(tr);
    attachKeyboard(tr);
    tbody.appendChild(tr);
  });
}

// Drag & Drop
let dragSrcIndex = null;
function attachDnD(tr) {
  tr.addEventListener('dragstart', () => { dragSrcIndex = rowIndex(tr); tr.classList.add('opacity-50'); });
  tr.addEventListener('dragend',   () => { tr.classList.remove('opacity-50'); dragSrcIndex = null; });
  tr.addEventListener('dragover',  (e) => e.preventDefault());
  tr.addEventListener('drop', (e) => {
    e.preventDefault();
    const dst = rowIndex(tr);
    if (dragSrcIndex === null || dst === null || dragSrcIndex === dst) return;
    moveRow(dragSrcIndex, dst);
  });
}

function rowIndex(tr) {
  const rows = Array.from(document.querySelectorAll('#tbody tr'));
  const i = rows.indexOf(tr);
  return i >= 0 ? i : null;
}

function moveRow(src, dst) {
  const arr = localOrder.slice();
  const [moved] = arr.splice(src, 1);
  arr.splice(dst, 0, moved);
  localOrder = arr;
  renderTable();
  markDirty(true);
}

// Keyboard ↑/↓
function attachKeyboard(tr) {
  tr.addEventListener('keydown', (ev) => {
    const idx = rowIndex(tr);
    if (idx === null) return;
    if (ev.key === 'ArrowUp' && idx > 0) {
      ev.preventDefault();
      moveRow(idx, idx - 1);
      focusRow(idx - 1);
    } else if (ev.key === 'ArrowDown' && idx < localOrder.length - 1) {
      ev.preventDefault();
      moveRow(idx, idx + 1);
      focusRow(idx + 1);
    }
  });
}

function focusRow(i) {
  const rows = document.querySelectorAll('#tbody tr');
  if (rows[i]) rows[i].focus();
}

// שמירה: קריאה ל-RPC (נדרש ליצור פונקציה בצד השרת בשם reorder_exercises_copy_replace)
async function saveOrder() {
  if (!workoutId || localOrder.length === 0) return;
  if (!confirm('פעולה זו תיצור תרגילים חדשים ותמחק את הישנים. להמשיך?')) return;

  try {
    const res = await http.post(`rpc/${RPC_NAME}`, {
      p_workout_id: workoutId,
      p_new_order_ids: localOrder
    });
    alert('הסדר נשמר בהצלחה.');
    goBackToEdit(workoutId);
  } catch (err) {
    console.error(err);
    alert('שגיאה בשמירה (RPC). בדוק שקיימת הפונקציה והרשאות EXECUTE.');
  }
}

async function resetOrder() {
  if (isDirty && !confirm('למחוק שינויים שלא נשמרו?')) return;
  await loadData();
  markDirty(false);
}

// boot
window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btnSave').addEventListener('click', saveOrder);
  document.getElementById('btnReset').addEventListener('click', resetOrder);
  document.getElementById('btnBack').addEventListener('click', () => goBackToEdit(new URLSearchParams(location.search).get('id')));
  await loadData();
});
