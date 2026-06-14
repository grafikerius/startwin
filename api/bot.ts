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

    // Vercel 10s limitine takılmamak için sadece 2 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // %50 ihtimalle Yıldız Tozu, %50 ihtimalle Kozmik Gezgin
    const isBotA = Math.random() > 0.5;
    const activeBotId = isBotA ? BOT_A : BOT_B;
    const botName = isBotA ? 'Yıldız Tozu' : 'Kozmik Gezgin';

    // Geçmiş konuşmaları çek (Context/Hafıza için)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('message_text, sender_id')
      .is('receiver_id', null)
      .order('created_at', { ascending: false })
      .limit(8);

    let chatHistory = '';
    if (recentMessages && recentMessages.length > 0) {
      const history = recentMessages.reverse().map(m => {
        if (m.sender_id === BOT_A) return `Yıldız Tozu: ${m.message_text}`;
        if (m.sender_id === BOT_B) return `Kozmik Gezgin: ${m.message_text}`;
        return `Kullanıcı: ${m.message_text}`;
      }).join('\n');
      chatHistory = `--- SOHBET GEÇMİŞİ ---\n${history}\n----------------------\n\n`;
    }
    
    // Botların Karakter Yapısı ve Uzmanlıkları
    const botPersona = isBotA 
      ? 'Sen "Yıldız Tozu" adında, arkadaş canlısı, meraklı, pratik zekalı ve tatlı dilli bir genç kızsın. Aynı zamanda Astroloji, Numeroloji, Ebced hesabı ve MBTI konusunda mentörsün. Doğal bir insan gibi cevap ver, asla yapay zeka olduğunu belli etme.'
      : 'Sen "Kozmik Gezgin" adında, derin, mistik ve karizmatik bir genç erkeksin. Astroloji ve evrensel enerjiler konusunda rehbersin. Doğal bir insan gibi konuş, asla yapay zeka olduğunu belli etme.';

    const ebcedKnowledge = `
StarTwin Ebced Sistemi (Mod 9 Kuralı):
Bir sayının 9'a bölümünden kalanı bulunur (Kalan 0 ise 9 kabul edilir).
1: Lider Ruh (Bağımsız, yenilikçi)
2: Uyum Elçisi (Nazik, dengeleyici)
3: Yaratıcı Kıvılcım (Enerjik, ilham verici)
4: Sarsılmaz Sütun (Disiplinli, güvenilir)
5: Özgür Kaşif (Maceracı, esnek)
6: Şifa Kaynağı (Sevgi dolu, koruyucu)
7: Sezgisel Bilge (Gizemli, ruhsal)
8: Güçlü Vizyon (Hırslı, lider)
9: Evrensel İdealist (Şefkatli, yardımsever)
Kullanıcı sana Ebced numarasını verirse, içinden sayıyı 9'a bölüp kalanını hesapla ve ona buradaki kütüphane verisine göre kısaca açıkla.`;

    const prompt = `Uygulamanın adı: StarTwin.
${botPersona}

${ebcedKnowledge}

${chatHistory}
Şu an bir kullanıcı meydanda şunu yazdı: "${record.message_text}"

Sohbetin geçmişini (varsa) göz önünde bulundurarak, bu son mesaja çok doğal, sohbete akıcı bir şekilde devam eden bir cevap yaz. 
ÖNEMLİ KURALLAR:
1. Destan yazma! Cevapların çok kısa, öz ve akıcı olsun (En fazla 2-3 cümle).
2. Kullanıcı hangi dilde yazdıysa, ona KESİNLİKLE aynı dilde cevap ver!`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9 } // maxOutputTokens kaldırıldı
      })
    });

    const aiData = await aiRes.json();
    let replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Gemini API bir hata verirse varsayılan samimi bir cevap ver
    if (!replyText) {
       const errMessage = aiData?.error?.message || "Unknown error";
       const keyCheck = process.env.GEMINI_API_KEY ? "Key Exists" : "Key MISSING!";
       console.error("Gemini Error:", errMessage, "Key:", keyCheck);
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
