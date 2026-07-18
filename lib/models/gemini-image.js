// Ported verbatim from genstock-web's lib/engines/gemini.js - the
// SINGLE_IMAGE_SUFFIX guard against multi-panel/collage and canvas-print-
// mockup artifacts is real, live-found there and applies here too.
const MODEL = 'gemini-2.5-flash-image'
const SINGLE_IMAGE_SUFFIX = ' — a single image, one continuous scene, no border, no frame, edge-to-edge, not a grid, not a collage, not a diptych, not a contact sheet, not multiple panels, not a canvas print, not a framed print, not wall art, not a product mockup, no drop shadow, no visible canvas or paper edge — the raw scene itself, flat, filling the entire frame'

async function fetchTimeout(url, opts, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function generateGeminiImage(prompt, apiKey) {
  const res = await fetchTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}${SINGLE_IMAGE_SUFFIX}` }] }],
      generationConfig: { responseModalities: ['Image'] },
    }),
  }, 60000)
  if (!res.ok) throw new Error(`Gemini generateContent ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!imagePart) throw new Error('Gemini returned no image data')
  return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`
}
