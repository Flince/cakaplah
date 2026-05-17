import { getVocabulary, showToast, launchConfetti } from '../app.js';
import { getSrsStates, getStreak, getXP, getActivity, getWeeklyXP, updateStreak } from '../store.js';
import { isDueToday, getMasteryLevel, todayStr } from '../srs.js';

export async function renderHome(container) {
  const vocab = await getVocabulary();
  const srsAll = getSrsStates();
  const streak = getStreak();
  const xp = getXP();
  const activity = getActivity();
  const weeklyXP = getWeeklyXP();

  // Compute stats
  let mastered = 0, inReview = 0, learning = 0, newW = 0, dueToday = 0;
  vocab.forEach(w => {
    const s = srsAll[w.id];
    if (!s || s.repetitions === 0) { newW++; }
    else {
      const lvl = getMasteryLevel(s);
      if (lvl === 'mastered') mastered++;
      else if (lvl === 'review') inReview++;
      else learning++;
    }
    if (!s || isDueToday(s)) dueToday++;
  });

  // Top 5 weakest words
  const weakWords = vocab
    .filter(w => srsAll[w.id]?.failCount > 0)
    .sort((a, b) => (srsAll[b.id]?.failCount || 0) - (srsAll[a.id]?.failCount || 0))
    .slice(0, 5);

  // Heatmap (last 30 days)
  const heatmapCells = buildHeatmap(activity, 30);

  // Check streak milestones
  const milestones = [7, 30, 100];
  if (milestones.includes(streak.count) && streak.lastDate === todayStr()) {
    setTimeout(() => {
      launchConfetti();
      showToast(`🔥 ${streak.count} hari berturut-turut! Luar biasa!`, 'gold', 4000);
    }, 600);
  }

  container.innerHTML = `
    <div class="page">
      <div class="streak-banner">
        <div class="streak-icon">🔥</div>
        <div class="streak-text">
          <h2>${streak.count} Hari Berturut-turut</h2>
          <p>Terus kekalkan semangat belajar anda! ${xp} XP dikumpulkan</p>
        </div>
        <div style="margin-left:auto"><span class="xp-chip">⭐ ${xp} XP</span></div>
      </div>

      <div class="stat-grid">
        <div class="stat-card green">
          <div class="stat-card-value">${mastered}</div>
          <div class="stat-card-label">Mahir</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-card-value">${inReview + learning}</div>
          <div class="stat-card-label">Dalam Ulangan</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-card-value">${newW}</div>
          <div class="stat-card-label">Perkataan Baru</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-card-value">${dueToday}</div>
          <div class="stat-card-label">Perlu Ulang Hari Ini</div>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:28px">
        <a href="#drill" class="cta-btn">
          <span>⚡</span> Mulakan Latihan Harian
        </a>
        <p style="font-size:0.83rem;color:var(--text-muted);margin-top:8px">
          ${dueToday} perkataan menunggu — anggaran 5–10 minit
        </p>
      </div>

      <div class="panel">
        <div class="panel-title">📅 Aktiviti 30 Hari Lepas</div>
        <div class="heatmap-grid">${heatmapCells}</div>
        <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:10px;align-items:center">
          <span style="font-size:0.75rem;color:var(--text-muted)">Kurang</span>
          <div class="heatmap-cell" style="width:14px;height:14px;border-radius:3px;background:#E8F5E9;display:inline-block"></div>
          <div class="heatmap-cell" data-level="1" style="width:14px;height:14px;border-radius:3px;display:inline-block"></div>
          <div class="heatmap-cell" data-level="2" style="width:14px;height:14px;border-radius:3px;display:inline-block"></div>
          <div class="heatmap-cell" data-level="3" style="width:14px;height:14px;border-radius:3px;display:inline-block"></div>
          <div class="heatmap-cell" data-level="4" style="width:14px;height:14px;border-radius:3px;display:inline-block"></div>
          <span style="font-size:0.75rem;color:var(--text-muted)">Banyak</span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">📊 XP Mingguan</div>
        <div class="chart-wrapper">
          <canvas id="xp-chart"></canvas>
        </div>
      </div>

      ${weakWords.length > 0 ? `
      <div class="panel">
        <div class="panel-title">😰 5 Perkataan Paling Susah</div>
        ${weakWords.map(w => `
          <div class="weak-word-item">
            <div>
              <div class="weak-word-malay">${w.malay}</div>
              <div class="weak-word-english">${w.english}</div>
            </div>
            <span class="fail-badge">${srsAll[w.id]?.failCount || 0}× silap</span>
          </div>
        `).join('')}
        <a href="#weak" style="display:block;text-align:center;margin-top:14px;font-size:0.87rem;font-weight:700;color:var(--green-dark)">
          Latih perkataan lemah →
        </a>
      </div>
      ` : ''}

      <div class="panel">
        <div class="panel-title">📈 Kemajuan Keseluruhan</div>
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:0.85rem;font-weight:600">Perkataan Dikuasai</span>
            <span style="font-size:0.85rem;color:var(--green-dark);font-weight:700">${mastered} / ${vocab.length}</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${vocab.length ? Math.round(mastered/vocab.length*100) : 0}%"></div>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.82rem">
          <span style="color:var(--text-muted)">✅ Mahir: <b style="color:var(--green)">${mastered}</b></span>
          <span style="color:var(--text-muted)">🔄 Ulang: <b style="color:var(--blue)">${inReview}</b></span>
          <span style="color:var(--text-muted)">📖 Belajar: <b style="color:#E65100">${learning}</b></span>
          <span style="color:var(--text-muted)">⭐ Baru: <b>${newW}</b></span>
        </div>
      </div>
    </div>
  `;

  // Draw XP chart
  setTimeout(() => {
    const ctx = document.getElementById('xp-chart');
    if (!ctx || !window.Chart) return;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('ms-MY', { weekday: 'short' }));
    }
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'XP',
          data: weeklyXP,
          backgroundColor: '#4CAF50',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0F0F0' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }, 0);
}

function buildHeatmap(activity, days) {
  let cells = '';
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = activity[dateStr] || 0;
    let level = 0;
    if (count >= 1)  level = 1;
    if (count >= 5)  level = 2;
    if (count >= 15) level = 3;
    if (count >= 30) level = 4;
    cells += `<div class="heatmap-cell" data-level="${level}" title="${dateStr}: ${count} perkataan"></div>`;
  }
  return cells;
}
