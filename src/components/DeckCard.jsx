import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

function timeAgo(date) {
  if (!date) return null
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

// ── Estimated days to mastery ─────────────────────────────────────────────────
// Logic: figure out avg session frequency → estimate how many more sessions
// are needed to master remaining cards → multiply out
function getMasteryETA(deck) {
  const { totalCards, masteredCards, sessions } = deck
  const remaining = totalCards - masteredCards
  if (!remaining || remaining === 0) return null           // already mastered
  if (!sessions || sessions.length === 0) return null      // no sessions yet

  // Average days between sessions (need ≥2 sessions for a meaningful avg)
  let avgDaysBetween = 1  // default: assume daily
  if (sessions.length >= 2) {
    const sorted = [...sessions]
      .map(d => (d instanceof Date ? d : new Date(d)))
      .sort((a, b) => a - b)
    const spans = []
    for (let i = 1; i < sorted.length; i++) {
      spans.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24))
    }
    avgDaysBetween = spans.reduce((a, b) => a + b, 0) / spans.length
    avgDaysBetween = Math.max(1, Math.min(avgDaysBetween, 14)) // clamp 1–14 days
  }

  // Cards mastered per session (from history)
  const masteredPerSession = sessions.length > 0
    ? masteredCards / sessions.length
    : 1
  const safePerSession = Math.max(masteredPerSession, 0.5)

  const sessionsNeeded = Math.ceil(remaining / safePerSession)
  const daysNeeded     = Math.round(sessionsNeeded * avgDaysBetween)

  if (daysNeeded <= 0) return null
  if (daysNeeded === 1) return '~1 day to master'
  if (daysNeeded > 365) return null  // unreasonably far, skip
  return `~${daysNeeded} days to master`
}

export default function DeckCard({ deck, onUpdate }) {
  const [renaming,   setRenaming]   = useState(false)
  const [newName,    setNewName]    = useState(deck.name)
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)

  const mastery = deck.totalCards > 0
    ? Math.round((deck.masteredCards / deck.totalCards) * 100)
    : 0

  const lastStudied = deck.sessions?.length > 0
    ? new Date(Math.max(...deck.sessions.map(d => d instanceof Date ? d : new Date(d))))
    : null

  const masteryETA = getMasteryETA(deck)

  async function handleRename() {
    if (!newName.trim() || newName.trim() === deck.name) { setRenaming(false); return }
    setLoading(true)
    await updateDoc(doc(db, 'decks', deck.id), { name: newName.trim() })
    setLoading(false)
    setRenaming(false)
    onUpdate()
  }

  async function handleDelete() {
    setLoading(true)
    const cardsSnap = await getDocs(collection(db, 'decks', deck.id, 'cards'))
    await Promise.all(cardsSnap.docs.map(d => deleteDoc(d.ref)))
    await deleteDoc(doc(db, 'decks', deck.id))
    onUpdate()
  }

  return (
    <div className="relative flex flex-col p-6 transition-all border bg-dark-700 border-dark-500 rounded-2xl hover:border-pink-400/40 group">

      {/* Delete confirm overlay */}
      {confirming && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 bg-dark-900/90 rounded-2xl">
          <p className="text-sm text-center text-white font-body">Delete "{deck.name}"? This can't be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 text-sm transition-all border rounded-xl border-dark-500 text-dark-400 font-body hover:border-dark-400"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-sm text-red-400 transition-all border rounded-xl bg-red-500/20 border-red-500/40 font-body hover:bg-red-500/30 disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 mr-2">
          {renaming ? (
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
              onBlur={handleRename}
              className="w-full px-2 py-1 text-base text-white border rounded-lg bg-dark-600 border-pink-400/50 font-body focus:outline-none"
            />
          ) : (
            <h3
              className="font-display text-lg text-white mb-0.5 cursor-pointer hover:text-pink-300 transition-colors"
              onClick={() => setRenaming(true)}
              title="Click to rename"
            >
              {deck.name}
            </h3>
          )}
          <p className="text-xs text-dark-400 font-body">{deck.totalCards} cards</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-2xl text-pink-300 font-display">{mastery}%</p>
            <p className="text-xs text-dark-400 font-body">mastered</p>
          </div>
          <button
            onClick={() => setConfirming(true)}
            className="ml-1 text-lg leading-none transition-all opacity-0 group-hover:opacity-100 text-dark-500 hover:text-red-400"
            title="Delete deck"
          >
            ×
          </button>
        </div>
      </div>

      {/* Last studied */}
      {lastStudied ? (
        <p className="mb-1 text-xs text-dark-400 font-body">
          Last studied <span className="text-dark-300">{timeAgo(lastStudied)}</span>
        </p>
      ) : (
        <p className="mb-1 text-xs text-pink-400/60 font-body">Not studied yet</p>
      )}

      {/* Mastery ETA */}
      {masteryETA && (
        <p className="mb-3 text-xs text-dark-500 font-body">{masteryETA} at current pace</p>
      )}
      {!masteryETA && mastery === 100 && (
        <p className="mb-3 text-xs text-green-400/70 font-body">Deck fully mastered 🎉</p>
      )}
      {!masteryETA && mastery < 100 && lastStudied && (
        <div className="mb-3" /> /* spacer when no ETA yet */
      )}

      {/* Mastery bar */}
      <div className="h-1 mb-4 rounded-full bg-dark-500">
        <div
          className="h-1 transition-all duration-700 rounded-full bg-gradient-to-r from-pink-400 to-pink-300"
          style={{ width: `${mastery}%` }}
        />
      </div>

      {deck.dueCards > 0 && (
        <p className="mb-4 text-xs text-yellow-400 font-body">
          {deck.dueCards} card{deck.dueCards !== 1 ? 's' : ''} due today
        </p>
      )}

      {/* Continue button */}
      {lastStudied && (
        <Link
          to={`/review/${deck.id}`}
          className="w-full py-2.5 text-center rounded-xl bg-pink-300 text-dark-900 text-sm font-body font-semibold hover:bg-pink-200 active:scale-95 transition-all mb-2"
        >
          {deck.dueCards > 0 ? `▶ Continue (${deck.dueCards} due)` : '▶ Continue'}
        </Link>
      )}

      {/* Action row */}
      <div className="flex gap-2 mt-auto">
        {!lastStudied && (
          <Link
            to={`/review/${deck.id}`}
            className="flex-1 py-2 text-sm text-center text-pink-300 transition-all rounded-xl bg-pink-400/10 font-body hover:bg-pink-400/20"
          >
            Start studying
          </Link>
        )}
        <Link
          to={`/review/${deck.id}?mode=browse`}
          className="flex-1 py-2 text-sm text-center transition-all border rounded-xl border-dark-500 text-dark-400 font-body hover:border-dark-400"
        >
          Browse
        </Link>
        <Link
          to={`/progress/${deck.id}`}
          className="px-3 py-2 text-sm text-center transition-all border rounded-xl border-dark-500 text-dark-400 font-body hover:border-dark-400"
        >
          Stats
        </Link>
      </div>
    </div>
  )
}