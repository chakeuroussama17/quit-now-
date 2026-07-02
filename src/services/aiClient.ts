/**
 * Thin HTTP client for the backend proxy. The app NEVER holds the OpenAI key —
 * it only knows the proxy URL (EXPO_PUBLIC_AI_PROXY_URL), which is public by
 * nature. No URL configured = AI features quietly fall back to bundled copy.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const PROXY_URL = (process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

export function aiConfigured(): boolean {
  return PROXY_URL.length > 0;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  if (!aiConfigured()) throw new AiUnavailableError('AI proxy not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${PROXY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages,
        max_tokens: opts.maxTokens ?? 400,
        json: opts.json ?? false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AiUnavailableError(`proxy responded ${res.status}`);
    const data = (await res.json()) as { content?: string };
    if (!data.content) throw new AiUnavailableError('empty response');
    return data.content;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(String(err));
  } finally {
    clearTimeout(timer);
  }
}
