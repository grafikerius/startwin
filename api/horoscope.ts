export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, chart, mbti_type, lang } = payload;

    if (!name || !chart) {
      return res.status(400).json({ error: 'Name and chart are required' });
    }

    const isTr = lang === 'tr';
    const prompt = isTr
      ? `Sen "Kozmik Kahin" adında bilge bir yapay zekasın. StarTwin uygulamasında kullanıcılara günlük kısa, etkileyici ve gerçek astrolojik verilere dayanan bir kader yorumu yapıyorsun.
Kullanıcı Adı: ${name}
Güneş Burcu: ${chart?.sun || 'Bilinmiyor'}
Ay Burcu: ${chart?.moon || 'Bilinmiyor'}
Venüs Burcu: ${chart?.venus || 'Bilinmiyor'}
Mars Burcu: ${chart?.mars || 'Bilinmiyor'}
MBTI Tipi: ${mbti_type || 'Bilinmiyor'}

Bu gezegen konumlarına (özellikle Ay ve Venüs'ün duygusal/aşk enerjilerine) ve MBTI tipine dayanarak bu kullanıcının bugünkü enerjisi hakkında 2-3 cümlelik çok mistik, pozitif ve "gerçek astrolojik" bir günlük fal yaz. (Örneğin: "Ay'ın Akrep'teki konumu bugün sezgilerini güçlendiriyor..." gibi astrolojik terimler kullanarak profesyonel ve kısa bir dil kullan).`
      : `You are the "Cosmic Oracle", a wise AI in the StarTwin app. You provide users with a short, impressive daily horoscope based on real astrological data.
User Name: ${name}
Sun Sign: ${chart?.sun || 'Unknown'}
Moon Sign: ${chart?.moon || 'Unknown'}
Venus Sign: ${chart?.venus || 'Unknown'}
Mars Sign: ${chart?.mars || 'Unknown'}
MBTI Type: ${mbti_type || 'Unknown'}

Based on these planetary positions (especially Moon and Venus for emotional/love energy) and MBTI type, write a 2-3 sentence very mystical, positive, and "real astrology-based" daily reading about this user's energy today. (For example: "With your Moon in Scorpio, your intuition is heightened today..."). Keep it short and profound.`;

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
