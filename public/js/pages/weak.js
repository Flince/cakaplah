import { getVocabulary, showToast, categoryBadge, launchConfetti } from '../app.js';
import { getSrsStates, saveSrsState, addXP, addWeeklyXP, logActivity } from '../store.js';
import { createWordState, applyRating, RATING } from '../srs.js';
import { speak, isSupported } from '../tts.js';

const MIN_FAIL = 3;
const CONSEC_CORRECT_TO_CLEAR = 2;

let deck = [];
let currentIndex = 0;
let isFlipped = false;
let consecutiveCorrect = {};
let session = { reviewed: 0, cleared: 0 };

export async function renderWeak(container) {
  const vocab = await getVocabulary();
  const srsAll = getSrsStates();

  const weakWords = vocab.filter(w => (srsAll[w.id]?.failCount || 0) >= MIN_FAIL);
  deck = [...weakWords]; // keep order by fail count (desc)
  deck.sort((a, b) => (srsAll[b.id]?.failCount || 0) - (srsAll[a.id]?.failCount || 0));

  currentIndex = 0;
  isFlipped = false;
  consecutiveCorrect = {};
  session = { reviewed: 0, cleared: 0 };

  if (deck.length === 0) {
    container.innerHTML = `
      <div class="page">
        <div class="section-header"><h1>💪 Latihan Kata Lemah</h1></div>
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <h3>Tiada perkataan lemah!</h3>
          <p>Anda perlu membuat kesilapan sekurang-kurangnya ${MIN_FAIL} kali pada sesuatu perkataan sebelum ia muncul di sini.</p>
          <div style="margin-top:20px">
            <a href="#drill" class="btn btn-primary">⚡ Mulakan Latihan Harian</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  renderShell(container);
  renderCard();
}

function renderShell(container) {
  container.innerHTML = `
    <div class="page" id="weak-page">
      <div class="section-header">
        <h1>💪 Latihan Kata Lemah</h1>
        <p>${deck.length} perkataan perlu diulang — jawab betul 2× berturut untuk lulus</p>
      </div>

      <div class="encourage-banner" id="weak-encourage">
        Anda boleh buat ini! Fokus dan berikan yang terbaik 💪
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="weak-progress" style="width:0%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.83rem;color:var(--text-muted);margin-bottom:20px">
        <span id="weak-counter">0 / ${deck.length} dilulus</span>
        <span id="weak-consec" style="color:var(--green-dark);font-weight:700"></span>
      </div>

      <div class="flashcard-scene" id="weak-scene">
        <div class="flashcard" id="weak-card">
          <div class="flashcard-face flashcard-front" id="weak-front"></div>
          <div class="flashcard-face flashcard-back"  id="weak-back"></div>
        </div>
      </div>

      <p class="flashcard-flip-hint"><span>Klik kad untuk balikkan</span></p>
      <div class="rating-buttons" id="weak-ratings" style="display:none"></div>
    </div>
  `;

  document.getElementById('weak-scene').addEventListener('click', () => {
    if (!isFlipped) flipCard();
  });
}

function renderCard() {
  const remaining = deck.filter(w => (consecutiveCorrect[w.id] || 0) < CONSEC_CORRECT_TO_CLEAR);
  if (remaining.length === 0) { showComplete(); return; }

  const word = remaining[currentIndex % remaining.length];
  const srsAll = getSrsStates();

  isFlipped = false;
  const card    = document.getElementById('weak-card');
  const front   = document.getElementById('weak-front');
  const back    = document.getElementById('weak-back');
  const ratings = document.getElementById('weak-ratings');

  card.classList.remove('is-flipped');
  ratings.style.display = 'none';

  const cleared = deck.length - remaining.length;
  const pct = Math.round((cleared / deck.length) * 100);
  document.getElementById('weak-progress').style.width = pct + '%';
  document.getElementById('weak-counter').textContent = `${cleared} / ${deck.length} dilulus`;

  const cc = consecutiveCorrect[word.id] || 0;
  document.getElementById('weak-consec').textContent = cc > 0 ? `${cc}/${CONSEC_CORRECT_TO_CLEAR} betul berturut` : '';

  const failCount = srsAll[word.id]?.failCount || 0;
  front.innerHTML = `
    <span class="flashcard-category">${categoryBadge(word.category)}</span>
    <div class="flashcard-word">${word.malay}</div>
    <div class="flashcard-hint">[ ${word.romanisation} ]</div>
    ${isSupported() ? `<button class="flashcard-tts-btn" id="weak-tts">🔊</button>` : ''}
    <div style="position:absolute;bottom:16px;right:16px">
      <span class="fail-badge">${failCount}× silap</span>
    </div>
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

  const ttsBtn = document.getElementById('weak-tts');
  if (ttsBtn) ttsBtn.addEventListener('click', e => { e.stopPropagation(); speak(word.malay); });

  ratings.innerHTML = `
    <button class="rating-btn again" data-correct="false">
      <span class="rating-btn-icon">😰</span><span>Masih Silap</span>
    </button>
    <button class="rating-btn good" data-correct="true">
      <span class="rating-btn-icon">✅</span><span>Saya Tahu!</span>
    </button>
  `;

  ratings.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(word, btn.dataset.correct === 'true'));
  });

  updateEncouragement(remaining.length);
}

function flipCard() {
  isFlipped = true;
  document.getElementById('weak-card').classList.add('is-flipped');
  document.getElementById('weak-ratings').style.display = 'grid';
  if (isSupported()) speak(deck[currentIndex % deck.length].malay);
}

function handleAnswer(word, isCorrect) {
  const srsAll = getSrsStates();
  const state  = srsAll[word.id] || createWordState();
  const rating = isCorrect ? RATING.GOOD : RATING.AGAIN;
  saveSrsState(word.id, applyRating(state, rating));

  addXP(isCorrect ? 10 : 0);
  if (isCorrect) addWeeklyXP(10);
  logActivity(1);
  session.reviewed++;

  if (isCorrect) {
    consecutiveCorrect[word.id] = (consecutiveCorrect[word.id] || 0) + 1;
    if (consecutiveCorrect[word.id] >= CONSEC_CORRECT_TO_CLEAR) {
      session.cleared++;
      showToast(`✅ "${word.malay}" dilulus!`, 'success', 2000);
    }
  } else {
    consecutiveCorrect[word.id] = 0;
  }

  currentIndex++;
  isFlipped = false;
  renderCard();
}

function updateEncouragement(remaining) {
  const messages = [
    'Anda boleh buat ini! Fokus dan berikan yang terbaik 💪',
    'Teruskan! Setiap perkataan yang dipelajari adalah kejayaan! 🌟',
    'Hampir sampai! Jangan berhenti sekarang! 🔥',
    'Hebat! Anda semakin baik! Terus berlatih! 👏',
    'Konsistensi adalah kunci kejayaan. Teruskan! 🗝️',
  ];
  const el = document.getElementById('weak-encourage');
  if (el) el.textContent = messages[Math.floor(Math.random() * messages.length)];
}

function showComplete() {
  launchConfetti();
  const page = document.getElementById('weak-page');
  page.innerHTML = `
    <div class="summary-screen">
      <div class="summary-emoji">🏆</div>
      <div class="summary-title">Semua Dilulus!</div>
      <div class="summary-sub">Anda telah menguasai semua perkataan yang sukar</div>

      <div class="summary-stats">
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--green)">${session.cleared}</div>
          <div class="summary-stat-label">Dilulus</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value">${session.reviewed}</div>
          <div class="summary-stat-label">Percubaan</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="#home" class="btn btn-primary btn-lg">🏠 Kembali ke Utama</a>
        <a href="#drill" class="btn btn-secondary btn-lg">⚡ Latihan Harian</a>
      </div>
    </div>
  `;
  showToast('🏆 Semua perkataan lemah dilulus!', 'success', 4000);
}
