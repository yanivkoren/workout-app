// main.js
// ==============================================
// לוגיקת מסך הפתיחה – שליפת אימונים, סינון, מיון ויצירה חדשה
// ==============================================

// ========= DOM refs =========
const filtersForm  = document.getElementById('filtersForm');
const onlyUndated  = document.getElementById('onlyUndated');
const typeSelect   = document.getElementById('typeSelect');
const dateFrom     = document.getElementById('dateFrom');
const dateTo       = document.getElementById('dateTo');
const searchName   = document.getElementById('searchName');
const sortField    = document.getElementById('sortField');
const sortDir      = document.getElementById('sortDir');
const resetBtn     = document.getElementById('resetBtn');
const newBtn       = document.getElementById('newWorkoutBtn');

const summaryEl    = document.getElementById('summary');
const resultsBody  = document.getElementById('resultsBody');
const logEl        = document.getElementById('log');

// ========= בניית שאילתת GET ל-workouts =========
function buildQuery() {
  const p = new URLSearchParams();

  // אילו עמודות להביא
  p.append('select', 'id,name,type,workout_date');

  // חיפוש בשם אימון
  const term = (searchName.value || '').trim();
  if (term) {
    p.append('name', `ilike.%${term}%`);
  }

  // סינון סוג אימון
  const typeVal = typeSelect.value;
  if (typeVal) {
    p.append('type', `eq.${typeVal}`);
  }

  // סינון לפי תאריך
  if (onlyUndated.checked) {
    p.append('workout_date', 'is.null');
  } else {
    const f = dateFrom.value;
    const t = dateTo.value;
    if (f) p.append('workout_date', `gte.${f}`);
    if (t) p.append('workout_date', `lte.${t}`);
  }

  // מיון
  p.append('order', `${sortField.value}.${sortDir.value}`);
  return p;
}

// ========= שליפת אימונים =========
async function fetchWorkouts() {
  clearLog(logEl);
  resultsBody.innerHTML = '';
  showStatus('טוען...', summaryEl);

  try {
    const rangeHeaders = { 'Range': '0-199' };
    const q = buildQuery().toString();
    const url = `/workouts?${q}`;

    const { data, headers } = await http.get(url, { headers: rangeHeaders });

    // ספירת רשומות מתוך Content-Range
    let total = 0;
    const cr = headers['content-range'];
    if (cr) {
      const m = cr.match(/\/(\d+)$/);
      if (m) total = Number(m[1]);
    } else {
      total = Array.isArray(data) ? data.length : 0;
    }

    renderWorkouts(Array.isArray(data) ? data : []);
    showStatus(`נמצאו ${total} אימונים.`, summaryEl);
  } catch (err) {
    showStatus('אירעה שגיאה בעת שליפת האימונים.', summaryEl);
    showError(err, logEl);
  }
}

// ========= רינדור טבלה =========
function renderWorkouts(rows) {
  resultsBody.innerHTML = '';
  for (const w of rows) {
    const tr = document.createElement('tr');

    const tdId   = document.createElement('td');
    const tdName = document.createElement('td');
    const tdType = document.createElement('td');
    const tdDate = document.createElement('td');
    const tdAct  = document.createElement('td');

    tdId.textContent   = w.id;
    tdName.textContent = w.name || '';
    tdType.textContent = w.type || '';
    tdDate.textContent = w.workout_date || '—';

    const btnPlay = document.createElement('button');
    btnPlay.type = 'button';
    btnPlay.textContent = 'ביצוע אימון';
    btnPlay.className = 'btn btn-sm btn-outline-success me-1';
    btnPlay.addEventListener('click', () => {
      window.location.href = `play.html?id=${encodeURIComponent(w.id)}`;
    });

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.textContent = 'עריכת אימון';
    btnEdit.className = 'btn btn-sm btn-outline-primary';
    btnEdit.addEventListener('click', () => {
      window.location.href = `edit.html?id=${encodeURIComponent(w.id)}`;
    });

    tdAct.appendChild(btnPlay);
    tdAct.appendChild(btnEdit);

    tr.append(tdId, tdName, tdType, tdDate, tdAct);
    resultsBody.appendChild(tr);
  }
}

// ========= יצירת אימון חדש =========
async function createNewWorkout() {
  clearLog(logEl);
  try {
    const payload = {
      name: 'אימון חדש',
      type: 'אימון ליבה',
      workout_date: null
    };
    const { data } = await http.post('/workouts', payload, {
      headers: { Prefer: 'return=representation' }
    });
    const created = Array.isArray(data) ? data[0] : data;
    if (created && created.id) {
      window.location.href = `edit.html?id=${encodeURIComponent(created.id)}`;
    } else {
      throw new Error('נוצר אימון אך לא התקבל מזהה לחיווי.');
    }
  } catch (err) {
    showError(err, logEl);
    alert('יצירת אימון נכשלה. ראה פירוט בלוג.');
  }
}

// ========= מאזינים =========
filtersForm.addEventListener('submit', (e) => {
  e.preventDefault();
  fetchWorkouts();
});

resetBtn.addEventListener('click', () => {
  onlyUndated.checked = true;
  typeSelect.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  searchName.value = '';
  sortField.value = 'id';
  sortDir.value = 'asc';
  fetchWorkouts();
});

onlyUndated.addEventListener('change', () => fetchWorkouts());
newBtn.addEventListener('click', createNewWorkout);

// טעינה ראשונית
fetchWorkouts();
