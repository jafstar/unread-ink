// One-off: ask the real council (Claude, Gemini, ChatGPT, Radium) for
// their independent take on rebranding genstock.photo to unstatic.art.
// Reuses the exact model wrappers built for the book pipeline.
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

const PROMPT = `We're considering renaming genstock.photo to "unstatic.art" and want your real opinion before committing.

Real context on the product:
- Currently named/branded genstock.photo, live in production as of last night, soft-launching to a small friends-and-family group (20-50 people), Product Hunt deferred until later.
- Core mechanic: lock a reference image/character's identity, generate variations of it across 3 engines (Flux, Recraft, Gemini) via a client-side word-tag description builder (not a raw prompt box), compare/critique/curate, export.
- Real differentiator: the identity-lock mechanism has proven itself well beyond "stock photos" - it produces genuinely book-illustration-quality output, era-remixed character reimaginings (e.g. a detective character redesigned as "70s Sherlock"), and coherent multi-frame character walk cycles. A second project type called "Story" (describe a character in text, no photo upload, then sweep it across a written scene list) just shipped.
- So the product is really "identity-locked generative image platform," and "genstock.photo" (stock-photo framing) is arguably too narrow for what it now does - hence considering unstatic.art instead.
- "unstatic" plays on turning a static/locked reference into motion/variation while art broadens beyond "stock photo."

Give your honest opinion: is unstatic.art a genuinely better name for what this product actually does now, or is genstock.photo still fine? What does "unstatic.art" get right or wrong (clarity, memorability, SEO/discoverability, saying it out loud, domain-extension trust with a .art TLD, whether it undersells or oversells)? Would you rebrand now, at this exact pre-launch moment, or wait? Any alternative name worth considering instead? Give a real, opinionated answer, not a hedge.`

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

const outPath = path.join(ROOT, 'council-genstock-rebrand.md')
const body = results.map((r) => `## ${r.name}\n\n${r.response || `(failed: ${r.error})`}`).join('\n\n---\n\n')
fs.writeFileSync(outPath, `# Council opinions: genstock.photo -> unstatic.art rebrand\n\n${body}\n`)
console.log(`\nDone. -> ${outPath}`)
