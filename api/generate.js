// Vercel serverless function to proxy requests to the Gemini Generative Language API
// Expects a Vercel Environment Variable named `GEMINI_API_KEY` to be set (or GENERATIVE_API_KEY).
// This function forwards the incoming JSON payload to the Gemini endpoint and returns
// the API response body and status code back to the client.

export default async function handler(req, res) {
  // Basic CORS handling so this endpoint can be called from GitHub Pages or other origins.
  // For production restrict `allowedOrigin` to your specific origin instead of '*'.
  const allowedOrigin = '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Preflight request
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY || process.env.GENERATIVE_API_KEY || '';
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY environment variable' });
  }

  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

  try {
    const fetchResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Forward the client's payload as-is. The server controls the secret key.
      body: JSON.stringify(req.body)
    });

    const text = await fetchResponse.text();

    // Mirror the status code and content-type of the remote response where practical
    res.status(fetchResponse.status);
    const contentType = fetchResponse.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    // Send raw text so we don't double-JSON encode
    return res.send(text);
  } catch (err) {
    console.error('Proxy error to Gemini:', err);
    return res.status(502).json({ error: 'Failed to contact Gemini API', details: err.message });
  }
}
