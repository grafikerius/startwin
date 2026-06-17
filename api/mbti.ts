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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
      })
    });

    const aiData = await aiRes.json();
    let replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!replyText || replyText.length > 4) {
       replyText = "ENFP"; // Fallback
    }

    return res.status(200).json({ success: true, mbti: replyText.toUpperCase() });
  } catch (error: any) {
    console.error('MBTI API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
