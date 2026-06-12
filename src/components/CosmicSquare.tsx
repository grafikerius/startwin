import { useEffect, useState, useRef } from 'react';
import { supabase, updateLocation, registerOrLogin, getNearbyUsers } from '../lib/supabase';
import { calculateMatch, calculateSigns, type UserInput, type Celebrity } from '../lib/match';
import { calculateEbced } from '../lib/ebced';
import ChatRoom from './ChatRoom';
import { KvkkModal, TermsModal } from './LegalModals';
import { AdBanner, type AdSettings } from './AdBanner';
import { getSystemSettings } from '../lib/supabase';

export default function CosmicSquare({ user, onRestart, t, lang }: { user: UserInput, onRestart: () => void, t: any, lang: string }) {
  const [authStep, setAuthStep] = useState<'checking' | 'register' | 'login' | 'locating' | 'ready'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const [radius, setRadius] = useState<number>(500);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [nearbyProfiles, setNearbyProfiles] = useState<Record<string, any>>({});
  const [activeChatPartner, setActiveChatPartner] = useState<any | null>(null);
  
  const [publicInput, setPublicInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showKvkk, setShowKvkk] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);

  useEffect(() => {
    getSystemSettings().then(s => {
      if (s) setAdSettings(s as AdSettings);
    });
  }, []);

  // Generate Bio Hash
  const safeName = user?.name || '';
  const bioStr = `${safeName.trim().toLowerCase()}_${user?.birth_date || ''}_${user?.birth_time || ''}`;
  const bioHash = btoa(encodeURIComponent(bioStr));

  // 0. Check if profile exists
  useEffect(() => {
    if (authStep !== 'checking') return;
    const checkProfile = async () => {
      if (!supabase) return;
      
      const savedPass = localStorage.getItem('startwin_pass');
      if (savedPass) {
        const { data } = await registerOrLogin(bioHash, savedPass, user.name || '');
        const result = data as unknown as { user_id: string, is_new: boolean, success: boolean }[];
        if (result && result.length > 0 && result[0].success) {
          setUserId(result[0].user_id);
          setAuthStep('locating');
          return;
        }
      }

      const { data } = await supabase.from('profiles').select('id').eq('bio_hash', bioHash).maybeSingle();
      if (data) setAuthStep('login');
      else setAuthStep('register');
    };
    checkProfile();
  }, [authStep, bioHash, user.name]);

  // 1. Password Auth Submit
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    if (authStep === 'register' && password !== confirmPassword) {
      setAuthError('Şifreler eşleşmiyor!');
      return;
    }
    setAuthError('');
    
    const { data, error } = await registerOrLogin(bioHash, password, user.name || '');
    if (error) {
      console.error("Supabase RPC Error:", error);
      setAuthError(`Veritabanı Hatası: ${error.message} (Lütfen SQL dosyasını çalıştırdığınızdan emin olun)`);
      return;
    }
    if (!data) {
      setAuthError('Giriş başarısız. Sunucudan yanıt alınamadı.');
      return;
    }
    
    const result = data as unknown as { user_id: string, is_new: boolean, success: boolean, message: string }[];
    if (!result || result.length === 0 || !result[0].success) {
      setAuthError(result?.[0]?.message || 'Şifre hatalı veya hesap bulunamadı.');
      return;
    }

    setUserId(result[0].user_id);
    localStorage.setItem('startwin_user_id', result[0].user_id);
    localStorage.setItem('startwin_pass', password);
    localStorage.setItem('startwin_user', JSON.stringify(user));
    setAuthStep('locating');
  };

  const handleLogout = () => {
    localStorage.removeItem('startwin_user_id');
    localStorage.removeItem('startwin_pass');
    localStorage.removeItem('startwin_user');
    onRestart();
  };

  // 2. Fetch Location & Initialize Public Room
  useEffect(() => {
    if (authStep !== 'locating' || !userId) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        const userEbced = calculateEbced(user.name || '');
        const userSigns = calculateSigns(user.birth_date, user.birth_time, lat, lng);
        const anonNames = ['Gizemli Baykuş', 'Kozmik Kaplan', 'Parlak Yıldız', 'Derin Okyanus', 'Kızıl Anka', 'Mistik Kurt'];
        const randomAnon = anonNames[Math.floor(Math.random() * anonNames.length)];

        // Update Profile & Location
        await updateLocation({
          p_user_id: userId,
          p_lat: lat,
          p_lng: lng,
          p_anon_name: randomAnon,
          p_gender: user.gender || 'other',
          p_birth_date: user.birth_date || '2000-01-01',
          p_sun_sign: userSigns.sun,
          p_mbti_type: user.mbti_type || null,
          p_fields: user.fields || [],
          p_height: user.height || null,
          p_weight: user.weight || null,
          p_ebced_val: userEbced
        });

        // Pre-fetch nearby profiles for fast matching display
        const { data: nearby } = await getNearbyUsers(lat, lng, 5000);
        if (nearby) {
          const profMap: Record<string, any> = {};
          nearby.forEach((n: any) => {
             const partnerInput: Celebrity = {
                id: n.id, name_en: n.anonymous_name, name_tr: n.anonymous_name,
                gender: n.gender || 'other', birth_date: n.birth_date || '2000-01-01',
                sun_sign: n.sun_sign || 'Aries', fields: n.fields || [],
                fame: 0, mbti_type: n.mbti_type,
             };
             const matchRes = calculateMatch(user, partnerInput);
             // Jitter distance slightly for privacy
             const jitter = Math.floor(Math.random() * 41) - 20; // -20 to +20
             let finalDist = Math.max(1, Math.round(n.distance_meters) + jitter);
             
             profMap[n.id] = { ...n, matchScore: Math.round(matchRes.score), distance_meters: finalDist };
          });
          setNearbyProfiles(profMap);
        }

        setAuthStep('ready');
      },
      (err) => {
        if (!cancelled) setAuthError(lang === 'tr' ? 'Konum alınamadı. Lütfen izin verin.' : 'Location could not be retrieved. Please allow permission.');
      },
      { enableHighAccuracy: true }
    );

    return () => { cancelled = true; };
  }, [authStep, userId, user]);

  // 3. Listen to Public Messages
  useEffect(() => {
    if (authStep !== 'ready' || !userId || !supabase) return;

    const channel = supabase
      .channel('public_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_deliveries', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const delivery = payload.new;
          if (delivery.distance_meters > radius) return;

          const { data: msgData } = await supabase.from('messages').select('*').eq('id', delivery.message_id).single();
          if (!msgData) return;
          
          if (msgData.receiver_id && msgData.receiver_id !== userId) return;
          if (msgData.receiver_id === userId) return;
          if (msgData.sender_id === userId) return;
          
          setMessages(prev => {
             if (prev.find(m => m.id === msgData.id)) return prev;
             return [...prev, { ...msgData, delivery_distance: delivery.distance_meters }];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authStep, userId, radius]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendPublicMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicInput.trim() || !userId || !supabase || !coords) return;
    const content = publicInput.trim();
    setPublicInput('');

    // Optimistically add to UI
    const tempMsg = {
      id: crypto.randomUUID(),
      sender_id: userId,
      message_text: content,
      created_at: new Date().toISOString(),
      delivery_distance: 0,
      receiver_id: null
    };
    setMessages(prev => [...prev, tempMsg]);

    // Insert message with correct PostGIS POINT string format
    const pointStr = `POINT(${coords.lng} ${coords.lat})`;
    const { error } = await supabase.from('messages').insert({
      sender_id: userId,
      message_text: content,
      sender_location: pointStr
    });
    
    if (error) {
      console.error('Mesaj gönderme hatası:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  if (activeChatPartner && userId) {
    return <ChatRoom myId={userId} partner={activeChatPartner} onBack={() => setActiveChatPartner(null)} />;
  }

  if (authStep === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (authStep === 'register' || authStep === 'login') {
    return (
      <div className="relative animate-[fade_.5s_ease] p-6 pt-12 text-white max-w-sm w-full mx-auto">
        <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent mb-2">
          {authStep === 'register' ? 'Kozmik Kayıt' : 'Kozmik Giriş'}
        </h2>
        <p className="text-xs text-white/60 mb-6">
          {authStep === 'register' 
            ? 'Profilini korumak için bir şifre belirle.' 
            : 'Bu profil zaten mevcut, lütfen şifreni gir.'}
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-white/50 hover:text-white">
              {showPassword ? 'Gizle' : 'Göster'}
            </button>
          </div>

          {authStep === 'register' && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifre (Tekrar)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
                required
              />
            </div>
          )}

          {authError && <p className="text-xs text-red-400 font-bold bg-red-500/20 p-2 rounded">{authError}</p>}
          
          <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black font-bold py-3 rounded-xl hover:brightness-110 transition">
            {authStep === 'register' ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
          
          {authStep === 'register' && (
            <p className="text-[10px] text-white/50 text-center mt-4">
              Kayıt olarak <button type="button" onClick={() => setShowTerms(true)} className="text-cyan-300 hover:underline">Kullanım Şartları</button>'nı ve{' '}
              <button type="button" onClick={() => setShowKvkk(true)} className="text-fuchsia-300 hover:underline">Gizlilik Politikasını (KVKK)</button> okuyup kabul etmiş sayılırsınız.
            </p>
          )}
        </form>
        <button onClick={onRestart} className="mt-4 w-full text-xs text-white/40 hover:text-white">Geri Dön</button>
        
        <KvkkModal isOpen={showKvkk} onClose={() => setShowKvkk(false)} />
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    );
  }

  if (authStep === 'locating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white px-6 text-center">
        {authError ? (
          <>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 mb-4 text-2xl">⚠️</div>
            <p className="text-sm text-red-400 mb-4">{authError}</p>
            <p className="text-xs text-white/50 mb-4">
              {lang === 'tr' 
                ? 'Tarayıcınızın gizlilik ayarlarından konum izni vermeniz veya "https://" ile güvenli bir bağlantı kullanmanız gerekebilir.' 
                : 'You may need to allow location in browser settings or use a secure "https://" connection.'}
            </p>
            <button onClick={() => setAuthStep('checking')} className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">
              {lang === 'tr' ? 'Tekrar Dene' : 'Try Again'}
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-fuchsia-300 animate-pulse">
              {lang === 'tr' ? 'Konum taranıyor, kozmik meydana bağlanılıyor...' : 'Scanning location, connecting to cosmic square...'}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative animate-[fade_.5s_ease] flex flex-col h-[600px] text-white">
      {/* Header & Radius Slider */}
      <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md rounded-t-[2rem]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-black text-lg bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Kozmik Meydan</h2>
          <button onClick={handleLogout} className="text-[10px] px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition font-bold">Çıkış Yap</button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/60">Mesafe:</span>
          <input type="range" min="100" max="5000" step="100" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="flex-1 accent-fuchsia-500" />
          <span className="font-bold text-cyan-300 w-12 text-right">{radius < 1000 ? `${radius}m` : `${(radius/1000).toFixed(1)}km`}</span>
        </div>
      </div>

      {/* Public Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40">
            <span className="text-4xl mb-3">🌌</span>
            <p className="text-sm text-center">Meydan şu an sessiz.<br/>Mesafeyi artırın veya ilk mesajı siz atın.</p>
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === userId;
            const prof = nearbyProfiles[m.sender_id];
            const matchScore = prof?.matchScore || '?';
            const anonName = prof?.anonymous_name || 'Gizemli Ruh';
            const sign = prof?.sun_sign ? (prof.sun_sign.substring(0,2)) : '✨';
            const dist = m.delivery_distance ? Math.max(1, Math.round(m.delivery_distance) + (Math.floor(Math.random() * 41) - 20)) : '?';

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <button onClick={() => setActiveChatPartner(prof)} className="mb-1 text-[10px] flex items-center gap-1.5 hover:opacity-80 transition bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
                    <span className="font-bold text-white">{anonName}</span>
                    <span className="text-white/50">{sign}</span>
                    <span className="text-fuchsia-300 font-bold">%{(matchScore as number)}</span>
                    <span className="text-cyan-300">~{dist}m</span>
                  </button>
                )}
                <div className={`max-w-[85%] p-3 rounded-2xl ${isMe ? 'bg-fuchsia-600 rounded-tr-sm' : 'bg-white/10 rounded-tl-sm'}`}>
                  <p className="text-sm text-white/95">{m.message_text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10 rounded-b-[2rem]">
        <form onSubmit={sendPublicMessage} className="flex gap-2">
          <input
            type="text"
            value={publicInput}
            onChange={(e) => setPublicInput(e.target.value)}
            placeholder="Meydana fısılda..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
          />
          <button type="submit" disabled={!publicInput.trim()} className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50">
            ➤
          </button>
        </form>
        
        {/* Banner Ad Area */}
        {adSettings && adSettings.banner_enabled && (
           <div className="mt-4">
             <AdBanner settings={adSettings} />
           </div>
        )}
      </div>
    </div>
  );
}
