// Pass 2: run once a book is fully drafted. Reads the whole manuscript at
// once and reports repeated sentence-level constructions/rhythms - see
// lib/pipeline/passTwo.js for why this can't be done per-chapter.
// Runs multiple models independently (same lesson Xlectic proved: a
// second model's read catches different things on the same text) and
// saves each as its own labeled report, no forced merge.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { runPassTwo } from '../lib/pipeline/passTwo.js'
import { callClaude } from '../lib/models/claude.js'
import { callGemini } from '../lib/models/gemini.js'
import { callChatGPT } from '../lib/models/chatgpt.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const MODELS = {
  claude: { label: 'Claude', fn: callClaude, key: process.env.ANTHROPIC_API_KEY },
  gemini: { label: 'Gemini', fn: callGemini, key: process.env.GEMINI_API_KEY },
  chatgpt: { label: 'ChatGPT', fn: callChatGPT, key: process.env.CHATGPT_API_KEY },
}

const bookFolder = process.argv[2]
// Optional "1-3" style range - lets a run be scoped to match what a
// specific outside review actually covered, for a real apples-to-apples
// comparison, instead of always auditing the whole book.
const rangeArg = process.argv[3]
// Optional model list, e.g. "claude,gemini" - defaults to both.
const modelsArg = process.argv[4]
const modelKeys = modelsArg ? modelsArg.split(',') : Object.keys(MODELS)

if (!bookFolder) {
  console.error('Usage: node scripts/storyglue-pass2.mjs <book-folder> [chapter-range e.g. 1-3] [models e.g. claude,gemini]')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const outline = fs.existsSync(path.join(bookDir, 'outline.json'))
  ? JSON.parse(fs.readFileSync(path.join(bookDir, 'outline.json'), 'utf8'))
  : { title: bookFolder }

let chapterFiles = fs.readdirSync(bookDir).filter((f) => /^chapter-\d+\.md$/.test(f)).sort()
if (rangeArg) {
  const [lo, hi] = rangeArg.split('-').map(Number)
  chapterFiles = chapterFiles.filter((f) => {
    const n = parseInt(f.match(/chapter-(\d+)\.md/)[1], 10)
    return n >= lo && n <= (hi || lo)
  })
}
const allChaptersText = chapterFiles.map((f) => fs.readFileSync(path.join(bookDir, f), 'utf8')).join('\n\n---\n\n')

console.log(`Book: ${outline.title}`)
console.log(`Auditing ${chapterFiles.length} chapters (${allChaptersText.split(/\s+/).length} words) with: ${modelKeys.join(', ')}\n`)

const suffix = rangeArg ? `-ch${rangeArg}` : ''

for (const key of modelKeys) {
  const model = MODELS[key]
  if (!model) { console.error(`Unknown model "${key}", skipping`); continue }

  let result
  try {
    result = await runPassTwo({ bookTitle: outline.title, allChaptersText, apiKey: model.key, callModel: model.fn, modelLabel: model.label })
  } catch (e) {
    console.error(`${model.label} failed after retries, skipping: ${e.message}`)
    continue
  }

  const modelSuffix = `${suffix}-${key}`
  fs.writeFileSync(path.join(bookDir, `pass2-report${modelSuffix}.json`), JSON.stringify(result, null, 2))

  const md = [
    `# Pass 2 report — ${outline.title}${rangeArg ? ` (chapters ${rangeArg})` : ''} — read by ${model.label}`,
    '',
    result.summary,
    '',
    ...result.findings.map((f) => [
      `## ${f.pattern}`,
      `**Severity:** ${f.severity} — **~${f.approximateCount} occurrences**`,
      '',
      ...f.examples.map((e) => `> Ch. ${e.chapter}: "${e.quote}"`),
      '',
    ].join('\n')),
  ].join('\n')
  fs.writeFileSync(path.join(bookDir, `pass2-report${modelSuffix}.md`), md)

  console.log(`\n${model.label}: ${result.findings.length} pattern(s) found:\n`)
  result.findings.forEach((f) => console.log(`  [${f.severity}] ${f.pattern} (~${f.approximateCount}x)`))
  console.log(`  -> ${path.join(bookDir, `pass2-report${modelSuffix}.md`)}`)
}
