// Same proven pattern as genstock-web's lib/engines/gemini.js, text
// generation instead of image (gemini-2.5-flash, not -image).
const MODEL = 'gemini-2.5-flash'

export async function callGemini(prompt, system, apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts) throw new Error('Gemini returned no content')
  return parts.map((p) => p.text || '').join('')
}
