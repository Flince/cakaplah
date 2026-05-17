import { getVocabulary, showToast, categoryBadge, xpForRating, shuffle } from '../app.js';
import { getSrsStates, saveSrsState, addXP, addWeeklyXP, logActivity, getSetting, setSetting } from '../store.js';
import { createWordState, applyRating, previewInterval, RATING } from '../srs.js';
import { speak, isSupported } from '../tts.js';

let deck = [];
let currentIndex = 0;
let isFlipped = false;
let isEnToMs = false; // direction: false = MS→EN, true = EN→MS

export async function renderFlashcard(container) {
  const vocab = await getVocabulary();
  const srsAll = getSrsStates();
  isEnToMs = getSetting('fc_direction', false);

  // Build shuffled deck of all words
  deck = shuffle(vocab);
  currentIndex = 0;
  isFlipped = false;

  renderShell(container);
  renderCard();
}

function renderShell(container) {
  container.innerHTML = `
    <div class="page" id="fc-page">
      <div class="section-header">
        <h1>🃏 Kad Imbas</h1>
        <p>Klik kad untuk membalikkan dan lihat jawapan</p>
      </div>

      <div class="direction-toggle">
        <label for="fc-dir-toggle">MS → EN</label>
        <label class="toggle-switch">
          <input type="checkbox" id="fc-dir-toggle" ${isEnToMs ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <label for="fc-dir-toggle">EN → MS</label>
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="fc-progress" style="width:0%"></div>
      </div>
      <div style="text-align:center;font-size:0.85rem;color:var(--text-muted);margin-bottom:16px" id="fc-counter">
        1 / ${deck.length}
      </div>

      <div class="flashcard-scene" id="fc-scene">
        <div class="flashcard" id="fc-card">
          <div class="flashcard-face flashcard-front" id="fc-front"></div>
          <div class="flashcard-face flashcard-back"  id="fc-back"></div>
        </div>
      </div>

      <p class="flashcard-flip-hint"><span>Klik kad untuk balikkan</span></p>

      <div class="rating-buttons" id="fc-ratings" style="display:none"></div>

      <div style="text-align:center;margin-top:8px">
        <button class="btn btn-ghost btn-sm" id="fc-skip">Langkau →</button>
        <button class="btn btn-ghost btn-sm" id="fc-shuffle">🔀 Kocok Semula</button>
      </div>
    </div>
  `;

  document.getElementById('fc-dir-toggle').addEventListener('change', e => {
    isEnToMs = e.target.checked;
    setSetting('fc_direction', isEnToMs);
    isFlipped = false;
    renderCard();
  });

  document.getElementById('fc-skip').addEventListener('click', advanceCard);
  document.getElementById('fc-shuffle').addEventListener('click', async () => {
    const vocab = await getVocabulary();
    deck = shuffle(vocab);
    currentIndex = 0;
    isFlipped = false;
    renderCard();
  });

  document.getElementById('fc-scene').addEventListener('click', () => {
    if (!isFlipped) flipCard();
  });
}

function renderCard() {
  if (currentIndex >= deck.length) {
    showComplete();
    return;
  }

  const word = deck[currentIndex];
  const srsAll = getSrsStates();
  const state = srsAll[word.id] || createWordState();

  isFlipped = false;
  const card = document.getElementById('fc-card');
  const front = document.getElementById('fc-front');
  const back  = document.getElementById('fc-back');
  const ratings = document.getElementById('fc-ratings');

  card.classList.remove('is-flipped');
  ratings.style.display = 'none';

  // Progress
  const pct = Math.round((currentIndex / deck.length) * 100);
  document.getElementById('fc-progress').style.width = pct + '%';
  document.getElementById('fc-counter').textContent = `${currentIndex + 1} / ${deck.length}`;

  if (!isEnToMs) {
    // MS → EN
    front.innerHTML = `
      <span class="flashcard-category">${categoryBadge(word.category)}</span>
      <div class="flashcard-word">${word.malay}</div>
      <div class="flashcard-hint">[ ${word.romanisation} ]</div>
      ${isSupported() ? `<button class="flashcard-tts-btn" id="fc-tts">🔊</button>` : ''}
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
  } else {
    // EN → MS
    front.innerHTML = `
      <span class="flashcard-category">${categoryBadge(word.category)}</span>
      <div class="flashcard-word" style="font-size:1.9rem">${word.english}</div>
      <div class="flashcard-hint">Apakah dalam Bahasa Melayu?</div>
    `;
    back.innerHTML = `
      <span class="flashcard-category">${categoryBadge(word.category)}</span>
      <div class="flashcard-translation">${word.malay}</div>
      <div class="flashcard-romanisation">${word.romanisation}</div>
      ${isSupported() ? `<button class="flashcard-tts-btn" id="fc-tts">🔊</button>` : ''}
      <div class="flashcard-example">
        ${word.exampleSentence}
        <em>${word.exampleTranslation}</em>
      </div>
    `;
  }

  // TTS button
  const ttsBtn = document.getElementById('fc-tts');
  if (ttsBtn) ttsBtn.addEventListener('click', e => { e.stopPropagation(); speak(word.malay); });

  // Build rating buttons with interval preview
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
  document.getElementById('fc-card').classList.add('is-flipped');
  document.getElementById('fc-ratings').style.display = 'grid';

  // Auto-speak on flip for MS→EN direction
  if (!isEnToMs && isSupported()) {
    speak(deck[currentIndex].malay);
  }
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

  if (xp > 0) showToast(`+${xp} XP`, 'gold', 1500);
  advanceCard();
}

function advanceCard() {
  currentIndex++;
  isFlipped = false;
  renderCard();
}

function showComplete() {
  const page = document.getElementById('fc-page');
  page.innerHTML = `
    <div class="summary-screen">
      <div class="summary-emoji">🎉</div>
      <div class="summary-title">Kad Selesai!</div>
      <div class="summary-sub">Anda telah melalui semua ${deck.length} perkataan</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" id="fc-restart">🔀 Kocok & Ulang Semula</button>
        <a href="#drill" class="btn btn-secondary btn-lg">⚡ Mulakan Latihan</a>
      </div>
    </div>
  `;
  document.getElementById('fc-restart').addEventListener('click', async () => {
    const vocab = await getVocabulary();
    deck = shuffle(vocab);
    currentIndex = 0;
    isFlipped = false;
    renderFlashcard(document.getElementById('page-content'));
  });
}
