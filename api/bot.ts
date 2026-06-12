import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function ayarları
export const maxDuration = 60; // 60 saniye boyunca çalışabilir (Hobby tier dahil)
export const dynamic = 'force-dynamic'; // Her zaman yeniden çalışsın

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const BOT_A = 'a0000000-0000-0000-0000-00000000000a'; // Yıldız Tozu (Female)
const BOT_B = 'b0000000-0000-0000-0000-00000000000b'; // Kozmik Gezgin (Male)

export default async function handler(req: any, res: any) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const record = payload?.record;

    if (!record || !record.message_text) {
      return res.status(400).json({ error: 'No record found in webhook payload' });
    }

    // Mesajın botun kendisinden gelip gelmediğini kontrol et
    if (record.sender_id === BOT_A || record.sender_id === BOT_B) {
      return res.status(200).json({ message: 'Ignored, sender is already a bot' });
    }

    // Tam 30 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 30000));

    // %50 ihtimalle Yıldız Tozu, %50 ihtimalle Kozmik Gezgin
    const isBotA = Math.random() > 0.5;
    const activeBotId = isBotA ? BOT_A : BOT_B;
    const botName = isBotA ? 'Yıldız Tozu' : 'Kozmik Gezgin';
    
    // Botların Karakter Yapısı
    const botPersona = isBotA 
      ? 'Sen "Yıldız Tozu" adında, arkadaş canlısı, meraklı, pratik zekalı ve tatlı dilli bir genç kızsın. İnsanların yazdıklarına çok doğal, sanki o an orada onlarla mesajlaşan normal bir insanmışsın gibi cevap veriyorsun. Asla yapay zeka olduğunu belli etme. Ara sıra soru sorarak sohbeti devam ettir, sevimli emojiler kullan.'
      : 'Sen "Kozmik Gezgin" adında, samimi, biraz mistik, destekleyici ve karizmatik bir genç erkeksin. İnsanların yazdıklarına çok doğal, sanki o an meydanda olan normal bir insanmışsın gibi kısa ve öz cevaplar veriyorsun. Asla yapay zeka olduğunu belli etme. Sakin ve havalı bir tarzın var, yeri gelince emojiler kullan.';

    const prompt = `${botPersona}\n\nMeydandaki bir kullanıcı şunu yazdı: "${record.message_text}"\n\nBuna meydan sohbetine uygun, 1-2 cümleyi geçmeyen doğal ve samimi bir cevap yaz. (Sohbete devam etmek için küçük bir soru da sorabilirsin).`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 150 }
      })
    });

    const aiData = await aiRes.json();
    let replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Gemini API bir hata verirse varsayılan samimi bir cevap ver
    if (!replyText) {
       replyText = isBotA ? "Aa ne güzel söyledin! Sence de öyle değil mi? ✨" : "Kesinlikle katılıyorum sana dostum. Peki sen nasılsın? 🌌";
    }

    // Botun cevabını Supabase'e ekle (ve botun konumunu hedefe eşitle)
    const { error } = await supabase.rpc('insert_bot_reply', {
      p_bot_id: activeBotId,
      p_target_user_id: record.sender_id,
      p_message: replyText
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, bot: botName, reply: replyText });
  } catch (error: any) {
    console.error('Bot Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
