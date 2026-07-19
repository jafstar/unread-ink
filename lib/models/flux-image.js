// Ported verbatim from genstock-web's lib/engines/flux.js - the 'exact'
// mode wrapper ("keep composition/subject/framing exactly the same,
// apply only this one change") is the real mechanism that makes
// identity-lock work; without it a reference photo + plain scene prompt
// produces near-duplicates or ignores the reference entirely.
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

// Real bug found live (unread-ink's scene illustration): without an
// explicit instruction against it, reference-conditioned generation
// defaults to planting the reference photo's exact pose - standing,
// front-facing, arms at sides - into the new background, looking posed
// for a cover instead of actually in the scene. Now explicitly forbidden
// as a second safety net alongside a real per-scene pose description
// (lib/pipeline/scenes.js).
function referenceConditionedPrompt(prompt) {
  return `Reimagine this reference photo as a new image: ${prompt}. Meaningful creative reinterpretation — vary the composition and framing — while keeping the same character/subject identity exactly recognizable. Do NOT simply place the reference figure standing still and facing the camera in the new setting — show them genuinely engaged in the described action, in profile or three-quarter view or turned away, mid-motion or mid-interaction with the scene, the way a real photo of someone actually doing something would look, not a posed portrait.`
}

export async function generateFluxImage(prompt, referenceImageDataUrl, apiKey, width = 640, height = 480) {
  const body = {
    prompt: `${referenceImageDataUrl ? referenceConditionedPrompt(prompt) : prompt}${SINGLE_IMAGE_SUFFIX}`,
    width,
    height,
  }
  if (referenceImageDataUrl) {
    const match = /^data:image\/\w+;base64,(.+)$/.exec(referenceImageDataUrl)
    body.input_image = match ? match[1] : referenceImageDataUrl
  }

  const submitRes = await fetchTimeout('https://api.bfl.ai/v1/flux-2-pro-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json', 'x-key': apiKey },
    body: JSON.stringify(body),
  }, 20000)
  if (!submitRes.ok) throw new Error(`FLUX submit ${submitRes.status}: ${(await submitRes.text()).slice(0, 300)}`)
  const { polling_url } = await submitRes.json()
  if (!polling_url) throw new Error('FLUX returned no polling_url')

  const start = Date.now()
  while (Date.now() - start < 120000) {
    await new Promise((r) => setTimeout(r, 1500))
    const pollRes = await fetchTimeout(polling_url, { headers: { accept: 'application/json', 'x-key': apiKey } }, 15000)
    if (!pollRes.ok) throw new Error(`FLUX poll ${pollRes.status}: ${(await pollRes.text()).slice(0, 300)}`)
    const data = await pollRes.json()
    if (data.status === 'Ready') {
      const imgUrl = data.result?.sample
      if (!imgUrl) throw new Error('FLUX ready but no result.sample URL')
      const imgRes = await fetchTimeout(imgUrl, {}, 20000)
      if (!imgRes.ok) throw new Error(`FLUX image download ${imgRes.status}`)
      const buf = Buffer.from(await imgRes.arrayBuffer())
      return `data:image/jpeg;base64,${buf.toString('base64')}`
    }
    if (data.status === 'Error' || data.status === 'Failed') throw new Error(`FLUX generation failed: ${data.status}`)
  }
  throw new Error('FLUX generation timed out after 120s')
}
