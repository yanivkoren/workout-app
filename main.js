// הקובץ מניח ש-config.js נטען לפניו ומספק את המשתנה http

// ===== DOM refs =====
const filtersForm  = document.getElementById('filtersForm');
const onlyUndated  = document.getElementById('onlyUndated');
const statusSelect = document.getElementById('statusSelect');
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

// ===== Utils =====
function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

function summarize() {
  const parts = [];
  parts.push(onlyUndated.checked ? 'מוצגים גם לא מתוזמנים' : 'מוצגים רק מתוזמנים');
  if (statusSelect.value) parts.push(`סטטוס: ${statusSelect.value}`);
  if (typeSelect.value) parts.push(`סוג: ${typeSelect.value}`);
  if (dateFrom.value && !onlyUndated.checked) parts.push(`מ־${dateFrom.value}`);
  if (dateTo.value && !onlyUndated.checked) parts.push(`עד ${dateTo.value}`);
  if (searchName.value.trim()) parts.push(`חיפוש: "${searchName.value.trim()}"`);
  parts.push(`מיון: ${sortField.value} (${sortDir.value})`);
  summaryEl.textContent = parts.join(' | ');
}

function buildParams() {
  const p = new URLSearchParams();
  p.append('select', 'id,name,type,workout_date,state');

  // חיפוש בשם
  const term = (searchName.value || '').trim();
  if (term) p.append('name', `ilike.%${term}%`);

  // סוג אימון
  if (typeSelect.value) p.append('type', `eq.${typeSelect.value}`);

  // סטטוס
  if (statusSelect.value) p.append('state', `eq.${statusSelect.value}`);

  const f = dateFrom.value;
  const t = dateTo.value;

  if (onlyUndated.checked) {
    // מציגים גם לא-מתוזמנים:
    // or = (workout_date.is.null, [טווח תאריכים אם סופק])
    const orClauses = ['workout_date.is.null'];

    // אם סופק טווח, נוסיף את הצד "עם תאריך בטווח"
    if (f && t) {
      orClauses.push(`and(workout_date.gte.${f},workout_date.lte.${t})`);
    } else if (f) {
      orClauses.push(`workout_date.gte.${f}`);
    } else if (t) {
      orClauses.push(`workout_date.lte.${t}`);
    }
    // אם לא סופק כלל טווח — נשאר רק is.null, כלומר כל הלא-מתוזמנים + כל המתוזמנים (כי אין טווח),
    // לכן נוותר בכלל על ה-or כדי לא לחסום מתוזמנים.
    if (orClauses.length > 1) {
      p.append('or', `(${orClauses.join(',')})`);
    }
  } else {
    // מציגים רק מתוזמנים: חייב תאריך + כבד טווח אם יש
    p.append('workout_date', 'not.is.null');
    if (f) p.append('workout_date', `gte.${f}`);
    if (t) p.append('workout_date', `lte.${t}`);
  }

  // מיון
  p.append('order', `${sortField.value}.${sortDir.value}`);
  return p;
}


async function fetchWorkouts() {
  try {
    summarize();
    const params = buildParams();
    const { data } = await http.get('/workouts', { params });
    renderRows(data || []);
    logEl.textContent = `GET /workouts?${params.toString()}\nתוצאות: ${data?.length ?? 0}`;
  } catch (err) {
    console.error(err);
    logEl.textContent = `שגיאה: ${err?.message || err}`;
  }
}

function renderRows(rows) {
  resultsBody.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.name || ''}</td>
      <td>${r.type || ''}</td>
      <td>${fmtDate(r.workout_date)}</td>
      <td>${r.state || ''}</td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <a class="btn btn-outline-primary" href="edit.html?id=${encodeURIComponent(r.id)}">עריכה</a>
          <a class="btn btn-outline-success" href="play.html?id=${encodeURIComponent(r.id)}">ביצוע</a>
        </div>
      </td>
    `;
    resultsBody.appendChild(tr);
  }
}

// ===== מאזינים =====
filtersForm.addEventListener('submit', (e) => {
  e.preventDefault();
  fetchWorkouts();
});

resetBtn.addEventListener('click', () => {
  onlyUndated.checked = true;
  statusSelect.value = '';
  typeSelect.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  searchName.value = '';
  sortField.value = 'id';
  sortDir.value = 'asc';
  fetchWorkouts();
});

[
  onlyUndated, statusSelect, typeSelect,
  dateFrom, dateTo, searchName, sortField, sortDir
].forEach(el => el.addEventListener('change', fetchWorkouts));

newBtn.addEventListener('click', () => {
  window.location.href = 'edit.html';
});

// ===== טעינה ראשונית =====
fetchWorkouts();
