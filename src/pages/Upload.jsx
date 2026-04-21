import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { extractTextFromPDF } from '../utils/pdfParser'
import { generateFlashcards } from '../utils/gemini'
import Navbar from '../components/Navbar'

const DIFF_COLOR = {
  easy:   'text-green-400 border-green-500/30 bg-green-500/5',
  medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  hard:   'text-red-400 border-red-500/30 bg-red-500/5',
}

const EMOJIS = ['🎉','✨','🌟','💫','🎊','⭐','🔥','💥']

// ── Sassy loading messages ────────────────────────────────────────────────────
const SASSY_MESSAGES = {
  extracting: [
    'Squinting at your PDF... 🔍',
    'Parsing the chaos you call notes...',
    'Decoding professor handwriting energy...',
    'Reading this so you don\'t have to again...',
  ],
  generating: [
    'Bribing Gemini to write better than your professor... 💸',
    'Teaching AI what your teacher couldn\'t explain...',
    'Turning 40 pages into things you\'ll actually remember...',
    'Gemini is doing its little magic dance... 🪄',
    'Generating cards that would make Anki jealous...',
    'Asking Gemini nicely (it said yes) ✨',
    'Turning your suffering into flashcards... almost done.',
  ],
  saving: [
    'Locking this into Firebase forever...',
    'Saving your future self some stress... 💾',
    'Committing to the cloud. No take-backs.',
  ],
}

function getSassyMessage(stage) {
  const pool = SASSY_MESSAGES[stage]
  if (!pool) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Time-of-day greeting ──────────────────────────────────────────────────────
function getGreeting(name) {
  const hour      = new Date().getHours()
  const firstName = name?.split(' ')[0] || ''
  const nameStr   = firstName ? `, ${firstName}` : ''

  if (hour >= 5  && hour < 12) return `Good morning${nameStr}. 🌅`
  if (hour >= 12 && hour < 17) return `Good afternoon${nameStr}. ☀️`
  if (hour >= 17 && hour < 21) return `Good evening${nameStr}. 🌙`
  return `Late night session${nameStr}? 🌌`
}

function Confetti() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl animate-bounce"
          style={{
            left:             `${Math.random() * 100}%`,
            top:              `${Math.random() * 60}%`,
            animationDelay:   `${Math.random() * 0.8}s`,
            animationDuration:`${0.6 + Math.random() * 0.8}s`,
            opacity:           0.9,
          }}
        >
          {EMOJIS[i % EMOJIS.length]}
        </div>
      ))}
    </div>
  )
}

export default function Upload() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const fileRef    = useRef()

  const [inputMode,    setInputMode]    = useState('pdf')
  const [file,         setFile]         = useState(null)
  const [pastedText,   setPastedText]   = useState('')
  const [deckName,     setDeckName]     = useState('')
  const [cardCount,    setCardCount]    = useState(20)
  const [stage,        setStage]        = useState('idle')
  const [error,        setError]        = useState(null)
  const [preview,      setPreview]      = useState([])
  const [dismissed,    setDismissed]    = useState(new Set())
  const [sassyMessage, setSassyMessage] = useState('')

  const canGenerate =
    deckName.trim() &&
    (inputMode === 'pdf' ? !!file : pastedText.trim().length > 20)

  async function handleGenerate() {
    if (!canGenerate) return
    setError(null)
    try {
      let text = ''
      if (inputMode === 'pdf') {
        setStage('extracting')
        setSassyMessage(getSassyMessage('extracting'))
        text = await extractTextFromPDF(file)
      } else {
        text = pastedText.trim()
      }
      setStage('generating')
      setSassyMessage(getSassyMessage('generating'))
      const cards = await generateFlashcards(text, cardCount || 10)
      setPreview(cards || [])
      setDismissed(new Set())
      setStage('preview')
    } catch (e) {
      console.error('GENERATION ERROR:', e)
      setError(e.message || 'Something went wrong')
      setStage('idle')
    }
  }

  async function handleSave() {
    setStage('saving')
    setSassyMessage(getSassyMessage('saving'))
    try {
      if (!user) throw new Error('User not logged in')
      const finalCards = preview.filter((_, i) => !dismissed.has(i))
      const deckRef = await addDoc(collection(db, 'decks'), {
        name:      deckName.trim(),
        userId:    user.uid,
        createdAt: serverTimestamp(),
        fileName:  file?.name ?? 'pasted-text',
      })
      const now = new Date().toISOString()
      await Promise.all(
        finalCards.map((card) => {
          const cardRef = doc(collection(db, 'decks', deckRef.id, 'cards'))
          return setDoc(cardRef, {
            ...card,
            repetitions: 0,
            easeFactor:  2.5,
            interval:    1,
            dueDate:     now,
          })
        })
      )
      setStage('done')
      setTimeout(() => navigate('/dashboard'), 2200)
    } catch (e) {
      console.error('SAVE ERROR:', e)
      setError(e.message || 'Failed to save')
      setStage('preview')
    }
  }

  function toggleDismiss(i) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const keptCount = preview.length - dismissed.size

  // ── Preview screen ───────────────────────────────────────────────────────
  if (stage === 'preview') {
    return (
      <div className="min-h-screen bg-dark-900">
        <Navbar />
        <main className="max-w-2xl px-6 pb-16 mx-auto pt-28">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl text-white font-display">Review your cards</h2>
            <span className="text-sm text-dark-400 font-body">{keptCount} cards kept</span>
          </div>
          <p className="mb-8 text-sm text-dark-400 font-body">
            Remove any cards you don't want before saving. Click a card to dismiss it.
          </p>
          <div className="mb-8 space-y-3">
            {preview.map((card, i) => (
              <div
                key={i}
                onClick={() => toggleDismiss(i)}
                className={`p-4 rounded-xl border cursor-pointer transition-all select-none ${
                  dismissed.has(i)
                    ? 'opacity-30 border-dark-600 bg-dark-800 line-through'
                    : 'border-dark-500 bg-dark-700 hover:border-pink-400/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="mb-1 text-sm text-white font-body">{card.question}</p>
                    <p className="text-xs leading-relaxed text-dark-400 font-body">{card.answer}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border font-body flex-shrink-0 ${DIFF_COLOR[card.difficulty] || 'text-dark-400 border-dark-500'}`}>
                    {card.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mb-4 text-sm text-red-400 font-body">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setStage('idle')}
              className="px-5 py-3 text-sm transition-all border rounded-xl border-dark-500 text-dark-400 font-body hover:border-dark-400"
            >
              ← Start over
            </button>
            <button
              onClick={handleSave}
              disabled={keptCount === 0}
              className="flex-1 py-3 text-sm font-semibold transition-all bg-pink-300 rounded-2xl text-dark-900 font-body hover:bg-pink-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Save {keptCount} cards to deck
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <>
        <Confetti />
        <div className="flex items-center justify-center min-h-screen bg-dark-900">
          <div className="px-6 text-center">
            <div className="mb-4 text-6xl">🎉</div>
            <h2 className="mb-2 text-3xl text-white font-display">Deck created!</h2>
            <p className="mb-1 text-sm text-dark-400 font-body">{keptCount} cards saved successfully.</p>
            <p className="text-xs text-dark-500 font-body">Heading to your dashboard…</p>
          </div>
        </div>
      </>
    )
  }

  // ── Upload screen ────────────────────────────────────────────────────────
  const busy = stage !== 'idle'

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-xl px-6 pb-16 mx-auto pt-28">

        {/* Time-of-day greeting */}
        <p className="mb-1 text-sm text-pink-300/70 font-body">{getGreeting(user?.displayName)}</p>

        <h2 className="mb-2 text-3xl text-white font-display">New deck</h2>
        <p className="mb-10 text-sm text-dark-400 font-body">
          Upload a PDF or paste text and we'll generate smart flashcards automatically.
        </p>

        {/* Deck name */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-body text-dark-400">Deck name</label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="e.g. Organic Chemistry Ch.4"
            className="w-full px-4 py-3 text-sm text-white border bg-dark-700 border-dark-500 rounded-xl font-body placeholder-dark-400 focus:outline-none focus:border-pink-400/50"
          />
        </div>

        {/* Card count slider — unchanged */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-body text-dark-400">Number of flashcards</label>
            <span className="text-lg text-pink-300 font-display">{cardCount}</span>
          </div>
          <input
            type="range" min={2} max={20} step={1}
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full cursor-pointer accent-pink-300"
          />
          <div className="flex justify-between mt-1 text-xs text-dark-500 font-body">
            <span>2 — quick review</span>
            <span>20 — comprehensive</span>
          </div>
        </div>

        {/* Input mode tabs */}
        <div className="flex mb-4 overflow-hidden border rounded-xl border-dark-500">
          <button
            onClick={() => setInputMode('pdf')}
            className={`flex-1 py-2.5 text-sm font-body transition-all ${
              inputMode === 'pdf' ? 'bg-dark-600 text-white' : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
          >
            📄 Upload PDF
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-2.5 text-sm font-body transition-all ${
              inputMode === 'text' ? 'bg-dark-600 text-white' : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
          >
            📋 Paste Text
          </button>
        </div>

        {/* PDF drop zone */}
        {inputMode === 'pdf' && (
          <div
            onClick={() => fileRef.current.click()}
            className="p-10 mb-6 text-center transition-all border-2 border-dashed cursor-pointer border-dark-500 hover:border-pink-400/40 rounded-2xl"
          >
            <input
              type="file" accept=".pdf" ref={fileRef} className="hidden"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file ? (
              <div className="flex flex-col items-center gap-1">
                <p className="font-semibold text-pink-300 break-all font-body">{file.name}</p>
                <p className="text-xs text-dark-400 font-body">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                </p>
              </div>
            ) : (
              <>
                <p className="mb-1 text-dark-400 font-body">Drop your PDF here</p>
                <p className="text-xs text-dark-500 font-body">or click to browse</p>
              </>
            )}
          </div>
        )}

        {/* Paste text area */}
        {inputMode === 'text' && (
          <div className="mb-6">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your notes, textbook content, or any text here…"
              rows={10}
              className="w-full px-4 py-3 text-sm leading-relaxed text-white border resize-none bg-dark-700 border-dark-500 rounded-xl font-body placeholder-dark-400 focus:outline-none focus:border-pink-400/50"
            />
            <p className="mt-1 text-xs text-right text-dark-500 font-body">
              {pastedText.length.toLocaleString()} characters
            </p>
          </div>
        )}

        {/* Progress indicator — sassy messages */}
        {busy && (
          <div className="p-4 mb-6 border rounded-xl bg-dark-700 border-dark-500">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-4 h-4 border-2 border-pink-300 rounded-full border-t-transparent animate-spin" />
              <p className="text-sm text-pink-300 font-body">{sassyMessage}</p>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-400 font-body">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || busy}
          className="w-full py-4 text-base font-semibold transition-all bg-pink-300 rounded-2xl text-dark-900 font-body hover:bg-pink-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Generate {cardCount} flashcards
        </button>
      </main>
    </div>
  )
}