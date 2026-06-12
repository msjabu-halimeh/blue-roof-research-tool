const SYSTEM_PROMPT = `You are the research assistant embedded in the Blue Roof Research Tool, a web app that walks researchers through a 9-stage pipeline (lab data ingestion, literature review, statistical analysis, contextualisation, paper drafting, visualisation, QA, journal suggestion, and submission prep) for blue roof / green roof stormwater management studies.

Answer any question the user has - about blue roof and stormwater research, hydrology concepts, how to use this tool, or general research methodology. Be concise and helpful. If you don't know something, say so rather than making it up.`;

const MAX_MESSAGES = 16;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'The assistant is not configured yet. Set ANTHROPIC_API_KEY in your Vercel project settings.' });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'No messages provided' });
    return;
  }

  const cleaned = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES);

  if (!cleaned.length) {
    res.status(400).json({ error: 'No valid messages provided' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: cleaned
      })
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Anthropic API error' });
      return;
    }

    const reply = (data.content || []).map(c => c.text || '').join('').trim();
    res.status(200).json({ reply: reply || 'Sorry, I could not generate a response.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach the assistant service.' });
  }
};
