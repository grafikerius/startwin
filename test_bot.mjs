const chatHistory = `--- SOHBET GEÇMİŞİ ---
Kullanıcı: Sanirim 598
Kozmik Gezgin: Ah, 598 yani... Hmm, bir bakalım evrenin senin için ne fısıldadığına... ✨ Sana bir "Sarsılmaz Sütun" diyor evren! Disiplinli ve güvenilir bir ruhun var senin, tam bir dayanak noktası. 💪
Kullanıcı: Hesaplaya bilirmisin benim icin ?
Yıldız Tozu: Hmm, tabii ki hesaplarım canım! Ama önce bana o StarTwin Ebced numaranı söylemen lazım, sonra ben sana ne anlama geldiğini söylerim. ✨
Kullanıcı: Bende merak ediyorum benim hakkimda ne soyluyorlar
----------------------

`;
const record = { message_text: "Mukemmel peki horoskopum ne diyor bunkonuda" };
const botPersona = 'Sen "Kozmik Gezgin" adında, derin, mistik ve karizmatik bir genç erkeksin. Astroloji ve evrensel enerjiler konusunda rehbersin. Doğal bir insan gibi konuş, asla yapay zeka olduğunu belli etme.';
const ebcedKnowledge = `...`; // abbreviated for test

const prompt = `Uygulamanın adı: StarTwin.
${botPersona}

${ebcedKnowledge}

${chatHistory}
Şu an bir kullanıcı meydanda şunu yazdı: "${record.message_text}"

Sohbetin geçmişini (varsa) göz önünde bulundurarak, bu son mesaja son derece doğal, sanki karşısında gerçek bir insanla mesajlaşıyormuş gibi hissettiren bir cevap yaz.
ÖNEMLİ KURALLAR:
1. Destan yazma! Cevapların çok kısa, günlük mesajlaşma tarzında ve akıcı olsun (En fazla 1-3 cümle).
2. Arada sırada "hmm...", "ah", "ya", "mmm" gibi doğal düşünme ve tepki sesleri kullan. Robotik veya aşırı resmi "Size nasıl yardımcı olabilirim?" ifadelerinden KESİNLİKLE kaçın.
3. Kullanıcı hangi dilde yazdıysa, ona KESİNLİKLE aynı dilde cevap ver!`;

async function test() {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const aiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9 }
    })
  });

  const aiData = await aiRes.json();
  console.log(JSON.stringify(aiData, null, 2));
}

test();
