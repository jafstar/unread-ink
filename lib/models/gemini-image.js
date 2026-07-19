// Ported verbatim from genstock-web's lib/engines/gemini.js - the
// SINGLE_IMAGE_SUFFIX guard against multi-panel/collage and canvas-print-
// mockup artifacts is real, live-found there and applies here too. Real
// bug found live in unread-ink, a DIFFERENT failure mode this guard never
// covered: given a plain scene description ("a forking tunnel..."),
// Gemini fabricated an entire fake book-cover mockup instead - invented
// title text ("The Serpent's Ascension"), a fake author byline ("Jonas
// Blackwood"), the works - sitting live in a published chapter until the
// Mayor caught it reading the site. The mockup guard covered canvas
// prints and wall art, never book covers or invented typography
// specifically.
const MODEL = 'gemini-2.5-flash-image'
const SINGLE_IMAGE_SUFFIX = ' — a single image, one continuous scene, no border, no frame, edge-to-edge, not a grid, not a collage, not a diptych, not a contact sheet, not multiple panels, not a canvas print, not a framed print, not wall art, not a product mockup, no drop shadow, no visible canvas or paper edge — the raw scene itself, flat, filling the entire frame. This is a pure illustration of a scene, never a book cover, movie poster, or product design - absolutely no overlaid title text, no subtitle, no author byline, no English-language captions or labels anywhere in the image. In-world inscriptions, glyphs, or symbols carved into objects that are physically part of the scene itself (a tablet, a wall, a carving) are fine if the scene calls for them - what is forbidden is typography layered ON TOP of the image like a cover design.'

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
