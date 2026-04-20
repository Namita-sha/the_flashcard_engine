const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Improved sleep with Jitter (randomness) to avoid hitting limits repeatedly at the same time
const sleep = (ms) => {
  const jitter = Math.random() * 1000; 
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
};

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
            generationConfig: { 
              temperature: 0.7, // Slightly higher helps with structured JSON output
              maxOutputTokens: 2048 // Reduced to save on TPM quota
            }
          })
        }
      );

      // Handle Rate Limits (429) or Server Overload (503/504)
      if ((res.status === 429 || res.status === 503 || res.status === 504) && attempt < retries) {
        // Wait longer for 429 than for 503
        const baseWait = res.status === 429 ? 10000 : 3000;
        const wait = Math.pow(2, attempt) * baseWait; 
        
        console.warn(`Gemini ${res.status} – attempt ${attempt}. Retrying in ${Math.round(wait/1000)}s...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Gemini API error: ${res.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(2000 * attempt);
    }
  }
}

export async function generateFlashcards(pdfText, cardCount = 20) {
  // Optimization: Slice input even more to stay under TPM limits
  // 12000 characters is roughly 3k-4k tokens.
  const optimizedText = pdfText.length > 10000 ? pdfText.slice(0, 10000) : pdfText;

  const prompt = `You are an expert teacher. Create exactly ${cardCount} flashcards from the text below.
  
Rules:
- JSON format only.
- Questions must be active recall.
- Answer length: 2-5 sentences.

Return ONLY a JSON array:
[{"question": "...", "answer": "...", "topic": "...", "difficulty": "..."}]

Text:
${optimizedText}`;

  const res = await callGemini(prompt);
  const data = await res.json();
  
  if (!data.candidates || !data.candidates[0].content.parts[0].text) {
    throw new Error("Invalid response from Gemini. Try a shorter text.");
  }

  const raw = data.candidates[0].content.parts[0].text;
  const cleaned = raw.replace(/```json|```/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Raw output:", raw);
    throw new Error("Failed to parse flashcards. Please try again.");
  }
}