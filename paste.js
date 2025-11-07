// === הגדרות Supabase ===
const SUPABASE_URL = 'https://gbjoudlehjovzwpyqoiv.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdiam91ZGxlaGpvdnp3cHlxb2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDE3NzAsImV4cCI6MjA3ODAxNzc3MH0.3GrGqV6ytcjW-AU3z6Am0tmGmpNrHqRYZXHNRL_Cjzw';
const REST_BASE = `${SUPABASE_URL}/rest/v1`;

const http = axios.create({
  baseURL: REST_BASE,
  headers: {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
  }
});

// === שליפת מזהה האימון מה-URL (id=123) ===
function getWorkoutIdFromURL() {
  const sp = new URLSearchParams(location.search);
  const id = sp.get('id');
  return id ? Number(id) : null;
}

// === שליפת שם האימון לפי id ===
async function fetchWorkoutName(id) {
  const { data } = await http.get(`/workouts`, {
    params: { select: 'name', id: `eq.${id}` }
  });
  return data?.[0]?.name || '';
}

// === Parser לטבלת Markdown ===
function parseMarkdownExercises(md, workoutId) {
  const lines = md
    .split(/\r?\n/)
    .filter(l => /^\s*\|/.test(l))
    .map(l => l.trim());

  if (lines.length === 0) return [];

  const sepIdx = lines.findIndex(l => {
    const cells = l.split('|').slice(1, -1).map(c => c.trim());
    return cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c));
  });

  const dataLines = sepIdx >= 0 && sepIdx + 1 < lines.length
    ? lines.slice(sepIdx + 1)
    : lines.slice(1);

  const rows = [];

  for (const l of dataLines) {
    const cells = l.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 5) continue;

    const [group, he, en, reps, instr] = cells;
    if (/^-{2,}$/.test(group) && /^-{2,}$/.test(he)) continue;

    rows.push({
      workout_id: workoutId,
      body_area: group ?? '',
      name_he: he ?? '',
      name_en: en ?? '',
      reps_load: reps ?? '',
      instructions: instr ?? '',
      gif_url: ''
    });
  }

  return rows;
}

// === UI ===
const $md = document.getElementById('mdInput');
const $insert = document.getElementById('insertBtn');
const $cancel = document.getElementById('cancelBtn');
const $status = document.getElementById('status');
const $title = document.querySelector('h1');

function setStatus(msg, isError = false) {
  $status.textContent = msg;
  $status.style.color = isError ? 'crimson' : 'inherit';
}

async function bulkInsertExercises(rows) {
  const headers = { Prefer: 'return=representation' };
  const { data } = await http.post('/exercises', rows, { headers });
  return data;
}

// === בעת טעינה: שלוף את שם האימון ועדכן את הכותרת ===
window.addEventListener('DOMContentLoaded', async () => {
  const workoutId = getWorkoutIdFromURL();
  if (!workoutId) return;

  try {
    const name = await fetchWorkoutName(workoutId);
    if (name) {
      document.title = `הדבקת תרגילים - ${name}`;
      $title.textContent = `הדבקת תרגילים - ${name}`;
    }
  } catch (e) {
    console.warn('לא ניתן לטעון שם אימון:', e.message);
  }
});

// === אירועים ===
$insert.addEventListener('click', async () => {
  try {
    setStatus('מנתח טבלה...');

    const workoutId = getWorkoutIdFromURL();
    if (!workoutId || Number.isNaN(workoutId)) {
      setStatus('חסר מזהה אימון בכתובת (id=...)', true);
      return;
    }

    const md = $md.value.trim();
    const rows = parseMarkdownExercises(md, workoutId);

    if (!rows.length) {
      setStatus('לא נמצאו שורות תקינות בטבלה.', true);
      return;
    }

    setStatus(`מעלה ${rows.length} תרגילים לשרת...`);
    await bulkInsertExercises(rows);

    setStatus('התרגילים נשמרו בהצלחה! חוזר לעריכת אימון...');
    setTimeout(() => history.back(), 700);
  } catch (err) {
    console.error(err);
    const msg = err?.response?.data?.message || err?.message || 'שגיאה לא צפויה';
    setStatus(`אירעה שגיאה: ${msg}`, true);
  }
});

$cancel.addEventListener('click', () => {
  history.back();
});
