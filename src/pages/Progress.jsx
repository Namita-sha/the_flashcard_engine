import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { getCardStatus } from '../utils/sm2'
import Navbar from '../components/Navbar'
import ProgressDonut from '../components/ProgressDonut'

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
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { loadData() }, [deckId])

  async function loadData() {
    const [cardsSnap, sessionsSnap] = await Promise.all([
      getDocs(collection(db, 'decks', deckId, 'cards')),
      getDocs(query(collection(db, 'decks', deckId, 'sessions'), orderBy('date', 'desc'))),
    ])
    setCards(cardsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  const statuses   = cards.map(getCardStatus)
  const mastered   = statuses.filter(s => s === 'mastered').length
  const shaky      = statuses.filter(s => s === 'shaky').length
  const due        = statuses.filter(s => s === 'due').length
  const upcoming   = statuses.filter(s => s === 'upcoming').length
  const masteryPct = cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0

  const byTopic = cards.reduce((acc, c) => {
    const t = c.topic || 'General'
    if (!acc[t]) acc[t] = { mastered: 0, total: 0 }
    acc[t].total++
    if (getCardStatus(c) === 'mastered') acc[t].mastered++
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-dark-900">
      <div className="w-8 h-8 border-2 border-pink-300 rounded-full border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-2xl px-6 pb-16 mx-auto pt-28">

        <button
          onClick={() => navigate('/dashboard')}
          className="block mb-6 text-sm transition-colors text-dark-400 font-body hover:text-white"
        >
          ← Dashboard
        </button>

        <h2 className="mb-8 text-3xl text-white font-display">Progress</h2>

        {/* Donut chart — now actually shown */}
        <div className="p-6 mb-8 border bg-dark-700 border-dark-500 rounded-2xl">
          <ProgressDonut
            mastered={mastered}
            shaky={shaky}
            due={due}
            upcoming={upcoming}
          />
        </div>

        {/* Overall mastery bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm font-body">
            <span className="text-dark-400">Overall mastery</span>
            <span className="font-semibold text-pink-300">{masteryPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-dark-600">
            <div
              className="h-2 transition-all duration-700 rounded-full bg-gradient-to-r from-pink-400 to-pink-300"
              style={{ width: `${masteryPct}%` }}
            />
          </div>
        </div>

        {/* Topic breakdown */}
        {Object.keys(byTopic).length > 1 && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg text-white font-display">By topic</h3>
            <div className="space-y-3">
              {Object.entries(byTopic)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([topic, data]) => {
                  const pct = Math.round((data.mastered / data.total) * 100)
                  return (
                    <div key={topic}>
                      <div className="flex justify-between mb-1 text-xs font-body">
                        <span className="capitalize text-dark-300">{topic}</span>
                        <span className="text-dark-400">{data.mastered}/{data.total}</span>
                      </div>
                      <div className="h-1 rounded-full bg-dark-600">
                        <div
                          className="h-1 transition-all rounded-full bg-pink-300/60"
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
          <h3 className="mb-4 text-lg text-white font-display">Session history</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-dark-400 font-body">No study sessions yet. Start reviewing to track your history.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between p-3 border bg-dark-700 border-dark-500 rounded-xl">
                  <div>
                    <p className="text-sm text-white font-body">{formatDate(s.date?.toDate?.())}</p>
                    <p className="text-dark-400 text-xs font-body mt-0.5">
                      {s.cardsReviewed} cards · {formatDuration(s.durationSec)}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-body">
                    {s.ratings?.easy  > 0 && <span className="text-pink-400">{s.ratings.easy} easy</span>}
                    {s.ratings?.good  > 0 && <span className="text-blue-400">{s.ratings.good} good</span>}
                    {s.ratings?.hard  > 0 && <span className="text-orange-400">{s.ratings.hard} hard</span>}
                    {s.ratings?.again > 0 && <span className="text-red-400">{s.ratings.again} again</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/review/${deckId}`)}
            className="flex-1 py-3 text-sm font-semibold transition-all bg-pink-300 rounded-2xl text-dark-900 font-body hover:bg-pink-200"
          >
            Start review session →
          </button>
        </div>
      </main>
    </div>
  )
}