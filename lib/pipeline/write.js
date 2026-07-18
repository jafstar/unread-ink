import { callGemini } from '../models/gemini.js'
import { callClaude } from '../models/claude.js'

// Writing council: same draft-then-refine shape as Valid's default mode
// (Gemini's turn primed into Claude's call) - live-confirmed there that
// Claude reads noticeably better with Gemini's context first rather than
// a cold prompt. Gemini writes the actual scene prose from the outline
// beat; Claude polishes voice/consistency without rewriting the plot.
const DRAFT_SYSTEM = 'You are a novelist drafting a chapter of a book. Write real, vivid prose - actual scenes with action and dialogue, not a summary of what happens. Match the tone and voice established so far in the book.'

const REFINE_SYSTEM = "You are a novelist refining another writer's chapter draft. Improve prose quality, tighten dialogue, deepen voice and sensory detail, fix any inconsistencies with earlier chapters - but preserve the events and structure of the draft. Do not rewrite the plot. Output the final chapter text only, no commentary, no chapter-number heading (that gets added separately)."

export async function writeChapter({ outline, chapter, priorSummary, keys }) {
  const outlineContext = `Book: "${outline.title}"\nPremise: ${outline.premise}\nTone: ${outline.tone}\nCharacters: ${outline.characters.map((c) => `${c.name} - ${c.description}`).join('; ')}`

  console.log(`  [write ch.${chapter.number}] Gemini drafting...`)
  const draft = await callGemini(
    `${outlineContext}\n\n${priorSummary ? `What has happened so far:\n${priorSummary}\n\n` : ''}Write Chapter ${chapter.number}: "${chapter.title}", which covers: ${chapter.summary}\n\nWrite the full chapter prose now.`,
    DRAFT_SYSTEM,
    keys.gemini
  )

  console.log(`  [write ch.${chapter.number}] Claude refining...`)
  const final = await callClaude(
    `Here is a draft of Chapter ${chapter.number} ("${chapter.title}") of "${outline.title}":\n\n${draft}\n\nRefine this into a polished final chapter per your instructions.`,
    REFINE_SYSTEM,
    keys.claude
  )

  return final
}
