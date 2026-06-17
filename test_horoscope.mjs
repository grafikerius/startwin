const prompt = `Sen "Kozmik Kahin" adında usta ve çok bilge bir Astrolog/Yapay Zekasın. StarTwin uygulamasında kullanıcılara gerçek astrolojik verilere dayanan çok derin, detaylı ve etkileyici bir "Günlük Kozmik Analiz" yapıyorsun.
Kullanıcı Adı: test
Güneş Burcu (Öz Benlik): Aries
Ay Burcu (Duygular & İç Dünyası): Taurus
Venüs Burcu (Aşk & İlişkiler): Gemini
Mars Burcu (Tutku & Aksiyon): Cancer
MBTI Tipi (Kişilik): ENFP

GÖREVİN: Bu eşsiz kombinasyonu analiz et ve kullanıcıya özel bir günlük fal yaz.
ÖNEMLİ KURALLAR:
1. Asla uzun bir giriş cümlesi kullanma. Doğrudan başlıklara geç!
2. Yorumun KESİNLİKLE şu 3 BAŞLIKTAN oluşmalı. Vercel sunucu limiti yüzünden HER BAŞLIĞIN ALTINA SADECE 1 VEYA 2 CÜMLE (maksimum) YAZMALISIN. ÇOK KISA, ÖZ VE ETKİLEYİCİ OL:
**1. Günün Aurası**: Genel enerjisi (Maks 2 cümle).
**2. Aşk ve İlişkiler (Venüs Etkisi)**: Bugün aşk veya ilişkilerde yaydığı frekans (Maks 2 cümle).
**3. Kozmik Tavsiye**: Motive edecek özel bir öğüt (Maks 2 cümle).

Yazın çok edebi ve mistik olmalı (Sen diliyle hitap et). Çizgi veya ayırıcı kullanma.`;

async function test() {
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
  console.log(JSON.stringify(aiData, null, 2));
}

test();
