const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const vocabularyPath = path.join(__dirname, 'data', 'vocabulary.json');

function loadVocabulary() {
  const raw = fs.readFileSync(vocabularyPath, 'utf-8');
  return JSON.parse(raw);
}

// GET /api/vocabulary — all words
app.get('/api/vocabulary', (req, res) => {
  try {
    const vocab = loadVocabulary();
    res.json(vocab);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load vocabulary' });
  }
});

// GET /api/vocabulary/category/:cat — words by category
app.get('/api/vocabulary/category/:cat', (req, res) => {
  try {
    const vocab = loadVocabulary();
    const cat = req.params.cat.toLowerCase();
    const filtered = vocab.filter(w => w.category.toLowerCase() === cat);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load vocabulary' });
  }
});

// GET /api/vocabulary/:id — single word (must come after category route)
app.get('/api/vocabulary/:id', (req, res) => {
  try {
    const vocab = loadVocabulary();
    const word = vocab.find(w => w.id === req.params.id);
    if (!word) return res.status(404).json({ error: 'Word not found' });
    res.json(word);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load vocabulary' });
  }
});

// GET /api/stats — aggregate stats from vocabulary file
app.get('/api/stats', (req, res) => {
  try {
    const vocab = loadVocabulary();
    const categories = [...new Set(vocab.map(w => w.category))];
    const countByCategory = {};
    categories.forEach(cat => {
      countByCategory[cat] = vocab.filter(w => w.category === cat).length;
    });
    res.json({
      total: vocab.length,
      categories: categories.length,
      countByCategory,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cakapla running at http://localhost:${PORT}`);
});
