import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { getCardStatus } from '../utils/sm2'
import ProgressDonut from '../components/ProgressDonut'
import Navbar from '../components/Navbar'

export default function Progress() {
  const { deckId } = useParams()
  const navigate   = useNavigate()
  const [deck,    setDeck]    = useState(null)
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [deckId])

  async function loadData() {
    const deckDoc  = await getDoc(doc(db, 'decks', deckId))
    const cardsSnap = await getDocs(collection(db, 'decks', deckId, 'cards'))
    const cards    = cardsSnap.docs.map(d => d.data())
    const statuses = cards.map(getCardStatus)

    setDeck(deckDoc.data())
    setStats({
      total:    cards.length,
      mastered: statuses.filter(s => s === 'mastered').length,
      due:      statuses.filter(s => s === 'due').length,
      shaky:    statuses.filter(s => s === 'shaky').length,
      upcoming: statuses.filter(s => s === 'upcoming').length,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-dark-400 font-body text-sm hover:text-pink-300 transition-colors mb-6 inline-flex items-center gap-1"
        >
          ← Dashboard
        </button>
        <h2 className="font-display text-3xl text-white mb-1">{deck?.name}</h2>
        <p className="text-dark-400 font-body text-sm mb-10">{stats.total} total cards</p>

        <div className="bg-dark-700 border border-dark-500 rounded-2xl p-8 mb-6">
          <h3 className="font-display text-lg text-white mb-6">Your progress</h3>
          <ProgressDonut
            mastered={stats.mastered}
            shaky={stats.shaky}
            due={stats.due}
            upcoming={stats.upcoming}
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Mastered', value: stats.mastered, color: 'text-pink-300' },
            { label: 'Due today', value: stats.due,      color: 'text-yellow-400' },
            { label: 'Shaky',    value: stats.shaky,    color: 'text-red-400' },
            { label: 'Upcoming', value: stats.upcoming, color: 'text-dark-400' },
          ].map(s => (
            <div key={s.label} className="bg-dark-700 border border-dark-500 rounded-xl p-4 text-center">
              <p className={`font-display text-3xl ${s.color}`}>{s.value}</p>
              <p className="text-dark-400 text-xs font-body mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(`/review/${deckId}`)}
          className="w-full py-4 rounded-2xl bg-pink-300 text-dark-900 font-body font-semibold text-base hover:bg-pink-200 active:scale-95 transition-all"
        >
          Start review session →
        </button>
      </main>
    </div>
  )
}