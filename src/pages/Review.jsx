import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { sm2 } from '../utils/sm2'
import FlashCard from '../components/FlashCard'
import Navbar    from '../components/Navbar'

export default function Review() {
  const { deckId }     = useParams()
  const navigate       = useNavigate()
  const [cards, setCards]   = useState([])
  const [index, setIndex]   = useState(0)
  const [rated, setRated]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDueCards() }, [deckId])

  async function loadDueCards() {
    const snap  = await getDocs(collection(db, 'decks', deckId, 'cards'))
    const today = new Date(); today.setHours(23, 59, 59, 999)
    const due   = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => new Date(c.dueDate) <= today)
    setCards(due)
    setLoading(false)
  }

  async function handleRate(rating) {
    const card    = cards[index]
    const updated = sm2(card, rating)
    // Update Firestore
    await updateDoc(doc(db, 'decks', deckId, 'cards', card.id), updated)
    setRated(r => r + 1)
    setIndex(i => i + 1)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const done = index >= cards.length

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">

        {cards.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-3xl text-white mb-3">All caught up! 🎉</p>
            <p className="text-dark-400 font-body mb-8">No cards due today. Come back tomorrow.</p>
            <button onClick={() => navigate('/dashboard')} className="text-pink-300 font-body hover:underline">
              Back to dashboard
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-20 animate-fade-up">
            <p className="font-display text-4xl text-white mb-3">Session complete!</p>
            <p className="text-dark-400 font-body text-lg mb-2">You reviewed {rated} card{rated !== 1 ? 's' : ''}.</p>
            <p className="text-dark-400 font-body text-sm mb-10">
              Spaced repetition has scheduled your next review based on how you did.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate(`/progress/${deckId}`)}
                className="px-6 py-3 rounded-xl bg-dark-700 border border-dark-500 text-white font-body text-sm hover:border-pink-400/40 transition-all"
              >
                See progress
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 rounded-xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 transition-all"
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
                <span>{cards.length - index - 1} remaining</span>
              </div>
              <div className="h-1 bg-dark-600 rounded-full">
                <div
                  className="h-1 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full transition-all duration-500"
                  style={{ width: `${((index) / cards.length) * 100}%` }}
                />
              </div>
            </div>

            <FlashCard card={cards[index]} onRate={handleRate} />
          </>
        )}
      </main>
    </div>
  )
}