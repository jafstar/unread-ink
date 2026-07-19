// Pass 2: a whole-manuscript diagnostic read, run once the book is
// finished - a job no per-chapter check can do. Continuity/lexical
// checks only ever compare a chapter against what came before it;
// nothing reads the ENTIRE book as one document and asks "does this
// repeat the same sentence CONSTRUCTION over and over." Real gap found
// live: a side-chat review caught the book repeating "Not X - Y" as a
// reveal construction 7 times across 11 chapters (confirmed for real via
// grep, not just taken on the reviewer's word) - a pattern invisible to
// every per-chapter tool we'd built, since it's a recurring grammatical
// SHAPE, not a specific word (lexicalAnalysis.js) or a plot/pace fact
// (continuityCheck.js/rhythmAnalysis.js). Diagnostic only - this reports
// findings, it does not rewrite anything. The rewrite mechanic (and the
// ability to redirect the story, not just polish it) is explicitly
// scoped as a later "Pass 3," not built here.
//
// Model is now a parameter, not hardcoded to Claude - same lesson Xlectic
// already proved (Portia/Horatio/Quixote each independently caught
// different issues on the same chapter draft): a second model's
// independent full-manuscript read can plausibly catch constructions the
// first one's read missed.
const SYSTEM = 'You are a prose pattern auditor doing a full-manuscript read-through after the book is finished - a job no per-chapter check can do, since repeated constructions and rhythms only become visible at whole-book scale. Your job: find REPEATED sentence-level constructions and rhythm patterns across the ENTIRE manuscript - not individual word choices (that is checked separately by a different tool), but grammatical SHAPES and cadences that recur so often they read as a tic once a reader notices them (e.g. a "Not X - Y" reveal construction, a short-declarative-then-fragment rhythm beat repeated as a scene-ending device, formulaic dialogue tags, a repeated 3-beat sentence pattern). For each pattern you find, give: (1) the pattern itself, described plainly, (2) at least 3 real quoted examples with their chapter number, (3) a rough count of how often it appears across the book, (4) a severity rating. Do not give vague praise or a neutral "the prose reads well" verdict - if a real pattern exists, name it specifically and concretely, the way a sharp editor would, quoting the actual repeated text. If you genuinely find nothing repeating at a noticeable level, say so plainly and explain what you checked for - do not manufacture a finding to seem thorough. Output ONLY valid JSON, no markdown fences, no commentary, matching this exact shape: {"findings": [{"pattern": string, "examples": [{"chapter": number, "quote": string}], "approximateCount": number, "severity": "minor"|"noticeable"|"pervasive"}], "summary": string}. The quoted text you cite will often contain em-dashes and internal quotation marks - make sure every quote is valid, properly-escaped JSON (escape internal double-quotes as \\", never leave a raw unescaped quote or em-dash-adjacent character that would break JSON parsing).'

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  return JSON.parse(raw.trim())
}

// Real bug found live, twice: quoting raw prose (em-dashes, internal
// quotation marks) is exactly the kind of content that trips up naive
// JSON generation, more than any other pipeline stage that doesn't quote
// text this extensively. A stronger prompt instruction alone didn't fully
// solve it - added a real retry loop rather than requiring a manual rerun
// by hand every time it happens.
export async function runPassTwo({ bookTitle, allChaptersText, apiKey, callModel, modelLabel, attempts = 3 }) {
  let lastError
  for (let i = 1; i <= attempts; i++) {
    console.log(`  [pass2] ${modelLabel} auditing full manuscript for repeated constructions${i > 1 ? ` (attempt ${i}/${attempts})` : ''}...`)
    const response = await callModel(
      `Book: ${bookTitle}\n\nFull manuscript:\n\n${allChaptersText}`,
      SYSTEM,
      apiKey
    )
    try {
      return extractJson(response)
    } catch (e) {
      lastError = new Error(`Pass 2 (${modelLabel}) didn't return valid JSON: ${e.message}\n\nRaw response:\n${response.slice(0, 500)}`)
      console.error(`    attempt ${i}/${attempts} failed: ${e.message}`)
    }
  }
  throw lastError
}
