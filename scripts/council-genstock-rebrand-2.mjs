// Round 2 of the rebrand council: candidate name "charlock.app" (reads as
// "character lock" - the actual differentiator, not just "things change"
// like unstatic.art named). Also open the floor to any non-.com TLD.
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

const PROMPT = `Round 2 of a rebrand discussion. Quick recap of round 1: we asked the council about renaming genstock.photo (an AI stock-image tool whose real differentiator is IDENTITY-LOCK - lock a reference character/subject, then generate it consistently across different poses/scenes/eras/styles, not just "generate variations") to "unstatic.art." The council split 3-1 in favor of rebranding pre-launch, but flagged a real problem even among the "yes" votes: "unstatic" names the mechanic (static -> dynamic) but not the actual differentiator (the LOCK - consistency, not just variation). Two alternatives were floated: PersonaForge.art and keep.id.

New candidate for this round: **charlock.app** - reads as "character lock," directly naming the actual differentiator. Domain is a non-.com TLD (.app).

Give your honest opinion on charlock.app specifically:
- Does it land as "character lock" on first read, or does it read as something else entirely (a plant name - "charlock" is literally a real weed/plant, a fantasy character name, a typo, etc.)?
- How does .app compare to .art or .photo for this product - does .app correctly signal "real software tool" vs "art gallery" vs "stock library"?
- Say it out loud - is it easy to say, spell, and remember compared to unstatic.art?
- Is "character lock" too narrow now that the product also does non-character use cases (settings, scenes, objects), or is that the right scope to name yourself after?

Also: independent of charlock.app specifically, if you were picking ANY TLD except .com for this product, which would you actually pick and why (.app, .art, .io, .studio, .id, .ai, others) - what does each TLD actually signal to this audience (illustrators, indie creators, people who want a consistent character across images)?

Give a real, opinionated answer - which name would you actually ship: charlock.app, unstatic.art, one of the round-1 alternatives, or something new you'd propose instead?`

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

const outPath = path.join(ROOT, 'council-genstock-rebrand-2.md')
const body = results.map((r) => `## ${r.name}\n\n${r.response || `(failed: ${r.error})`}`).join('\n\n---\n\n')
fs.writeFileSync(outPath, `# Council opinions round 2: charlock.app + non-.com TLD picks\n\n${body}\n`)
console.log(`\nDone. -> ${outPath}`)
