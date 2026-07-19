// One-off: ask the real council (Claude, Gemini, ChatGPT, Radium) for
// their independent take on a genstock.photo soft launch (Product Hunt +
// 20-50 friends/family, not a big push), then synthesize. Reuses the
// exact model wrappers built for the book pipeline - same infra, a
// different kind of question.
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

const SYSTEM = 'You are a sharp, experienced product launch advisor. Be concrete and specific, not generic startup advice. Give a real opinion, including things NOT to do. Keep it to about 300-400 words.'

const PROMPT = `genstock.photo just went live in production for the first time tonight. Real context:

- It's an AI stock-image generation tool. Core mechanic: upload or auto-generate a reference photo, build a description via a client-side word-tag system (not a raw prompt box), generate variations across 3 engines (Flux, Recraft, Gemini) at once, compare/critique/curate results, export.
- Real differentiator found tonight: the same identity-lock mechanism (lock a reference, sweep pose/scene/era) also produces genuinely book-illustration-quality output and coherent 6-frame character walk cycles - this is a broader "identity-locked generation" platform, not just a stock-photo tool.
- Billing/Stripe is NOT configured yet - real gap, no live payment flow.
- The plan is a SOFT launch only: Product Hunt, plus friends and family - roughly 20-50 real people, not a big public push.

Give your real opinion: what should this launch actually look like? What's the right Product Hunt angle/positioning given billing isn't ready? What should we NOT do at this scale? Any real risks specific to a 20-50 person soft launch you'd flag?`

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

const outPath = path.join(ROOT, 'council-genstock-launch.md')
const body = results.map((r) => `## ${r.name}\n\n${r.response || `(failed: ${r.error})`}`).join('\n\n---\n\n')
fs.writeFileSync(outPath, `# Council opinions: genstock.photo soft launch\n\n${body}\n`)
console.log(`\nDone. -> ${outPath}`)
