import { KNIGHTS } from './knights.js'
import { checkContinuity } from './continuityCheck.js'
import { analyzeChapterText } from './rhythmAnalysis.js'
import { lexicalSteerInstruction } from './lexicalAnalysis.js'

// Syncopation: reactive pacing steering, built from the same rhythm
// measurement the whole-book report uses - not a vibe, the previous
// chapter's ACTUAL measured pace. Two real signals combine: the outline's
// declared intendedPace for THIS chapter (storyglue-outline.js's macro-
// waveform), and whether the previous chapter measured unusually fast or
// slow (avoid stacking a third chapter in the same register even when the
// outline didn't explicitly plan for it).
export function paceSteerInstruction(intendedPace, previousChapterText) {
  const parts = []
  if (intendedPace === 'low') {
    parts.push('This chapter is planned as a LOW-pace, reflective breathing chapter - favor longer, more descriptive sentences and interior reflection over rapid dialogue exchanges. Let the reader exhale after recent intensity.')
  } else if (intendedPace === 'high') {
    parts.push('This chapter is planned as a HIGH-pace, high-intensity chapter - favor short, punchy sentences and heavy dialogue/action. Keep the prose moving fast throughout.')
  }
  if (previousChapterText) {
    const prevPace = analyzeChapterText(previousChapterText).avgPace
    if (prevPace > 0.55 && intendedPace !== 'high') {
      parts.push(`The previous chapter measured fast (pace ${prevPace.toFixed(2)}) - avoid stacking another fast chapter on top of it, let this one breathe even if it isn't the designated low-pace chapter.`)
    } else if (prevPace < 0.4 && intendedPace !== 'low') {
      parts.push(`The previous chapter measured slow (pace ${prevPace.toFixed(2)}) - pick the energy back up here rather than letting the momentum stall further.`)
    }
  }
  return parts.length ? `\n\n${parts.join(' ')}` : ''
}

// Writer relay: the 3 non-winning knights write Chapter 1 TOGETHER, in
// sequence - the first starts it, the second takes that draft and
// continues/refines it into a stronger version of the SAME chapter, the
// third does the same again. One single chapter, not three competing
// versions - same draft-then-refine shape as outline.js/write.js, chained
// three times instead of two.
const START_ROLE = 'You are starting the chapter - write its opening.'
const CONTINUE_ROLE = "You are taking over from another writer's version of this chapter - read what they wrote, then continue and refine it into a stronger version of the SAME chapter. Preserve their events, characters, and structure; improve the prose, tighten pacing, fix anything that doesn't read well. Output the full chapter text, not just your addition, no commentary."

function writeSystem(role) {
  return `You are one of three writers taking turns on the same chapter, in the point of view and plot established below. ${role} Write real, vivid prose - actual scenes with action and dialogue, not a summary. Favor short, punchy sentences and real white space over long expository paragraphs. Let characterization come through terse dialogue and physical detail, not narrated backstory. Do not add a title or chapter-number heading, just the prose.`
}

export async function relayWriteChapter1({ winningPlot, bigAnswer, writerKeys, keys }) {
  // No prior chapters to measure yet - use the confirmed cross-book tics
  // list only (lexicalAnalysis.js's KNOWN_TICS), same reasoning as pace:
  // don't wait for repetition to accumulate when the data already shows
  // it happens from chapter 1 onward regardless of story.
  const lexicalInstruction = lexicalSteerInstruction('')
  let draft = ''
  for (let i = 0; i < writerKeys.length; i++) {
    const knightKey = writerKeys[i]
    const knight = KNIGHTS[knightKey]
    const isFirst = i === 0
    console.log(`  [write] ${knight.label} (${isFirst ? 'starting' : 'refining'})...`)
    const prompt = isFirst
      ? `Book premise: ${bigAnswer}\n\nWinning plot:\n${winningPlot}\n\nWrite Chapter 1 now - the opening of this book.${lexicalInstruction}`
      : `Book premise: ${bigAnswer}\n\nWinning plot:\n${winningPlot}\n\nHere is the chapter so far:\n\n${draft}\n\nContinue and refine it per your instructions.${lexicalInstruction}`
    draft = await knight.fn(prompt, writeSystem(isFirst ? START_ROLE : CONTINUE_ROLE), keys[knightKey])
    console.log(`    -> ${draft.split(/\s+/).length} words`)
  }
  return draft
}

// Chapter 2+ methodology, changed after a real bug: the 3-writer relay
// (chapter 1's methodology, kept as-is for chapter 1 only) let a
// continuity gap slip through - Chapter 3 opened assuming a body had been
// found and examined off-page, with no transition from how Chapter 2
// actually ended. Fix: split "who creates" from "who verifies" instead of
// folding a third creative pass in. Gemini and ChatGPT write (2-pass
// relay); Claude is pulled OUT of creative writing entirely and checks
// continuity between every pass, and is given the prior chapter's actual
// ending explicitly, so a time/event skip has to be bridged on purpose,
// not assumed by accident.
// priorChapters (full concatenated history) still goes to the WRITERS -
// they benefit from full-book context for voice/world consistency.
// previousChapter/earlierChapters (split apart) go to the CHECKER only -
// see continuityCheck.js for why the split matters.
export async function relayWriteChapterChecked({ bigAnswer, winningPlot, chapterNum, chapterTitle, chapterSummary, intendedPace, priorChapters, previousChapter, earlierChapters, keys }) {
  const bridgeInstruction = priorChapters
    ? `\n\nThis is a NEW scene that has not happened yet in the book - do not retell, rewind into, or re-describe any scene from the prior chapters above, even with added detail. Continue naturally from exactly where the previous chapter left off. If time needs to pass or something needs to happen off-page before this chapter's events, bridge it explicitly with a transition (e.g. "Two days later...", "By the time the search team arrived..."). Do not silently assume something happened that was never shown, and do not repeat a scene that was already told.`
    : ''
  const paceInstruction = paceSteerInstruction(intendedPace, previousChapter)
  const lexicalInstruction = lexicalSteerInstruction(priorChapters)
  const context = `Book premise: ${bigAnswer}\n\nOverall plot:\n${winningPlot}\n\n${priorChapters ? `What has happened so far:\n\n${priorChapters}\n\n` : ''}Chapter ${chapterNum}: "${chapterTitle}", which covers: ${chapterSummary}${bridgeInstruction}${paceInstruction}${lexicalInstruction}`

  console.log(`  [write ch.${chapterNum}] Gemini (starting)...`)
  let draft = await KNIGHTS.gemini.fn(`${context}\n\nWrite Chapter ${chapterNum} now.`, writeSystem(START_ROLE), keys.gemini)
  console.log(`    -> ${draft.split(/\s+/).length} words`)

  draft = await checkContinuity({ draft, winningPlot, previousChapter, earlierChapters, chapterTitle, chapterSummary, apiKey: keys.claude })

  console.log(`  [write ch.${chapterNum}] ChatGPT (refining)...`)
  draft = await KNIGHTS.chatgpt.fn(`${context}\n\nHere is the chapter so far:\n\n${draft}\n\nContinue and refine it per your instructions.`, writeSystem(CONTINUE_ROLE), keys.chatgpt)
  console.log(`    -> ${draft.split(/\s+/).length} words`)

  draft = await checkContinuity({ draft, winningPlot, previousChapter, earlierChapters, chapterTitle, chapterSummary, apiKey: keys.claude })

  return draft
}
