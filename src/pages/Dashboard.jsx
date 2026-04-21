import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { getCardStatus } from '../utils/sm2'
import Navbar   from '../components/Navbar'
import DeckCard from '../components/DeckCard'
import { Link } from 'react-router-dom'

// ── Demo deck — shown to every brand-new user automatically ──────────────────
const DEMO_DECK_NAME = '✨ How Memory Works (Demo)'

const DEMO_CARDS = [
  {
    question: 'What is spaced repetition?',
    answer:   'A study technique that schedules reviews at increasing intervals. You see hard cards more often and easy cards less — optimising long-term retention.',
    topic:    'Memory Science',
    difficulty: 'easy',
  },
  {
    question: 'What is the "forgetting curve"?',
    answer:   'Ebbinghaus\'s discovery that memory decays exponentially after learning. Without review, ~50% is forgotten within an hour and ~70% within a day.',
    topic:    'Memory Science',
    difficulty: 'medium',
  },
  {
    question: 'What does "active recall" mean and why does it work?',
    answer:   'Actively retrieving information from memory (rather than re-reading). Each retrieval attempt strengthens the neural pathway, making future recall easier.',
    topic:    'Study Techniques',
    difficulty: 'medium',
  },
  {
    question: 'What is the SM-2 algorithm?',
    answer:   'A spaced repetition algorithm that adjusts review intervals based on how hard you found each card. Rating "Easy" pushes the card further into the future; "Again" resets it.',
    topic:    'Algorithms',
    difficulty: 'hard',
  },
  {
    question: 'What is the "testing effect"?',
    answer:   'The research finding that testing yourself on material produces significantly better long-term retention than re-reading or re-watching the same material.',
    topic:    'Study Techniques',
    difficulty: 'easy',
  },
  {
    question: 'How does sleep affect memory consolidation?',
    answer:   'During sleep — especially deep sleep and REM — the brain replays and consolidates memories from the day, transferring them from short-term to long-term storage.',
    topic:    'Memory Science',
    difficulty: 'medium',
  },
  {
    question: 'What is "interleaving" in learning?',
    answer:   'Mixing different topics or problem types within a study session instead of blocking one topic at a time. Interleaving feels harder but improves long-term retention and transfer.',
    topic:    'Study Techniques',
    difficulty: 'hard',
  },
  {
    question: 'What is the difference between recognition and recall?',
    answer:   'Recognition is identifying a correct answer when shown it (e.g. multiple choice). Recall is retrieving the answer from memory with no prompts. Recall is far more demanding and effective for learning.',
    topic:    'Memory Science',
    difficulty: 'medium',
  },
]

async function seedDemoDecks(userId) {
  const now = new Date().toISOString()
  const deckRef = await addDoc(collection(db, 'decks'), {
    name:      DEMO_DECK_NAME,
    userId,
    createdAt: serverTimestamp(),
    fileName:  'demo',
    isDemo:    true,
  })
  await Promise.all(
    DEMO_CARDS.map((card) => {
      const cardRef = doc(collection(db, 'decks', deckRef.id, 'cards'))
      return setDoc(cardRef, {
        ...card,
        repetitions: 0,
        easeFactor:  2.5,
        interval:    1,
        dueDate:     now,
      })
    })
  )
}

// ── Streak helpers ────────────────────────────────────────────────────────────
function getStreak(sessions) {
  if (!sessions.length) return 0
  const days = [...new Set(sessions.map(d => d.toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b - a)

  const today     = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)

  if (days[0].toDateString() !== today.toDateString() &&
      days[0].toDateString() !== yesterday.toDateString()) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i - 1] - days[i]) / (1000 * 60 * 60 * 24)
    if (Math.round(diff) === 1) streak++
    else break
  }
  return streak
}

const STREAK_MESSAGES = [
  { min: 1,  msg: 'Good start! Keep it up.' },
  { min: 3,  msg: 'You\'re building a habit! 🔥' },
  { min: 7,  msg: 'One week strong! You\'re unstoppable.' },
  { min: 14, msg: 'Two weeks! Your memory is thanking you.' },
  { min: 30, msg: 'A whole month! You\'re a legend. 🏆' },
]

function getStreakMessage(streak) {
  if (streak === 0) return null
  const match = [...STREAK_MESSAGES].reverse().find(s => streak >= s.min)
  return match?.msg || null
}

// ── Time-of-day empty state ───────────────────────────────────────────────────
function getTimeOfDayMessage() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { emoji: '🧠', heading: 'Good morning!',          body: 'Your brain retains 40% more before noon. Best time to start a deck.' }
  }
  if (hour >= 12 && hour < 17) {
    return { emoji: '☀️', heading: 'Afternoon focus mode.',  body: 'Midday review locks in morning learning. Even one deck counts.' }
  }
  if (hour >= 17 && hour < 21) {
    return { emoji: '🌙', heading: 'Perfect time to review.', body: 'Sleep locks in memory. Study now and wake up knowing more.' }
  }
  return   { emoji: '🌌', heading: 'Late night learner.',    body: 'Sleep consolidates everything you review tonight. Make it count.' }
}

// ── Motivational quotes ───────────────────────────────────────────────────────
// Picked ONCE when the module loads (i.e. once per login/refresh session).
// The banner stays on screen the whole time — it never disappears.
const QUOTES = [
  { text: 'An investment in knowledge pays the best interest.',                              author: 'Benjamin Franklin' },
  { text: 'The more that you read, the more things you will know.',                         author: 'Dr. Seuss' },
  { text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',     author: 'Mahatma Gandhi' },
  { text: 'The beautiful thing about learning is that no one can take it away from you.',   author: 'B.B. King' },
  { text: 'Spaced repetition is the closest thing to a cheat code for your memory.',        author: '' },
  { text: 'It does not matter how slowly you go as long as you do not stop.',               author: 'Confucius' },
  { text: 'The expert in anything was once a beginner.',                                    author: 'Helen Hayes' },
  { text: 'Every master was once a disaster.',                                              author: '' },
  { text: 'Small daily improvements are the key to staggering long-term results.',          author: '' },
  { text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.',       author: 'Goethe' },
  { text: 'Review once, remember twice. Review daily, remember forever.',                   author: '' },
  { text: 'Your future self is watching you right now through your memories.',              author: '' },
  { text: 'The secret of getting ahead is getting started.',                                author: 'Mark Twain' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.',      author: 'Zig Ziglar' },
  { text: 'One card a day keeps the forgetting curve away.',                                author: '' },
  { text: 'Learning never exhausts the mind.',                                              author: 'Leonardo da Vinci' },
  { text: 'Genius is 1% inspiration and 99% perspiration.',                                 author: 'Thomas Edison' },
  { text: 'What you learn today, you own forever.',                                         author: '' },
  { text: 'Push yourself, because no one else is going to do it for you.',                  author: '' },
  { text: 'Education is the passport to the future.',                                       author: 'Malcolm X' },
]

// Banner colour variants — one is chosen alongside the quote
const QUOTE_PALETTES = [
  { banner: 'bg-pink-500/10 border-pink-500/20',   text: 'text-pink-200',   dot: 'text-pink-400'   },
  { banner: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-200', dot: 'text-purple-400' },
  { banner: 'bg-sky-500/10 border-sky-500/20',     text: 'text-sky-200',    dot: 'text-sky-400'    },
  { banner: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-200',  dot: 'text-amber-400'  },
  { banner: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-200', dot: 'text-emerald-400' },
]

const _qi             = Math.floor(Math.random() * QUOTES.length)
const SESSION_QUOTE   = QUOTES[_qi]
const SESSION_PALETTE = QUOTE_PALETTES[_qi % QUOTE_PALETTES.length]

export default function Dashboard() {
  const { user }           = useAuth()
  const [decks,    setDecks]    = useState([])
  const [streak,   setStreak]   = useState(0)
  const [totalDue, setTotalDue] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => { if (user) loadDecks() }, [user])

  async function loadDecks() {
    setLoading(true)
    const q = query(
      collection(db, 'decks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)

    if (snap.empty) {
      await seedDemoDecks(user.uid)
      loadDecks()
      return
    }

    const deckList = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data()
      const [cardsSnap, sessionsSnap] = await Promise.all([
        getDocs(collection(db, 'decks', d.id, 'cards')),
        getDocs(collection(db, 'decks', d.id, 'sessions')),
      ])
      const cards    = cardsSnap.docs.map(c => c.data())
      const statuses = cards.map(getCardStatus)
      return {
        id: d.id,
        ...data,
        totalCards:    cards.length,
        masteredCards: statuses.filter(s => s === 'mastered').length,
        dueCards:      statuses.filter(s => s === 'due').length,
        sessions:      sessionsSnap.docs.map(s => s.data().date?.toDate?.() || new Date()),
      }
    }))

    const allSessionDates = deckList.flatMap(d => d.sessions)
    setStreak(getStreak(allSessionDates))
    setTotalDue(deckList.reduce((a, d) => a + d.dueCards, 0))
    setDecks(deckList)
    setLoading(false)
  }

  const filtered = decks.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const streakMsg = getStreakMessage(streak)
  const timeMsg   = getTimeOfDayMessage()

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-5xl px-6 pb-16 mx-auto pt-28">

        {/* ── Motivational quote — permanent, changes every login/refresh ── */}
        <div className={`flex items-start gap-3 px-5 py-4 mb-8 border rounded-2xl ${SESSION_PALETTE.banner}`}>
          <span className={`mt-0.5 text-base select-none ${SESSION_PALETTE.dot}`}>✦</span>
          <div>
            <p className={`text-sm leading-relaxed font-body italic ${SESSION_PALETTE.text}`}>
              "{SESSION_QUOTE.text}"
            </p>
            {SESSION_QUOTE.author && (
              <p className={`mt-1 text-xs opacity-55 font-body not-italic ${SESSION_PALETTE.text}`}>
                — {SESSION_QUOTE.author}
              </p>
            )}
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl text-white font-display">Your decks</h2>
            <p className="mt-1 text-sm text-dark-400 font-body">
              {decks.length} deck{decks.length !== 1 ? 's' : ''}
              {totalDue > 0 && <span className="ml-2 text-yellow-400">· {totalDue} due today</span>}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border bg-dark-700 border-dark-500 rounded-xl">
                <span className="text-base text-orange-400">🔥</span>
                <div>
                  <p className="text-lg leading-none text-white font-display">{streak}</p>
                  <p className="text-xs text-dark-400 font-body">day streak</p>
                </div>
              </div>
            )}
            <Link
              to="/upload"
              className="px-5 py-2.5 rounded-xl bg-pink-300 text-dark-900 font-body font-semibold text-sm hover:bg-pink-200 active:scale-95 transition-all"
            >
              + New deck
            </Link>
          </div>
        </div>

        {/* Streak encouragement */}
        {streakMsg && (
          <div className="px-4 py-3 mb-6 border bg-orange-500/10 border-orange-500/20 rounded-xl">
            <p className="text-sm text-orange-300 font-body">{streakMsg}</p>
          </div>
        )}

        {/* Search */}
        {decks.length > 0 && (
          <input
            type="text"
            placeholder="Search decks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-sm font-body text-white placeholder-dark-400 focus:outline-none focus:border-pink-400/50 mb-8"
          />
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-pink-300 rounded-full border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 && decks.length === 0 ? (
          <div className="max-w-sm py-20 mx-auto text-center">
            <div className="mb-4 text-5xl">{timeMsg.emoji}</div>
            <p className="mb-1 text-2xl text-white font-display">{timeMsg.heading}</p>
            <p className="mb-3 text-sm italic text-pink-300/80 font-body">{timeMsg.body}</p>
            <p className="mb-8 text-sm text-dark-400 font-body">
              Drop in any PDF and Recallify turns it into a smart flashcard deck in seconds.
            </p>
            <Link
              to="/upload"
              className="inline-block px-8 py-3 text-sm font-semibold transition-all bg-pink-300 rounded-2xl text-dark-900 font-body hover:bg-pink-200 active:scale-95"
            >
              Upload your first PDF →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-dark-400 font-body">No decks match "{search}".</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(deck => (
              <DeckCard key={deck.id} deck={deck} onUpdate={loadDecks} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}