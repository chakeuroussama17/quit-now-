/**
 * Core proxy logic, shared by the Vercel function (api/chat.js) and the local
 * dev server (local-server.mjs). The OpenAI key lives ONLY here on the server —
 * it is never shipped in the app bundle.
 */

const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 8000;
const MAX_TOKENS_CAP = 900;

/** Validates the request body and returns { status, payload }. */
export async function completeChat(body, apiKey) {
  if (!apiKey) {
    return { status: 500, payload: { error: 'OPENAI_API_KEY is not configured on the server' } };
  }

  const { messages, max_tokens = 400, json = false } = body ?? {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return { status: 400, payload: { error: 'messages must be a non-empty array (max 40)' } };
  }
  for (const m of messages) {
    const roleOk = m && ['system', 'user', 'assistant'].includes(m.role);
    const contentOk = typeof m?.content === 'string' && m.content.length <= MAX_CONTENT_CHARS;
    if (!roleOk || !contentOk) {
      return { status: 400, payload: { error: 'invalid message shape' } };
    }
  }

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: Math.min(Number(max_tokens) || 400, MAX_TOKENS_CAP),
      temperature: 0.7,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 300);
    return { status: 502, payload: { error: 'upstream_error', detail } };
  }

  const data = await upstream.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return { status: 200, payload: { content } };
}
