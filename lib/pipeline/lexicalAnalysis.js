// Real, measured vocabulary-repetition check - same discipline as
// rhythmAnalysis.js (measure the actual text, don't just tell the writer
// to "try harder"). Real finding, live-caught reading two completely
// different books side by side: near-identical word counts regardless of
// story - "fingers" 23 vs 26, "slick" 8 vs 8 (exact), "hum" 49 vs 38,
// "brush" 14 vs 14 (exact). Not story-specific drift, a genuine model
// default for "mysterious ancient thing + thriller tension" content.
const STOPWORDS = new Set(['this', 'that', 'these', 'those', 'with', 'from', 'have', 'were', 'they', 'them', 'their', 'there', 'then', 'than', 'what', 'when', 'where', 'which', 'while', 'would', 'could', 'should', 'about', 'into', 'through', 'toward', 'towards', 'over', 'under', 'again', 'still', 'even', 'just', 'only', 'been', 'being', 'more', 'most', 'some', 'such', 'each', 'every', 'other', 'another', 'because', 'before', 'after', 'against', 'between', 'around', 'below', 'above', 'behind', 'beneath', 'here', 'like', 'said', 'says', 'felt', 'feel', 'knew', 'know', 'looked', 'look', 'seemed', 'seem'])

// Confirmed real offenders - flagged immediately, not only after
// accumulating occurrences within one book, since the data shows these
// are already overused from chapter 1 onward regardless of story.
export const KNOWN_TICS = ['hum', 'humming', 'vibration', 'vibrating', 'vibrated', 'fingers', 'slick', 'brush', 'brushed', 'brushing', 'resonance', 'resonant', 'resonated', 'resonating', 'pulse', 'pulsing', 'pulsed']

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || [])
}

export function wordFrequency(text) {
  const freq = {}
  for (const w of tokenize(text)) {
    if (w.length < 4 || STOPWORDS.has(w)) continue
    freq[w] = (freq[w] || 0) + 1
  }
  return freq
}

export function overusedWords(priorChaptersText, threshold = 6) {
  const freq = wordFrequency(priorChaptersText || '')
  return Object.entries(freq)
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w, c]) => ({ word: w, count: c }))
}

// Combines the confirmed cross-book tics (always active) with whatever
// this specific book has independently started overusing (dynamic,
// computed from what's actually been written so far).
export function lexicalSteerInstruction(priorChaptersText) {
  const dynamic = overusedWords(priorChaptersText).map((o) => o.word)
  const combined = [...new Set([...KNOWN_TICS, ...dynamic])].slice(0, 15)
  if (combined.length === 0) return ''
  return `\n\nVocabulary variety: this genre (and this book specifically) tends to overuse certain sensory words - avoid leaning on these unless truly necessary, find fresh and specific alternatives instead: ${combined.join(', ')}.`
}
