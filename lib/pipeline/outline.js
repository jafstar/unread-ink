import { callRadium } from '../models/radium.js'
import { callChatGPT } from '../models/chatgpt.js'

// Outline council: Radium drafts the shape, ChatGPT tightens it and locks
// the final structure into strict JSON - the refine step is also the
// format-enforcement step, since asking for structured output on the
// FIRST pass (before the actual creative thinking has happened) tends to
// produce a worse outline than letting the draft think freely in prose
// first, then formalizing it.
const DRAFT_SYSTEM = 'You are a book editor drafting a structured outline for a new novel. Be concrete: a working title, a full chapter list where each chapter gets a one-paragraph summary of what actually happens, a character list with a line on each person, and a couple of sentences on tone/voice. Think in real story terms - stakes, arc, turns - not just a list of settings.'

const REFINE_SYSTEM = 'You are a second editor turning a draft outline into a final, structured outline. Tighten pacing, sharpen character motivations, make sure every chapter has a clear purpose and the arc actually resolves - but keep the same overall shape and chapter count unless something is genuinely broken. Output ONLY valid JSON, no markdown fences, no commentary, matching this exact shape: {"title": string, "premise": string, "tone": string, "characters": [{"name": string, "description": string}], "chapters": [{"number": number, "title": string, "summary": string}]}'

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  return JSON.parse(raw.trim())
}

export async function generateOutline(concept, keys) {
  console.log('  [outline] Radium drafting...')
  const draft = await callRadium(
    `Draft a full outline for this book concept: ${concept}\n\nAim for 8-12 chapters, a clear arc, and enough named characters to sustain a real story.`,
    DRAFT_SYSTEM,
    keys.radium
  )

  console.log('  [outline] ChatGPT refining + structuring...')
  const refinedText = await callChatGPT(
    `Here is a draft outline:\n\n${draft}\n\nTurn this into the final structured outline per your instructions.`,
    REFINE_SYSTEM,
    keys.chatgpt
  )

  try {
    return extractJson(refinedText)
  } catch (e) {
    throw new Error(`Outline refine step didn't return valid JSON: ${e.message}\n\nRaw response:\n${refinedText.slice(0, 500)}`)
  }
}
