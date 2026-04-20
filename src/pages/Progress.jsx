import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { getCardStatus } from '../utils/sm2'
import Navbar from '../components/Navbar'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatDuration(sec) {
  if (!sec) return '—'
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

export default function Progress() {
  const { deckId } = useParams()
  const navigate   = useNavigate()
  const [cards,    setCards]    = useState([])
  const [sessions, setSessions] = useState([])
  const [deckName, setDeckName] = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { loadData() }, [deckId])

  async function loadData() {
    const [cardsSnap, sessionsSnap] = await Promise.all([
      getDocs(collection(db, 'decks', deckId, 'cards')),
      getDocs(query(collection(db, 'decks', deckId, 'sessions'), orderBy('date', 'desc'))),
    ])
    const cardData = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setCards(cardData)
    setSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  const statuses    = cards.map(getCardStatus)
  const mastered    = statuses.filter(s => s === 'mastered').length
  const shaky       = statuses.filter(s => s === 'shaky').length
  const due         = statuses.filter(s => s === 'due').length
  const upcoming    = statuses.filter(s => s === 'upcoming').length
  const masteryPct  = cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0

  // Group cards by topic
  const byTopic = cards.reduce((acc, c) => {
    const t = c.topic || 'General'
    if (!acc[t]) acc[t] = { mastered: 0, total: 0 }
    acc[t].total++
    if (getCardStatus(c) === 'mastered') acc[t].mastered++
    return acc
  }, {})

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 pt-28 pb-16">

        <button
          onClick={() => navigate('/dashboard')}
          className="text-dark-400 font-body text-sm hover:text-white transition-colors mb-6 block"
        >
          ← Dashboard
        </button>

        <h2 className="font-display text-3xl text-white mb-8">Progress</h2>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Mastered', value: mastered, color: 'text-green-400' },
            { label: 'Due today', value: due,      color: 'text-yellow-400' },
            { label: 'Shaky',    value: shaky,     color: 'text-red-400' },
            { label: 'Upcoming', value: upcoming,  color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-dark-700 border border-dark-500 rounded-xl p-4 text-center">
              <p className={`font-display text-3xl ${color}`}>{value}</p>
              <p className="text-dark-400 text-xs font-body mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Overall mastery bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-body mb-2">
            <span className="text-dark-400">Overall mastery</span>
            <span className="text-pink-300 font-semibold">{masteryPct}%</span>
          </div>
          <div className="h-2 bg-dark-600 rounded-full">
            <div
              className="h-2 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full transition-all duration-700"
              style={{ width: `${masteryPct}%` }}
            />
          </div>
        </div>

        {/* Topic breakdown */}
        {Object.keys(byTopic).length > 1 && (
          <div className="mb-8">
            <h3 className="font-display text-lg text-white mb-4">By topic</h3>
            <div className="space-y-3">
              {Object.entries(byTopic)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([topic, data]) => {
                  const pct = Math.round((data.mastered / data.total) * 100)
                  return (
                    <div key={topic}>
                      <div className="flex justify-between text-xs font-body mb-1">
                        <span className="text-dark-300 capitalize">{topic}</span>
                        <span className="text-dark-400">{data.mastered}/{data.total}</span>
                      </div>
                      <div className="h-1 bg-dark-600 rounded-full">
                        <div
                          className="h-1 bg-pink-300/60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Session history */}
        <div className="mb-8">
          <h3 className="font-display text-lg text-white mb-4">Session history</h3>
          {sessions.length === 0 ? (
            <p className="text-dark-400 font-body text-sm">No study sessions yet. Start reviewing to track your history.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between p-3 bg-dark-700 border border-dark-500 rounded-xl">
                  <div>
                    <p className="text-white font-body text-sm">{formatDate(s.date?.toDate?.())}</p>
                    <p className="text-dark-400 text-xs font-body mt-0.5">
                      {s.cardsReviewed} cards · {formatDuration(s.durationSec)}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-body">
                    {s.ratings?.easy > 0   && <span className="text-pink-400">{s.ratings.easy} easy</span>}
                    {s.ratings?.good > 0   && <span className="text-blue-400">{s.ratings.good} good</span>}
                    {s.ratings?.hard > 0   && <span className="text-orange-400">{s.ratings.hard} hard</span>}
                    {s.ratings?.again > 0  && <span className="text-red-400">{s.ratings.again} again</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/review/${deckId}`)}
            className="flex-1 py-3 rounded-2xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 transition-all"
          >
            Start review session →
          </button>
        </div>
      </main>
    </div>
  )
}