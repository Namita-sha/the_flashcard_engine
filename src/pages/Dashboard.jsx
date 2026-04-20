import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { getCardStatus } from '../utils/sm2'
import Navbar   from '../components/Navbar'
import DeckCard from '../components/DeckCard'
import { Link } from 'react-router-dom'

function getStreak(sessions) {
  // sessions: array of Date objects (one per study day)
  if (!sessions.length) return 0
  const days = [...new Set(sessions.map(d => d.toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b - a)

  const today     = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)

  // streak must include today or yesterday to be active
  if (days[0].toDateString() !== today.toDateString() &&
      days[0].toDateString() !== yesterday.toDateString()) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i - 1] - days[i]) / (1000 * 60 * 60 * 24)
    if (Math.round(diff) === 1) streak++
    else break
  }
  return streak
}

export default function Dashboard() {
  const { user }          = useAuth()
  const [decks,    setDecks]   = useState([])
  const [streak,   setStreak]  = useState(0)
  const [totalDue, setTotalDue] = useState(0)
  const [loading,  setLoading] = useState(true)
  const [search,   setSearch]  = useState('')

  useEffect(() => { if (user) loadDecks() }, [user])

  async function loadDecks() {
    setLoading(true)
    const q = query(
      collection(db, 'decks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)

    // Load cards + sessions for each deck in parallel
    const deckList = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data()
      const [cardsSnap, sessionsSnap] = await Promise.all([
        getDocs(collection(db, 'decks', d.id, 'cards')),
        getDocs(collection(db, 'decks', d.id, 'sessions')),
      ])
      const cards    = cardsSnap.docs.map(c => c.data())
      const statuses = cards.map(getCardStatus)
      return {
        id: d.id,
        ...data,
        totalCards:    cards.length,
        masteredCards: statuses.filter(s => s === 'mastered').length,
        dueCards:      statuses.filter(s => s === 'due').length,
        sessions:      sessionsSnap.docs.map(s => s.data().date?.toDate?.() || new Date()),
      }
    }))

    // Compute global streak across all decks
    const allSessionDates = deckList.flatMap(d => d.sessions)
    setStreak(getStreak(allSessionDates))
    setTotalDue(deckList.reduce((a, d) => a + d.dueCards, 0))
    setDecks(deckList)
    setLoading(false)
  }

  const filtered = decks.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 pt-28 pb-16">

        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl text-white">Your decks</h2>
            <p className="text-dark-400 font-body text-sm mt-1">
              {decks.length} deck{decks.length !== 1 ? 's' : ''}
              {totalDue > 0 && <span className="text-yellow-400 ml-2">· {totalDue} due today</span>}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak badge */}
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl">
                <span className="text-orange-400 text-base">🔥</span>
                <div>
                  <p className="text-white font-display text-lg leading-none">{streak}</p>
                  <p className="text-dark-400 text-xs font-body">day streak</p>
                </div>
              </div>
            )}
            <Link
              to="/upload"
              className="px-5 py-2.5 rounded-xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 active:scale-95 transition-all"
            >
              + New deck
            </Link>
          </div>
        </div>

        {/* Search */}
        {decks.length > 0 && (
          <input
            type="text"
            placeholder="Search decks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-sm font-body text-white placeholder-dark-400 focus:outline-none focus:border-pink-400/50 mb-8"
          />
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 && decks.length === 0 ? (
          // Empty state — first-time user
          <div className="text-center py-20 max-w-sm mx-auto">
            <div className="text-5xl mb-6">📚</div>
            <p className="font-display text-2xl text-white mb-3">No decks yet</p>
            <p className="text-dark-400 font-body text-sm mb-2">
              Drop in any PDF — a textbook chapter, lecture notes, a research paper —
              and Recallify turns it into a smart flashcard deck in seconds.
            </p>
            <p className="text-dark-400 font-body text-sm mb-8">
              The SM-2 spaced repetition algorithm then makes sure you review cards
              at exactly the right moment to lock them into long-term memory.
            </p>
            <Link
              to="/upload"
              className="inline-block px-8 py-3 rounded-2xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 active:scale-95 transition-all"
            >
              Upload your first PDF →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-dark-400 font-body text-sm">No decks match "{search}".</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(deck => (
              <DeckCard key={deck.id} deck={deck} onUpdate={loadDecks} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}