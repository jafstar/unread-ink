// Real pacing analysis, shared by the whole-book report
// (scripts/storyglue-rhythm.mjs) and the live syncopation feedback loop
// (storyglue-chapter.mjs) - one measurement, two consumers. Computed from
// measurable stylometric signals (sentence length, dialogue density,
// urgency punctuation), never an LLM guess about "tension."
export function splitSentences(text) {
  return text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"'*])/).map((s) => s.trim()).filter(Boolean)
}

export function analyzeParagraph(p) {
  const sentences = splitSentences(p)
  const words = p.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const avgSentenceLen = sentences.length ? wordCount / sentences.length : wordCount
  const dialogueChars = (p.match(/"[^"]*"/g) || []).join('').length
  const dialogueRatio = p.length ? dialogueChars / p.length : 0
  const urgencyMarks = (p.match(/[!—]|\.\.\./g) || []).length
  const urgencyDensity = wordCount ? urgencyMarks / wordCount : 0
  // 6-word avg sentence -> pace 1.0 (fast); 30-word avg -> pace 0.0 (slow) - a real, if
  // simple, threshold matching typical short-punchy vs. long-expository prose.
  const lengthScore = Math.max(0, Math.min(1, 1 - (avgSentenceLen - 6) / 24))
  const paceScore = 0.5 * lengthScore + 0.3 * Math.min(1, dialogueRatio * 2) + 0.2 * Math.min(1, urgencyDensity * 20)
  return { wordCount, avgSentenceLen: Math.round(avgSentenceLen * 10) / 10, dialogueRatio: Math.round(dialogueRatio * 100) / 100, paceScore: Math.round(paceScore * 1000) / 1000 }
}

// Chapter "shape" - a diagnostic READING, not a generation rule (Mayor's
// framing: this stays an indicator on the book, not a constraint the
// writers are forced into). Splits the chapter into thirds by paragraph
// count and classifies how pace moves across them - the same "inhale/
// tension/exhale" idea, measured after the fact instead of prescribed.
export function classifyShape(openPace, midPace, closePace) {
  const THRESHOLD = 0.05
  if (closePace - openPace > THRESHOLD && closePace >= midPace - THRESHOLD) return 'escalating'
  if (midPace < openPace - THRESHOLD && midPace < closePace - THRESHOLD) return 'dip-then-rise'
  if (midPace > openPace + THRESHOLD && midPace > closePace + THRESHOLD) return 'spike-then-settle'
  if (openPace - closePace > THRESHOLD) return 'front-loaded'
  return 'steady'
}

// Analyzes one chapter's raw text (heading already stripped). Returns
// per-paragraph timeline plus chapter-level aggregates, including the
// shape classification.
export function analyzeChapterText(rawText) {
  const paragraphs = rawText.trim().split(/\n{2,}/).filter(Boolean)
  const paraStats = paragraphs.map((p) => ({ ...analyzeParagraph(p), excerpt: p.slice(0, 90) }))
  const wordCount = paraStats.reduce((s, p) => s + p.wordCount, 0)
  const avgPace = paraStats.length ? paraStats.reduce((s, p) => s + p.paceScore, 0) / paraStats.length : 0

  const third = Math.max(1, Math.floor(paraStats.length / 3))
  const openSlice = paraStats.slice(0, third)
  const midSlice = paraStats.slice(third, third * 2)
  const closeSlice = paraStats.slice(third * 2)
  const avgOf = (slice) => (slice.length ? slice.reduce((s, p) => s + p.paceScore, 0) / slice.length : avgPace)
  const openPace = avgOf(openSlice)
  const midPace = avgOf(midSlice)
  const closePace = avgOf(closeSlice)

  return {
    paragraphs: paraStats,
    paragraphCount: paraStats.length,
    wordCount,
    avgPace: Math.round(avgPace * 1000) / 1000,
    shape: {
      open: Math.round(openPace * 1000) / 1000,
      mid: Math.round(midPace * 1000) / 1000,
      close: Math.round(closePace * 1000) / 1000,
      pattern: classifyShape(openPace, midPace, closePace),
    },
  }
}
