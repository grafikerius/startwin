export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, lang } = payload;

    if (!text || text.length < 5) {
      return res.status(400).json({ error: 'Lütfen kendinizi biraz daha detaylı anlatın.' });
    }

    const isTr = lang === 'tr';
    const prompt = isTr
      ? `Aşağıdaki metni okuyan kişinin 16 MBTI kişilik tipinden (INTJ, ENFP, ISTP, vb.) hangisi olduğunu tahmin et.
Kullanıcının metni: "${text}"

Sadece ve KESİNLİKLE 4 harfli sonucu döndür (Örn: INFP). Başka hiçbir kelime, nokta, veya açıklama yazma.`
      : `Guess which of the 16 MBTI personality types (INTJ, ENFP, ISTP, etc.) this person is based on their text.
User's text: "${text}"

ONLY and STRICTLY return the 4-letter result (e.g. INFP). Do not write any other words, punctuation, or explanations.`;

    const anthropicUrl = 'https://api.anthropic.com/v1/messages';
    
    const aiRes = await fetch(anthropicUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    let replyText = aiData?.content?.[0]?.text?.trim();

    if (!replyText || replyText.length > 4) {
       replyText = "ENFP"; // Fallback
    }

    return res.status(200).json({ success: true, mbti: replyText.toUpperCase() });
  } catch (error: any) {
    console.error('MBTI API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
