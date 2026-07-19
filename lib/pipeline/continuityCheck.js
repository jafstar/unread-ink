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
// reference material, not just prior chapter text. (5) Chapter 10 still
// re-narrated ~60 lines of Chapter 9's entire cave-recap almost verbatim,
// even with all of the above in place. Real cause: by chapter 10, "prior
// chapters" was one undifferentiated blob of 8 chapters' text - the one
// boundary that actually mattered (exactly how chapter 9 ended) was
// buried in a pile of older material with no special weight. The
// immediately-previous chapter is now split out as its own explicitly
// emphasized input, separate from earlier chapters - unbridged jumps and
// scene duplication happen at THAT boundary almost every time, so it
// gets primary attention instead of competing for it against everything
// that came before.
const SYSTEM = 'You are a continuity editor. You do not write creatively or improve prose style - that is not your job. Your job is catching five things: (1) factual contradictions (ages, numbers, names, established details that changed between chapters, OR that contradict the original plot pitch even if no prior chapter happened to restate them - e.g. inventing a different surname for a character than the one established in the pitch), (2) unbridged narrative jumps (this chapter assuming something happened that the PREVIOUS chapter never actually showed, with no transition bridging the gap), (3) scene duplication (this chapter re-narrating or rewinding into a scene or beat the PREVIOUS chapter already covered, even with new embellishment layered on top - the most common form of this is a chapter re-opening with a recap of how the previous chapter\'s situation came to be, when it should just continue directly from where that chapter left off), (4) outline drift (this chapter is supposed to cover a SPECIFIC assigned beat, given below - if the draft instead delivers a different chapter\'s events, or repeats the previous chapter\'s scene under a new chapter title, that is a critical failure, not a style choice), and (5) invented details that contradict the original plot pitch or earlier chapters (character names, roles, or traits established but never yet restated on-page - the pitch is canon even where no chapter has repeated it yet). PRIMARY CHECK, do this first and most carefully: compare the draft\'s OPENING against the PREVIOUS chapter\'s actual ENDING (given separately below, not mixed in with earlier chapters) - does the draft continue directly from that exact moment, or does it jump ahead without a bridge, or does it re-tell something that chapter already covered? This single boundary is where almost every real bug in this pipeline has been found. Earlier chapters and the plot pitch are secondary reference material for facts/names, not the primary continuity check. If you find a contradiction, fix it with the smallest edit. If you find an unbridged jump, add minimal bridging material. If you find scene duplication OR outline drift, this requires a real rewrite: discard the retold/wrong material and write what this chapter\'s outline beat actually describes, continuing forward from the previous chapter\'s real ending - preserve only what genuinely is new and matches the assigned beat. If nothing is wrong, return the draft completely unchanged. Output the full corrected chapter text only, no commentary, no list of changes.'

export async function checkContinuity({ draft, winningPlot, previousChapter, earlierChapters, chapterTitle, chapterSummary, apiKey }) {
  console.log('  [continuity] Claude checking...')
  const corrected = await callClaude(
    `Original plot pitch (secondary reference, canon even for details no chapter has restated yet):\n\n${winningPlot}\n\n${earlierChapters ? `Earlier chapters, before the previous one (secondary reference - do NOT let this chapter repeat any of their scenes):\n\n${earlierChapters}\n\n` : ''}${previousChapter ? `=== THE PREVIOUS CHAPTER (primary check - compare the draft's opening against exactly how THIS ends) ===\n\n${previousChapter}\n\n=== END OF PREVIOUS CHAPTER ===\n\n` : '(This is Chapter 1 - no previous chapter to check against.)\n\n'}This chapter's assigned outline beat: "${chapterTitle}" - ${chapterSummary}\n\nChapter draft to check:\n\n${draft}\n\nCheck for continuity issues (starting with the primary check against the previous chapter's ending, then whether the draft delivers its assigned beat, then contradictions against earlier chapters/the plot pitch) and return the corrected chapter.`,
    SYSTEM,
    apiKey
  )
  console.log(`    -> ${corrected.trim() === draft.trim() ? 'no changes needed' : 'corrected'}`)
  return corrected
}
