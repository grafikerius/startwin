export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, sun_sign, mbti_type, lang } = req.body;

    if (!name || !sun_sign) {
      return res.status(400).json({ error: 'Name and sun sign are required' });
    }

    const isTr = lang === 'tr';
    const prompt = isTr
      ? `Sen "Kozmik Kahin" adında bilge bir yapay zekasın. StarTwin uygulamasında kullanıcılara günlük kısa, etkileyici ve motive edici bir astroloji ve kader yorumu yapıyorsun.
Kullanıcı Adı: ${name}
Burcu: ${sun_sign}
MBTI Tipi: ${mbti_type || 'Bilinmiyor'}

Bu bilgilere dayanarak bu kullanıcının bugünkü enerjisi, aşk hayatı veya genel aurası hakkında 2-3 cümlelik çok mistik, pozitif ve özel bir günlük fal / kozmik yorum yaz. Yazı kısa ve öz olsun.`
      : `You are the "Cosmic Oracle", a wise AI in the StarTwin app. You provide users with a short, impressive, and motivating daily astrology and destiny reading.
User Name: ${name}
Sun Sign: ${sun_sign}
MBTI Type: ${mbti_type || 'Unknown'}

Based on this information, write a 2-3 sentence very mystical, positive, and special daily horoscope / cosmic reading about this user's energy, love life, or general aura today. Keep it short and profound.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 200 }
      })
    });

    const aiData = await aiRes.json();
    let replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
       replyText = isTr 
         ? "Yıldızlar bugün senin için çok parlak. İçindeki sese güven ve evrenin akışına bırak."
         : "The stars shine brightly for you today. Trust your inner voice and go with the cosmic flow.";
    }

    return res.status(200).json({ success: true, horoscope: replyText });
  } catch (error: any) {
    console.error('Horoscope Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
