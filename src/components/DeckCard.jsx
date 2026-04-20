import { Link } from 'react-router-dom'

export default function DeckCard({ deck }) {
  const mastery = deck.totalCards > 0
    ? Math.round((deck.masteredCards / deck.totalCards) * 100)
    : 0

  return (
    <div className="bg-dark-700 border border-dark-500 rounded-2xl p-6 hover:border-pink-400/40 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg text-white mb-1">{deck.name}</h3>
          <p className="text-dark-400 text-xs font-body">{deck.totalCards} cards</p>
        </div>
        <div className="text-right">
          <p className="text-pink-300 font-display text-2xl">{mastery}%</p>
          <p className="text-dark-400 text-xs font-body">mastered</p>
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
          Review
        </Link>
        <Link
          to={`/progress/${deck.id}`}
          className="flex-1 py-2 text-center rounded-xl border border-dark-500 text-dark-400 text-sm font-body hover:border-dark-400 transition-all"
        >
          Progress
        </Link>
      </div>
    </div>
  )
}