import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { sm2 } from '../utils/sm2'
import FlashCard from '../components/FlashCard'
import Navbar    from '../components/Navbar'

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
      // Browse: all cards sorted by topic
      all.sort((a, b) => (a.topic || '').localeCompare(b.topic || ''))
      setCards(all)
    } else {
      // Study: only due cards, sorted by dueDate ascending
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
        date:        serverTimestamp(),
        cardsReviewed: total,
        durationSec: Math.round((Date.now() - sessionStart) / 1000),
        ratings,
      })
    } catch (e) {
      console.warn('Session save failed', e)
    }
  }

  const done = index >= cards.length && cards.length > 0

  // Save session when study mode completes
  useEffect(() => {
    if (done && !browseMode) {
      saveSession(cards.length)
    }
  }, [done])

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">

        {/* Mode toggle */}
        <div className="flex gap-2 mb-8 bg-dark-700 p-1 rounded-xl w-fit">
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
          <div className="text-center py-20">
            {browseMode ? (
              <>
                <p className="font-display text-3xl text-white mb-3">No cards yet</p>
                <p className="text-dark-400 font-body mb-8">This deck has no cards.</p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl text-white mb-3">All caught up!</p>
                <p className="text-dark-400 font-body mb-2">No cards due today.</p>
                <p className="text-dark-400 font-body text-sm mb-8">
                  Spaced repetition is working — your next cards are scheduled for future sessions.
                </p>
                <button
                  onClick={() => navigate(`/review/${deckId}?mode=browse`)}
                  className="text-pink-300 font-body hover:underline mr-6"
                >
                  Browse all cards →
                </button>
              </>
            )}
            <button onClick={() => navigate('/dashboard')} className="text-dark-400 font-body hover:underline text-sm">
              Back to dashboard
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-20 animate-fade-up">
            {/* Celebration */}
            <div className="text-5xl mb-4">🎉</div>
            <p className="font-display text-4xl text-white mb-3">Session complete!</p>
            <p className="text-dark-400 font-body text-lg mb-6">
              You reviewed {cards.length} card{cards.length !== 1 ? 's' : ''}.
            </p>

            {/* Rating breakdown */}
            {!browseMode && (
              <div className="flex gap-3 justify-center mb-10">
                {ratings.again > 0 && (
                  <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 font-display text-xl">{ratings.again}</p>
                    <p className="text-red-400/70 text-xs font-body">again</p>
                  </div>
                )}
                {ratings.hard > 0 && (
                  <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <p className="text-orange-400 font-display text-xl">{ratings.hard}</p>
                    <p className="text-orange-400/70 text-xs font-body">hard</p>
                  </div>
                )}
                {ratings.good > 0 && (
                  <div className="px-4 py-2 rounded-xl bg-blue-400/10 border border-blue-400/20">
                    <p className="text-blue-400 font-display text-xl">{ratings.good}</p>
                    <p className="text-blue-400/70 text-xs font-body">good</p>
                  </div>
                )}
                {ratings.easy > 0 && (
                  <div className="px-4 py-2 rounded-xl bg-pink-400/10 border border-pink-400/20">
                    <p className="text-pink-400 font-display text-xl">{ratings.easy}</p>
                    <p className="text-pink-400/70 text-xs font-body">easy</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setIndex(0); loadCards() }}
                className="px-5 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white font-body text-sm hover:border-pink-400/40 transition-all"
              >
                Review again
              </button>
              <button
                onClick={() => navigate(`/progress/${deckId}`)}
                className="px-5 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white font-body text-sm hover:border-pink-400/40 transition-all"
              >
                See progress
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-3 rounded-xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 transition-all"
              >
                Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-xs font-body text-dark-400 mb-2">
                <span>{index + 1} of {cards.length}</span>
                <span>{browseMode ? 'browsing all cards' : 'spaced repetition session'}</span>
              </div>
              <div className="h-1 bg-dark-600 rounded-full">
                <div
                  className="h-1 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full transition-all duration-500"
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