import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function DeckCard({ deck, onUpdate }) {
  const [renaming,  setRenaming]  = useState(false)
  const [newName,   setNewName]   = useState(deck.name)
  const [confirming, setConfirming] = useState(false)
  const [loading,   setLoading]   = useState(false)

  const mastery = deck.totalCards > 0
    ? Math.round((deck.masteredCards / deck.totalCards) * 100)
    : 0

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
    // Delete all cards in subcollection first
    const cardsSnap = await getDocs(collection(db, 'decks', deck.id, 'cards'))
    await Promise.all(cardsSnap.docs.map(d => deleteDoc(d.ref)))
    await deleteDoc(doc(db, 'decks', deck.id))
    onUpdate()
  }

  return (
    <div className="bg-dark-700 border border-dark-500 rounded-2xl p-6 hover:border-pink-400/40 transition-all group relative">

      {/* Delete confirm overlay */}
      {confirming && (
        <div className="absolute inset-0 bg-dark-900/90 rounded-2xl flex flex-col items-center justify-center gap-4 z-10 p-6">
          <p className="text-white font-body text-sm text-center">Delete "{deck.name}"? This can't be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-xl border border-dark-500 text-dark-400 font-body text-sm hover:border-dark-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 mr-2">
          {renaming ? (
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
              onBlur={handleRename}
              className="bg-dark-600 border border-pink-400/50 rounded-lg px-2 py-1 text-white font-body text-base w-full focus:outline-none"
            />
          ) : (
            <h3
              className="font-display text-lg text-white mb-1 cursor-pointer hover:text-pink-300 transition-colors"
              onClick={() => setRenaming(true)}
              title="Click to rename"
            >
              {deck.name}
            </h3>
          )}
          <p className="text-dark-400 text-xs font-body">{deck.totalCards} cards</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-pink-300 font-display text-2xl">{mastery}%</p>
            <p className="text-dark-400 text-xs font-body">mastered</p>
          </div>
          <button
            onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 ml-1 text-dark-500 hover:text-red-400 transition-all text-lg leading-none"
            title="Delete deck"
          >
            ×
          </button>
        </div>
      </div>

      {/* Mastery bar */}
      <div className="h-1 bg-dark-500 rounded-full mb-4">
        <div
          className="h-1 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full transition-all duration-700"
          style={{ width: `${mastery}%` }}
        />
      </div>

      {deck.dueCards > 0 && (
        <p className="text-xs text-yellow-400 font-body mb-4">
          {deck.dueCards} card{deck.dueCards !== 1 ? 's' : ''} due today
        </p>
      )}

      <div className="flex gap-2">
        <Link
          to={`/review/${deck.id}`}
          className="flex-1 py-2 text-center rounded-xl bg-pink-400/10 text-pink-300 text-sm font-body hover:bg-pink-400/20 transition-all"
        >
          {deck.dueCards > 0 ? `Study (${deck.dueCards})` : 'Study'}
        </Link>
        <Link
          to={`/review/${deck.id}?mode=browse`}
          className="flex-1 py-2 text-center rounded-xl border border-dark-500 text-dark-400 text-sm font-body hover:border-dark-400 transition-all"
        >
          Browse
        </Link>
        <Link
          to={`/progress/${deck.id}`}
          className="py-2 px-3 text-center rounded-xl border border-dark-500 text-dark-400 text-sm font-body hover:border-dark-400 transition-all"
        >
          Stats
        </Link>
      </div>
    </div>
  )
}