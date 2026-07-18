// Same proven pattern as Valid's callClaude (sync-agent-extension/extension.js).
const MODEL = 'claude-sonnet-4-5'

export async function callClaude(prompt, system, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const block = data.content.find((b) => b.type === 'text')
  return block ? block.text : ''
}
