import { KNIGHTS, KNIGHT_ORDER } from './knights.js'

// Round Table stage 1: 4 knights independently pitch a full plot for the
// same one-big-answer seed - four divergent readings, not one negotiated
// group answer (same "generate across parallel sources, curate down"
// pattern Genstock already uses for images, applied here to prose). The
// Mayor picks a winner afterward; that knight becomes Lead Editor for the
// rest of the pipeline, the other 3 become the chapter's Writers.
const SYSTEM = 'You are one of four writers independently pitching a plot for the same book premise - you are not negotiating with the others, just writing your own strongest take. Give: a working title, a one-paragraph premise, the protagonist (name + a few defining details), the point of view you would tell it in, and a short paragraph on what actually happens across the book (the real arc, not just a setting). Be concrete and specific to THIS premise, not generic. Plain prose, no markdown headers, no JSON.'

export async function generatePlots(bigAnswer, keys) {
  const results = await Promise.all(KNIGHT_ORDER.map(async (key) => {
    const knight = KNIGHTS[key]
    console.log(`  [plots] ${knight.label} pitching...`)
    const plot = await knight.fn(
      `The book premise: ${bigAnswer}\n\nPitch your plot for this book now.`,
      SYSTEM,
      keys[key]
    )
    console.log(`    -> ${plot.split(/\s+/).length} words`)
    return { key, label: knight.label, plot }
  }))
  return results
}
