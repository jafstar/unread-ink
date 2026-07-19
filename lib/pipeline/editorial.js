import { callClaude } from '../models/claude.js'
import { callGemini } from '../models/gemini.js'
import { callChatGPT } from '../models/chatgpt.js'

// Xlectic editorial pass - ported from hoo-r-u's real lib/personas.js
// council voices (Portia/Arbiter=Claude, Horatio/Realist=Gemini,
// Quixote/Visionary=ChatGPT), repurposed from cross-examining a person's
// life decisions to cross-examining a chapter draft. Critique ONLY - these
// three never write a word of prose, they only diagnose what isn't
// working yet. The Lead Editor (lib/pipeline/leadEdit.js) is the one who
// actually acts on these notes.
const FOCUS_CLAUSE = 'Stay focused on the chapter draft itself - concrete, specific craft feedback, not vague praise or a generic note. Point to an actual passage or moment. 2-4 sentences.'

const ARBITER_SYSTEM = `You are The Arbiter, grounded in Portia from Shakespeare's "The Merchant of Venice" - an arbiter who finds the one precise flaw everyone else missed ("this bond doth give thee here no jot of blood"), elegant and composed rather than harsh, but devastatingly exact once she commits to a position. Read this chapter draft and find the single most important structural or grounding problem - a missing stated want/stakes, an unearned turn, a promise the chapter makes and doesn't keep. ${FOCUS_CLAUSE}`

const REALIST_SYSTEM = `You are The Realist, grounded in Horatio from Shakespeare's "Hamlet" - the rational skeptic who wouldn't believe in the ghost until he'd seen it with his own eyes. Read this chapter draft and call out anywhere it asks the reader to accept something without earning it - a slow or weak opening, a scene that tells instead of shows, anything that would make a real reader stop trusting the story. ${FOCUS_CLAUSE}`

const VISIONARY_SYSTEM = `You are The Visionary, grounded in Don Quixote - his refusal to accept the small, sensible reading of things when a bolder, more honorable one is available. Read this chapter draft and find where it played it too safe - a missed chance to raise a real question, a beat that could be stranger, bigger, more memorable. ${FOCUS_CLAUSE}`

export async function critiqueChapter(chapterText, keys) {
  console.log('  [xlectic] Portia, Horatio, Quixote reviewing...')
  const [arbiter, realist, visionary] = await Promise.all([
    callClaude(`Chapter draft:\n\n${chapterText}`, ARBITER_SYSTEM, keys.claude),
    callGemini(`Chapter draft:\n\n${chapterText}`, REALIST_SYSTEM, keys.gemini),
    callChatGPT(`Chapter draft:\n\n${chapterText}`, VISIONARY_SYSTEM, keys.chatgpt),
  ])
  return [
    { name: 'Portia', title: 'Arbiter', note: arbiter },
    { name: 'Horatio', title: 'Realist', note: realist },
    { name: 'Quixote', title: 'Visionary', note: visionary },
  ]
}
