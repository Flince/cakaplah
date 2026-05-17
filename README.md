# Cakapla — Kuasai Bahasa Melayu

A full-stack spaced-repetition vocabulary app for mastering Bahasa Melayu. Built with Node.js + Express (backend) and Vanilla JS (frontend, no build step required).

---

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

---

## Features

- **Flashcard Mode** — 3D flip cards with MS→EN or EN→MS direction toggle
- **Daily Drill** — SM-2 spaced repetition pulls due cards + new words (up to 20/session)
- **Quiz** — Multiple choice or typing challenge (accent-insensitive matching)
- **Browse** — Searchable grid of all words, filterable by category, with mastery badges
- **Weak Word Drill** — Targets words with ≥3 failures; loops until answered correctly twice consecutively
- **Dashboard** — Streak tracker, XP, 30-day activity heatmap, weekly XP bar chart
- **Text-to-speech** — Uses Web Speech API for Malay pronunciation
- **No login required** — Progress saved to localStorage; vocabulary served from a local JSON file

---

## Adding More Vocabulary (toward 1000 words)

Edit `data/vocabulary.json`. Each entry follows this schema:

```json
{
  "id": "unique-id",
  "malay": "perkataan",
  "english": "the word",
  "romanisation": "pho-net-ic",
  "category": "verbs",
  "exampleSentence": "Contoh ayat dalam Bahasa Melayu.",
  "exampleTranslation": "Example sentence in English."
}
```

**Categories available:** `food`, `family`, `numbers`, `time`, `nature`, `body`, `emotions`, `travel`, `home`, `verbs`

You can add new categories freely — they'll appear automatically in Browse tabs and stat breakdowns.

The server reads `vocabulary.json` on every request, so changes take effect immediately without a restart.

---

## How SRS Scheduling Works (SM-2 Algorithm)

Each word has a state stored in the browser's localStorage:

| Field | Description |
|---|---|
| `interval` | Days until next review |
| `repetitions` | Successful review streak count |
| `easeFactor` | Multiplier for interval growth (starts at 2.5) |
| `nextReviewDate` | ISO date string for next scheduled review |
| `failCount` | Total number of "Again" ratings (used for weak-word detection) |

**After each card, the user rates recall:**

- **Again (0)** — Reset repetitions; interval = 1 day; ease factor drops by 0.2
- **Hard (1)** — Interval ×0.8; ease factor drops slightly
- **Good (2)** — Standard SM-2 progression; interval grows by ease factor
- **Easy (3)** — Interval ×1.3 bonus; ease factor increases

**"Due today"** = any word whose `nextReviewDate` is ≤ today's date.

New words (never reviewed) are always considered due. The Daily Drill prioritises due words and tops up with new words to reach 20 cards.

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Core app | ✅ | ✅ | ✅ | ✅ |
| Text-to-speech (TTS) | ✅ | ✅ | ✅ | ✅ |
| Malay voice (ms-MY) | ✅ Chrome | ⚠️ May use ID voice | ✅ macOS/iOS | ✅ |

**TTS notes:**
- Chrome on Windows typically has a Malay (ms-MY) voice installed via Windows Speech Platform
- If no Malay voice is found, the app falls back to Indonesian (id-ID), then English
- On iOS/macOS Safari, Malay voices are available via System Preferences → Accessibility → Spoken Content
- Firefox uses the OS speech engine; Malay support depends on the OS

---

## File Structure

```
cakapla/
├── package.json
├── server.js                  # Express API server
├── data/
│   └── vocabulary.json        # 100 seed words (extend to 1000)
├── public/
│   ├── index.html             # SPA shell
│   ├── css/
│   │   ├── main.css           # Global styles, layout, pages
│   │   ├── cards.css          # Flashcard 3D flip animation
│   │   └── components.css     # Buttons, toasts, badges, confetti
│   └── js/
│       ├── app.js             # Router, global helpers
│       ├── srs.js             # SM-2 algorithm (pure functions)
│       ├── store.js           # localStorage read/write
│       ├── tts.js             # Web Speech API wrapper
│       └── pages/
│           ├── home.js        # Dashboard with heatmap + chart
│           ├── flashcard.js   # Flashcard mode
│           ├── drill.js       # Daily drill session
│           ├── quiz.js        # Multiple choice + typing quiz
│           ├── browse.js      # Searchable vocabulary browser
│           └── weak.js        # Weak word targeted drill
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/vocabulary` | All words |
| GET | `/api/vocabulary/:id` | Single word by ID |
| GET | `/api/vocabulary/category/:cat` | Words filtered by category |
| GET | `/api/stats` | Aggregate counts by category |

All user progress (SRS states, streaks, XP) stays in the browser's localStorage — no user data is written to the server.
