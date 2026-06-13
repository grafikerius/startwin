import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  mixCocktail,
  calculateMatch,
  calculateSigns,
  type Celebrity,
  type CocktailSlice,
  type Field,
  type Gender,
  type Sign,
  type UserInput,
  type MatchResult,
} from '../lib/match';
import { calculateEbced, getEbcedInterpretation } from '../lib/ebced';
import { fetchWikiSummary, type WikiSummary } from '../lib/wikipedia';
import { CELEBRITIES } from '../data';
import CosmicSquare from './CosmicSquare';
import AdminDashboard from './AdminDashboard';
import { InterstitialAd } from './InterstitialAd';
import { getSystemSettings } from '../lib/supabase';

type Lang = 'tr' | 'en';
type Mode = 'celebrity' | 'custom' | 'nearby';

const FIELDS: { id: Field; emoji: string; tr: string; en: string }[] = [
  { id: 'acting', emoji: '🎭', tr: 'Oyunculuk', en: 'Acting' },
  { id: 'music', emoji: '🎵', tr: 'Müzik', en: 'Music' },
  { id: 'film', emoji: '🎬', tr: 'Sinema', en: 'Film' },
  { id: 'art', emoji: '🎨', tr: 'Sanat', en: 'Art' },
  { id: 'writing', emoji: '✍️', tr: 'Edebiyat', en: 'Writing' },
  { id: 'science', emoji: '🔬', tr: 'Bilim', en: 'Science' },
  { id: 'sports', emoji: '⚽', tr: 'Spor', en: 'Sports' },
  { id: 'business', emoji: '💼', tr: 'İş', en: 'Business' },
  { id: 'politics', emoji: '🏛️', tr: 'Siyaset', en: 'Politics' },
];
const FIELD_LABEL = Object.fromEntries(FIELDS.map((f) => [f.id, f])) as Record<Field, (typeof FIELDS)[number]>;

const SIGN: Record<Sign, { tr: string; en: string; emoji: string }> = {
  Aries: { tr: 'Koç', en: 'Aries', emoji: '♈' }, Taurus: { tr: 'Boğa', en: 'Taurus', emoji: '♉' },
  Gemini: { tr: 'İkizler', en: 'Gemini', emoji: '♊' }, Cancer: { tr: 'Yengeç', en: 'Cancer', emoji: '♋' },
  Leo: { tr: 'Aslan', en: 'Leo', emoji: '♌' }, Virgo: { tr: 'Başak', en: 'Virgo', emoji: '♍' },
  Libra: { tr: 'Terazi', en: 'Libra', emoji: '♎' }, Scorpio: { tr: 'Akrep', en: 'Scorpio', emoji: '♏' },
  Sagittarius: { tr: 'Yay', en: 'Sagittarius', emoji: '♐' }, Capricorn: { tr: 'Oğlak', en: 'Capricorn', emoji: '♑' },
  Aquarius: { tr: 'Kova', en: 'Aquarius', emoji: '♒' }, Pisces: { tr: 'Balık', en: 'Pisces', emoji: '♓' },
};

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const T = {
  tr: {
    tagline: 'Kozmik uyumunu keşfet ✨',
    modeCeleb: '🌟 Ünlü İkizini Bul',
    modeCustom: '👯 Partner / Arkadaş Uyumu',
    nameTitle: 'Adın ve Soyadın?',
    nameHint: 'Kozmik ve numerolojik (Ebced) uyum için tam isminiz önemlidir.',
    namePlaceholder: 'Örn: Can Yılmaz',
    gender: 'Cinsiyet', female: 'Kadın', male: 'Erkek', other: 'Diğer',
    birth: 'Doğum Tarihi', sunHint: 'güneş burcun',
    birthTime: 'Doğum Saati (Opsiyonel)', birthCity: 'Doğum Yeri (Opsiyonel)', cityPh: 'Örn: İstanbul',
    height: 'Boy', weight: 'Kilo',
    vibeTitle: 'Hangi dünyalara çekiliyorsun?', vibeHint: 'En az bir tane seç',
    mbtiTitle: 'MBTI Kişilik Tipin', mbtiHint: 'Biliyorsan seç, bilmiyorsan boş bırak',
    matchWith: 'Kiminle eşleşmek istersin?', any: 'Farketmez',
    next: 'Devam', back: 'Geri', reveal: 'Sonucu Göster ✨',
    partnerBio: 'Partnerin / Arkadaşının Bilgileri', partnerVibe: 'Onun Vibe & MBTI\'ı',
    cocktailLabel: 'Ünlü Kokteylin', customLabel: 'Kozmik Uyum Analizi',
    topMatch: 'En iyi eşleşme', match: 'uyum', born: 'doğum',
    yourMix: '🍸 Senin karışımın', retake: 'Başa Dön', share: 'Paylaş ↗', copied: 'Panoya kopyalandı ✨',
    vibe: 'Vibe', astrology: 'Astroloji', era: 'Kuşak', physical: 'Fiziksel', mbti: 'MBTI',
    aiThinking: 'Yıldızlar okunuyor, dinamikler hesaplanıyor...',
    shareText: (n: string, p: number, mix: string) => `StarTwin sonucum: ${n} ile %${p} uyum! 🌟 ${mix}`,
  },
  en: {
    tagline: 'Discover your cosmic match ✨',
    modeCeleb: '🌟 Find Celebrity Twin',
    modeCustom: '👯 Partner / Friend Match',
    nameTitle: 'First and Last Name',
    nameHint: 'Your full name is important for cosmic and numerological (Ebced) matching.',
    namePlaceholder: 'e.g. John Doe',
    gender: 'Gender', female: 'Female', male: 'Male', other: 'Other',
    birth: 'Birth Date', sunHint: 'sun sign',
    birthTime: 'Birth Time (Optional)', birthCity: 'Birth City (Optional)', cityPh: 'e.g. New York',
    height: 'Height', weight: 'Weight',
    vibeTitle: 'Which worlds pull you in?', vibeHint: 'Pick at least one',
    mbtiTitle: 'MBTI Personality Type', mbtiHint: 'Optional',
    matchWith: 'Who do you want to match with?', any: 'Anyone',
    next: 'Next', back: 'Back', reveal: 'Reveal Match ✨',
    partnerBio: 'Partner/Friend Details', partnerVibe: 'Their Vibe & MBTI',
    cocktailLabel: 'Celebrity Cocktail', customLabel: 'Cosmic Synergy Analysis',
    topMatch: 'Top match', match: 'match', born: 'born',
    yourMix: '🍸 Your mix', retake: 'Retake', share: 'Share ↗', copied: 'Copied to clipboard ✨',
    vibe: 'Vibe', astrology: 'Astrology', era: 'Era', physical: 'Physical', mbti: 'MBTI',
    aiThinking: 'Reading the stars and calculating dynamics...',
    shareText: (n: string, p: number, mix: string) => `My StarTwin match: ${n} — ${p}%! 🌟 ${mix}`,
  },
} as const;

type TT = (typeof T)[Lang];

const thumb = (u?: string) => (u ? `${u.replace(/^http:/, 'https:')}?width=400` : undefined);
const yearOf = (iso: string) => new Date(iso).getUTCFullYear();

type ProfileForm = Partial<Omit<UserInput, 'fields'>> & { fields: Field[] };
const EMPTY_PROFILE: ProfileForm = { gender: 'female', height: 170, weight: 65, fields: [], match_gender: 'any' };

export type TopMatchSlice = CocktailSlice & { wiki: WikiSummary };

export default function StarTwin({ celebrities = CELEBRITIES }: { celebrities?: Celebrity[] }) {
  const [lang, setLang] = useState<Lang>('tr');
  const [step, setStep] = useState(0);
  
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adSettings, setAdSettings] = useState<any>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  
  const [mode, setMode] = useState<Mode>('celebrity');
  const [userProfile, setUserProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [partnerProfile, setPartnerProfile] = useState<ProfileForm>(EMPTY_PROFILE);

  const [nearbyUser, setNearbyUser] = useState<UserInput | null>(null);

  useEffect(() => {
    // Fetch global ad settings
    getSystemSettings().then(settings => {
      if (settings) setAdSettings(settings);
    });

    try {
      const savedUserStr = localStorage.getItem('startwin_user');
      const savedPass = localStorage.getItem('startwin_pass');
      if (savedUserStr && savedPass) {
        const u = JSON.parse(savedUserStr);
        if (u && u.name && u.birth_date && Array.isArray(u.fields)) {
          setNearbyUser(u);
          setUserProfile(u);
          setMode('nearby');
          setStep(4.5); 
        } else {
          localStorage.removeItem('startwin_user');
          localStorage.removeItem('startwin_pass');
        }
      }
    } catch (e) {
      console.error('Auto login parse error', e);
    }
  }, []);

  const [user, setUser] = useState<UserInput | null>(null);
  const [partner, setPartner] = useState<UserInput | null>(null);
  const [cocktail, setCocktail] = useState<CocktailSlice[]>([]);
  const [topMatches, setTopMatches] = useState<TopMatchSlice[]>([]);
  const [customMatch, setCustomMatch] = useState<MatchResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const t = T[lang];

  const isProfileBioOk = (p: ProfileForm) => !!p.name && !!p.birth_date;
  const isProfileVibeOk = (p: ProfileForm) => p.fields.length > 0;

  const handleNext = () => {
    if (step === 2 && (mode === 'celebrity' || mode === 'nearby')) {
      if (mode === 'nearby') {
        const u = { ...userProfile, lat: 0, lon: 0 } as UserInput;
        setNearbyUser(u);
        setStep(4.5); 
      } else {
        setStep(5);
      }
    }
    else setStep(s => s + 1);
  };

  useEffect(() => {
    if (step === 4.5) {
      if (adSettings?.interstitial_enabled) {
        setShowInterstitial(true);
      } else {
        setStep(5);
      }
    }
  }, [step, adSettings]);

  const handleLogoClick = () => {
    setAdminClicks(c => c + 1);
    if (adminClicks >= 2) {
      setShowAdmin(true);
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 1000);
  };

  const handleCalculate = async () => {
    setCalculating(true);
    let lat = 0, lon = 0;
    
    if (userProfile.birth_city) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userProfile.birth_city)}&format=json&limit=1`, {
          headers: { 'User-Agent': 'StarTwinApp/1.0' }
        });
        const data = await res.json();
        if (data && data[0]) {
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
        }
      } catch (e) {
        console.warn('Geocoding failed, using default coords');
      }
    }
    
    let plat = 0, plon = 0;
    if (mode === 'custom' && partnerProfile.birth_city) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(partnerProfile.birth_city)}&format=json&limit=1`, {
          headers: { 'User-Agent': 'StarTwinApp/1.0' }
        });
        const data = await res.json();
        if (data && data[0]) {
          plat = parseFloat(data[0].lat);
          plon = parseFloat(data[0].lon);
        }
      } catch (e) {
        console.warn('Partner geocoding failed');
      }
    }

    const u = { ...userProfile, lat, lon } as UserInput;
    const p = { ...partnerProfile, lat: plat, lon: plon } as UserInput;

    setUser(u);
    if (mode === 'celebrity') {
      const { sun, moon } = calculateSigns(u.birth_date, u.birth_time, lat, lon);
      u.moon_sign = moon;
      const initialMix = mixCocktail(u, celebrities, 15);
      
      const verifiedMatches: TopMatchSlice[] = [];
      await Promise.all(initialMix.map(async (slice) => {
        const name = lang === 'tr' ? slice.celebrity.name_tr : slice.celebrity.name_en;
        const wiki = await fetchWikiSummary(name, lang);
        if (wiki) {
          verifiedMatches.push({ ...slice, wiki });
        }
      }));
      
      if (verifiedMatches.length === 0 && initialMix.length > 0) {
         const topSlice = initialMix[0];
         verifiedMatches.push({
            ...topSlice,
            wiki: {
               title: topSlice.celebrity.name_tr,
               extract: lang === 'tr' ? 'Vikipedi bilgisine şu an ulaşılamıyor.' : 'Wikipedia info unavailable.',
               content_urls: { desktop: { page: `https://${lang}.wikipedia.org` } }
            }
         });
      }

      verifiedMatches.sort((a, b) => b.result.overall - a.result.overall);
      const finalMatches = verifiedMatches.slice(0, 10);
      setTopMatches(finalMatches);

      const mix = mixCocktail(u, finalMatches.map(m => m.celebrity), 3);
      setCocktail(mix);
    } else {
      setPartner(p);
      const c: Celebrity = {
        id: 'partner',
        name_en: p.name || 'Partner',
        name_tr: p.name || 'Partner',
        gender: p.gender || 'other',
        birth_date: p.birth_date,
        sun_sign: calculateSigns(p.birth_date, p.birth_time, plat, plon).sun,
        fields: p.fields,
        fame: 0,
        mbti_type: p.mbti_type,
      };
      setCustomMatch(calculateMatch(u, c).result);
    }
    setTimeout(() => {
      setCalculating(false);
      setStep(5);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#06060f] bg-[radial-gradient(60%_60%_at_50%_0%,#1b0b3a_0%,#06060f_60%)] p-4 font-sans text-white">
      <style>{'@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
      <div className="relative w-full max-w-sm h-[calc(100dvh-2rem)] max-h-[800px] flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_0_60px_-15px_rgba(124,92,255,0.6)] backdrop-blur-xl">
        <Glow />
        <LangToggle lang={lang} onChange={setLang} />
        
        {step < 5 ? (
          <div className="relative p-7 pt-12">
            <header className="mb-6 text-center">
              <h1 
                onClick={handleLogoClick}
                className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-cyan-300 bg-clip-text text-3xl font-black tracking-tight text-transparent cursor-pointer select-none"
              >
                StarTwin
              </h1>
              <p className="mt-1 text-xs text-white/50">{t.tagline}</p>
              {step > 0 && (
                <div className="mt-5 flex gap-1.5">
                  {Array.from({ length: mode === 'celebrity' ? 2 : 4 }).map((_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < step ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400' : 'bg-white/10'}`} />
                  ))}
                </div>
              )}
            </header>

            <div key={step} className="animate-[fade_.4s_ease] space-y-4">
              {step === 0 && (
                <div className="flex flex-col gap-3 mt-8">
                  <button onClick={() => { setMode('celebrity'); setStep(1); }} className="rounded-2xl border border-white/20 bg-white/5 p-5 text-left transition hover:bg-white/10 hover:border-fuchsia-400">
                    <h3 className="text-lg font-bold text-white">{t.modeCeleb}</h3>
                    <p className="mt-1 text-xs text-white/50">Yıldızların arasındaki ruh eşini bul.</p>
                  </button>
                  <button onClick={() => { setMode('custom'); setStep(1); }} className="rounded-2xl border border-white/20 bg-white/5 p-5 text-left transition hover:bg-white/10 hover:border-cyan-400">
                    <h3 className="text-lg font-bold text-white">{t.modeCustom}</h3>
                    <p className="mt-1 text-xs text-white/50">Sevgilin, kankan veya crush'ın ile uyumunu ölç.</p>
                  </button>
                  <button onClick={() => { setMode('nearby'); setStep(1); }} className="rounded-2xl border border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-600/20 to-cyan-500/20 p-5 text-left transition hover:brightness-125 shadow-[0_0_20px_-5px_rgba(255,0,255,0.4)]">
                    <h3 className="text-lg font-black bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">🌌 Yakınlardaki Kozmik Ruh Eşini Bul</h3>
                    <p className="mt-1 text-xs text-white/70">Çevrendeki en uyumlu profilleri haritada bul ve anonim sohbet et.</p>
                  </button>
                </div>
              )}

              {step === 1 && <BioForm t={t} lang={lang} form={userProfile} setForm={setUserProfile} title={t.name} />}
              {step === 2 && <VibeForm t={t} lang={lang} form={userProfile} setForm={setUserProfile} mode={mode} isPartner={false} />}
              
              {step === 3 && <BioForm t={t} lang={lang} form={partnerProfile} setForm={setPartnerProfile} title={t.partnerBio} />}
              {step === 4 && <VibeForm t={t} lang={lang} form={partnerProfile} setForm={setPartnerProfile} mode={mode} isPartner={true} />}
            </div>

            {step > 0 && (
              <div className="mt-7 flex gap-3">
                <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5">
                  {t.back}
                </button>
                <button onClick={() => ((step === 2 && mode === 'celebrity') || step === 4) ? handleCalculate() : handleNext()} 
                  disabled={calculating || (step === 2 && !isProfileVibeOk(userProfile)) || (step === 4 && !isProfileVibeOk(partnerProfile))}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3 text-sm font-bold text-black shadow-[0_8px_30px_-8px_rgba(124,92,255,0.9)] transition enabled:hover:brightness-110 disabled:opacity-30">
                  {calculating ? t.aiThinking : (((step === 2 && mode === 'celebrity') || step === 4) ? t.reveal : t.next)}
                </button>
              </div>
            )}
          </div>
        ) : mode === 'nearby' && nearbyUser ? (
          <CosmicSquare user={nearbyUser} t={t} lang={lang} onRestart={() => { setUserProfile(EMPTY_PROFILE); setNearbyUser(null); setStep(0); }} />
        ) : (
          <Results t={t} lang={lang} mode={mode} user={user!} partner={partner!} cocktail={cocktail} topMatches={topMatches} customMatch={customMatch} onRestart={() => { setUserProfile(EMPTY_PROFILE); setPartnerProfile(EMPTY_PROFILE); setStep(0); }} />
        )}
      </div>
      
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      
      {showInterstitial && (
        <InterstitialAd 
          settings={adSettings} 
          onComplete={() => {
            setShowInterstitial(false);
            setStep(5);
          }} 
        />
      )}
    </div>
  );
}

function Glow() {
  return (
    <>
      <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/30 blur-3xl" />
    </>
  );
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="absolute right-4 top-4 z-10 flex rounded-full border border-white/15 bg-black/30 p-0.5 text-[11px] font-bold backdrop-blur">
      {(['tr', 'en'] as Lang[]).map((l) => (
        <button key={l} onClick={() => onChange(l)}
          className={`rounded-full px-2.5 py-1 uppercase transition ${lang === l ? 'bg-white/90 text-black' : 'text-white/60 hover:text-white'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10 [color-scheme:dark]';

function FieldWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      {children}
    </label>
  );
}

function BioForm({ t, lang, form, setForm, title }: { t: TT, lang: Lang, form: ProfileForm, setForm: any, title: string }) {
  const [avatarLoading, setAvatarLoading] = useState(false);
  const set = (k: keyof ProfileForm, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const sun = form.birth_date ? calculateSigns(form.birth_date, form.birth_time).sun : undefined;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAvatarLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) throw new Error("Supabase is not connected");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      set('avatar_url', data.publicUrl);
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert(lang === 'tr' ? 'Fotoğraf yüklenirken bir hata oluştu.' : 'Error uploading photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center font-bold text-cyan-200 mb-2">{title}</div>
      
      <FieldWrap label={lang === 'tr' ? 'Profil Fotoğrafı (İsteğe Bağlı)' : 'Profile Photo (Optional)'}>
        <div className="flex items-center gap-4">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-fuchsia-500" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 text-center leading-tight">
              {lang === 'tr' ? 'Foto\nYok' : 'No\nPhoto'}
            </div>
          )}
          <label className={`cursor-pointer border py-1.5 px-4 rounded-xl text-sm transition ${avatarLoading ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300/50' : 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-300 hover:bg-fuchsia-500/30'}`}>
            {avatarLoading ? (lang === 'tr' ? 'Yükleniyor...' : 'Loading...') : (lang === 'tr' ? 'Seç / Değiştir' : 'Select Photo')}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarLoading} />
          </label>
        </div>
      </FieldWrap>

      <FieldWrap label={t.name}>
        <input className={inputCls} placeholder={t.namePlaceholder} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
      </FieldWrap>
      <FieldWrap label={t.gender}>
        <div className="grid grid-cols-3 gap-2">
          {(['female', 'male', 'other'] as Gender[]).map((g) => (
            <button key={g} onClick={() => set('gender', g)}
              className={`rounded-xl border py-2 text-sm transition ${form.gender === g ? 'border-fuchsia-400 bg-fuchsia-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              {t[g]}
            </button>
          ))}
        </div>
      </FieldWrap>
      
      <FieldWrap label={t.birth}>
        <input type="date" className={inputCls} value={form.birth_date ?? ''} onChange={(e) => set('birth_date', e.target.value)} />
        {sun && (
          <span className="mt-1.5 inline-block text-xs text-cyan-200/80">
            {SIGN[sun].emoji} {SIGN[sun][lang]} <span className="text-white/40">· {t.sunHint}</span>
          </span>
        )}
      </FieldWrap>
      <div className="grid grid-cols-2 gap-3">
        <FieldWrap label={t.birthTime}>
          <input type="time" className={inputCls} value={form.birth_time ?? ''} onChange={(e) => set('birth_time', e.target.value)} />
        </FieldWrap>
        <FieldWrap label={t.birthCity}>
          <input type="text" className={inputCls} placeholder={t.cityPh} value={form.birth_city ?? ''} onChange={(e) => set('birth_city', e.target.value)} />
        </FieldWrap>
      </div>
      
      <Slider label={t.height} unit="cm" min={140} max={210} value={form.height ?? 170} onChange={(v) => set('height', v)} />
      <Slider label={t.weight} unit="kg" min={40} max={150} value={form.weight ?? 65} onChange={(v) => set('weight', v)} />
    </div>
  );
}

function VibeForm({ t, lang, form, setForm, mode, isPartner }: { t: TT, lang: Lang, form: ProfileForm, setForm: any, mode: Mode, isPartner: boolean }) {
  const set = (k: keyof ProfileForm, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleField = (id: Field) =>
    setForm((f: any) => ({ ...f, fields: f.fields.includes(id) ? f.fields.filter((x: Field) => x !== id) : [...f.fields, id] }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-white/85">{t.vibeTitle}</p>
        <p className="mb-3 text-xs text-white/45">{t.vibeHint}</p>
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.map((f) => {
            const on = form.fields.includes(f.id);
            return (
              <button key={f.id} onClick={() => toggleField(f.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-[11px] font-medium transition ${on ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}>
                <span className="text-lg leading-none">{f.emoji}</span>{f[lang]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/85">{t.mbtiTitle}</p>
        <p className="mb-3 text-xs text-white/45">{t.mbtiHint}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MBTI_TYPES.map((m) => (
            <button key={m} onClick={() => set('mbti_type', form.mbti_type === m ? undefined : m)}
              className={`rounded-lg border py-2 text-[10px] font-bold tracking-wider transition ${form.mbti_type === m ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {!isPartner && mode === 'celebrity' && (
        <FieldWrap label={t.matchWith}>
          <div className="grid grid-cols-3 gap-2">
            {(['any', 'female', 'male'] as const).map((g) => (
              <button key={g} onClick={() => set('match_gender', g)}
                className={`rounded-xl border py-2 text-sm transition ${(form.match_gender ?? 'any') === g ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                {g === 'any' ? t.any : t[g]}
              </button>
            ))}
          </div>
        </FieldWrap>
      )}
    </div>
  );
}

function Slider({ label, unit, min, max, value, onChange }: {
  label: string; unit: string; min: number; max: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="font-bold text-cyan-200">{value}<span className="text-white/40"> {unit}</span></span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-fuchsia-500" />
    </div>
  );
}

function Results({ t, lang, mode, user, partner, cocktail, topMatches, customMatch, onRestart }: {
  t: TT; lang: Lang; mode: Mode; user: UserInput; partner?: UserInput; cocktail: CocktailSlice[]; topMatches: TopMatchSlice[]; customMatch: any; onRestart: () => void;
}) {
  const topCeleb = mode === 'celebrity' ? topMatches[0] : undefined;
  const COLORS = ['from-fuchsia-500 to-pink-400', 'from-violet-500 to-cyan-400', 'from-cyan-400 to-emerald-400'];
  const nm = (c: Celebrity) => (lang === 'tr' ? c.name_tr : c.name_en);

  const [comment, setComment] = useState<string | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [selectedWiki, setSelectedWiki] = useState<TopMatchSlice | null>(null);

  useEffect(() => {
    let payload: any = null;

    if (mode === 'celebrity' && topCeleb) {
      payload = {
        mode: 'celebrity',
        lang,
        user: { name: user.name, mbti: user.mbti_type, ebced: calculateEbced(user.name || ''), fields: user.fields, sun_sign: calculateSigns(user.birth_date, user.birth_time, user.lat, user.lon).sun, birth_year: yearOf(user.birth_date), chart: calculateSigns(user.birth_date, user.birth_time, user.lat, user.lon) },
        top: { name: nm(topCeleb.celebrity), sun_sign: topCeleb.celebrity.sun_sign, fields: topCeleb.celebrity.fields, birth_year: yearOf(topCeleb.celebrity.birth_date), overall: topCeleb.result.overall, sub: topCeleb.result.sub },
        mix: cocktail.map((c) => ({ name: nm(c.celebrity), share: c.share })),
      };
    } else if (mode === 'custom' && customMatch && partner) {
      payload = {
        mode: 'custom',
        lang,
        user: { name: user.name, mbti: user.mbti_type, ebced: calculateEbced(user.name || ''), fields: user.fields, sun_sign: calculateSigns(user.birth_date, user.birth_time, user.lat, user.lon).sun, birth_year: yearOf(user.birth_date), chart: calculateSigns(user.birth_date, user.birth_time, user.lat, user.lon) },
        partner: { name: partner.name, mbti: partner.mbti_type, ebced: calculateEbced(partner.name || ''), fields: partner.fields, sun_sign: calculateSigns(partner.birth_date, partner.birth_time, partner.lat, partner.lon).sun, birth_year: yearOf(partner.birth_date), overall: customMatch.overall, sub: customMatch.sub, chart: calculateSigns(partner.birth_date, partner.birth_time, partner.lat, partner.lon) },
      };
    }

    if (!payload) return;

    let cancelled = false;
    setComment(null);
    setLoadingComment(true);
    fetch('/api/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setComment(typeof d.comment === 'string' ? d.comment : null); })
      .catch(() => { if (!cancelled) setComment(null); })
      .finally(() => { if (!cancelled) setLoadingComment(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCeleb, customMatch, lang, mode]);

  if (mode === 'celebrity' && !topCeleb) return null;
  if (mode === 'custom' && !customMatch) return null;

  const matchData = mode === 'celebrity' ? topCeleb.result : customMatch;
  const topName = mode === 'celebrity' ? nm(topCeleb.celebrity) : (partner?.name || 'Partner');
  const userChart = calculateSigns(user.birth_date, user.birth_time, user.lat, user.lon);
  const partnerChart = mode === 'celebrity' ? { sun: topCeleb.celebrity.sun_sign } : calculateSigns(partner!.birth_date, partner!.birth_time, partner!.lat, partner!.lon);
  const topSign = partnerChart.sun;
  const topBirth = mode === 'celebrity' ? topCeleb.celebrity.birth_date : partner!.birth_date;
  const topFields = mode === 'celebrity' ? topCeleb.celebrity.fields : partner!.fields;
  const imageUrl = mode === 'celebrity' ? topCeleb.celebrity.image_url : undefined;

  const userEbcedVal = calculateEbced(user.name || '');
  const partnerEbcedVal = mode === 'custom' && partner?.name ? calculateEbced(partner.name) : undefined;
  const ebcedInfo = getEbcedInterpretation(userEbcedVal, partnerEbcedVal);

  const share = async () => {
    let mixStr = '';
    if (mode === 'celebrity') {
      mixStr = cocktail.map((c) => `%${c.share} ${nm(c.celebrity)}`).join(', ');
    } else {
      mixStr = 'Birlikte dünyayı fethedebiliriz!';
    }
    const text = t.shareText(topName, matchData.overall, mixStr) + (comment ? `\n${comment}` : '');
    try {
      if (navigator.share) await navigator.share({ title: 'StarTwin', text });
      else { await navigator.clipboard.writeText(text); alert(t.copied); }
    } catch { /* dismissed */ }
  };

  return (
    <div className="relative animate-[fade_.5s_ease] p-6 pt-12">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-white/40">{mode === 'celebrity' ? t.cocktailLabel : t.customLabel}</p>

      <div className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-600/30 via-violet-700/20 to-cyan-500/30 p-5 shadow-[0_0_50px_-12px_rgba(255,80,220,0.7)]">
        <div className="flex items-center gap-4">
          <Avatar imageUrl={imageUrl} name={topName} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-cyan-200/80">{t.topMatch}</p>
            <h2 className="truncate text-xl font-black">{topName}</h2>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-200 bg-clip-text text-4xl font-black text-transparent">
                {matchData.overall}%
              </span>
              <span className="text-xs text-white/60">{t.match}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
          <Tag>{SIGN[topSign]?.emoji || '✨'} {SIGN[topSign]?.[lang] || topSign}</Tag>
          {mode === 'custom' && partnerChart.moon && <Tag>🌙 {SIGN[partnerChart.moon]?.[lang] || partnerChart.moon}</Tag>}
          {mode === 'custom' && partnerChart.venus && <Tag>♀️ {SIGN[partnerChart.venus]?.[lang] || partnerChart.venus}</Tag>}
          {mode === 'custom' && partnerChart.mars && <Tag>♂️ {SIGN[partnerChart.mars]?.[lang] || partnerChart.mars}</Tag>}
          <Tag>{t.born} {yearOf(topBirth)}</Tag>
          {topFields.filter((f: Field) => FIELD_LABEL[f]).slice(0, 2).map((f: Field) => (
            <Tag key={f}>{FIELD_LABEL[f].emoji} {FIELD_LABEL[f][lang]}</Tag>
          ))}
        </div>

        {mode === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
            <Tag> Senin Haritan:</Tag>
            <Tag>{SIGN[userChart.sun]?.emoji || '✨'} {SIGN[userChart.sun]?.[lang] || userChart.sun}</Tag>
            <Tag>🌙 {SIGN[userChart.moon]?.[lang] || userChart.moon}</Tag>
            <Tag>♀️ {SIGN[userChart.venus]?.[lang] || userChart.venus}</Tag>
            <Tag>♂️ {SIGN[userChart.mars]?.[lang] || userChart.mars}</Tag>
          </div>
        )}
        
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
          <Tag>✨ Senin Ebcedin: <span className="font-bold text-cyan-200">{userEbcedVal}</span></Tag>
          {partnerEbcedVal !== undefined && (
            <Tag>✨ Onun Ebcedi: <span className="font-bold text-fuchsia-300">{partnerEbcedVal}</span></Tag>
          )}
        </div>

        {ebcedInfo.title && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-bold text-white/90">
              <span>🔮 İsim Numerolojisi:</span>
              <span className="text-fuchsia-300">{ebcedInfo.title}</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              {ebcedInfo.desc}
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label={t.astrology} value={matchData.sub.astrology} />
          <Stat label={t.mbti} value={matchData.sub.mbti} />
          <Stat label={t.physical} value={matchData.sub.physical} />
          <Stat label={t.vibe} value={matchData.sub.vibe} />
        </div>

        <CommentBox loading={loadingComment} text={comment} thinking={t.aiThinking} />
      </div>

      {mode === 'celebrity' && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-white/80">{t.yourMix}</p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {cocktail.map((c, i) => (
              <div key={c.celebrity.id} className={`bg-gradient-to-r ${COLORS[i]}`} style={{ width: `${c.share}%` }} title={`${c.share}% ${nm(c.celebrity)}`} />
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {cocktail.map((c, i) => (
              <li key={c.celebrity.id} className="flex items-center gap-3 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${COLORS[i]}`} />
                <span className="flex-1 truncate text-white/80">{nm(c.celebrity)}</span>
                <span className="text-white/40">{c.result.overall}%</span>
                <span className="w-9 text-right font-bold tabular-nums">{c.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onRestart} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10">{t.retake}</button>
        <button onClick={share} className="flex-[2] rounded-xl bg-cyan-500/20 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/30">
          {t.share}
        </button>
      </div>

      {mode === 'celebrity' && topMatches.length > 1 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-white mb-1">✨ {lang === 'tr' ? 'Kozmik İkizlerin (Top Seçkiler)' : 'Your Cosmic Twins (Top Picks)'}</h3>
          {topMatches.length < 10 && (
             <p className="text-xs text-fuchsia-300 mb-3 font-medium">
               {lang === 'tr' 
                 ? `Sen o kadar eşsizsin ki, koskoca dünyada sana benzeyen sadece ${topMatches.length} ünlü bulabildik! 💖` 
                 : `You are so incredibly rare that we only found ${topMatches.length} celebrities in the world like you! 💖`}
             </p>
          )}
          {topMatches.length >= 10 && (
             <p className="text-[10px] text-white/50 mb-3">{lang === 'tr' ? 'Seninle uyumlu en iyi eşleşmeler:' : 'Your top compatible matches:'}</p>
          )}

          <div className="flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar">
            {topMatches.map((match, i) => (
              <button 
                key={match.celebrity.id}
                onClick={() => setSelectedWiki(match)}
                className="snap-center shrink-0 w-[110px] rounded-2xl bg-white/5 border border-white/10 overflow-hidden text-left hover:bg-white/10 transition group"
              >
                <div className="h-[140px] w-full overflow-hidden relative">
                  <img src={match.wiki.thumbnail?.source || thumb(match.celebrity.image_url)} alt={nm(match.celebrity)} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 text-xs font-black text-cyan-300 drop-shadow-md">
                    %{match.result.overall}
                  </div>
                  {i === 0 && <div className="absolute top-2 right-2 text-xs bg-fuchsia-500 text-white px-1.5 rounded-full font-bold shadow-lg shadow-fuchsia-500/50">#1</div>}
                </div>
                <div className="p-2">
                  <h4 className="font-bold text-xs truncate text-white">{nm(match.celebrity)}</h4>
                  <p className="text-[9px] text-white/50 truncate">♊ {match.celebrity.sun_sign}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedWiki && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedWiki(null)}></div>
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-[#120a24] border-t border-fuchsia-500/30 rounded-t-3xl z-50 p-6 shadow-[0_-10px_40px_rgba(192,38,211,0.2)] animate-[fade_.3s_ease]">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">{nm(selectedWiki.celebrity)}</h2>
                  <p className="text-xs text-white/50 mt-0.5">Uyumluluk: <span className="text-cyan-300 font-bold">%{selectedWiki.result.overall}</span></p>
               </div>
               <button onClick={() => setSelectedWiki(null)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60">✕</button>
            </div>
            
            <div className="flex gap-4 mb-5">
              {selectedWiki.wiki.thumbnail && (
                <img src={selectedWiki.wiki.thumbnail.source} alt={nm(selectedWiki.celebrity)} className="w-24 h-32 object-cover rounded-xl border border-white/10 shadow-lg" />
              )}
              <div className="flex-1 text-sm text-white/80 leading-relaxed">
                <p className="line-clamp-6">{selectedWiki.wiki.extract}</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
               <h4 className="text-xs font-bold text-cyan-200 mb-2">💫 StarTwin Analizi</h4>
               <div className="flex flex-wrap gap-2 text-xs">
                 <div className="bg-white/5 px-2 py-1 rounded">♊ Güneş: <span className="font-medium text-white">{selectedWiki.celebrity.sun_sign}</span></div>
                 {selectedWiki.celebrity.moon_sign && <div className="bg-white/5 px-2 py-1 rounded">🌙 Ay: <span className="font-medium text-white">{selectedWiki.celebrity.moon_sign}</span></div>}
                 <div className="bg-white/5 px-2 py-1 rounded">💼 Alan: <span className="font-medium text-white">{selectedWiki.celebrity.fields[0]}</span></div>
                 <div className="bg-white/5 px-2 py-1 rounded">📅 Kuşak: <span className="font-medium text-white">{yearOf(selectedWiki.celebrity.birth_date)}</span></div>
               </div>
            </div>

            <a href={selectedWiki.wiki.content_urls.desktop.page} target="_blank" rel="noopener noreferrer" 
              className="block w-full text-center py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition">
              {lang === 'tr' ? 'Wikipedia\'da Devamını Oku ↗' : 'Read more on Wikipedia ↗'}
            </a>
          </div>
        </>
      )}

    </div>
  );
}

function Avatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const [ok, setOk] = useState(true);
  const src = thumb(imageUrl);
  if (src && ok) {
    return (
      <img src={src} alt={name} onError={() => setOk(false)}
        className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-white/30" />
    );
  }
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-3xl font-black text-black ring-2 ring-white/30">
      {name.charAt(0)}
    </div>
  );
}

function CommentBox({ loading, text, thinking }: { loading: boolean; text: string | null; thinking: string }) {
  if (!loading && !text) return null;
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3.5">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-fuchsia-400" />
          {thinking}
        </div>
      ) : (
        <p className="text-sm italic leading-snug text-white/90">
          <span className="mr-1 not-italic">🔮</span>{text}
        </p>
      )}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/15 bg-black/25 px-2 py-0.5 text-white/75">{children}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-white/60">{label}</span>
        <span className="text-sm font-bold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 transition-all duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
