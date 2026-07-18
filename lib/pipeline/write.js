import { callGemini } from '../models/gemini.js'
import { callClaude } from '../models/claude.js'

// Writing council: same draft-then-refine shape as Valid's default mode
// (Gemini's turn primed into Claude's call) - live-confirmed there that
// Claude reads noticeably better with Gemini's context first rather than
// a cold prompt. Gemini writes the actual scene prose from the outline
// beat; Claude polishes voice/consistency without rewriting the plot.
//
// Real gap, live-caught comparing this pipeline's Chapter 1 against a
// hand-written rewrite: "improve prose quality" wasn't specific enough to
// actually change anything. The rewrite won on two concrete axes - prose
// ECONOMY (short punchy sentences, real white space, no throat-clearing)
// and SHOWING over telling (characterization lands through terse
// dialogue and physical detail, not narrated backstory dumps). Both
// prompts now name these explicitly instead of leaving "good prose" to
// the model's unguided default, and both carry the outline's own POV
// decision through instead of drifting into generic third person.
const DRAFT_SYSTEM = 'You are a novelist drafting a chapter of a book, in the point of view specified. Write real, vivid prose - actual scenes with action and dialogue, not a summary of what happens. Favor short, punchy sentences and real white space over long expository paragraphs. Let characterization come through terse dialogue and physical detail, not narrated backstory. Match the tone and voice established so far in the book.'

const REFINE_SYSTEM = "You are a novelist refining another writer's chapter draft, in the point of view specified. Tighten every sentence - cut throat-clearing, cut anything that tells the reader what a scene means instead of trusting the scene itself. Break up long paragraphs; give the prose real white space and rhythm. Sharpen dialogue so it reveals character through what's said and left unsaid, not through the narration explaining it. Fix any inconsistencies with earlier chapters - but preserve the events and structure of the draft. Do not rewrite the plot. Output the final chapter text only, no commentary, no chapter-number heading (that gets added separately)."

export async function writeChapter({ outline, chapter, priorSummary, keys }) {
  const outlineContext = `Book: "${outline.title}"\nPremise: ${outline.premise}\nTone: ${outline.tone}\nPoint of view: ${outline.pov || 'third person'}\nCharacters: ${outline.characters.map((c) => `${c.name} - ${c.description}`).join('; ')}`

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
