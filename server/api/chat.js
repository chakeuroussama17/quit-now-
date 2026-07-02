import { completeChat } from '../lib/complete.mjs';

/** Vercel serverless function: POST /api/chat { messages, max_tokens?, json? } */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const { status, payload } = await completeChat(req.body, process.env.OPENAI_API_KEY);
    res.status(status).json(payload);
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err).slice(0, 200) });
  }
}
