// StoryGlue stage 1: 4 Round Table Knights (Claude/Gemini/ChatGPT/Radium)
// each independently pitch a plot for one big-answer premise. Review
// plots.md, then run storyglue-chapter1.mjs with the winning knight's key.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generatePlots } from '../lib/pipeline/plots.js'

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

const BIG_ANSWER = process.argv[2]
if (!BIG_ANSWER) {
  console.error('Usage: node scripts/storyglue-plots.mjs "<big answer>"')
  process.exit(1)
}

const slug = BIG_ANSWER.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const OUT_DIR = path.join(ROOT, 'books', `storyglue-${Date.now()}-${slug}`)
fs.mkdirSync(OUT_DIR, { recursive: true })

console.log(`Big answer: ${BIG_ANSWER}\n`)
console.log('=== Round Table: 4 knights pitching plots ===')
const plots = await generatePlots(BIG_ANSWER, keys)

fs.writeFileSync(path.join(OUT_DIR, 'plots.json'), JSON.stringify({ bigAnswer: BIG_ANSWER, plots }, null, 2))
const md = plots.map((p) => `## ${p.label}\n\n${p.plot}`).join('\n\n---\n\n')
fs.writeFileSync(path.join(OUT_DIR, 'plots.md'), `# Plot pitches\n\nBig answer: ${BIG_ANSWER}\n\n${md}\n`)

console.log(`\nDone. ${plots.length} plots -> ${path.join(OUT_DIR, 'plots.md')}`)
console.log(`\nPick a winner (${plots.map((p) => p.key).join('/')}), then run:`)
console.log(`  node scripts/storyglue-chapter1.mjs ${path.basename(OUT_DIR)} <winner-key>`)
