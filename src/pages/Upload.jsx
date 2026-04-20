import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { extractTextFromPDF } from '../utils/pdfParser'
import { generateFlashcards }  from '../utils/gemini'
import { sm2 } from '../utils/sm2'
import Navbar from '../components/Navbar'

const STAGES = ['idle', 'extracting', 'generating', 'saving', 'done']

export default function Upload() {
  const { user }         = useAuth()
  const navigate         = useNavigate()
  const fileRef          = useRef()
  const [file,     setFile]     = useState(null)
  const [deckName, setDeckName] = useState('')
  const [stage,    setStage]    = useState('idle')
  const [error,    setError]    = useState(null)
  const [cardCount, setCardCount] = useState(0)

  async function handleUpload() {
    if (!file || !deckName.trim()) return
    setError(null)

    try {
      // Step 1: extract text
      setStage('extracting')
      const text = await extractTextFromPDF(file)

      // Step 2: generate flashcards
      setStage('generating')
      const cards = await generateFlashcards(text)
      setCardCount(cards.length)

      // Step 3: save to Firestore
      setStage('saving')
      const deckRef = await addDoc(collection(db, 'decks'), {
        name:      deckName.trim(),
        userId:    user.uid,
        createdAt: serverTimestamp(),
        fileName:  file.name,
      })

      // Save each card with initial SM-2 values
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await Promise.all(cards.map((card, i) => {
        const cardRef = doc(collection(db, 'decks', deckRef.id, 'cards'))
        return setDoc(cardRef, {
          ...card,
          repetitions: 0,
          easeFactor:  2.5,
          interval:    1,
          dueDate:     tomorrow.toISOString(),
        })
      }))

      setStage('done')
      setTimeout(() => navigate('/dashboard'), 1500)

    } catch (e) {
      console.error(e)
      setError(e.message)
      setStage('idle')
    }
  }

  const stageText = {
    extracting: 'Reading your PDF...',
    generating: 'Gemini is thinking up your cards...',
    saving:     'Saving to your account...',
    done:       `Done! ${cardCount} cards created ✓`,
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-6 pt-28 pb-16">
        <h2 className="font-display text-3xl text-white mb-2">New deck</h2>
        <p className="text-dark-400 font-body text-sm mb-10">
          Upload a PDF and we'll generate smart flashcards automatically.
        </p>

        {/* Deck name */}
        <div className="mb-5">
          <label className="block text-sm font-body text-dark-400 mb-2">Deck name</label>
          <input
            type="text"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            placeholder="e.g. Organic Chemistry Ch.4"
            className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-sm font-body text-white placeholder-dark-400 focus:outline-none focus:border-pink-400/50"
          />
        </div>

        {/* File drop zone */}
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-dark-500 hover:border-pink-400/40 rounded-2xl p-10 text-center cursor-pointer transition-all mb-6"
        >
          <input
            type="file"
            accept=".pdf"
            ref={fileRef}
            className="hidden"
            onChange={e => setFile(e.target.files[0])}
          />
          {file ? (
            <>
              <p className="text-pink-300 font-body font-semibold">{file.name}</p>
              <p className="text-dark-400 text-xs font-body mt-1">
                {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
              </p>
            </>
          ) : (
            <>
              <p className="text-dark-400 font-body mb-1">Drop your PDF here</p>
              <p className="text-dark-500 text-xs font-body">or click to browse</p>
            </>
          )}
        </div>

        {/* Status */}
        {stage !== 'idle' && (
          <div className="mb-6 p-4 rounded-xl bg-dark-700 border border-dark-500">
            <div className="flex items-center gap-3">
              {stage !== 'done' && (
                <div className="w-4 h-4 border-2 border-pink-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              <p className="text-sm font-body text-pink-300">{stageText[stage]}</p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm font-body mb-4">{error}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !deckName.trim() || stage !== 'idle'}
          className="w-full py-4 rounded-2xl bg-pink-300 text-dark-900 font-body font-semibold text-base hover:bg-pink-200 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Generate flashcards
        </button>
      </main>
    </div>
  )
}