// play.js
// ==============================================
// מסך "ביצוע אימון": טוען אימון + תרגיליו ומספק טיימרים לכל תרגיל
// תלוי בקבצים: axios (CDN), config.js (http), common.js (showError/clearLog)
// ==============================================

// ---- עזר: שליפת פרמטר id מה-URL ----
function getQueryParam(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

// ---- DOM ----
const workoutTitleEl = document.getElementById('workoutTitle');
const workoutMetaEl  = document.getElementById('workoutMeta');
const exerciseListEl = document.getElementById('exerciseList');
const logEl          = document.getElementById('log');

// מפה לניהול טיימרים פר-תרגיל: key = exercise.id, value = {interval, remaining}
const timers = new Map();

// ---- טעינה ראשית ----
(async function init() {
  clearLog(logEl);
  const workoutId = getQueryParam('id');

  if (!workoutId) {
    showError(new Error('חסר מזהה אימון (?id=) בכתובת העמוד.'), logEl);
    workoutTitleEl.textContent = 'שגיאה — חסר מזהה אימון';
    return;
  }

  try {
    // 1) שלוף כותרת אימון
    const { data: workoutArr } = await http.get(
      `/workouts?select=id,name,type,workout_date&id=eq.${encodeURIComponent(workoutId)}`
    );
    const workout = Array.isArray(workoutArr) ? workoutArr[0] : workoutArr;

    if (!workout) {
      workoutTitleEl.textContent = 'אימון לא נמצא';
      return;
    }

    workoutTitleEl.textContent = workout.name || `אימון #${workout.id}`;
    workoutMetaEl.textContent = [
      workout.type ? `סוג: ${workout.type}` : null,
      workout.workout_date ? `תאריך: ${workout.workout_date}` : 'ללא תאריך'
    ].filter(Boolean).join(' • ');

    // 2) שלוף תרגילים של האימון
    const { data: exercises } = await http.get(
      `/exercises?select=id,workout_id,name_he,name_en,body_area,reps_load,instructions,gif_url&workout_id=eq.${encodeURIComponent(workoutId)}&order=id.asc`,
      { headers: { Range: '0-999' } }
    );

    renderExercises(Array.isArray(exercises) ? exercises : []);
  } catch (err) {
    showError(err, logEl);
  }
})();

// ---- רינדור תרגילים ----
function renderExercises(rows) {
  exerciseListEl.innerHTML = '';

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'alert alert-info';
    empty.textContent = 'אין תרגילים לאימון זה.';
    exerciseListEl.appendChild(empty);
    return;
  }

  for (const ex of rows) {
    exerciseListEl.appendChild(renderExerciseCard(ex));
  }
}

function renderExerciseCard(ex) {
  const card = document.createElement('div');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <strong>${escapeHtml(ex.name_he || '')}</strong>
        ${ex.name_en ? `<small class="text-muted"> / ${escapeHtml(ex.name_en)}</small>` : ''}
      </div>
      <span class="badge text-bg-secondary">${escapeHtml(ex.body_area || 'כללי')}</span>
    </div>
  `;

  const body = document.createElement('div');
  body.className = 'card-body';

// חזרות/עומס + הוראות
const text = document.createElement('div');

const reps = document.createElement('p');
reps.className = 'mb-2';
reps.innerHTML = `<strong>חזרות/עומס:</strong> ${escapeHtml(ex.reps_load || '—')}`;

// הוראות ביצוע (שומר מעברי שורה, אין גלילה פנימית)
const instr = document.createElement('div');
instr.className = 'mb-0';
instr.textContent = ex.instructions || '';
instr.style.whiteSpace = 'pre-wrap';  // שומר מעברי שורה
instr.style.overflow = 'visible';     // מונע גלילה
instr.style.wordBreak = 'break-word'; // שוברים מילים ארוכות אם צריך

text.appendChild(reps);
text.appendChild(instr);


//  text.appendChild(reps);
//  text.appendChild(instr);

    // גיף (אם יש)
  const media = document.createElement('div');
  if (ex.gif_url) {
    const img = document.createElement('img');
    img.src = ex.gif_url;
    img.alt = ex.name_en || ex.name_he || 'exercise gif';
    img.style.maxWidth = '100%';
    img.loading = 'lazy';
    media.appendChild(img);
  }

  // טיימר
  const timerBox = document.createElement('div');
  timerBox.className = 'mt-3';
  const label = document.createElement('div');
  label.className = 'mb-1';
  label.innerHTML = `<strong>טיימר:</strong> <span id="cd-${ex.id}" class="ms-2">—</span>`;
  timerBox.appendChild(label);

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-group';
  [15, 30, 45, 60].forEach(sec => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary';
    btn.textContent = `${sec} שניות`;
    btn.addEventListener('click', () => startTimer(ex.id, sec));
    btnRow.appendChild(btn);
  });

  timerBox.appendChild(btnRow);

  // הרכבת גוף הכרטיס

  body.appendChild(text);
  body.appendChild(media);
  body.appendChild(timerBox);

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

// ---- טיימרים ----
function startTimer(exerciseId, seconds) {
  // נקה טיימר קודם אם קיים
  const prev = timers.get(exerciseId);
  if (prev?.interval) {
    clearInterval(prev.interval);
  }

  const cdEl = document.getElementById(`cd-${exerciseId}`);
  if (!cdEl) return;

  let remaining = seconds;
  cdEl.textContent = formatSeconds(remaining);

  const interval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(interval);
      timers.delete(exerciseId);
      cdEl.textContent = 'סיום!';
      gentleBeep(); // צליל סיום עדין
      setTimeout(() => { cdEl.textContent = '—'; }, 1200);
    } else {
      cdEl.textContent = formatSeconds(remaining);
    }
  }, 1000);

  timers.set(exerciseId, { interval, remaining });
}

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return m ? `${m}:${ss}` : `${ss}s`;
}

// צליל סיום עדין באמצעות Web Audio API
function gentleBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.28);
  } catch (_) {
    // דפדפנים מסוימים חוסמים; נתעלם בשקט
  }
}

// ---- עזר קטן ל-HTML-escape ----
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, ch => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]
  ));
}
