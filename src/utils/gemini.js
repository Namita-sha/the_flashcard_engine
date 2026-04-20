const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY — add VITE_GEMINI_API_KEY to your .env / Vercel env vars')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 1000))

async function callGemini(prompt, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      )

      if ((res.status === 429 || res.status === 503 || res.status === 504) && attempt < retries) {
        const baseWait = res.status === 429 ? 10000 : 3000
        const wait = Math.pow(2, attempt) * baseWait
        console.warn(`Retry ${attempt} after ${Math.round(wait / 1000)}s`)
        await sleep(wait)
        continue
      }

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(`Gemini API error ${res.status}: ${errData.error?.message}`)
      }

      return res
    } catch (err) {
      if (attempt === retries) throw err
      await sleep(2000 * attempt)
    }
  }
}

// Named export (kept for backward compat)
export async function generateFlashcards(pdfText, cardCount = 20) {
  const optimizedText = pdfText.length > 10000 ? pdfText.slice(0, 10000) : pdfText

  const prompt = `
You are an expert teacher. Create exactly ${cardCount} flashcards from the text below.

Rules:
- Return JSON ONLY — no markdown, no code fences, no explanation
- Ask active-recall questions
- Each answer: 2–5 sentences
- difficulty must be one of: easy | medium | hard

Format:
[{"question":"","answer":"","topic":"","difficulty":""}]

Text:
${optimizedText}
`

  const res = await callGemini(prompt)
  const data = await res.json()

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) throw new Error('Empty response from Gemini')

  const cleaned = raw.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse flashcards JSON from Gemini response')
  }
}

// Default export — fixes the "import generateFlashcards from" crash
export default generateFlashcards