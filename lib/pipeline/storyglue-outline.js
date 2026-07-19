import { KNIGHTS } from './knights.js'

// Outline stage, deliberately AFTER Chapter 1 instead of before it -
// Chapter 1 is written first (writer relay + Xlectic + Lead Editor,
// storyglue-write.js/editorial.js/leadEdit.js), then the Lead Editor scopes
// the rest of the book against what actually got written, not a guess made
// before any prose existed. Chapter 1 is treated as canon; the outline only
// covers what comes after it.
const SYSTEM = 'You are the Lead Editor of this book, scoping out the rest of it now that Chapter 1 is written and locked. Given the winning plot pitch and the actual final Chapter 1 text (which may have introduced or changed details beyond the original pitch - Chapter 1 is canon now), write a full chapter-by-chapter outline for the REMAINING chapters of the book (do not include Chapter 1, it is already done). Aim for 7-11 more chapters, a clear escalating arc that pays off the premise and Chapter 1\'s specific setup, and a one-paragraph summary of what actually happens in each. Output ONLY valid JSON, no markdown fences, no commentary, matching this exact shape: {"title": string, "chapters": [{"number": number, "title": string, "summary": string}]}. Chapter numbers start at 2.'

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  return JSON.parse(raw.trim())
}

export async function generateOutlineAfterChapter1({ bigAnswer, winningPlot, chapter1Text, editorKey, keys }) {
  const editor = KNIGHTS[editorKey]
  console.log(`  [outline] ${editor.label} (Lead Editor) scoping the rest of the book...`)
  const response = await editor.fn(
    `Book premise: ${bigAnswer}\n\nOriginal winning plot pitch:\n${winningPlot}\n\nFinal Chapter 1 (canon):\n\n${chapter1Text}\n\nWrite the outline for the rest of the book now.`,
    SYSTEM,
    keys[editorKey]
  )
  try {
    return extractJson(response)
  } catch (e) {
    throw new Error(`Outline didn't return valid JSON: ${e.message}\n\nRaw response:\n${response.slice(0, 500)}`)
  }
}
