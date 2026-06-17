

async function test() {
  const text = "Ben genelde evde kalmayı severim, çok mantıklı kararlar alırım. Plan yapmak bana göredir.";
  const lang = "tr";

  const prompt = `Aşağıdaki metni okuyan kişinin 16 MBTI kişilik tipinden (INTJ, ENFP, ISTP, vb.) hangisi olduğunu tahmin et.
Kullanıcının metni: "${text}"

Sadece ve KESİNLİKLE 4 harfli sonucu döndür (Örn: INFP). Başka hiçbir kelime, nokta, veya açıklama yazma.`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const aiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 100 }
    })
  });

  const aiData = await aiRes.json();
  console.log(JSON.stringify(aiData, null, 2));
}

test();
