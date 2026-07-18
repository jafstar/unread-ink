// "Great Illustrated Classics" format: a full illustration page, then a
// text page, alternating. The picture-page breaks need to land on real
// narrative scene boundaries (a new setting, a time jump, a shift in
// who's present or what's happening) - not a mechanical word-count chop,
// which would just as easily land mid-conversation. One model call finds
// the real scene breaks AND writes a plain, concrete image description
// for each at the same time, since a tight visual-facts prompt is a
// different job than flowing prose - asking the same pass that keeps the
// narrative voice to also produce that description would bleed prose
// style into what should be a plain scene description.
const SYSTEM = 'You split a chapter of a novel into its real narrative scenes - a new scene starts wherever the setting changes, real time passes, or the focus of the action shifts, not at a fixed word count. Reproduce the chapter\'s own prose verbatim, just split at those scene boundaries - do not rewrite, summarize, or change any wording. For each scene, also write a plain, concrete one-to-two sentence illustration description: what the scene physically looks like. A scene does NOT need a character in it - some of the best illustrations here are pure setting and atmosphere (the ship itself, the weather, the dock, a room, an object described in the text) with nobody in frame at all. Only include a character if they are genuinely the visual focus of that specific passage. No prose style, no metaphor, just the visual facts an illustrator would need. Output ONLY valid JSON, no markdown fences, no commentary, matching this exact shape: {"scenes": [{"text": string, "imageDescription": string, "hasCharacter": boolean}]}'

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  return JSON.parse(raw.trim())
}

export async function splitIntoScenes(chapterText, callModel, apiKey) {
  const response = await callModel(
    `Split this chapter into its real scenes:\n\n${chapterText}`,
    SYSTEM,
    apiKey
  )
  try {
    const { scenes } = extractJson(response)
    return scenes
  } catch (e) {
    throw new Error(`Scene split didn't return valid JSON: ${e.message}\n\nRaw response:\n${response.slice(0, 500)}`)
  }
}
