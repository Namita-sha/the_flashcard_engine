const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function generateFlashcards(pdfText) {
  const prompt = `You are an expert teacher creating high-quality flashcards from study material.

Read the following text carefully and create 15-25 flashcards.

Rules for good flashcards:
- Each question must test ONE specific concept
- Questions should require active recall, not just recognition
- Cover key definitions, relationships, causes/effects, and examples
- Vary difficulty: some factual, some conceptual, some application
- Write answers concisely but completely (2-5 sentences max)
- Do NOT create trivially easy questions like "What is the title of this text?"

Respond ONLY with a valid JSON array. No preamble, no markdown, no explanation.
Format:
[
  {
    "question": "...",
    "answer": "...",
    "topic": "one or two word topic label",
    "difficulty": "easy|medium|hard"
  }
]

Text to process:
${pdfText.slice(0, 12000)}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
      })
    }
  )

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)

  const data = await res.json()
  const raw  = data.candidates[0].content.parts[0].text

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}