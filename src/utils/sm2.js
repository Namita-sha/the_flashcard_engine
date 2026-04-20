// SM-2 Algorithm
// Rating from UI: 'again'=1, 'hard'=2, 'good'=4, 'easy'=5

export function sm2(card, rating) {
  const q = rating === 'easy' ? 5
          : rating === 'good' ? 4
          : rating === 'hard' ? 2
          : 1  // 'again'

  let { repetitions, easeFactor, interval } = card

  if (q >= 3) {
    if (repetitions === 0)      interval = 1
    else if (repetitions === 1) interval = 6
    else                        interval = Math.round(interval * easeFactor)
    repetitions += 1
  } else {
    repetitions = 0
    interval    = 1
  }

  easeFactor = Math.max(1.3,
    easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  )

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + interval)

  return {
    repetitions,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    interval,
    dueDate: dueDate.toISOString(),
  }
}

export function getCardStatus(card) {
  if (card.repetitions >= 3 && card.easeFactor >= 2.5) return 'mastered'
  if (card.easeFactor < 2.0)                            return 'shaky'
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (new Date(card.dueDate) <= today)                  return 'due'
  return 'upcoming'
}