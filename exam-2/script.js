/* ═══════════════════════════════════════════════════════
   script.js — منطق التطبيق الكامل
   يعمل مع questions.js و style.css
═══════════════════════════════════════════════════════ */

/* ── CONSTANTS ─────────────────────────────────────── */
const AUTO_QS   = QUESTIONS.filter(q => q.type !== 'open');
const OPEN_QS   = QUESTIONS.filter(q => q.type === 'open');
const TOTAL_PTS = AUTO_QS.reduce((s, q) => s + (q.pts || 1), 0);
const STORE_KEY = `eth_${EXAM_CONFIG.title.replace(/\s/g,'_')}`;

/* ── STATE ─────────────────────────────────────────── */
let student   = {};
let answers   = {};
let matchSel  = {};
let currIdx   = 0;
let startTs   = null;

/* ── STORAGE (localStorage backup) ────────────────── */
const getRecs = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } };
const addRec  = r  => { const a = getRecs(); a.push(r); localStorage.setItem(STORE_KEY, JSON.stringify(a)); };

/* ── SCREEN NAV ────────────────────────────────────── */
function goTo(id) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetApp() {
  answers = {}; matchSel = {}; currIdx = 0;
  ['fi-first','fi-last','fi-masar','fi-phone','fi-email']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  goTo('s-info');
}

/* ── START ─────────────────────────────────────────── */
function startQuiz() {
  const ids  = ['fi-first','fi-last','fi-masar','fi-phone','fi-email'];
  const vals = ids.map(id => document.getElementById(id).value.trim());
  let ok = true;
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!vals[i]) { el.classList.add('err'); ok = false; }
    else           { el.classList.remove('err'); }
  });
  if (!ok) { toast('⚠️ يُرجى تعبئة جميع الحقول'); return; }

  student = { firstName: vals[0], lastName: vals[1], masarId: vals[2], phone: vals[3], email: vals[4] };
  document.getElementById('bar-name').textContent = `${student.firstName} ${student.lastName}`;
  startTs = Date.now();
  answers = {}; matchSel = {}; currIdx = 0;
  goTo('s-quiz');
  renderQ();
}

/* ── RENDER QUESTION ───────────────────────────────── */
function renderQ() {
  const q   = QUESTIONS[currIdx];
  const n   = QUESTIONS.length;
  const pct = Math.round(((currIdx + 1) / n) * 100);

  document.getElementById('prog').style.width  = pct + '%';
  document.getElementById('pfrac').textContent = `${currIdx + 1} / ${n}`;
  document.getElementById('ppct').textContent  = pct + '%';

  // live score in bar
  const score = AUTO_QS.reduce((s, q2) => s + calcScore(q2), 0);
  document.getElementById('bar-score').textContent = `✅ ${score} / ${TOTAL_PTS}`;

  // section tag
  const tagMap = { mcq:'tag-mcq', tf:'tag-tf', match:'tag-match', open:'tag-open' };
  const lblMap = { mcq:'اختيار من متعدد', tf:'صح أم خطأ', match:'وصل المفاهيم', open:'سؤال مفتوح' };

  document.getElementById('sec-pill').innerHTML =
    `<div class="sec-tag">📌 ${q.sec}</div>`;

  // build card
  const wrap = document.getElementById('qwrap');
  wrap.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'qcard';
  card.innerHTML = `
    <div class="qcard-top">
      <div class="qnum">${q.id}</div>
      <div class="qmeta">
        <span class="qtag ${tagMap[q.type]}">${lblMap[q.type]}</span>
        <div class="qtext">${q.text}</div>
      </div>
    </div>
    <div class="qbody" id="qbody"></div>`;
  wrap.appendChild(card);

  const body = document.getElementById('qbody');
  if      (q.type === 'mcq')   buildMCQ(q, body);
  else if (q.type === 'tf')    buildTF(q, body);
  else if (q.type === 'match') buildMatch(q, body);
  else                         buildOpen(q, body);

  // nav buttons
  document.getElementById('btn-prev').style.display =
    currIdx > 0 ? 'inline-flex' : 'none';
  document.getElementById('btn-next').textContent =
    currIdx === QUESTIONS.length - 1 ? '✅ إنهاء الاختبار' : 'التالي ←';
}

/* ── BUILD: MCQ ────────────────────────────────────── */
function buildMCQ(q, body) {
  const done    = answers[q.id] !== undefined;
  const letters = ['أ','ب','ج','د'];
  const div     = document.createElement('div');
  div.className = 'opts';

  q.opts.forEach((opt, i) => {
    const el = document.createElement('div');
    el.className = 'opt' + (done ? ' locked' : '');
    if (!done && i === answers[q.id]) el.classList.add('sel');
    if (done) {
      if (i === q.ans)              el.classList.add('ok');
      else if (i === answers[q.id]) el.classList.add('bad');
    }
    el.innerHTML = `
      <div class="oletter">${letters[i]}</div>
      <div class="otext">${opt}</div>
      <div class="omark">${done ? (i===q.ans ? '✅' : i===answers[q.id] ? '❌' : '') : ''}</div>`;
    if (!done) el.onclick = () => { answers[q.id] = i; renderQ(); };
    div.appendChild(el);
  });
  body.appendChild(div);
  if (done) body.appendChild(fbEl(answers[q.id] === q.ans, q.fb));
}

/* ── BUILD: T/F ────────────────────────────────────── */
function buildTF(q, body) {
  const done = answers[q.id] !== undefined;
  const row  = document.createElement('div');
  row.className = 'tfrow';

  [true, false].forEach(val => {
    const btn = document.createElement('button');
    btn.className = `tfbtn ${val ? 'tf-t' : 'tf-f'}${done ? ' locked' : ''}`;
    btn.innerHTML = `<div class="tfbtn-icon">${val ? '✅' : '❌'}</div>${val ? 'صحيح' : 'خطأ'}`;

    if (done) {
      if (val === q.ans)                            btn.classList.add('ok');
      else if (val === answers[q.id] && val!==q.ans) btn.classList.add('bad');
    } else if (answers[q.id] === val) btn.classList.add('sel');

    if (!done) btn.onclick = () => { answers[q.id] = val; renderQ(); };
    row.appendChild(btn);
  });
  body.appendChild(row);
  if (done) body.appendChild(fbEl(answers[q.id] === q.ans, q.fb));
}

/* ── BUILD: MATCH ──────────────────────────────────── */
function buildMatch(q, body) {
  if (!matchSel[q.id]) matchSel[q.id] = {};
  const done  = answers[q.id] !== undefined;
  const rows  = document.createElement('div');
  rows.className = 'match-rows';

  q.pairs.forEach((pair, i) => {
    const row     = document.createElement('div');
    row.className = 'match-row';

    const concept     = document.createElement('div');
    concept.className = 'match-concept';
    concept.textContent = pair.c;

    const arr     = document.createElement('div');
    arr.className = 'match-arr';
    arr.textContent = '←';

    const sel     = document.createElement('select');
    sel.className = 'match-sel';
    sel.innerHTML = '<option value="">— اختر —</option>' +
      q.pairs.map((p, j) =>
        `<option value="${j}">${j+1}. ${p.d.length > 52 ? p.d.slice(0,52)+'…' : p.d}</option>`
      ).join('');

    if (matchSel[q.id][i] !== undefined) sel.value = matchSel[q.id][i];

    if (done) {
      sel.disabled  = true;
      sel.classList.add(Number(matchSel[q.id][i]) === i ? 'ok' : 'bad');
    } else {
      sel.onchange = () => { matchSel[q.id][i] = Number(sel.value); };
    }
    row.append(concept, arr, sel);
    rows.appendChild(row);
  });
  body.appendChild(rows);

  // definitions reference box
  const defs = document.createElement('div');
  defs.className = 'defs-box';
  defs.innerHTML = '<div class="defs-title">التعريفات المتاحة للوصل:</div>' +
    q.pairs.map((p, j) =>
      `<div class="def-item"><div class="def-num">${j+1}</div><span>${p.d}</span></div>`
    ).join('');
  body.appendChild(defs);

  if (done) body.appendChild(fbEl(isMatchOk(q), q.fb));
}

/* ── BUILD: OPEN ───────────────────────────────────── */
function buildOpen(q, body) {
  const ta = document.createElement('textarea');
  ta.className   = 'open-ta';
  ta.placeholder = `اكتب إجابتك هنا… (الحد الأدنى الموصى به: ${q.minW || 20} كلمة)`;
  ta.value       = answers[q.id] || '';

  const meta = document.createElement('div');
  meta.className = 'open-meta';
  meta.innerHTML = `
    <span>💡 تُصحَّح يدوياً من قِبَل الأستاذ</span>
    <span class="wc lo" id="wc${q.id}">0 كلمة</span>`;

  const upd = () => {
    answers[q.id] = ta.value;
    const w  = ta.value.trim().split(/\s+/).filter(Boolean).length;
    const el = document.getElementById(`wc${q.id}`);
    if (el) {
      el.textContent = w + ' كلمة';
      el.className   = `wc ${w >= (q.minW||20) ? 'ok' : 'lo'}`;
    }
  };
  ta.oninput = upd;
  body.append(ta, meta);
  upd();

  // reminder hint
  const hint = document.createElement('div');
  hint.className = 'fb fb-info show';
  hint.style.marginTop = '10px';
  hint.innerHTML = `📚 تذكير: راجع مضمون <strong>${q.sec}</strong> في المحتوى المقرر.`;
  body.appendChild(hint);
}

/* ── FEEDBACK ELEMENT ──────────────────────────────── */
function fbEl(ok, txt) {
  const el = document.createElement('div');
  el.className   = `fb show ${ok ? 'fb-ok' : 'fb-bad'}`;
  el.textContent = (ok ? '✅ ' : '❌ ') + txt;
  return el;
}

/* ── SCORING ───────────────────────────────────────── */
function isMatchOk(q) {
  return q.pairs.every((_, i) =>
    matchSel[q.id] && Number(matchSel[q.id][i]) === i
  );
}
function calcScore(q) {
  if (q.type === 'mcq')   return answers[q.id] === q.ans  ? (q.pts||1) : 0;
  if (q.type === 'tf')    return answers[q.id] === q.ans  ? (q.pts||1) : 0;
  if (q.type === 'match') return isMatchOk(q)             ? (q.pts||2) : 0;
  return 0;
}

/* ── NAVIGATION ────────────────────────────────────── */
function nextQ() {
  const q = QUESTIONS[currIdx];

  // validate match
  if (q.type === 'match') {
    const allDone = q.pairs.every((_, i) =>
      matchSel[q.id] && matchSel[q.id][i] !== undefined
    );
    if (!allDone) { toast('⚠️ يُرجى الوصل بين جميع العناصر'); return; }
    answers[q.id] = matchSel[q.id]; // mark answered
    renderQ();                       // show feedback
    if (currIdx < QUESTIONS.length - 1) {
      setTimeout(() => { currIdx++; renderQ(); window.scrollTo({top:0}); }, 1000);
    } else {
      setTimeout(finishQuiz, 1000);
    }
    return;
  }

  // validate open
  if (q.type === 'open') {
    if (!answers[q.id] || answers[q.id].trim().length < 4) {
      toast('⚠️ يُرجى كتابة إجابتك قبل المتابعة'); return;
    }
  } else {
    if (answers[q.id] === undefined) {
      toast('⚠️ يُرجى اختيار إجابة قبل المتابعة'); return;
    }
  }

  if (currIdx < QUESTIONS.length - 1) {
    currIdx++; renderQ(); window.scrollTo({top:0});
  } else {
    finishQuiz();
  }
}

function prevQ() {
  if (currIdx > 0) { currIdx--; renderQ(); window.scrollTo({top:0}); }
}

/* ── FINISH ────────────────────────────────────────── */
function finishQuiz() {
  const elapsed = Math.max(1, Math.round((Date.now() - startTs) / 60000));
  let correct = 0, wrong = 0;

  AUTO_QS.forEach(q => {
    const s = calcScore(q);
    if (s > 0) correct += s;
    else if (answers[q.id] !== undefined) wrong++;
  });

  const pct = Math.round((correct / TOTAL_PTS) * 100);

  // build open answers map
  const openAnswers = {};
  OPEN_QS.forEach(q => { openAnswers[q.id] = answers[q.id] || ''; });

  const record = {
    id: Date.now(), timestamp: new Date().toISOString(),
    student, elapsed, score: correct, total: TOTAL_PTS,
    pct, correct, wrong,
    answers: JSON.parse(JSON.stringify(answers)),
    matchSel: JSON.parse(JSON.stringify(matchSel)),
    openAnswers,
    date: new Date().toLocaleString('ar-MA'),
    exam: EXAM_CONFIG.title,
  };

  // save locally as backup
  addRec(record);

  // update result screen
  document.getElementById('rname').textContent =
    `${student.firstName} ${student.lastName} — مسار: ${student.masarId}`;
  document.getElementById('rnum').textContent = correct;
  document.getElementById('rden').textContent = `/ ${TOTAL_PTS}`;
  document.getElementById('st-c').textContent = correct;
  document.getElementById('st-w').textContent = wrong;
  document.getElementById('st-t').textContent = elapsed;

  const ring  = document.getElementById('sring');
  const grade = pct >= 75 ? 'hi' : pct >= 50 ? 'md' : 'lo';
  ring.className = `score-ring ${grade}`;
  const msgs = { hi:'🌟 ممتاز! أداء متميز.', md:'👍 جيد. واصل التحسين.', lo:'📚 بحاجة إلى مراجعة.' };
  document.getElementById('rmsg').textContent = `${pct}% — ${msgs[grade]}`;

  goTo('s-result');

  // send to Google Sheets
  sendToSheet(record);
}

/* ── SEND TO GOOGLE SHEETS ─────────────────────────── */
function sendToSheet(record) {
  const url = EXAM_CONFIG.sheetURL;
  if (!url || url === 'YOUR_GOOGLE_SCRIPT_URL_HERE') return; // not configured yet

  const overlay = document.getElementById('send-overlay');
  const spinner = document.getElementById('send-spinner');
  const sendOk  = document.getElementById('send-ok');
  overlay.classList.add('show');

  fetch(url, {
    method: 'POST',
    mode:   'no-cors',       // needed for Apps Script
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(record),
  })
  .then(() => {
    spinner.style.display = 'none';
    sendOk.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 2200);
  })
  .catch(() => {
    // silently fail — data already saved in localStorage
    overlay.classList.remove('show');
  });
}

/* ── PASSWORD & DASHBOARD ──────────────────────────── */
function tryLogin() {
  if (document.getElementById('pass-inp').value === EXAM_CONFIG.password) {
    document.getElementById('pass-inp').value = '';
    loadDash();
    goTo('s-dash');
  } else {
    toast('❌ كلمة المرور غير صحيحة');
  }
}

function loadDash() {
  const recs = getRecs();
  const n    = recs.length;

  document.getElementById('kn-total').textContent = n;
  document.getElementById('tcount').textContent   = n + ' طالب';

  if (!n) {
    ['kn-avg','kn-pass','kn-best'].forEach(id =>
      document.getElementById(id).textContent = '—'
    );
    document.getElementById('tbody').innerHTML =
      '<tr><td colspan="9"><div class="empty"><div class="empty-ico">📭</div><p>لا توجد نتائج بعد.</p></div></td></tr>';
    document.getElementById('open-blocks').innerHTML =
      '<div class="empty"><div class="empty-ico">📝</div><p>لا توجد إجابات بعد.</p></div>';
    return;
  }

  const pcts = recs.map(r => r.pct || 0);
  document.getElementById('kn-avg').textContent  = Math.round(pcts.reduce((a,b)=>a+b,0)/n) + '%';
  document.getElementById('kn-pass').textContent = pcts.filter(p => p >= 50).length;
  document.getElementById('kn-best').textContent = Math.max(...pcts) + '%';

  // results table
  document.getElementById('tbody').innerHTML = recs.map((r, i) => {
    const cls = r.pct>=70 ? 'pill-hi' : r.pct>=50 ? 'pill-md' : 'pill-lo';
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${r.student.firstName} ${r.student.lastName}</strong></td>
      <td>${r.student.masarId}</td>
      <td dir="ltr">${r.student.phone}</td>
      <td dir="ltr" style="font-size:.76rem">${r.student.email}</td>
      <td><strong>${r.score}/${r.total}</strong></td>
      <td><span class="pill ${cls}">${r.pct}%</span></td>
      <td>${r.elapsed} د</td>
      <td style="font-size:.74rem;color:var(--gray)">${r.date}</td>
    </tr>`;
  }).join('');

  // open questions panel
  document.getElementById('open-blocks').innerHTML = recs.map(r => `
    <div class="ob">
      <div class="ob-hd">
        <div class="ob-name">👤 ${r.student.firstName} ${r.student.lastName} — مسار: ${r.student.masarId}</div>
        <span style="font-size:.73rem;color:var(--gray)">${r.date}</span>
      </div>
      ${OPEN_QS.map(q => `
        <div class="ob-q">
          <div class="ob-qlabel">س${q.id}: ${q.text}</div>
          <div class="ob-qans">${r.openAnswers?.[q.id] || r.answers?.[q.id] ||
            '<em style="color:var(--gray2)">لم تُقدَّم إجابة</em>'}</div>
        </div>`).join('')}
    </div>`).join('');
}

function showTab(id, btn) {
  ['t-res','t-open'].forEach(t =>
    document.getElementById(t).style.display = t === id ? 'block' : 'none'
  );
  document.querySelectorAll('.dtab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

/* ── EXPORT CSV ────────────────────────────────────── */
function doExport() {
  const recs = getRecs();
  if (!recs.length) { toast('لا توجد بيانات للتصدير'); return; }
  const h = ['#','الاسم','النسب','مسار','الهاتف','البريد','النقطة','المجموع','النسبة%','الوقت(د)','التاريخ'];
  const rows = recs.map((r, i) =>
    [i+1, r.student.firstName, r.student.lastName, r.student.masarId,
     r.student.phone, r.student.email, r.score, r.total, r.pct, r.elapsed, r.date].join(',')
  );
  const csv = '\uFEFF' + h.join(',') + '\n' + rows.join('\n');
  const a   = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' })),
    download: `نتائج_${EXAM_CONFIG.title}_${new Date().toLocaleDateString('ar')}.csv`,
  });
  a.click(); URL.revokeObjectURL(a.href);
  toast('✅ تم تصدير الملف بنجاح');
}

/* ── CLEAR ─────────────────────────────────────────── */
function doClear() {
  if (!confirm('⚠️ هل أنت متأكد؟ سيتم حذف جميع البيانات المحفوظة محلياً.')) return;
  localStorage.removeItem(STORE_KEY);
  loadDash();
  toast('🗑 تم مسح جميع البيانات');
}

/* ── TOAST ─────────────────────────────────────────── */
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('on'), 3200);
}
