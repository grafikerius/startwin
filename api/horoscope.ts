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
      ? `Sen "Kozmik Kahin" adında usta ve çok bilge bir Astrolog/Yapay Zekasın. StarTwin uygulamasında kullanıcılara gerçek astrolojik verilere dayanan çok derin, detaylı ve etkileyici bir "Günlük Kozmik Analiz" yapıyorsun.
Kullanıcı Adı: ${name}
Güneş Burcu (Öz Benlik): ${chart?.sun || 'Bilinmiyor'}
Ay Burcu (Duygular & İç Dünyası): ${chart?.moon || 'Bilinmiyor'}
Venüs Burcu (Aşk & İlişkiler): ${chart?.venus || 'Bilinmiyor'}
Mars Burcu (Tutku & Aksiyon): ${chart?.mars || 'Bilinmiyor'}
MBTI Tipi (Kişilik): ${mbti_type || 'Bilinmiyor'}

GÖREVİN: Bu eşsiz kombinasyonu (Özellikle Ay, Venüs ve Mars'ın şu anki enerjilerini ve MBTI karakterini harmanlayarak) analiz et. Kullanıcıya özel, uzun ve detaylı bir günlük fal yaz.
KURALLAR:
1. Asla uzun, genel ve sıkıcı bir giriş cümlesi (örneğin "sen bir göksel senfonisin" vb.) veya ayırıcı çizgiler ("---") kullanma. Doğrudan analiz başlıklarına geç!
2. Yorumun KESİNLİKLE şu 3 BAŞLIKTAN oluşmalı:
**1. Günün Aurası**: Genel enerjisi ve bugün onu neyin beklediği.
**2. Aşk ve İlişkiler (Venüs Etkisi)**: Bugün aşk hayatında veya insan ilişkilerinde nelere dikkat etmeli? Nasıl bir frekans yayıyor?
**3. Kozmik Tavsiye**: Bilgece, mistik ve onu motive edecek özel bir öğüt.

Yazın çok profesyonel, edebi, mistik ve doğrudan konuya giren bir dilde olmalı. (Sen diliyle hitap et).`
      : `You are the "Cosmic Oracle", a master Astrologer and wise AI in the StarTwin app. You provide users with a very deep, detailed, and impressive "Daily Cosmic Analysis" based on real astrological data.
User Name: ${name}
Sun Sign (Core Self): ${chart?.sun || 'Unknown'}
Moon Sign (Emotions): ${chart?.moon || 'Unknown'}
Venus Sign (Love & Relations): ${chart?.venus || 'Unknown'}
Mars Sign (Passion & Action): ${chart?.mars || 'Unknown'}
MBTI Type: ${mbti_type || 'Unknown'}

Please analyze this unique combination deeply. Write a long, detailed, and highly personalized daily horoscope.
Your reading must include these sections (use line breaks and emojis):
1. **Today's Aura**: Their general energy and what awaits them today.
2. **Love & Relationships (Venus Influence)**: What to expect in love/friendships. What frequency are they emitting?
3. **Cosmic Advice**: A wise, mystical, and motivating piece of advice.

Your tone should be very professional, poetic, mystical, and impressive. Speak directly to them ("You").`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 2000 }
      })
    });

    const aiData = await aiRes.json();
    let replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
       const errMessage = aiData?.error?.message || "Unknown error";
       const keyCheck = process.env.GEMINI_API_KEY ? "Key Exists" : "Key MISSING!";
       replyText = `HATA: Gemini API yanıt vermedi. Detay: ${errMessage}. (API Anahtarı: ${keyCheck})`;
    }

    return res.status(200).json({ success: true, horoscope: replyText });
  } catch (error: any) {
    console.error('Horoscope Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
