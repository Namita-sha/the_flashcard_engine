# Recallify

A spaced-repetition flashcard app that turns any PDF into a smart, practice-ready deck.

Built for the Cuemath Round 2 Take-Home Challenge — Problem 1: The Flashcard Engine.

**Live demo → [recallify.vercel.app]([https://recallify.vercel.app](https://the-flashcard-engine-eight.vercel.app/))**
**github link ->https://github.com/Namita-sha/the_flashcard_engine

---

## What it does

Drop in a PDF (or paste text). Gemini generates up to 20 flashcards — definitions, relationships, edge cases, worked examples — tagged by topic and difficulty. Then study them with SM-2 spaced repetition: cards you struggle with keep showing up, cards you know well fade away.

**Features**

- PDF ingestion via `pdfjs-dist` (fully client-side, nothing leaves the browser)
- AI card generation with Gemini 2.5 Flash — teacher-persona prompt, six card types
- Card preview and curation before saving
- SM-2 spaced repetition with Again / Hard / Good / Easy ratings
- Per-card status: Mastered, Due, Shaky, Upcoming
- Progress page: donut chart, topic breakdown, full session history
- Mastery ETA based on session pace and frequency
- Day streak tracking
- Demo deck auto-seeded for new users
- Google OAuth — decks are private and user-scoped

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind CSS v4 |
| Auth | Firebase Authentication (Google OAuth) |
| Database | Firestore |
| AI | Gemini 2.5 Flash Lite (REST) |
| PDF Parsing | pdfjs-dist (client-side) |
| Deployment | Vercel |

---

## Local setup

**Prerequisites:** Node 18+, a Firebase project, a Gemini API key

```bash
git clone https://github.com/Namita-sha/the_flashcard_engine
cd the_flashcard_engine
npm install
```

Create a `.env` file in the root:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

```bash
npm run dev
```

---

## Firestore structure

```
decks/{deckId}
  cards/{cardId}        ← SM-2 state lives here
  sessions/{sessionId}  ← per-session ratings and duration
```

---

## Security

No API keys or credentials are committed to this repository. All secrets are injected at build time via Vercel environment variables. The Gemini key is additionally restricted to the production domain in Google Cloud Console.

---

## License

MIT
