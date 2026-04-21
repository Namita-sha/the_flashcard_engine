import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { sm2 } from '../utils/sm2'
import FlashCard from '../components/FlashCard'
import Navbar    from '../components/Navbar'

// ── Session roast ─────────────────────────────────────────────────────────────
function getRoast(ratings) {
  const total = ratings.again + ratings.hard + ratings.good + ratings.easy
  if (total === 0) return null
  const easyPct  = (ratings.easy  / total) * 100
  const againPct = (ratings.again / total) * 100

  if (easyPct >= 70)   return { msg: "Okay genius, maybe try a harder deck 😏",        color: "text-pink-300" }
  if (againPct >= 60)  return { msg: "Rough session. The algorithm noticed. 👀",        color: "text-red-400"  }
  return               { msg: "Solid session. Consistency beats intensity. 💪",          color: "text-blue-400" }
}

// ── "What you learned today" — unique topics from reviewed cards ──────────────
function getLearnedTopics(cards) {
  const topics = [...new Set(cards.map(c => c.topic).filter(Boolean))]
  return topics.slice(0, 3)
}

export default function Review() {
  const { deckId }         = useParams()
  const navigate           = useNavigate()
  const [searchParams]     = useSearchParams()
  const browseMode         = searchParams.get('mode') === 'browse'

  const [cards,    setCards]    = useState([])
  const [index,    setIndex]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [sessionStart] = useState(Date.now())
  const [ratings,  setRatings]  = useState({ again: 0, hard: 0, good: 0, easy: 0 })

  useEffect(() => { loadCards() }, [deckId, browseMode])

  async function loadCards() {
    setLoading(true)
    const snap = await getDocs(collection(db, 'decks', deckId, 'cards'))
    const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    if (browseMode) {
      all.sort((a, b) => (a.topic || '').localeCompare(b.topic || ''))
      setCards(all)
    } else {
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const due = all
        .filter(c => new Date(c.dueDate) <= today)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      setCards(due)
    }
    setLoading(false)
  }

  async function handleRate(rating) {
    const card = cards[index]

    if (!browseMode) {
      const updated = sm2(card, rating)
      await updateDoc(doc(db, 'decks', deckId, 'cards', card.id), updated)
      setRatings(r => ({ ...r, [rating]: r[rating] + 1 }))
    }

    setIndex(i => i + 1)
  }

  async function saveSession(total) {
    try {
      await addDoc(collection(db, 'decks', deckId, 'sessions'), {
        date:          serverTimestamp(),
        cardsReviewed: total,
        durationSec:   Math.round((Date.now() - sessionStart) / 1000),
        ratings,
      })
    } catch (e) {
      console.warn('Session save failed', e)
    }
  }

  const done = index >= cards.length && cards.length > 0

  useEffect(() => {
    if (done && !browseMode) {
      saveSession(cards.length)
    }
  }, [done])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-dark-900">
      <div className="w-8 h-8 border-2 border-pink-300 rounded-full border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-3xl px-6 pb-16 mx-auto pt-28">

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 mb-8 bg-dark-700 rounded-xl w-fit">
          <button
            onClick={() => navigate(`/review/${deckId}`)}
            className={`px-4 py-2 rounded-lg text-sm font-body transition-all ${!browseMode ? 'bg-pink-300 text-dark-900 font-semibold' : 'text-dark-400 hover:text-white'}`}
          >
            Study
          </button>
          <button
            onClick={() => navigate(`/review/${deckId}?mode=browse`)}
            className={`px-4 py-2 rounded-lg text-sm font-body transition-all ${browseMode ? 'bg-pink-300 text-dark-900 font-semibold' : 'text-dark-400 hover:text-white'}`}
          >
            Browse all
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="py-20 text-center">
            {browseMode ? (
              <>
                <p className="mb-3 text-3xl text-white font-display">No cards yet</p>
                <p className="mb-8 text-dark-400 font-body">This deck has no cards.</p>
              </>
            ) : (
              <>
                <p className="mb-3 text-3xl text-white font-display">All caught up!</p>
                <p className="mb-2 text-dark-400 font-body">No cards due today.</p>
                <p className="mb-8 text-sm text-dark-400 font-body">
                  Spaced repetition is working — your next cards are scheduled for future sessions.
                </p>
                <button
                  onClick={() => navigate(`/review/${deckId}?mode=browse`)}
                  className="mr-6 text-pink-300 font-body hover:underline"
                >
                  Browse all cards →
                </button>
              </>
            )}
            <button onClick={() => navigate('/dashboard')} className="text-sm text-dark-400 font-body hover:underline">
              Back to dashboard
            </button>
          </div>
        ) : done ? (
          // ── End screen ───────────────────────────────────────────────────
          <div className="py-20 text-center animate-fade-up">
            <div className="mb-4 text-5xl">🎉</div>
            <p className="mb-3 text-4xl text-white font-display">Session complete!</p>
            <p className="mb-6 text-lg text-dark-400 font-body">
              You reviewed {cards.length} card{cards.length !== 1 ? 's' : ''}.
            </p>

            {/* Session roast */}
            {!browseMode && (() => {
              const roast = getRoast(ratings)
              return roast ? (
                <p className={`mb-6 text-base font-body italic ${roast.color}`}>{roast.msg}</p>
              ) : null
            })()}

            {/* What you learned today */}
            {!browseMode && (() => {
              const topics = getLearnedTopics(cards)
              return topics.length > 0 ? (
                <div className="inline-block px-6 py-4 mb-8 text-left border border-dark-500 bg-dark-700 rounded-2xl">
                  <p className="mb-3 text-xs tracking-widest uppercase text-dark-400 font-body">Today you studied</p>
                  <ul className="space-y-1">
                    {topics.map(t => (
                      <li key={t} className="flex items-center gap-2 text-sm text-white font-body">
                        <span className="text-pink-300">✦</span>
                        <span className="capitalize">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            })()}

            {/* Rating breakdown */}
            {!browseMode && (
              <div className="flex justify-center gap-3 mb-10">
                {ratings.again > 0 && (
                  <div className="px-4 py-2 border rounded-xl bg-red-500/10 border-red-500/20">
                    <p className="text-xl text-red-400 font-display">{ratings.again}</p>
                    <p className="text-xs text-red-400/70 font-body">again</p>
                  </div>
                )}
                {ratings.hard > 0 && (
                  <div className="px-4 py-2 border rounded-xl bg-orange-500/10 border-orange-500/20">
                    <p className="text-xl text-orange-400 font-display">{ratings.hard}</p>
                    <p className="text-xs text-orange-400/70 font-body">hard</p>
                  </div>
                )}
                {ratings.good > 0 && (
                  <div className="px-4 py-2 border rounded-xl bg-blue-400/10 border-blue-400/20">
                    <p className="text-xl text-blue-400 font-display">{ratings.good}</p>
                    <p className="text-xs text-blue-400/70 font-body">good</p>
                  </div>
                )}
                {ratings.easy > 0 && (
                  <div className="px-4 py-2 border rounded-xl bg-pink-400/10 border-pink-400/20">
                    <p className="text-xl text-pink-400 font-display">{ratings.easy}</p>
                    <p className="text-xs text-pink-400/70 font-body">easy</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setIndex(0); loadCards() }}
                className="px-5 py-3 text-sm text-white transition-all border rounded-xl bg-dark-700 border-dark-500 font-body hover:border-pink-400/40"
              >
                Review again
              </button>
              <button
                onClick={() => navigate(`/progress/${deckId}`)}
                className="px-5 py-3 text-sm text-white transition-all border rounded-xl bg-dark-700 border-dark-500 font-body hover:border-pink-400/40"
              >
                See progress
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-3 text-sm font-semibold transition-all bg-pink-300 rounded-xl text-dark-900 font-body hover:bg-pink-200"
              >
                Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2 text-xs font-body text-dark-400">
                <span>{index + 1} of {cards.length}</span>
                <span>{browseMode ? 'browsing all cards' : 'spaced repetition session'}</span>
              </div>
              <div className="h-1 rounded-full bg-dark-600">
                <div
                  className="h-1 transition-all duration-500 rounded-full bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{ width: `${(index / cards.length) * 100}%` }}
                />
              </div>
            </div>

            <FlashCard
              card={cards[index]}
              onRate={handleRate}
              browseMode={browseMode}
            />
          </>
        )}
      </main>
    </div>
  )
}