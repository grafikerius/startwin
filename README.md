# StarTwin ✨

Ünlü eşleştirme (celebrity matchmaking) MVP'si — React + Vite + Tailwind + TypeScript, Supabase backend.

## Hızlı başlangıç

Gereksinim: **Node.js 18+** (kontrol: `node -v`).

```bash
npm install      # bağımlılıkları yükler
npm run dev      # geliştirme sunucusunu başlatır
```

Terminalde çıkan adrese (genelde **http://localhost:5173**) tarayıcıdan girin.
Karşınıza StarTwin sihirbazı çıkar: **Adım 1 – Bio**, **Adım 2 – Astroloji & MBTI**,
ardından neon gradyanlı **sonuç panosu**.

> Uygulama kutudan çıktığı haliyle çalışır — `src/components/StarTwin.tsx` içindeki
> `SEED` ünlü listesini kullanır, yani Supabase olmadan da test edebilirsiniz.

## Komutlar

| Komut             | Açıklama                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Geliştirme sunucusu (HMR ile)             |
| `npm run build`   | TypeScript tip kontrolü + üretim derlemesi |
| `npm run preview` | Üretim derlemesini yerelde önizleme       |

## Proje yapısı

```
.
├─ index.html                    # giriş HTML'i (#root + Inter fontu)
├─ src/
│  ├─ main.tsx                   # React kökü, StarTwin'i mount eder
│  ├─ index.css                 # Tailwind direktifleri
│  ├─ components/StarTwin.tsx     # çift dilli sihirbaz + sonuç panosu (tek dosya)
│  ├─ lib/match.ts              # gerçek-veri eşleştirme motoru (saf)
│  └─ data/
│     ├─ celebrities.json        # Wikidata'dan üretilen 1500+ gerçek ünlü
│     └─ index.ts               # tipli sarmalayıcı
├─ scripts/ingest.mjs            # Wikidata → celebrities.json üretici
├─ supabase/schema.sql           # tablo + RLS + örnek satırlar
├─ tailwind.config.js · postcss.config.js · vite.config.ts · tsconfig*.json
```

## Veriyi yenileme (Wikidata ingest)

`src/data/celebrities.json` canlı Wikidata'dan üretilir. node'un `fetch`'i bu ortamda
engelli olduğu için ağ adımı `curl` ile yapılır; WDQS'in 60sn limiti yüzünden meslekler
küçük gruplar hâlinde çekilir:

```bash
# 1) sorgu gruplarını üret (minFame=80, grup başına 250, 4 meslek/grup)
node scripts/ingest.mjs emit 80 250 4

# 2) her grubu curl ile çek
for q in scripts/_query_*.rq; do i="${q##*_}"; i="${i%.rq}"; \
  curl -sG "https://query.wikidata.org/sparql" \
    --data-urlencode "query@$q" --data-urlencode "format=json" \
    -H "User-Agent: StarTwin/0.1 (you@example.com)" \
    -o "scripts/_raw_$i.json" --max-time 75; done

# 3) birleştir → src/data/celebrities.json
node scripts/ingest.mjs build
```

Üretilen alanlar: `name_en/name_tr`, `gender`, `birth_date`, `sun_sign` (tarihten türetilir),
`height` (varsa, birim normalize edilir), `fields`, `image_url` (Wikimedia), `fame`, `turkish`.
`moon_sign`/`mbti_type` Wikidata'da bulunmaz → opsiyonel bonus olarak boş kalır.

## Supabase'e bağlama (opsiyonel, hazır)

Uygulama Supabase'e **bağlanmaya hazır gelir** (`src/lib/supabase.ts` + `src/App.tsx`).
Önce yerleşik 1529 kişilik veriyle açılır, sonra Supabase ayarlıysa ve veri dönüyorsa
**canlı DB verisine** yükseltir. Bağlantı/veri yoksa sessizce yerleşik veride kalır.

**1) `.env`** — proje URL'i ve **anon** key (anon key herkese açık olacak şekilde tasarlıdır):

```bash
VITE_SUPABASE_URL=https://<proje>.supabase.co     # sonunda /rest/v1/ OLMADAN
VITE_SUPABASE_ANON_KEY=eyJ...
```

**2) Supabase panelinde SQL Editor** — sırayla çalıştır:

```text
1. supabase/schema.sql            → tablo + RLS (herkese-okuma) politikası
2. supabase/seed_celebrities.sql  → 1529 gerçek ünlü (node scripts/gen-seed.mjs ile üretilir)
```

**3)** `npm run dev` → uygulama artık ünlüleri **Supabase'ten** çeker.

> Veriyi tazeledikten sonra (`node scripts/ingest.mjs ...`) seed'i yeniden üret:
> `node scripts/gen-seed.mjs`. Tablonun var olup olmadığını hızlı kontrol:
> `GET {URL}/rest/v1/celebrities?select=id&limit=1` (apikey başlığıyla) — `PGRST205`
> dönerse tablo henüz oluşturulmamış demektir.

## Eğlenceli AI yorumu (Google Gemini)

Sonuç kartında, eşleşmeni anlatan esprili bir cümle çıkar. Bu cümle **Gemini** ile
üretilir ve API anahtarı **asla tarayıcıya gönderilmez** — çağrı sunucu tarafında yapılır:

- **Geliştirme:** `vite.config.ts` içindeki `POST /api/comment` ara katmanı (anahtar Node'da kalır).
- **Production:** `supabase/functions/comment` Edge Function (`supabase functions deploy comment`).

Anahtar **olmadan** da çalışır: bu durumda şablon (deterministik) bir yorum gösterilir.
Gerçek Gemini yorumları için:

```bash
cp .env.example .env
# Ücretsiz anahtar al: https://aistudio.google.com/apikey
# .env içine GEMINI_API_KEY=... yaz, sonra:
npm run dev
```

Varsayılan model **`gemini-2.5-flash`** (kısa esprili cümleler için ücretsiz katmanda hızlı).
`.env` içinde `GEMINI_MODEL=...` ile değiştirebilirsin (ör. `gemini-2.5-flash-lite`).

> Production'da Edge Function'a anahtarı `supabase secrets set GEMINI_API_KEY=...`
> ile verir, istemcide `fetch('/api/comment')` yerine Edge Function URL'ini çağırırsın.
> İstek doğrudan Gemini REST API'sine gider — ekstra npm bağımlılığı yok.

## Not

Görseller Wikimedia Commons'tan (`image_url`) gelir; canlıya almadan önce ilgili
görsellerin lisans/kullanım haklarını gözden geçirin. Yaşayan kişiler için AI yorumları
pozitif/saygılı tutacak şekilde sınırlandırılmıştır.
