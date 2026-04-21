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
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
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

export async function generateFlashcards(pdfText, cardCount = 20) {
  const optimizedText = pdfText.length > 12000 ? pdfText.slice(0, 12000) : pdfText

  const prompt = `You are an expert teacher and curriculum designer creating high-quality flashcards.

Read the text carefully and create exactly ${cardCount} flashcards that a great teacher would write.

Card types to include (mix all of these):
- Key definitions: "What is X?" with a precise, complete answer
- Relationships: "How does X relate to Y?" or "What is the difference between X and Y?"
- Cause and effect: "What happens when X?" or "Why does X cause Y?"
- Edge cases: "What is the exception to X?" or "When does X NOT apply?"
- Worked examples: "Give an example of X in practice" or "How would X work in scenario Y?"
- Conceptual understanding: "Why does X matter?" or "What is the significance of X?"

Quality rules:
- Every question must require genuine active recall, not just recognition
- Answers must be complete but concise (2-4 sentences max)
- Cover the FULL breadth of the text — do not cluster around the opening paragraphs
- Vary difficulty: roughly 30% easy, 50% medium, 20% hard
- Topic labels must be specific (e.g. "Mitosis" not "Biology", "French Revolution" not "History")
- Never write trivial questions like "What is the title?" or "What does the author say?"
- Do not repeat the same concept in multiple cards

Return JSON ONLY — no markdown, no code fences, no explanation, no preamble:
[{"question":"","answer":"","topic":"","difficulty":""}]

Text:
${optimizedText}`

  const res  = await callGemini(prompt)
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

export default generateFlashcards