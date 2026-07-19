# StoryGlue Writing Tools — a living catalog

This is a running record of the craft/QA tools built into the StoryGlue book pipeline — not the story-generation mechanism itself (see the Round Table entry below for that), but everything built *around* it to make the output better: catch real bugs, measure real signal, and steer the writing deliberately instead of leaving quality to chance.

**Why this document exists**: the pipeline is meant to keep growing tools like this over time — this is the platform's real differentiator, a living, visible process of craft rather than a black box that spits out a manuscript. Every tool below exists because a real problem showed up reading actual output, not because it sounded good in theory. Update this file whenever a new tool is added or an existing one changes.

**Positioning note**: the first real market for this is the "quick airport read" — commercial page-turner fiction, accessible and fast, for someone who wants *something* to read and nothing exact is available. That's the initial bar these tools are tuned against. Supporting genuinely different styles (literary, slow-burn, non-thriller pacing) is a real future direction, not yet built — most of the tools below (continuity, structure) are style-agnostic, but the pacing tools (rhythm analysis, syncopation) currently assume "faster is more engaging," which is a genre-specific assumption worth revisiting before this generalizes beyond thrillers.

---

## The generation mechanism (context, not a QA tool)

**Round Table** (`lib/pipeline/knights.js`, `plots.js`) — 4 models (Claude/Gemini/ChatGPT/Radium, no literary costume) independently pitch a plot for one premise. The Mayor picks a winner; that knight becomes **Lead Editor**, the other 3 (Chapter 1) or 2 (Chapter 2+) become **Writers**.

**Writer relay** (`storyglue-write.js`) — Chapter 1: 3 knights relay-write in sequence (start, refine, refine). Chapter 2+: only Gemini and ChatGPT write, in a 2-pass relay — Claude was deliberately pulled OUT of creative writing and given a dedicated checking role instead (see Continuity Checker).

**Xlectic editorial council** (`editorial.js`) — Portia/Horatio/Quixote, ported from hoo-r-u's real persona voices. Critique-only, never writes a word of prose. Reviews the writer relay's draft and hands notes to the Lead Editor.

**Lead Editor rewrite** (`leadEdit.js`) — the winning knight takes the draft + Xlectic's notes and produces the chapter's near-final form.

---

## QA tools (this is the growing list)

### 1. Continuity Checker
**File:** `continuityCheck.js` · **Runs:** after every writer pass, and once more after the Lead Editor's rewrite

Claude, in a dedicated role separate from writing, checks five things:
1. Factual contradictions (ages, names, established details that drifted)
2. Unbridged narrative jumps (this chapter assumes something happened that the previous chapter never showed)
3. Scene duplication (this chapter re-narrates a scene the previous chapter already told, even with new embellishment on top)
4. Outline drift (the chapter delivers different events than its own assigned outline beat)
5. Contradictions against the original plot pitch, even for details no chapter has restated on-page yet

**Real bugs this caught, in order discovered:** unbridged jump (Ch3 assumed an off-page body discovery), scene duplication (Ch3 re-told Ch2's footprint scene), outline drift (Ch7 retold Ch6 instead of its own assigned meadow scene), a plot-pitch contradiction (Ch10 invented "Nora Lin" instead of the established "Nora Cruz"), and a structural gap — the Lead Editor's own rewrite was never re-checked, so Ch10 shipped live with ~60 lines re-narrating Ch9's cave recap almost verbatim. Each bug was found by actually reading the finished book, not by the pipeline reporting success.

**Design detail that matters:** the immediately-previous chapter is passed to the checker as its own explicitly emphasized field, separate from all earlier chapters — by chapter 10, "everything before this" was an undifferentiated 8-chapter blob and the one boundary that actually mattered (exactly how chapter 9 ended) was getting lost in it.

### 2. Rhythm / Pacing Analyzer
**File:** `lib/pipeline/rhythmAnalysis.js` (shared logic), `scripts/storyglue-rhythm.mjs` (whole-book report)

Measures real, computable stylometric pacing signals per paragraph — average sentence length, dialogue density, urgency punctuation — combined into a 0–1 "pace score." Not sentiment, not an LLM's guess at "tension" — pure measurement. Whole-book output includes a per-chapter average and a full paragraph-by-paragraph timeline (see `rhythm-analysis.json` per book, and the one-off visualization published for "The Boundary Shift").

**Known honest limitation, now confirmed twice:** pace measures cadence, not drama or emotional register. Chapter 8 of "The Boundary Shift" (a bureaucratic interrogation, all dialogue) measured as the *fastest* chapter in that book — faster than the cave descent or the landslide. Chapter 4 of "The Breath of the Serpent" repeated the exact same pattern from the other direction: planned as a `low`-pace reflective breather (grief, a moral confrontation, real exhaustion), it measured `high` (0.577) purely because it's carried by short, terse dialogue exchanges ("I don't know." / "Good answer."), which the formula reads as fast regardless of what the scene is actually about. Two independent instances across two different books - a real, structural blind spot in the metric, not a fluke: **dialogue density and short sentences read as "fast" even when the content is quiet and introspective.** Worth knowing before trusting pace score alone as a page-turner guarantee; a genuine fix would need real content/semantic signal, not just sentence-length stylometry, and hasn't been attempted.

### 3. Chapter Shape (diagnostic reading, not a generation rule)
**File:** `rhythmAnalysis.js` → `classifyShape()`

Splits each chapter into thirds and classifies how pace moves across them: `escalating`, `dip-then-rise`, `spike-then-settle`, `front-loaded`, or `steady`. This is explicitly a *reading* on the finished chapter, not a constraint fed back into generation — it answers "does this chapter actually breathe the way a good chapter should" after the fact, the same way an editor would flag it, not a rule writers are forced to satisfy.

**First real finding:** across "The Boundary Shift"'s 11 chapters, only the two actual disaster-climax chapters (9, 10) measured as genuinely `escalating`. Five chapters open hot and taper off (`front-loaded`/`spike-then-settle`) rather than building into their ending — a real, specific craft note a human editor might reach for by feel, now backed by a number.

### 4. Macro-Waveform Outline Guidance
**File:** `storyglue-outline.js`

The outline stage (Lead Editor scoping the book after Chapter 1 is written) now explicitly rejects a straight escalating ramp — real page-turners breathe. Each chapter's outline entry declares its own `intendedPace` (`low`/`medium`/`high`) up front, and the system prompt requires the sequence across the book to actually form a wave (rises and dips), not a flat climb toward the end.

### 5. Syncopation Feedback Loop
**File:** `storyglue-write.js` → `paceSteerInstruction()`, logged via `syncopation-log.json` per book

Reactive pacing, built on real measured data, not a plan made once and forgotten. Before writing chapter N: (a) the outline's declared `intendedPace` for this chapter becomes an explicit writing instruction, and (b) the *actual measured pace* of chapter N-1 is checked — if it ran unusually fast or slow, the next chapter gets nudged the other direction even if the outline didn't explicitly plan for it (avoiding three consecutive chapters in the same register). After the chapter is finished, its own actual measured pace is compared against what was planned and logged as MATCHED or DRIFTED — a real, inspectable plan-vs-actual record, not just an assertion that the mechanism works.

### 6. Lexical Repetition Checker
**File:** `lib/pipeline/lexicalAnalysis.js` → `lexicalSteerInstruction()`

Real finding, live-caught reading two completely different books side by side: near-identical word counts regardless of story - "fingers" 23 vs 26 occurrences, "slick" 8 vs 8 (exact), "hum" 49 vs 38, "brush" 14 vs 14 (exact), across "The Breath of the Serpent" and "The Boundary Shift." Not story-specific drift - a genuine default vocabulary tic the underlying models reach for on "mysterious ancient thing + thriller tension" content, regardless of premise. Two-part fix: (1) a confirmed cross-book tic list (`KNOWN_TICS`: hum, vibration, fingers, slick, brush, resonance, pulse and their variants) is flagged in every chapter's writer instructions from chapter 1 onward, not just after it accumulates within one book, and (2) real word-frequency counting on what's actually been written so far in THIS book flags anything independently overused beyond the known list. Combined into one explicit "avoid these, find fresh alternatives" instruction fed to the writer relay before each chapter is drafted.

---

## Planned, not yet built

- **Direct-editing tooling** — a real interface for touching a finished/in-progress book directly, instead of only being able to regenerate a chapter through the pipeline. No committed timeline.
- **Diegetic audio** — embedded sound for in-world artifacts (radio dispatch, an archived field recording) tied to scroll position, extending the "do more with a webpage than static text+images" idea already proven by the sticky-scroll scene format.
- **Predictive (during-writing) pacing guidance** — the rhythm/syncopation tools above are diagnostic, describing pace that already exists. A real "what should the *next* chapter do" advisor is a genuinely harder, different tool, not yet attempted.
- **Genre-remix beat templates** — extracting a genre-agnostic "shape" that could be reapplied with a different prose style/atmosphere on the same underlying plot. Speculative, years-away scale, not scoped.
