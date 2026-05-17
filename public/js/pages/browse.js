import { getVocabulary, categoryBadge, masteryBadge } from '../app.js';
import { getSrsStates } from '../store.js';
import { getMasteryLevel } from '../srs.js';
import { speak, isSupported } from '../tts.js';

const CATEGORIES = ['semua', 'food', 'family', 'numbers', 'time', 'nature', 'body', 'emotions', 'travel', 'home', 'verbs'];
let activeCategory = 'semua';
let searchQuery = '';
let allVocab = [];
let srsAll = {};

export async function renderBrowse(container) {
  allVocab = await getVocabulary();
  srsAll = getSrsStates();
  activeCategory = 'semua';
  searchQuery = '';

  container.innerHTML = `
    <div class="page">
      <div class="section-header">
        <h1>📚 Semak Imbas Perbendaharaan Kata</h1>
        <p>${allVocab.length} perkataan dalam ${CATEGORIES.length - 1} kategori</p>
      </div>

      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="browse-search" placeholder="Cari dalam Melayu atau Inggeris..." />
      </div>

      <div class="scroll-x">
        <div class="cat-tabs" id="cat-tabs">
          ${CATEGORIES.map(c => `
            <button class="cat-tab ${c === 'semua' ? 'active' : ''}" data-cat="${c}">
              ${catLabel(c)}
            </button>
          `).join('')}
        </div>
      </div>

      <div id="browse-count" style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px"></div>
      <div class="word-grid" id="word-grid"></div>
    </div>
  `;

  document.getElementById('browse-search').addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderGrid();
    });
  });

  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('word-grid');
  const countEl = document.getElementById('browse-count');

  const filtered = allVocab.filter(w => {
    const catMatch = activeCategory === 'semua' || w.category === activeCategory;
    const searchMatch = !searchQuery
      || w.malay.toLowerCase().includes(searchQuery)
      || w.english.toLowerCase().includes(searchQuery);
    return catMatch && searchMatch;
  });

  countEl.textContent = `${filtered.length} perkataan dijumpai`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>Tiada hasil</h3>
        <p>Cuba cari perkataan lain atau tukar kategori</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(w => {
    const state  = srsAll[w.id];
    const level  = getMasteryLevel(state);
    return `
      <div class="word-card" data-id="${w.id}">
        <div class="word-card-malay">${w.malay}</div>
        <div class="word-card-english">${w.english}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
          ${categoryBadge(w.category)}
          ${masteryBadge(level)}
        </div>
        <div class="word-card-details">
          <div class="word-card-romanisation">[ ${w.romanisation} ]</div>
          <div class="word-card-example">
            <b>${w.exampleSentence}</b><br>
            <em>${w.exampleTranslation}</em>
          </div>
        </div>
        ${isSupported() ? `<button class="word-card-tts" data-word="${w.malay}" title="Sebut">🔊</button>` : ''}
      </div>
    `;
  }).join('');

  // Expand/collapse
  grid.querySelectorAll('.word-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('word-card-tts')) return;
      card.classList.toggle('expanded');
    });
  });

  // TTS buttons
  grid.querySelectorAll('.word-card-tts').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      speak(btn.dataset.word);
    });
  });
}

function catLabel(cat) {
  const labels = {
    semua: '🌐 Semua', food: '🍜 Makanan', family: '👨‍👩‍👧 Keluarga',
    numbers: '🔢 Nombor', time: '⏰ Masa', nature: '🌿 Alam',
    body: '🫀 Badan', emotions: '💭 Emosi', travel: '✈️ Perjalanan',
    home: '🏠 Rumah', verbs: '🏃 Kata Kerja',
  };
  return labels[cat] || cat;
}
