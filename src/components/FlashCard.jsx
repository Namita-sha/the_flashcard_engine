import { useState } from 'react'

export default function FlashCard({ card, onRate, browseMode = false }) {
  const [flipped, setFlipped] = useState(false)

  function handleRate(r) {
    setFlipped(false)
    setTimeout(() => onRate(r), 200)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card */}
      <div
        className="card-flip h-72 cursor-pointer mb-8"
        onClick={() => setFlipped(f => !f)}
      >
        <div className={`card-inner h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="card-front bg-dark-700 border border-dark-500 rounded-2xl flex flex-col items-center justify-center p-8">
            <span className="text-xs text-pink-400 uppercase tracking-widest mb-4 font-body">
              {card.topic} · {card.difficulty}
            </span>
            <p className="font-display text-2xl text-center text-white leading-relaxed">
              {card.question}
            </p>
            <p className="text-dark-400 text-sm mt-6 font-body">Tap to reveal answer</p>
          </div>
          {/* Back */}
          <div className="card-back bg-dark-700 border border-pink-400/30 rounded-2xl flex flex-col items-center justify-center p-8">
            <span className="text-xs text-pink-400 uppercase tracking-widest mb-4 font-body">Answer</span>
            <p className="font-body text-lg text-center text-gray-200 leading-relaxed">
              {card.answer}
            </p>
          </div>
        </div>
      </div>

      {/* After flip: rating buttons (study mode) or next button (browse mode) */}
      {flipped && (
        <div className="animate-fade-up">
          {browseMode ? (
            <div className="flex justify-center">
              <button
                onClick={() => handleRate('good')}
                className="px-10 py-3 rounded-xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 active:scale-95 transition-all"
              >
                Next →
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-dark-400 text-xs font-body mb-3">How well did you recall this?</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleRate('again')}
                  className="flex-1 max-w-[120px] py-3 rounded-xl border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/10 transition-all"
                >
                  Again
                </button>
                <button
                  onClick={() => handleRate('hard')}
                  className="flex-1 max-w-[120px] py-3 rounded-xl border border-orange-500/40 text-orange-400 font-body text-sm hover:bg-orange-500/10 transition-all"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleRate('good')}
                  className="flex-1 max-w-[120px] py-3 rounded-xl border border-blue-400/40 text-blue-400 font-body text-sm hover:bg-blue-400/10 transition-all"
                >
                  Good
                </button>
                <button
                  onClick={() => handleRate('easy')}
                  className="flex-1 max-w-[120px] py-3 rounded-xl border border-pink-400/40 text-pink-400 font-body text-sm hover:bg-pink-400/10 transition-all"
                >
                  Easy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}