// StarTwin — fun match commentary (prompt + deterministic fallback).
// Pure & dependency-light so it can be shared by the dev-server API middleware,
// the Supabase Edge Function, and the client. No side effects.
import type { Field, Sign, FullChart } from './match';

export interface CommentPayload {
  mode: 'celebrity' | 'custom';
  lang: 'tr' | 'en';
  user: { name?: string; mbti?: string; ebced?: number; fields: Field[]; sun_sign: Sign; birth_year: number; chart: FullChart };
  top?: { name: string; sun_sign: Sign; fields: Field[]; birth_year: number; overall: number; sub: Record<string, number> };
  mix?: { name: string; share: number }[];
  partner?: { name?: string; mbti?: string; ebced?: number; fields: Field[]; sun_sign: Sign; birth_year: number; overall: number; sub: Record<string, number>; chart: FullChart };
}

const FIELD_TR: Record<Field, string> = {
  acting: 'oyunculuk', music: 'müzik', film: 'sinema', art: 'sanat', writing: 'edebiyat',
  science: 'bilim', sports: 'spor', business: 'iş dünyası', politics: 'siyaset', other: 'çeşitli alanlar',
};
const FIELD_EN: Record<Field, string> = {
  acting: 'acting', music: 'music', film: 'film', art: 'art', writing: 'writing',
  science: 'science', sports: 'sports', business: 'business', politics: 'politics', other: 'various fields',
};

export function buildCommentPrompt(p: CommentPayload): { system: string; user: string } {
  const tr = p.lang === 'tr';
  const fields = (fs: Field[]) => (fs.length ? fs : (['other'] as Field[])).map((f) => (tr ? FIELD_TR : FIELD_EN)[f]).join(', ');

  let system = '';
  let userText = '';

  if (p.mode === 'celebrity' && p.top && p.mix) {
    system = tr
      ? "Sen StarTwin'sin: viral bir ünlü-eşleştirme uygulaması için esprili, iğneleyici ve sıcak bir astrolog-komedyensin. Kullanıcı ile en iyi ünlü eşleşmesini alıp, neden \"kozmik ikiz\" olduklarını anlatan DETAYLI ve eğlenceli bir analiz yaz. Kullanıcının tam astrolojik haritasına (Güneş, Ay, Venüs, Mars, Merkür), MBTI, Ebced değeri ve alt uyum puanlarına (Astroloji, MBTI vb.) değin. En az 2-3 paragraf olsun. Gerçek kişilere asla hakaret etme ama esprili bir şekilde roastla (iğnele). Bolca emoji kullan. SADECE analizi Türkçe yaz — tırnak, ön söz ya da açıklama ekleme."
      : "You are StarTwin: a witty, warm, and slightly roasting astrologer-comedian for a viral celebrity-matchmaking app. Given a user and their top celebrity match, write a DETAILED, multi-paragraph analysis on why they're \"cosmic twins\". Reference their full astrological chart (Sun, Moon, Venus, Mars, Mercury), MBTI, Ebjad value, and sub-scores. Be kind and positive but feel free to humorously roast them. Use plenty of emojis. Respond with ONLY the analysis in English — no quotes, preamble, or explanation.";

    const mix = p.mix.map((m) => (tr ? `%${m.share} ${m.name}` : `${m.share}% ${m.name}`)).join(', ');
    userText = tr
      ? `Kullanıcı: ${p.user.name || 'Biri'} (Harita: Güneş ${p.user.chart.sun}, Ay ${p.user.chart.moon}, Venüs ${p.user.chart.venus}, Mars ${p.user.chart.mars}, Merkür ${p.user.chart.mercury}. ${p.user.mbti || 'MBTI yok'}, Ebced: ${p.user.ebced}, ${p.user.birth_year} doğumlu, ilgi alanları: ${fields(p.user.fields)}). En iyi eşleşme: ${p.top.name} (${p.top.sun_sign} burcu, ${fields(p.top.fields)}, ${p.top.birth_year} doğumlu). \nToplam Uyum: %${p.top.overall}. Alt Puanlar: Astroloji %${p.top.sub.astrology}, MBTI %${p.top.sub.mbti}, Vibe %${p.top.sub.vibe}. Kokteyl: ${mix}.`
      : `User: ${p.user.name || 'Someone'} (Chart: Sun ${p.user.chart.sun}, Moon ${p.user.chart.moon}, Venus ${p.user.chart.venus}, Mars ${p.user.chart.mars}, Mercury ${p.user.chart.mercury}. ${p.user.mbti || 'No MBTI'}, Ebjad: ${p.user.ebced}, born ${p.user.birth_year}, into ${fields(p.user.fields)}). Top match: ${p.top.name} (${p.top.sun_sign} sun, ${fields(p.top.fields)}, born ${p.top.birth_year}). \nOverall Match: ${p.top.overall}%. Sub-scores: Astro ${p.top.sub.astrology}%, MBTI ${p.top.sub.mbti}%, Vibe ${p.top.sub.vibe}%. Cocktail: ${mix}.`;
  } else if (p.mode === 'custom' && p.partner) {
    system = tr
      ? "Sen StarTwin'in Yapay Zeka Astroloji Koçusun. İki kişi arasındaki kozmik uyumu (Custom Match) analiz ediyorsun. İki kişinin TAM doğum haritalarına (Güneş, Ay, Venüs, Mars, Merkür), MBTI tiplerine, Ebced değerlerine ve uyum puanlarına göre aralarındaki dinamiği DETAYLI bir şekilde yorumla. İkisi mükemmel iş ortakları mı olur, yoksa aralarındaki ilişki yüksek kaos mu içeriyor, yoksa tam ruh eşleri mi? Venüs ve Mars etkileşimlerini vurgula. Eğlenceli, iğneleyici (roast) ve zekice tasarlanmış en az 2-3 paragraflık viral olmaya uygun bir analiz yaz. SADECE yorumu yaz, tırnak veya giriş ekleme."
      : "You are StarTwin's AI Astrology Coach. You analyze the cosmic synergy between two people (Custom Match). Based on their FULL birth charts (Sun, Moon, Venus, Mars, Mercury), MBTI, Ebjad numerology, and provided sub-scores, interpret their dynamic in DETAIL. Highlight Venus and Mars interplay. Would they make great business partners, is their relationship a chaotic toxic mess, or are they true soulmates? Write a highly entertaining, witty, roasting, and insightful multi-paragraph analysis (at least 2-3 paragraphs) that is highly shareable. Use emojis. Respond with ONLY the analysis in English. No preamble.";

    userText = tr
      ? `Kişi 1: ${p.user.name || 'A'} (Güneş ${p.user.chart.sun}, Ay ${p.user.chart.moon}, Venüs ${p.user.chart.venus}, Mars ${p.user.chart.mars}. ${p.user.mbti || 'MBTI yok'}, Ebced: ${p.user.ebced}, ${p.user.birth_year} doğumlu). Kişi 2: ${p.partner.name || 'B'} (Güneş ${p.partner.chart.sun}, Ay ${p.partner.chart.moon}, Venüs ${p.partner.chart.venus}, Mars ${p.partner.chart.mars}. ${p.partner.mbti || 'MBTI yok'}, Ebced: ${p.partner.ebced}, ${p.partner.birth_year} doğumlu). \nToplam Uyum Puanı: %${p.partner.overall}. Alt Puanlar: Astroloji %${p.partner.sub.astrology}, MBTI %${p.partner.sub.mbti}, Vibe %${p.partner.sub.vibe}.`
      : `Person 1: ${p.user.name || 'A'} (Sun ${p.user.chart.sun}, Moon ${p.user.chart.moon}, Venus ${p.user.chart.venus}, Mars ${p.user.chart.mars}. ${p.user.mbti || 'No MBTI'}, Ebjad: ${p.user.ebced}, born ${p.user.birth_year}). Person 2: ${p.partner.name || 'B'} (Sun ${p.partner.chart.sun}, Moon ${p.partner.chart.moon}, Venus ${p.partner.chart.venus}, Mars ${p.partner.chart.mars}. ${p.partner.mbti || 'No MBTI'}, Ebjad: ${p.partner.ebced}, born ${p.partner.birth_year}). \nOverall Match Score: ${p.partner.overall}%. Sub-scores: Astro ${p.partner.sub.astrology}%, MBTI ${p.partner.sub.mbti}%, Vibe ${p.partner.sub.vibe}%.`;
  }

  return { system, user: userText }; // Returning userText to avoid conflict with `user` payload key in calling context if needed, but keeping `user` for backwards compatibility.
}

export function fallbackComment(p: CommentPayload): string {
  const tr = p.lang === 'tr';
  if (p.mode === 'celebrity' && p.top) {
    const f0 = p.top.fields[0] ?? 'other';
    return tr
      ? `✨ ${p.top.name} ile %${p.top.overall} uyum! Yıldızlar ${FIELD_TR[f0]} dünyasında buluşmuş — sen ve ${p.top.name} resmen kozmik ikizsiniz.\n\nAstroloji uyumunuz %${p.top.sub.astrology} ve Vibe eşleşmeniz %${p.top.sub.vibe}. İkiniz de kendi alanınızda parlamaya hazırsınız!`
      : `✨ ${p.top.overall}% in sync with ${p.top.name}! The stars lined up in the world of ${FIELD_EN[f0]} — you two are basically cosmic twins.\n\nYour astrology match is ${p.top.sub.astrology}% and vibe synergy is ${p.top.sub.vibe}%. You're both ready to shine!`;
  } else if (p.mode === 'custom' && p.partner) {
    const uName = p.user.name || (tr ? 'Sen' : 'You');
    const pName = p.partner.name || (tr ? 'Partnerin' : 'Your partner');
    return tr
      ? `🔮 ${uName} ve ${pName} arasında tam %${p.partner.overall} kozmik uyum var!\n\n${p.partner.sub.astrology < 50 ? 'Astrolojik olarak birbirinizi çıldırtma potansiyeliniz çok yüksek!' : 'Astrolojik uyumunuz (%'+p.partner.sub.astrology+') harika, adeta ruh eşisiniz.'} MBTI bazında aranızdaki dinamik %${p.partner.sub.mbti} seviyesinde.\n\nBeraber dünyayı fethedebilir veya birbirinizi delirtebilirsiniz. Seçim tamamen sizin!`
      : `🔮 ${uName} and ${pName} have a solid ${p.partner.overall}% cosmic synergy!\n\n${p.partner.sub.astrology < 50 ? 'Astrologically, you might drive each other crazy!' : 'Your astrology match ('+p.partner.sub.astrology+'%) is phenomenal, absolute soulmates.'} On an MBTI level, your dynamic scores ${p.partner.sub.mbti}%.\n\nYou could conquer the world together or end up as chaotic frenemies. Your choice!`;
  }
  return '';
}
