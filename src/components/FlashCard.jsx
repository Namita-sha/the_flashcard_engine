import { useState } from 'react'

export default function FlashCard({ card, onRate }) {
  const [flipped, setFlipped] = useState(false)
  const [rating,  setRating]  = useState(null)

  function handleRate(r) {
    setRating(r)
    setTimeout(() => {
      setFlipped(false)
      setRating(null)
      onRate(r)
    }, 300)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card */}
      <div
        className="card-flip h-72 cursor-pointer mb-8"
        onClick={() => !flipped && setFlipped(true)}
      >
        <div className={`card-inner h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="card-front bg-dark-700 border border-dark-500 flex flex-col items-center justify-center p-8">
            <span className="text-xs text-pink-400 uppercase tracking-widest mb-4 font-body">
              {card.topic} · {card.difficulty}
            </span>
            <p className="font-display text-2xl text-center text-white leading-relaxed">
              {card.question}
            </p>
            <p className="text-dark-400 text-sm mt-6 font-body">Tap to reveal answer</p>
          </div>
          {/* Back */}
          <div className="card-back bg-dark-700 border border-pink-400/30 flex flex-col items-center justify-center p-8">
            <span className="text-xs text-pink-400 uppercase tracking-widest mb-4 font-body">Answer</span>
            <p className="font-body text-lg text-center text-gray-200 leading-relaxed">
              {card.answer}
            </p>
          </div>
        </div>
      </div>

      {/* Rating buttons — only show after flip */}
      {flipped && (
        <div className="flex gap-3 justify-center animate-fade-up">
          <button
            onClick={() => handleRate('hard')}
            className="flex-1 max-w-[140px] py-3 rounded-xl border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/10 transition-all"
          >
            Hard
          </button>
          <button
            onClick={() => handleRate('medium')}
            className="flex-1 max-w-[140px] py-3 rounded-xl border border-yellow-500/40 text-yellow-400 font-body text-sm hover:bg-yellow-500/10 transition-all"
          >
            Medium
          </button>
          <button
            onClick={() => handleRate('easy')}
            className="flex-1 max-w-[140px] py-3 rounded-xl border border-pink-400/40 text-pink-400 font-body text-sm hover:bg-pink-400/10 transition-all"
          >
            Easy
          </button>
        </div>
      )}
    </div>
  )
}