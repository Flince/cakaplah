import { getVocabulary, showToast, categoryBadge, xpForRating, launchConfetti, shuffle } from '../app.js';
import { getSrsStates, saveSrsState, addXP, addWeeklyXP, logActivity, updateStreak } from '../store.js';
import { createWordState, applyRating, previewInterval, isDueToday, RATING } from '../srs.js';
import { speak, isSupported } from '../tts.js';

const MAX_DRILL = 20;
let drillDeck = [];
let currentIndex = 0;
let isFlipped = false;
let sessionStats = { reviewed: 0, correct: 0, xpEarned: 0 };

export async function renderDrill(container) {
  const vocab = await getVocabulary();
  const srsAll = getSrsStates();

  // Build deck: due cards first, then new words to fill up to MAX_DRILL
  const due = vocab.filter(w => {
    const s = srsAll[w.id];
    return !s || isDueToday(s);
  });

  const notDue = vocab.filter(w => {
    const s = srsAll[w.id];
    return s && !isDueToday(s);
  });

  drillDeck = shuffle(due).slice(0, MAX_DRILL);
  if (drillDeck.length < MAX_DRILL) {
    const needed = MAX_DRILL - drillDeck.length;
    drillDeck = [...drillDeck, ...shuffle(notDue).slice(0, needed)];
  }

  currentIndex = 0;
  isFlipped = false;
  sessionStats = { reviewed: 0, correct: 0, xpEarned: 0 };

  renderShell(container);
  renderCard();
}

function renderShell(container) {
  container.innerHTML = `
    <div class="page" id="drill-page">
      <div class="section-header">
        <h1>⚡ Latihan Harian</h1>
        <p>${drillDeck.length} perkataan dalam sesi ini</p>
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="drill-progress" style="width:0%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.83rem;color:var(--text-muted);margin-bottom:20px">
        <span id="drill-counter">0 / ${drillDeck.length}</span>
        <span id="drill-xp-display">0 XP</span>
      </div>

      <div class="flashcard-scene" id="drill-scene">
        <div class="flashcard" id="drill-card">
          <div class="flashcard-face flashcard-front" id="drill-front"></div>
          <div class="flashcard-face flashcard-back"  id="drill-back"></div>
        </div>
      </div>

      <p class="flashcard-flip-hint"><span>Klik kad untuk balikkan</span></p>
      <div class="rating-buttons" id="drill-ratings" style="display:none"></div>
    </div>
  `;

  document.getElementById('drill-scene').addEventListener('click', () => {
    if (!isFlipped) flipCard();
  });
}

function renderCard() {
  if (currentIndex >= drillDeck.length) {
    showSummary();
    return;
  }

  const word = drillDeck[currentIndex];
  const srsAll = getSrsStates();
  const state = srsAll[word.id] || createWordState();

  isFlipped = false;
  const card     = document.getElementById('drill-card');
  const front    = document.getElementById('drill-front');
  const back     = document.getElementById('drill-back');
  const ratings  = document.getElementById('drill-ratings');

  card.classList.remove('is-flipped');
  ratings.style.display = 'none';

  const pct = Math.round((currentIndex / drillDeck.length) * 100);
  document.getElementById('drill-progress').style.width = pct + '%';
  document.getElementById('drill-counter').textContent = `${currentIndex} / ${drillDeck.length}`;
  document.getElementById('drill-xp-display').textContent = `${sessionStats.xpEarned} XP`;

  front.innerHTML = `
    <span class="flashcard-category">${categoryBadge(word.category)}</span>
    <div class="flashcard-word">${word.malay}</div>
    <div class="flashcard-hint">[ ${word.romanisation} ]</div>
    ${isSupported() ? `<button class="flashcard-tts-btn" id="drill-tts">🔊</button>` : ''}
  `;

  back.innerHTML = `
    <span class="flashcard-category">${categoryBadge(word.category)}</span>
    <div class="flashcard-translation">${word.english}</div>
    <div class="flashcard-romanisation">${word.romanisation}</div>
    <div class="flashcard-example">
      ${word.exampleSentence}
      <em>${word.exampleTranslation}</em>
    </div>
  `;

  const ttsBtn = document.getElementById('drill-tts');
  if (ttsBtn) ttsBtn.addEventListener('click', e => { e.stopPropagation(); speak(word.malay); });

  ratings.innerHTML = [
    { r: RATING.AGAIN, cls: 'again', icon: '😰', label: 'Lagi' },
    { r: RATING.HARD,  cls: 'hard',  icon: '😓', label: 'Susah' },
    { r: RATING.GOOD,  cls: 'good',  icon: '🙂', label: 'Bagus' },
    { r: RATING.EASY,  cls: 'easy',  icon: '😄', label: 'Mudah' },
  ].map(({ r, cls, icon, label }) => `
    <button class="rating-btn ${cls}" data-rating="${r}">
      <span class="rating-btn-icon">${icon}</span>
      <span>${label}</span>
      <span class="rating-btn-interval">${previewInterval(state, r)}</span>
    </button>
  `).join('');

  ratings.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => handleRating(word, parseInt(btn.dataset.rating)));
  });
}

function flipCard() {
  isFlipped = true;
  document.getElementById('drill-card').classList.add('is-flipped');
  document.getElementById('drill-ratings').style.display = 'grid';
  if (isSupported()) speak(drillDeck[currentIndex].malay);
}

function handleRating(word, rating) {
  const srsAll = getSrsStates();
  const state = srsAll[word.id] || createWordState();
  const newState = applyRating(state, rating);
  saveSrsState(word.id, newState);

  const xp = xpForRating(rating);
  addXP(xp);
  addWeeklyXP(xp);
  logActivity(1);

  sessionStats.reviewed++;
  sessionStats.xpEarned += xp;
  if (rating >= RATING.GOOD) sessionStats.correct++;

  currentIndex++;
  isFlipped = false;
  renderCard();
}

function showSummary() {
  const accuracy = sessionStats.reviewed > 0
    ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
    : 0;

  const streak = updateStreak();
  const isStreakMilestone = [7, 30, 100].includes(streak.count);

  if (isStreakMilestone) setTimeout(launchConfetti, 400);

  const grade = accuracy >= 90 ? { msg: 'Cemerlang! 🌟', sub: 'Penguasaan bahasa anda semakin mantap!' }
    : accuracy >= 70 ? { msg: 'Bagus! 👍', sub: 'Teruskan usaha — anda semakin berkembang.' }
    : { msg: 'Teruskan! 💪', sub: 'Setiap usaha membawa kemajuan.' };

  const page = document.getElementById('drill-page');
  page.innerHTML = `
    <div class="summary-screen">
      <div class="summary-emoji">${accuracy >= 70 ? '🎉' : '💪'}</div>
      <div class="summary-title">${grade.msg}</div>
      <div class="summary-sub">${grade.sub}</div>

      <div class="summary-stats">
        <div class="summary-stat">
          <div class="summary-stat-value">${sessionStats.reviewed}</div>
          <div class="summary-stat-label">Dikaji</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--green)">${accuracy}%</div>
          <div class="summary-stat-label">Ketepatan</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--gold-dark)">${sessionStats.xpEarned}</div>
          <div class="summary-stat-label">XP Diperolehi</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:#E65100">🔥 ${streak.count}</div>
          <div class="summary-stat-label">Hari Berturut</div>
        </div>
      </div>

      ${isStreakMilestone ? `
        <div class="encourage-banner" style="margin-bottom:20px">
          🎊 Tahniah! Anda mencapai ${streak.count} hari berturut-turut!
        </div>
      ` : ''}

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="#home" class="btn btn-primary btn-lg">🏠 Kembali ke Utama</a>
        <button class="btn btn-secondary btn-lg" id="drill-again">🔄 Latih Semula</button>
      </div>
    </div>
  `;

  document.getElementById('drill-again')?.addEventListener('click', () => {
    renderDrill(document.getElementById('page-content'));
  });

  showToast(`+${sessionStats.xpEarned} XP diperoleh!`, 'gold', 3000);
}
