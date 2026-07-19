import { callClaude } from '../models/claude.js'
import { callGemini } from '../models/gemini.js'
import { callChatGPT } from '../models/chatgpt.js'
import { callRadium } from '../models/radium.js'

// The 4 Round Table Knights - the same 4 models used all night for
// council opinions (rebrand naming, launch strategy), now cast as
// StoryGlue's plot-pitching/writing agents. No literary costume - that's
// Xlectic's job (lib/pipeline/editorial.js), a deliberately separate,
// critique-only layer.
export const KNIGHTS = {
  claude: { key: 'claude', label: 'Claude', fn: callClaude },
  gemini: { key: 'gemini', label: 'Gemini', fn: callGemini },
  chatgpt: { key: 'chatgpt', label: 'ChatGPT', fn: callChatGPT },
  radium: { key: 'radium', label: 'Radium', fn: callRadium },
}

export const KNIGHT_ORDER = ['claude', 'gemini', 'chatgpt', 'radium']
