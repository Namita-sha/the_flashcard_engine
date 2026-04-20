// SM-2 Algorithm
// q = quality of response: 0=blackout, 1=wrong, 2=wrong but familiar, 
//     3=correct with difficulty, 4=correct, 5=perfect
// Returns updated card fields

export function sm2(card, rating) {
  // rating from UI: 'hard'=1, 'medium'=3, 'easy'=5
  const q = rating === 'easy' ? 5 : rating === 'medium' ? 3 : 1

  let { repetitions, easeFactor, interval } = card

  if (q >= 3) {
    // Correct response
    if (repetitions === 0)      interval = 1
    else if (repetitions === 1) interval = 6
    else                        interval = Math.round(interval * easeFactor)

    repetitions += 1
  } else {
    // Incorrect — reset
    repetitions = 0
    interval    = 1
  }

  // Update ease factor (min 1.3)
  easeFactor = Math.max(1.3,
    easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  )

  // Calculate next due date
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
  today.setHours(0, 0, 0, 0)
  if (new Date(card.dueDate) <= today)                  return 'due'
  return 'upcoming'
}
