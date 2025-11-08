// edit.js
// ==============================================
// מסך "עריכת אימון": טוען, שומר ומוחק אימון + תרגילים משויכים
// תלוי ב: axios (CDN), config.js (http), common.js (clearLog/showError)
// ==============================================

// ---- עזר: פרמטר מה-URL ----
function getQueryParam(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

// ---- DOM ----
const wNameEl   = document.getElementById('wName');
const wTypeEl   = document.getElementById('wType');
const wDateEl   = document.getElementById('wDate');
const wStateEl  = document.getElementById('wState');

const saveBtn   = document.getElementById('saveBtn');
const delBtn    = document.getElementById('deleteBtn');
const cancelBtn = document.getElementById('cancelBtn');
const pasteBtn  = document.getElementById('pasteBtn');
const reorderBtn  = document.getElementById('reorderBtn');
const addRowBtn = document.getElementById('addRowBtn');

const exBody    = document.getElementById('exBody');
const logEl     = document.getElementById('log');

const workoutId = getQueryParam('id');
const pendingDeletes = new Set(); // exercise ids למחיקה בשמירה

// ---- עזר: תאריך היום YYYY-MM-DD (לפי זמן הדפדפן) ----
function todayISO() {
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---- טעינה ראשית ----
(async function init() {
  if (!workoutId) {
    showError(new Error('חסר מזהה אימון (?id=) בכתובת העמוד.'), logEl);
    disableAll();
    return;
  }

  clearLog(logEl);

  try {
    // 1) טען כותרת אימון (כולל state)
    const { data: workoutArr } = await http.get(
      `/workouts?select=id,name,type,workout_date,state&id=eq.${encodeURIComponent(workoutId)}`
    );
    const w = Array.isArray(workoutArr) ? workoutArr[0] : workoutArr;
    if (!w) throw new Error('האימון לא נמצא.');

    wNameEl.value  = w.name || '';
    wTypeEl.value  = w.type || 'אימון ליבה';
    wDateEl.value  = w.workout_date || '';
    wStateEl.value = w.state || 'מתוכנן';

    // 2) טען תרגילים
    const { data: exRows } = await http.get(
      `/exercises?select=id,workout_id,name_he,name_en,body_area,reps_load,instructions,gif_url&workout_id=eq.${encodeURIComponent(workoutId)}&order=id.asc`,
      { headers: { Range: '0-999' } }
    );
    renderExercises(Array.isArray(exRows) ? exRows : []);

    // 3) הוסף שורה ריקה להוספה
    appendEmptyRow();

  } catch (err) {
    showError(err, logEl);
  }
})();

// ---- רינדור טבלה ----
function renderExercises(rows) {
  exBody.innerHTML = '';
  pendingDeletes.clear();
  for (const ex of rows) {
    exBody.appendChild(buildRow(ex)); // מחזיר fragment עם שתי שורות
  }
}

// בונה זוג שורות לתרגיל
function buildRow(ex = {}) {
  const trTop = document.createElement('tr');
  trTop.dataset.part = 'top';
  trTop.dataset.id = ex.id || '';

  const trBottom = document.createElement('tr');
  trBottom.dataset.part = 'bottom';

  // ====== תא מזהה (rowspan=2) ======
  const tdId = document.createElement('td');
  tdId.textContent = ex.id ?? '—';
  tdId.rowSpan = 2;

  // ====== שורה עליונה ======
  // שם (עברית)
  const tdHe = document.createElement('td');
  const taHe = document.createElement('textarea');
  taHe.className = 'form-control';
  taHe.rows = 2;
  taHe.wrap = 'soft';
  taHe.style.resize = 'vertical';
  taHe.style.wordBreak = 'break-word';
  taHe.value = ex.name_he || '';
  tdHe.appendChild(taHe);

  // שם (אנגלית) LTR
  const tdEn = document.createElement('td');
  const taEn = document.createElement('textarea');
  taEn.className = 'form-control';
  taEn.rows = 2;
  taEn.wrap = 'soft';
  taEn.style.resize = 'vertical';
  taEn.style.wordBreak = 'break-word';
  taEn.dir = 'ltr';
  taEn.style.textAlign = 'left';
  taEn.value = ex.name_en || '';
  tdEn.appendChild(taEn);

  // אזור גוף
  const tdArea = document.createElement('td');
  const taArea = document.createElement('textarea');
  taArea.className = 'form-control';
  taArea.rows = 2;
  taArea.wrap = 'soft';
  taArea.style.resize = 'vertical';
  taArea.style.wordBreak = 'break-word';
  taArea.value = ex.body_area || '';
  tdArea.appendChild(taArea);

  // חזרות/עומס
  const tdReps = document.createElement('td');
  const taReps = document.createElement('textarea');
  taReps.className = 'form-control';
  taReps.rows = 2;
  taReps.wrap = 'soft';
  taReps.style.resize = 'vertical';
  taReps.style.wordBreak = 'break-word';
  taReps.value = ex.reps_load || '';
  tdReps.appendChild(taReps);

  // קישור לגיף (כפתור חיפוש + אינפוט URL)
  const tdGif = document.createElement('td');

  const linkBtn = document.createElement('button');
  linkBtn.type = 'button';
  linkBtn.className = 'btn btn-sm btn-outline-primary mb-1';
  linkBtn.textContent = 'קישור';
  linkBtn.addEventListener('click', () => {
    const nameEn = taEn.value.trim();
    if (!nameEn) {
      alert('נא להזין קודם שם תרגיל באנגלית.');
      return;
    }
    const query = encodeURIComponent(`${nameEn} exercise`);
    const url = `https://www.google.com/search?q=${query}&sca_esv=93b66263c54a1938&udm=2&source=lnt&tbs=itp:animated`;
    window.open(url, '_blank');
  });

  const inGif = document.createElement('input');
  inGif.type = 'url';
  inGif.className = 'form-control';
  inGif.placeholder = 'https://...gif';
  inGif.value = ex.gif_url || '';

  tdGif.append(linkBtn, inGif);

  // מחיקה
  const tdDel = document.createElement('td');
  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'btn btn-sm btn-outline-danger';
  btnDel.textContent = 'מחק';
  btnDel.addEventListener('click', () => {
    const id = trTop.dataset.id;
    if (id) pendingDeletes.add(Number(id));
    trTop.remove();
    trBottom.remove();
  });
  tdDel.appendChild(btnDel);

  // הרכבת השורה העליונה
  trTop.append(tdId, tdHe, tdEn, tdArea, tdReps, tdGif, tdDel);

  // ====== שורה תחתונה: תצוגת גיף + הנחיות ביצוע ======
  const tdPreview = document.createElement('td');
  tdPreview.colSpan = 2;
  tdPreview.className = 'text-center';

  const previewBox = document.createElement('div');
  previewBox.style.width = '100%';
  previewBox.style.maxWidth = '100%';
  previewBox.style.overflow = 'hidden';

  const previewImg = document.createElement('img');
  previewImg.alt = 'GIF Preview';
  previewImg.style.maxWidth = '100%';
  previewImg.style.height = 'auto';
  previewImg.style.display = 'block';
  previewImg.style.maxHeight = '180px';

  if (inGif.value) previewImg.src = inGif.value;
  inGif.addEventListener('input', () => {
    const url = inGif.value.trim();
    if (!url) {
      previewImg.removeAttribute('src');
      previewImg.alt = 'אין קישור';
      return;
    }
    previewImg.src = url;
  });
  previewImg.addEventListener('error', () => {
    previewImg.removeAttribute('src');
    previewImg.alt = 'קישור לא תקין';
  });

  previewBox.appendChild(previewImg);
  tdPreview.appendChild(previewBox);

  const tdInstr = document.createElement('td');
  tdInstr.colSpan = 4;
  const taInstr = document.createElement('textarea');
  taInstr.className = 'form-control';
  taInstr.rows = 4;
  taInstr.value = ex.instructions || '';
  tdInstr.appendChild(taInstr);

  trBottom.append(tdPreview, tdInstr);

  const frag = document.createDocumentFragment();
  frag.append(trTop, trBottom);
  return frag;
}

// הוספת שורה ריקה
function appendEmptyRow() { exBody.appendChild(buildRow({})); }

// ---- איסוף נתונים מהטבלה ----
function collectRows() {
  const rows = [];
  for (const trTop of exBody.querySelectorAll('tr[data-part="top"]')) {
    const trBottom = trTop.nextElementSibling;
    const hasId = !!trTop.dataset.id;

    const [tdId, tdHe, tdEn, tdArea, tdReps, tdGif] = trTop.children;
    const [tdPreview, tdInstr] = trBottom.children;

    const row = {
      workout_id: Number(workoutId),
      name_he: tdHe.querySelector('textarea').value.trim(),
      name_en: tdEn.querySelector('textarea').value.trim(),
      body_area: tdArea.querySelector('textarea').value.trim(),
      reps_load: tdReps.querySelector('textarea').value.trim(),
      instructions: tdInstr.querySelector('textarea').value,
      gif_url: tdGif.querySelector('input').value.trim()
    };

    if (hasId) row.id = Number(trTop.dataset.id);
    rows.push(row);
  }
  return rows;
}

// ---- שמירה ----
async function saveAll() {
  clearLog(logEl);
  setBusy(true);
  try {
    // אם סטטוס "בוצע" ואין תאריך — נמלא תאריך של היום (כדי לעמוד ב-CHECK במסד)
    let dateVal = wDateEl.value ? wDateEl.value : null;
    const stateVal = wStateEl.value || 'מתוכנן';
    if (stateVal === 'בוצע' && !dateVal) {
      dateVal = todayISO();
      wDateEl.value = dateVal; // עדכון UI
    }

    // 1) עדכון כותרת אימון
    const wPayload = {
      name: wNameEl.value.trim() || null,
      type: wTypeEl.value || null,
      workout_date: dateVal,
      state: stateVal
    };
    await http.patch(`/workouts?id=eq.${encodeURIComponent(workoutId)}`, wPayload);

    // 2) תרגילים: אסוף שורות, חלק לחדשים/קיימים
    const rows = collectRows();
    const toInsert = [];
    const toUpdate = [];

    for (const r of rows) {
      const hasContent =
        r.name_he || r.name_en || r.body_area || r.reps_load || r.instructions || r.gif_url;
      if (r.id) {
        toUpdate.push(r);        // קיים — נעדכן
      } else if (hasContent) {
        toInsert.push(r);        // חדש עם תוכן — נכניס
      } // שורה ריקה — מתעלמים
    }

    // 2.א מחיקות
    if (pendingDeletes.size) {
      const ids = Array.from(pendingDeletes).join(',');
      await http.delete(`/exercises?id=in.(${ids})`);
      pendingDeletes.clear();
    }

    // 2.ב הוספות (batch)
    if (toInsert.length) {
      await http.post('/exercises', toInsert, { headers: { Prefer: 'return=representation' } });
    }

    // 2.ג עדכונים (פר-שורה)
    for (const r of toUpdate) {
      const { id, ...payload } = r;
      await http.patch(`/exercises?id=eq.${id}`, payload);
    }

    await reloadExercises();
    alert('נשמר בהצלחה.');
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || String(err);
    const details = err?.response?.data?.details || '';
    const hint = err?.response?.data?.hint || '';
    showError(`${msg}${details ? ' | ' + details : ''}${hint ? ' | ' + hint : ''}`, logEl);
    console.error('Insert/Update error payload:', {
      status: err?.response?.status,
      data: err?.response?.data,
    });
    alert('שמירה נכשלה. ראה פירוט בלוג.');
  } finally {
    setBusy(false);
  }
}

async function reloadExercises() {
  const { data: exRows } = await http.get(
    `/exercises?select=id,workout_id,name_he,name_en,body_area,reps_load,instructions,gif_url&workout_id=eq.${encodeURIComponent(workoutId)}&order=id.asc`,
    { headers: { Range: '0-999' } }
  );
  renderExercises(Array.isArray(exRows) ? exRows : []);
  appendEmptyRow();
}

// ---- מחיקת אימון + תרגיליו ----
async function deleteWorkout() {
  if (!confirm('למחוק את האימון וכל התרגילים המשויכים?')) return;
  clearLog(logEl);
  setBusy(true);
  try {
    // אם אין ON DELETE CASCADE — מוחקים ידנית את התרגילים
    await http.delete(`/exercises?workout_id=eq.${encodeURIComponent(workoutId)}`);
    await http.delete(`/workouts?id=eq.${encodeURIComponent(workoutId)}`);
    alert('האימון נמחק.');
    window.location.href = 'main.html';
  } catch (err) {
    showError(err, logEl);
    alert('מחיקה נכשלה. ראה פירוט בלוג.');
  } finally {
    setBusy(false);
  }
}

// ---- עזרי UI ----
function setBusy(busy) {
  saveBtn.disabled = busy;
  delBtn.disabled = busy;
  cancelBtn.disabled = busy;
  pasteBtn.disabled = busy;
  reorderBtn.disabled = busy;
  addRowBtn.disabled = busy;
}
function disableAll() { setBusy(true); }

// אם משנים ל"בוצע" ואין תאריך — נמלא אוטומטית "היום" (שומר UX עקבי עם השמירה)
wStateEl.addEventListener('change', () => {
  if (wStateEl.value === 'בוצע' && !wDateEl.value) {
    wDateEl.value = todayISO();
  }
});

// ---- מאזינים ----
saveBtn.addEventListener('click', (e) => { e.preventDefault(); saveAll(); });
delBtn.addEventListener('click',  (e) => { e.preventDefault(); deleteWorkout(); });
cancelBtn.addEventListener('click',(e) => { e.preventDefault(); window.location.href = 'main.html'; });
pasteBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = `paste.html?id=${encodeURIComponent(workoutId)}`; });
reorderBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = `reorder.html?id=${encodeURIComponent(workoutId)}`; });
addRowBtn.addEventListener('click',(e) => { e.preventDefault(); appendEmptyRow(); });
