// Round 3 of the rebrand council: candidate name "StoryGlue" (.ai or .app
// available; .com is for sale but expensive - premium aftermarket price).
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

const SYSTEM = 'You are a sharp, experienced brand strategist and naming consultant. Be concrete and specific, not generic startup advice. Give a real opinion, including reasons to say no. Keep it to about 300-400 words.'

const PROMPT = `Round 3 of a rebrand discussion for an AI identity-locked image generation product (currently genstock.photo). Quick recap:

- Round 1: proposed "unstatic.art." Council split 3-1 in favor of rebranding pre-launch, but flagged that "unstatic" names the mechanic (static -> dynamic) not the actual differentiator (identity LOCK - consistency across generations, not just variation).
- Round 2: proposed "charlock.app" (character + lock wordplay). UNANIMOUS rejection across all four of you - it reads as "charlock" (a real English word for a yellow-flowered weed) before "character lock" ever clicks. Also disagreement on .app: two of you said .app signals "professional tool" (good fit), two said .app reads as cold utility software and undersells the creative side (.studio preferred). Two of you independently converged on "keep.id" as your actual top pick across both rounds.

Product reminder: lock a reference character/subject's identity via text description (no photo upload) or an uploaded photo, then generate it consistently across different poses/scenes/eras/art styles - not flat variations of one prompt, but a real sequence (walk cycles, book illustration chapters, era-remixed reimaginings). A "Story" project type just shipped: describe a character, then generate it across a written scene list.

New candidate for this round: **StoryGlue**. Domain situation: storyglue.ai and storyglue.app are available to register normally; storyglue.com is available but only via aftermarket purchase at a real premium price (not a normal registration fee).

Give your honest opinion on StoryGlue specifically:
- Does "glue" correctly capture the identity-lock mechanism (the thing that "glues" a character's identity across scenes/images), or does it suggest something else (assembly/collage, sticking things together randomly, adhesive/craft supplies)?
- Does "Story" correctly scope the product now that it does both a "Photos" project type (single subject, no real story/sequence) and a "Story" project type (scene sequence) - or does naming the whole product after just the Story half misrepresent the Photos half?
- .ai vs .app for this name specifically - which fits better and why?
- Is the .com aftermarket premium worth paying for this name, or is .ai/.app good enough at this stage (pre-launch, 20-50 friends, no Product Hunt yet)?

Give a real, opinionated final answer for this round: would you ship StoryGlue (and on which TLD), stick with keep.id from round 1/2, or is there a new name you'd propose instead now that you've seen three real candidates argued through?`

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

const outPath = path.join(ROOT, 'council-genstock-rebrand-3.md')
const body = results.map((r) => `## ${r.name}\n\n${r.response || `(failed: ${r.error})`}`).join('\n\n---\n\n')
fs.writeFileSync(outPath, `# Council opinions round 3: StoryGlue\n\n${body}\n`)
console.log(`\nDone. -> ${outPath}`)
