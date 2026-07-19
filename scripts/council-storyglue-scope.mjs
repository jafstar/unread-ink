// Product-scoping council round: where does "StoryGlue" actually live?
// Not a naming question this time - a real architecture/focus question.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { callClaude } from '../lib/models/claude.js'
import { callGemini } from '../lib/models/gemini.js'
import { callChatGPT } from '../lib/models/chatgpt.js'
import { callRadium } from '../lib/models/radium.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const keys = {
  claude: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  chatgpt: process.env.CHATGPT_API_KEY,
  radium: process.env.RADIUM_API_KEY,
}

const SYSTEM = 'You are a sharp, experienced product strategist who has seen many small teams overextend by shipping too many separate products at once. Be concrete and specific, not generic startup advice. Give a real, opinionated answer, including a direct recommendation on scope, not just a list of options. Keep it to about 350-450 words.'

const PROMPT = `Real situation, need your honest strategic read - this is a scoping question, not a naming question.

**Current state, all built by one small team in the last week or so:**

1. **genstock.photo** - live in production, real users being onboarded now (20-50 friends/family soft launch, no Product Hunt yet). Core mechanic: lock a reference image/character's identity, generate variations across 3 AI engines. Has two project types: "Photos" (single subject variations) and "Story" (just shipped last night - describe a character in text, lock it, generate it across a user-written scene list, one image per scene).

2. **unread.ink** - separate live product, also just shipped. Full AI-generated illustrated book pipeline: a council of 4 models (Claude/Gemini/ChatGPT/Radium) writes a book's outline and prose, then the SAME identity-lock mechanism as genstock's Story type illustrates it (lock a character, generate one image per detected scene), published as a real reading site with a sticky-scroll "picture faces text" format. Currently one real generated book live (a 1980s reimagining of Moby Dick).

3. **Proposed new idea:** rebrand or fork out a THIRD product called "StoryGlue" - the name is meant to capture the identity-lock-across-scenes mechanism specifically. Real technical fact: this would be the exact same underlying mechanism genstock's "Story" type and unread.ink's illustration step already both run - StoryGlue would basically be "the illustration engine, standalone, no writing/no photo-variation baggage, its own app and domain."

**The real tension:** Is StoryGlue a genuinely distinct product (illustration-only tool for storyboard artists/comic creators/mascot campaigns who don't want a full ghostwritten book AND don't want a generic stock-photo-variation tool), or is it the same capability already live in two other places, about to become a THIRD deployed app/domain/codebase to maintain in the same week as an active soft launch?

Give your honest, direct opinion:
- Should StoryGlue become an actual new forked app with its own domain/deploy, OR stay purely as a name/positioning layer over capability that already exists inside genstock.photo and/or unread.ink?
- If you'd fork it as a real new product, what's the actual distinct audience/use case that justifies a 3rd surface, and is now (mid-soft-launch on genstock) the right time?
- If you would NOT fork it, where should the "StoryGlue" name actually be used, if anywhere - genstock's Story project type, unread.ink's illustration engine, both, or shelved?
- Real risk check: is this pattern (proposing a new branded product for a capability that already exists in two places) itself a warning sign of the team overextending versus deepening what's already live?

Give a real recommendation, not a hedge.`

async function ask(name, fn, apiKey) {
  console.log(`Asking ${name}...`)
  try {
    const response = await fn(PROMPT, SYSTEM, apiKey)
    console.log(`  -> ${response.split(/\s+/).length} words`)
    return { name, response }
  } catch (e) {
    console.error(`  ${name} failed: ${e.message}`)
    return { name, response: null, error: e.message }
  }
}

const results = await Promise.all([
  ask('Claude', callClaude, keys.claude),
  ask('Gemini', callGemini, keys.gemini),
  ask('ChatGPT', callChatGPT, keys.chatgpt),
  ask('Radium', callRadium, keys.radium),
])

const outPath = path.join(ROOT, 'council-storyglue-scope.md')
const body = results.map((r) => `## ${r.name}\n\n${r.response || `(failed: ${r.error})`}`).join('\n\n---\n\n')
fs.writeFileSync(outPath, `# Council opinions: should StoryGlue be a new forked product?\n\n${body}\n`)
console.log(`\nDone. -> ${outPath}`)
