import { getVocabulary, showToast, shuffle, normalize, xpForRating } from '../app.js';
import { getSrsStates, saveSrsState, addXP, addWeeklyXP, logActivity } from '../store.js';
import { createWordState, applyRating, RATING } from '../srs.js';

const QUIZ_LENGTH = 15;
let quizDeck = [];
let currentIndex = 0;
let score = 0;
let mode = null; // 'mc' | 'type'
let allVocab = [];
let answered = false;

export async function renderQuiz(container) {
  allVocab = await getVocabulary();
  mode = null;
  renderModeSelect(container);
}

function renderModeSelect(container) {
  container.innerHTML = `
    <div class="page" id="quiz-page">
      <div class="section-header">
        <h1>🎯 Kuiz</h1>
        <p>Pilih mod kuiz untuk menguji pengetahuan anda</p>
      </div>

      <div class="mode-selector">
        <div class="mode-card" id="mc-card">
          <div class="mode-card-icon">🔤</div>
          <div class="mode-card-title">Pilihan Berganda</div>
          <div class="mode-card-desc">Pilih jawapan yang betul daripada 4 pilihan</div>
        </div>
        <div class="mode-card" id="type-card">
          <div class="mode-card-icon">⌨️</div>
          <div class="mode-card-title">Taip Jawapan</div>
          <div class="mode-card-desc">Taip perkataan Melayu yang betul</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:8px">
        <p style="font-size:0.85rem;color:var(--text-muted)">${QUIZ_LENGTH} soalan setiap sesi</p>
      </div>
    </div>
  `;

  document.getElementById('mc-card').addEventListener('click', () => startQuiz('mc'));
  document.getElementById('type-card').addEventListener('click', () => startQuiz('type'));
}

function startQuiz(selectedMode) {
  mode = selectedMode;
  quizDeck = shuffle(allVocab).slice(0, QUIZ_LENGTH);
  currentIndex = 0;
  score = 0;
  answered = false;
  renderQuizShell(document.getElementById('quiz-page'));
  renderQuestion();
}

function renderQuizShell(page) {
  page.innerHTML = `
    <div class="section-header">
      <h1>🎯 Kuiz — ${mode === 'mc' ? 'Pilihan Berganda' : 'Taip Jawapan'}</h1>
    </div>

    <div class="quiz-score-bar">
      <span class="quiz-score-label">Markah</span>
      <span class="quiz-score-value" id="quiz-score">0 / 0</span>
      <span class="quiz-score-label" id="quiz-counter">Soalan 1 / ${QUIZ_LENGTH}</span>
    </div>

    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" id="quiz-progress" style="width:0%"></div>
    </div>

    <div id="quiz-question-area"></div>
    <div id="quiz-feedback"></div>
    <div id="quiz-next-wrap" style="text-align:center;margin-top:16px"></div>
  `;
}

function renderQuestion() {
  if (currentIndex >= quizDeck.length) { showResults(); return; }
  answered = false;

  const word = quizDeck[currentIndex];
  const pct  = Math.round((currentIndex / quizDeck.length) * 100);

  document.getElementById('quiz-progress').style.width = pct + '%';
  document.getElementById('quiz-counter').textContent = `Soalan ${currentIndex + 1} / ${QUIZ_LENGTH}`;
  document.getElementById('quiz-score').textContent = `${score} / ${currentIndex}`;
  document.getElementById('quiz-feedback').innerHTML = '';
  document.getElementById('quiz-next-wrap').innerHTML = '';

  const qArea = document.getElementById('quiz-question-area');

  // Prompt
  const prompt = `
    <div class="quiz-prompt">
      <div class="quiz-prompt-label">Apakah dalam Bahasa Melayu?</div>
      <div class="quiz-prompt-word">${word.english}</div>
    </div>
  `;

  if (mode === 'mc') {
    const wrong = shuffle(allVocab.filter(w => w.id !== word.id)).slice(0, 3);
    const options = shuffle([word, ...wrong]);
    qArea.innerHTML = prompt + `
      <div class="quiz-options">
        ${options.map((o, i) => `
          <button class="quiz-option" data-id="${o.id}" data-correct="${o.id === word.id}">${o.malay}</button>
        `).join('')}
      </div>
    `;
    qArea.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => handleMCAnswer(btn, word));
    });
  } else {
    qArea.innerHTML = prompt + `
      <div class="quiz-input-wrap">
        <input type="text" id="quiz-type-input" placeholder="Taip dalam Bahasa Melayu..." autocomplete="off" spellcheck="false" />
        <button class="btn btn-primary" id="quiz-submit">Semak</button>
      </div>
    `;
    const input = document.getElementById('quiz-type-input');
    input.focus();
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleTypeAnswer(word); });
    document.getElementById('quiz-submit').addEventListener('click', () => handleTypeAnswer(word));
  }
}

function handleMCAnswer(btn, word) {
  if (answered) return;
  answered = true;

  const isCorrect = btn.dataset.correct === 'true';
  document.querySelectorAll('.quiz-option').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
    else if (b === btn && !isCorrect) b.classList.add('wrong');
  });

  recordAnswer(word, isCorrect);
  showFeedback(word, isCorrect);
  showNextBtn();
}

function handleTypeAnswer(word) {
  if (answered) return;
  const input = document.getElementById('quiz-type-input');
  const userAnswer = input.value.trim();
  if (!userAnswer) return;
  answered = true;

  const isCorrect = normalize(userAnswer) === normalize(word.malay);
  input.disabled = true;
  input.classList.add(isCorrect ? 'correct' : 'wrong');
  document.getElementById('quiz-submit').disabled = true;

  recordAnswer(word, isCorrect);
  showFeedback(word, isCorrect);
  showNextBtn();
}

function recordAnswer(word, isCorrect) {
  const srsAll = getSrsStates();
  const state  = srsAll[word.id] || createWordState();
  const rating = isCorrect ? RATING.GOOD : RATING.AGAIN;
  saveSrsState(word.id, applyRating(state, rating));

  const xp = isCorrect ? 10 : 0;
  if (xp) { addXP(xp); addWeeklyXP(xp); }
  logActivity(1);

  if (isCorrect) {
    score++;
    showToast('+10 XP', 'gold', 1200);
  }
}

function showFeedback(word, isCorrect) {
  const fb = document.getElementById('quiz-feedback');
  fb.innerHTML = `
    <div class="answer-feedback ${isCorrect ? 'correct' : 'wrong'}">
      ${isCorrect
        ? `✅ Betul! <b>${word.malay}</b> = ${word.english}`
        : `❌ Salah. Jawapan betul: <b>${word.malay}</b> (${word.romanisation})`
      }
    </div>
    <div style="text-align:center;font-size:0.82rem;color:var(--text-muted);margin-top:4px;font-style:italic">
      ${word.exampleSentence} — ${word.exampleTranslation}
    </div>
  `;
}

function showNextBtn() {
  const nextWrap = document.getElementById('quiz-next-wrap');
  const isLast = currentIndex >= quizDeck.length - 1;
  nextWrap.innerHTML = `
    <button class="btn btn-primary btn-lg" id="quiz-next">
      ${isLast ? '🏁 Lihat Keputusan' : 'Seterusnya →'}
    </button>
  `;
  document.getElementById('quiz-next').addEventListener('click', () => {
    currentIndex++;
    renderQuestion();
  });
}

function showResults() {
  const pct = Math.round((score / QUIZ_LENGTH) * 100);
  const grade = pct >= 90 ? '🌟 Cemerlang'
    : pct >= 70 ? '👍 Bagus'
    : pct >= 50 ? '🙂 Boleh Tahan'
    : '💪 Cuba Lagi';

  const page = document.getElementById('quiz-page');
  page.innerHTML = `
    <div class="summary-screen">
      <div class="summary-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
      <div class="summary-title">${grade}</div>
      <div class="summary-sub">Sesi kuiz selesai!</div>

      <div class="summary-stats">
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--green)">${score}</div>
          <div class="summary-stat-label">Betul</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--red)">${QUIZ_LENGTH - score}</div>
          <div class="summary-stat-label">Silap</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value">${pct}%</div>
          <div class="summary-stat-label">Skor</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--gold-dark)">${score * 10}</div>
          <div class="summary-stat-label">XP</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" id="quiz-restart">🔄 Cuba Lagi</button>
        <a href="#home" class="btn btn-secondary btn-lg">🏠 Utama</a>
      </div>
    </div>
  `;

  document.getElementById('quiz-restart').addEventListener('click', () => {
    renderQuiz(document.getElementById('page-content'));
  });
}
