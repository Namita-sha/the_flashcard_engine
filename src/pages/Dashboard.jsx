import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { getCardStatus } from '../utils/sm2'
import Navbar   from '../components/Navbar'
import DeckCard from '../components/DeckCard'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user }          = useAuth()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    if (!user) return
    loadDecks()
  }, [user])

  async function loadDecks() {
    setLoading(true)
    const q = query(
      collection(db, 'decks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const deckList = await Promise.all(snap.docs.map(async (doc) => {
      const data = doc.data()
      // Load cards to compute stats
      const cardsSnap = await getDocs(collection(db, 'decks', doc.id, 'cards'))
      const cards = cardsSnap.docs.map(c => c.data())
      const statuses = cards.map(getCardStatus)
      return {
        id: doc.id,
        ...data,
        totalCards:   cards.length,
        masteredCards: statuses.filter(s => s === 'mastered').length,
        dueCards:      statuses.filter(s => s === 'due').length,
      }
    }))
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl text-white">Your decks</h2>
            <p className="text-dark-400 font-body text-sm mt-1">
              {decks.length} deck{decks.length !== 1 ? 's' : ''} · {decks.reduce((a, d) => a + d.dueCards, 0)} due today
            </p>
          </div>
          <Link
            to="/upload"
            className="px-5 py-2.5 rounded-xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 active:scale-95 transition-all"
          >
            + New deck
          </Link>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search decks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-sm font-body text-white placeholder-dark-400 focus:outline-none focus:border-pink-400/50 mb-8"
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-2xl text-white mb-2">No decks yet</p>
            <p className="text-dark-400 font-body text-sm mb-6">Upload a PDF to create your first deck</p>
            <Link to="/upload" className="text-pink-300 font-body text-sm hover:underline">
              Upload now →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(deck => <DeckCard key={deck.id} deck={deck} />)}
          </div>
        )}
      </main>
    </div>
  )
}