/**
 * Main app entry — router, global state, vocabulary cache, utilities.
 */
import { renderHome }      from './pages/home.js';
import { renderFlashcard } from './pages/flashcard.js';
import { renderDrill }     from './pages/drill.js';
import { renderQuiz }      from './pages/quiz.js';
import { renderBrowse }    from './pages/browse.js';
import { renderWeak }      from './pages/weak.js';

// ===== GLOBAL VOCABULARY CACHE =====
let _vocab = null;

export async function getVocabulary() {
  if (_vocab) return _vocab;
  try {
    const res = await fetch('/api/vocabulary');
    _vocab = await res.json();
  } catch {
    _vocab = [];
  }
  return _vocab;
}

// ===== ROUTER =====
const ROUTES = {
  home:      renderHome,
  flashcard: renderFlashcard,
  drill:     renderDrill,
  quiz:      renderQuiz,
  browse:    renderBrowse,
  weak:      renderWeak,
};

function getHash() {
  return window.location.hash.replace('#', '') || 'home';
}

async function navigate(page) {
  const content = document.getElementById('page-content');
  const skeleton = document.getElementById('skeleton-loader');

  // Update nav active states
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  skeleton.style.display = 'grid';
  content.style.display = 'none';

  const renderer = ROUTES[page] || ROUTES.home;
  await renderer(content);

  skeleton.style.display = 'none';
  content.style.display = '';
}

window.addEventListener('hashchange', () => navigate(getHash()));

// ===== TOAST SYSTEM =====
export function showToast(message, type = 'success', duration = 2800) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ===== CONFETTI =====
export function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#4CAF50','#FFC107','#2196F3','#F44336','#9C27B0','#FF5722'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${1.8 + Math.random() * 1.4}s;
      animation-delay: ${Math.random() * 0.6}s;
    `;
    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

// ===== CATEGORY BADGE HELPER =====
export function categoryBadge(cat) {
  return `<span class="category-badge ${cat}">${cat}</span>`;
}

// ===== MASTERY BADGE =====
export function masteryBadge(level) {
  const labels = { new: '⭐ Baru', learning: '📖 Belajar', review: '🔄 Ulang', mastered: '✅ Mahir' };
  return `<span class="mastery-badge ${level}">${labels[level] || level}</span>`;
}

// ===== XP PER RATING =====
export function xpForRating(rating) {
  return [0, 5, 10, 15][rating] ?? 10;
}

// ===== SHUFFLE =====
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== NORMALIZE (accent-insensitive compare) =====
export function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// ===== INIT =====
async function init() {
  // Preload vocab
  getVocabulary();
  navigate(getHash());
}

init();
