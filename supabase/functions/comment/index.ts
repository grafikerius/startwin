// StarTwin — fun match commentary (PRODUCTION path), powered by Google Gemini.
// Supabase Edge Function (Deno). Keeps the API key server-side.
//   Deploy:  supabase functions deploy comment
//   Secret:  supabase secrets set GEMINI_API_KEY=...   (optional: GEMINI_MODEL)
// Client calls: POST {SUPABASE_URL}/functions/v1/comment  (same JSON as the dev /api/comment)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FIELD_TR: Record<string, string> = {
  acting: 'oyunculuk', music: 'müzik', film: 'sinema', art: 'sanat', writing: 'edebiyat',
  science: 'bilim', sports: 'spor', business: 'iş dünyası', politics: 'siyaset', other: 'çeşitli alanlar',
};
const FIELD_EN: Record<string, string> = {
  acting: 'acting', music: 'music', film: 'film', art: 'art', writing: 'writing',
  science: 'science', sports: 'sports', business: 'business', politics: 'politics', other: 'various fields',
};

// deno-lint-ignore no-explicit-any
function buildPrompt(p: any) {
  const tr = p.lang === 'tr';
  const fields = (fs: string[]) => (fs?.length ? fs : ['other']).map((f) => (tr ? FIELD_TR : FIELD_EN)[f] ?? f).join(', ');
  const system = tr
    ? "Sen StarTwin'sin: viral bir ünlü-eşleştirme uygulaması için esprili ve sıcak bir astrolog-komedyensin. Kullanıcı ile en iyi ünlü eşleşmesini alıp, neden \"kozmik ikiz\" olduklarını anlatan TEK kısa, paylaşılabilir cümle yaz (en fazla ~30 kelime). Burç, kuşak ya da ortak ilgi alanına gönderme yap. Nazik ve pozitif ol; gerçek kişilere asla hakaret etme. Hafif emoji serbest. SADECE o cümleyi Türkçe yaz — tırnak, ön söz ya da açıklama ekleme."
    : "You are StarTwin: a witty, warm astrologer-comedian for a viral celebrity-matchmaking app. Given a user and their top celebrity match, write ONE short, shareable line (max ~30 words) on why they're \"cosmic twins\". Nod to the star sign, generation, or shared field. Be kind and positive; never insult real people. Light emoji ok. Respond with ONLY that line in English — no quotes, preamble, or explanation.";
  const mix = (p.mix ?? []).map((m: any) => (tr ? `%${m.share} ${m.name}` : `${m.share}% ${m.name}`)).join(', ');
  const user = tr
    ? `Kullanıcı: ${p.user.sun_sign} burcu, ${p.user.birth_year} doğumlu, ilgi alanları: ${fields(p.user.fields)}. En iyi eşleşme: ${p.top.name} (${p.top.sun_sign} burcu, ${fields(p.top.fields)}, ${p.top.birth_year} doğumlu) — %${p.top.overall} uyum. Kokteyl: ${mix}.`
    : `User: ${p.user.sun_sign} sun, born ${p.user.birth_year}, into ${fields(p.user.fields)}. Top match: ${p.top.name} (${p.top.sun_sign} sun, ${fields(p.top.fields)}, born ${p.top.birth_year}) — ${p.top.overall}% match. Cocktail: ${mix}.`;
  return { system, user };
}

// deno-lint-ignore no-explicit-any
function fallback(p: any) {
  const f0 = p?.top?.fields?.[0] ?? 'other';
  return p?.lang === 'tr'
    ? `${p.top.name} ile %${p.top.overall} uyum! Yıldızlar ${FIELD_TR[f0]} dünyasında buluşmuş — sen ve ${p.top.name} resmen kozmik ikizsiniz. ✨`
    : `${p.top.overall}% in sync with ${p.top.name}! The stars lined up in the world of ${FIELD_EN[f0]} — you two are basically cosmic twins. ✨`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // deno-lint-ignore no-explicit-any
  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }

  const key = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  if (!key) return json({ comment: fallback(payload), source: 'fallback' });

  try {
    const { system, user } = buildPrompt(payload);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 1, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    // deno-lint-ignore no-explicit-any
    const data: any = await r.json();
    if (!r.ok) throw new Error(data?.error?.message ?? `HTTP ${r.status}`);
    // deno-lint-ignore no-explicit-any
    const text: string = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
    return json({ comment: text || fallback(payload), source: text ? 'gemini' : 'fallback', model });
  } catch (e) {
    return json({ comment: fallback(payload), source: 'fallback', error: String((e as Error)?.message ?? e) });
  }
});
