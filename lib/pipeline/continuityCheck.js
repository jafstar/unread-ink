import { callClaude } from '../models/claude.js'

// Continuity checker - Claude's dedicated role in the write stage, pulled
// OUT of creative writing entirely. Not a prose-quality pass (Xlectic
// covers that) and not a rewrite - only catches factual contradictions,
// unbridged narrative jumps, scene duplication, and outline drift.
// Real bugs this exists to catch, all found live testing this exact
// pipeline: (1) Chapter 3 originally opened assuming a body had been
// found and examined off-page, with zero transition from how Chapter 2
// actually ended - fixed by adding the unbridged-jump check. (2) Fixing
// that surfaced a SECOND bug: Chapter 3 re-narrated the footprint/ledge
// scene Chapter 2 had already covered, almost verbatim - fixed by adding
// the scene-duplication check. (3) That still wasn't enough: Chapter 7's
// own outline summary called for a completely different scene (following
// the Handler through a meadow, finding survivors), but the writers
// produced a near-total retelling of Chapter 6's body-discovery/cliff-
// climb scene instead, with the duplication check not catching it because
// the retelling had new embellishment layered on top (a glyph detail).
// The real gap: nothing verified the draft against ITS OWN assigned
// outline beat, only against prior chapters existing generally - a
// chapter can duplicate a prior chapter's SCENE while still being
// "different" in surface wording. Outline summary is now a required input,
// not optional context. (4) Chapter 10 invented a full name for a radio
// call ("This is Nora Lin") that directly contradicts the protagonist's
// actual established surname, Cruz - from the ORIGINAL plot pitch. Root
// cause: no chapter body ever states her surname on-page, only "Nora" -
// so prior-chapter text alone gave the checker nothing to contradict
// against. The plot pitch (winningPlot) is canon too (it's what the
// reference character image was generated from) and is now passed in as
// reference material, not just prior chapter text.
const SYSTEM = 'You are a continuity editor. You do not write creatively or improve prose style - that is not your job. Your job is catching five things: (1) factual contradictions (ages, numbers, names, established details that changed between chapters, OR that contradict the original plot pitch even if no prior chapter happened to restate them - e.g. inventing a different surname for a character than the one established in the pitch), (2) unbridged narrative jumps (this chapter assuming something happened that the prior chapter never actually showed, with no transition bridging the gap), (3) scene duplication (this chapter re-narrating or rewinding into a scene or beat a prior chapter already covered, even with new embellishment layered on top - the story must move forward from exactly where the last chapter left off, never backward or sideways into already-told ground), (4) outline drift (this chapter is supposed to cover a SPECIFIC assigned beat, given below - if the draft instead delivers a different chapter\'s events, or repeats a prior chapter\'s scene under a new chapter title, that is a critical failure, not a style choice), and (5) invented details that contradict the original plot pitch (character names, roles, or traits established in the pitch but never yet restated on-page in the chapters themselves - the pitch is canon even where no chapter has repeated it yet). Read the original plot pitch, the prior chapters (if given), this chapter\'s assigned outline beat, and the draft, paying close attention to exactly how the immediately preceding chapter ended and whether this draft\'s actual events and details match what has actually been established. If you find a contradiction, fix it with the smallest edit. If you find an unbridged jump, add minimal bridging material. If you find scene duplication OR outline drift, this requires a real rewrite: discard the retold/wrong material and write what this chapter\'s outline beat actually describes, continuing forward from the prior chapter\'s real ending - preserve only what genuinely is new and matches the assigned beat. If nothing is wrong, return the draft completely unchanged. Output the full corrected chapter text only, no commentary, no list of changes.'

export async function checkContinuity({ draft, winningPlot, priorChapters, chapterTitle, chapterSummary, apiKey }) {
  console.log('  [continuity] Claude checking...')
  const corrected = await callClaude(
    `Original plot pitch (canon, even for details no chapter has restated yet):\n\n${winningPlot}\n\n${priorChapters ? `Prior chapters (for continuity reference - do NOT let this chapter repeat their scenes):\n\n${priorChapters}\n\n` : '(This is Chapter 1 - no prior chapters to check against.)\n\n'}This chapter's assigned outline beat: "${chapterTitle}" - ${chapterSummary}\n\nChapter draft to check:\n\n${draft}\n\nCheck for continuity issues (including whether the draft actually delivers its assigned beat above, not a prior chapter's scene, and whether any invented details contradict the plot pitch) and return the corrected chapter.`,
    SYSTEM,
    apiKey
  )
  console.log(`    -> ${corrected.trim() === draft.trim() ? 'no changes needed' : 'corrected'}`)
  return corrected
}
