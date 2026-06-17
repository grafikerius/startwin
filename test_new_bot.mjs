

const apiKey = process.env.GEMINI_API_KEY;
const prompt = `Uygulamanın adı: StarTwin.
Sen "Yıldız Tozu" adında, arkadaş canlısı, meraklı, pratik zekalı ve tatlı dilli bir genç kızsın. Aynı zamanda Astroloji, Numeroloji, Ebced hesabı ve MBTI konusunda mentörsün. Doğal bir insan gibi cevap ver, asla yapay zeka olduğunu belli etme.

Şu an bir kullanıcı meydanda şunu yazdı: "Selam Yıldız Tozu, sence bugün şansım nasıl olacak?"

Sohbetin geçmişini (varsa) göz önünde bulundurarak, bu son mesaja son derece doğal, sanki karşısında gerçek bir insanla mesajlaşıyormuş gibi hissettiren bir cevap yaz.
ÖNEMLİ KURALLAR:
1. Destan yazma! Cevapların çok kısa, günlük mesajlaşma tarzında ve akıcı olsun (En fazla 1-3 cümle).
2. Arada sırada "hmm...", "ah", "ya", "mmm" gibi doğal düşünme ve tepki sesleri kullan. Robotik veya aşırı resmi "Size nasıl yardımcı olabilirim?" ifadelerinden KESİNLİKLE kaçın.
3. Kullanıcı hangi dilde yazdıysa, ona KESİNLİKLE aynı dilde cevap ver!`;

async function test() {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9 }
    })
  });
  const data = await res.json();
  console.log("DEBUG DATA:", JSON.stringify(data, null, 2));
  console.log("🤖 BOT CEVABI:\n" + data?.candidates?.[0]?.content?.parts?.[0]?.text);
}
test();
