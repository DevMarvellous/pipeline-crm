import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateScript } from './_lib/generate';

// Vercel serverless function. The Gemini key stays here, server-side only.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'bad_request' });
    return;
  }
  try {
    // req.body is already parsed by Vercel when Content-Type is JSON.
    const result = await generateScript(req.body, process.env.GEMINI_API_KEY);
    if (result.message) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(result.status).json({ error: result.error ?? 'gemini_down' });
    }
  } catch (err) {
    // Absolute backstop — the function must never crash unhandled.
    console.error('[generate-script] unhandled error:', err);
    res.status(500).json({ error: 'gemini_down' });
  }
}
