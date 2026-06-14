import { useEffect, useState, useRef } from 'react';
import { supabase, updateLocation, registerOrLogin, getNearbyUsers } from '../lib/supabase';
import { calculateMatch, calculateSigns, type UserInput, type Celebrity } from '../lib/match';
import { calculateEbced } from '../lib/ebced';
import ChatRoom from './ChatRoom';
import { KvkkModal, TermsModal } from './LegalModals';
import { AdBanner, type AdSettings } from './AdBanner';
import PremiumPaywall from './PremiumPaywall';
import { shareAsImage } from '../lib/share';
import { containsProfanity } from '../lib/badwords';
import { getSystemSettings } from '../lib/supabase';

const SIGN_EMOJIS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
};

interface CosmicMessage {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  delivery_distance: number;
  receiver_id: string | null;
}

export default function CosmicSquare({ user, onRestart, t, lang }: { user: UserInput, onRestart: () => void, t: any, lang: string }) {
  const [authStep, setAuthStep] = useState<'checking' | 'register' | 'login' | 'locating' | 'ready'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const [radius, setRadius] = useState<number>(500);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [messages, setMessages] = useState<CosmicMessage[]>([]);
  const [nearbyProfiles, setNearbyProfiles] = useState<Record<string, any>>({});
  const [activeChatPartner, setActiveChatPartner] = useState<any | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeChatIds, setActiveChatIds] = useState<Set<string>>(new Set());
  const [publicInput, setPublicInput] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [dailyRequestCount, setDailyRequestCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showKvkk, setShowKvkk] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);

  const [horoscopeOpen, setHoroscopeOpen] = useState(false);
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  const [horoscopeText, setHoroscopeText] = useState('');

  const fetchHoroscope = async () => {
    setHoroscopeOpen(true);
    setLoadingHoroscope(true);
    try {
      const chart = calculateSigns(user.birth_date, user.birth_time);

      const res = await fetch('/api/horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          chart,
          mbti_type: user.mbti_type,
          lang
        })
      });
      const data = await res.json();
      if (data.horoscope) {
        setHoroscopeText(data.horoscope);
      } else {
        setHoroscopeText(lang === 'tr' ? 'Yıldızlar şu an çok sessiz...' : 'The stars are silent right now...');
      }
    } catch (err) {
      setHoroscopeText(lang === 'tr' ? 'Bağlantı kurulamadı.' : 'Connection failed.');
    } finally {
      setLoadingHoroscope(false);
    }
  };

  useEffect(() => {
    getSystemSettings().then(s => {
      if (s) setAdSettings(s as AdSettings);
    });
  }, []);

  const safeName = user?.name || '';
  const bioStr = `${safeName.trim().toLowerCase()}_${user?.birth_date || ''}_${user?.birth_time || ''}`;
  const bioHash = btoa(encodeURIComponent(bioStr));

  useEffect(() => {
    if (authStep !== 'checking') return;
    const checkProfile = async () => {
      if (!supabase) return;
      
      const checkUserLimits = async (uId: string) => {
        const { data: prof } = await supabase.from('profiles').select('is_premium').eq('id', uId).single();
        if (prof?.is_premium) setIsPremium(true);
        
        const { data: reqCount } = await supabase.rpc('get_daily_chat_request_count', { p_user_id: uId });
        setDailyRequestCount(reqCount || 0);
      };

      const savedPass = localStorage.getItem('startwin_pass');
      if (savedPass) {
        const { data } = await registerOrLogin(bioHash, savedPass, user.name || '');
        const result = data as unknown as { user_id: string, is_new: boolean, success: boolean }[];
        if (result && result.length > 0 && result[0].success) {
          const uId = result[0].user_id as string;
          setUserId(uId);
          await checkUserLimits(uId);
          if (user.avatar_url) {
            await supabase.from('profiles').update({ avatar_url: user.avatar_url }).eq('id', uId);
          }
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
      setAuthError(`Veritabanı Hatası: ${error.message}`);
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

    const uId = result[0].user_id;
    setUserId(uId);
    localStorage.setItem('startwin_user_id', uId);
    localStorage.setItem('startwin_pass', password);
    localStorage.setItem('startwin_user', JSON.stringify(user));

    if (user.avatar_url) {
      await supabase.from('profiles').update({ avatar_url: user.avatar_url }).eq('id', uId);
    }
    
    setAuthStep('locating');
  };

  const handleLogout = () => {
    localStorage.removeItem('startwin_user_id');
    localStorage.removeItem('startwin_pass');
    localStorage.removeItem('startwin_user');
    onRestart();
  };

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

        const { data: nearby } = await supabase.rpc('get_nearby_users', { p_lat: lat, p_lng: lng, p_radius_meters: 5000 });
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
             const jitter = Math.floor(Math.random() * 41) - 20;
             let finalDist = Math.max(1, Math.round(n.distance_meters) + jitter);
             profMap[n.id] = { ...n, matchScore: Math.round(matchRes.score), distance_meters: finalDist };
          });
          setNearbyProfiles(profMap);
        }

        setAuthStep('ready');
      },
      (err) => {
        if (!cancelled) setAuthError(lang === 'tr' ? 'Konum alınamadı. Lütfen izin verin.' : 'Location could not be retrieved.');
      },
      { enableHighAccuracy: true }
    );

    return () => { cancelled = true; };
  }, [authStep, userId, user]);

  useEffect(() => {
    if (authStep !== 'ready' || !userId || !supabase) return;

    const channel = supabase
      .channel('public:message_deliveries')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_deliveries', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const delivery = payload.new;
          if (delivery.distance_meters > radius) return;

          const { data: msgData } = await supabase.from('messages').select('*').eq('id', delivery.message_id).single();
          if (!msgData || msgData.receiver_id === userId || msgData.sender_id === userId) return;
          
          setMessages(prev => {
             if (prev.find(m => m.id === msgData.id)) return prev;
             return [...prev, { ...msgData, delivery_distance: delivery.delivery_distance || delivery.distance_meters }];
          });
        }
      )
      .subscribe();

    const reqChannel = supabase
      .channel('public:chat_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_requests', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncomingRequests(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setIncomingRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r).filter(r => r.status === 'pending'));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_requests', filter: `sender_id=eq.${userId}` },
        (payload) => {
          if (payload.new.status === 'accepted') {
             const newPartnerId = payload.new.receiver_id === userId ? payload.new.sender_id : payload.new.receiver_id;
             setActiveChatIds(prev => new Set(prev).add(newPartnerId));
             const partnerProf = nearbyProfiles[newPartnerId];
             if (partnerProf) setActiveChatPartner(partnerProf);
          }
        }
      )
      .subscribe();

    const fetchIncomingRequests = async () => {
        const { data } = await supabase!.from('chat_requests').select('*').eq('receiver_id', userId).eq('status', 'pending');
        if (data) setIncomingRequests(data);
    };

    const fetchAcceptedChats = async () => {
        const { data } = await supabase!.from('chat_requests')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (data) {
          const ids = new Set<string>();
          data.forEach(r => ids.add(r.sender_id === userId ? r.receiver_id : r.sender_id));
          setActiveChatIds(ids);
        }
    };

    fetchIncomingRequests();
    fetchAcceptedChats();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(reqChannel); };
  }, [authStep, userId, radius, nearbyProfiles, supabase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendPublicMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicInput.trim() || !userId || !supabase || !coords) return;
    const content = publicInput.trim();
    
    if (containsProfanity(content)) {
      alert("Kozmik enerjiyi kirleten kelimeler kullanamazsın!");
      setPublicInput('');
      return;
    }

    setPublicInput('');

    const tempMsg = {
      id: crypto.randomUUID(),
      sender_id: userId,
      message_text: content,
      created_at: new Date().toISOString(),
      delivery_distance: 0,
      receiver_id: null
    };
    setMessages(prev => [...prev, tempMsg]);

    const pointStr = `POINT(${coords.lng} ${coords.lat})`;
    const { error } = await supabase.from('messages').insert({
      sender_id: userId,
      message_text: content,
      sender_location: pointStr
    });
    
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  const handleSendRequest = async () => {
    if (!selectedProfile || !userId || !supabase) return;

    if (!isPremium && dailyRequestCount >= 3) {
      setShowPaywall(true);
      return;
    }

    await supabase.from('chat_requests').insert({ sender_id: userId, receiver_id: selectedProfile.id, status: 'pending' });
    
    setDailyRequestCount(prev => prev + 1);
    // Trigger Push Notification
    fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedProfile.id,
        title: 'Yeni Kozmik Sohbet İsteği',
        body: 'Gizemli bir ruh seninle eşleşmek istiyor! Meydana dön ve kim olduğuna bak.',
        url: '/'
      })
    }).catch(console.error);

    setSelectedProfile(null);
  };

  const acceptRequest = async (req: any) => {
    await supabase!.from('chat_requests').update({ status: 'accepted' }).eq('id', req.id);
    setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
    setActiveChatIds(prev => new Set(prev).add(req.sender_id));
    const partnerProf = nearbyProfiles[req.sender_id];
    if (partnerProf) setActiveChatPartner(partnerProf);
  };

  const rejectRequest = async (req: any) => {
    await supabase!.from('chat_requests').update({ status: 'rejected' }).eq('id', req.id);
    setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
  };

  if (activeChatPartner && userId) {
    return <ChatRoom myId={userId} partner={activeChatPartner} onBack={() => setActiveChatPartner(null)} />;
  }

  if (authStep === 'checking') return <div className="flex flex-col items-center justify-center py-20 text-white"><div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (authStep === 'register' || authStep === 'login') {
    return (
      <div className="relative animate-[fade_.5s_ease] p-6 pt-12 text-white max-w-sm w-full mx-auto">
        <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent mb-2">{authStep === 'register' ? 'Kozmik Kayıt' : 'Kozmik Giriş'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" required />
          {authStep === 'register' && <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Şifre (Tekrar)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" required />}
          {authError && <p className="text-xs text-red-400 bg-red-500/20 p-2 rounded">{authError}</p>}
          <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black font-bold py-3 rounded-xl">Devam Et</button>
        </form>
        <KvkkModal isOpen={showKvkk} onClose={() => setShowKvkk(false)} />
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    );
  }

  return (
    <div className="relative animate-[fade_.5s_ease] flex flex-col h-full text-white">
      {/* Günün Falı Modal */}
      {horoscopeOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-fuchsia-500/30 bg-[#0b0b1a] p-6 shadow-[0_0_40px_rgba(255,0,255,0.2)] text-center animate-[fade_.3s_ease]">
            <h3 className="text-xl font-black mb-4 bg-gradient-to-r from-fuchsia-300 to-cyan-200 bg-clip-text text-transparent">
              🔮 Günün Kozmik Falı
            </h3>
            {loadingHoroscope ? (
              <div className="flex flex-col items-center py-10 space-y-4">
                <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white/60 text-sm animate-pulse">Yıldızların mesajı çözülüyor...</p>
              </div>
            ) : (
              <div id="horoscope-share-card" className="relative bg-[#0b0b1a] rounded-2xl p-4 border border-fuchsia-500/20 shadow-lg shadow-fuchsia-900/20">
                <div className="text-left text-sm leading-relaxed text-white/90 mb-2 max-h-[60vh] overflow-y-auto scrollbar-hide pb-4 space-y-4">
                  {horoscopeText.split('\n').map((line, i) => {
                    if (!line.trim()) return null;
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={i} className="mb-2">
                        {parts.map((part, j) => 
                          part.startsWith('**') && part.endsWith('**') 
                            ? <strong key={j} className="text-fuchsia-300 font-bold block mt-4 mb-1 text-base">{part.slice(2, -2)}</strong> 
                            : part
                        )}
                      </p>
                    );
                  })}
                </div>
                {/* Filigran */}
                <div className="mt-4 pt-3 border-t border-white/10 text-center">
                  <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">✨ startwin-eta.vercel.app</p>
                </div>
                {horoscopeText && horoscopeText.length > 200 && (
                  <div className="absolute bottom-10 left-0 right-0 h-10 bg-gradient-to-t from-[#0b0b1a] to-transparent flex justify-center items-end pointer-events-none">
                    <span className="animate-bounce text-fuchsia-400 mb-1 text-xl">⬇️</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => setHoroscopeOpen(false)}
                className="flex-1 rounded-xl bg-white/10 py-3 font-bold hover:bg-white/20 transition">
                Kapat
              </button>
              {!loadingHoroscope && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    const oldText = btn.innerText;
                    btn.innerText = 'Hazırlanıyor...';
                    await import('../lib/share').then(m => 
                      m.shareAsImage(
                        'horoscope-share-card', 
                        'startwin-gunluk-fal', 
                        'Günün Kozmik Falı! Sen de kendi falına bak: https://startwin-eta.vercel.app'
                      )
                    );
                    btn.innerText = oldText;
                    btn.disabled = false;
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 py-3 font-bold text-white shadow-[0_0_15px_-3px_rgba(255,0,255,0.5)] transition hover:brightness-110">
                  Paylaş ↗
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md rounded-t-[2rem]">
        <div className="flex justify-between items-center mb-2 pr-16">
          <h2 className="font-black text-lg bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Kozmik Meydan</h2>
          <div className="flex items-center gap-1.5 z-10">
            <button onClick={fetchHoroscope} className="text-[10px] px-3 py-1.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30 transition font-bold border border-fuchsia-500/30">🔮 Falım</button>
            <button 
              onClick={async () => {
                const { subscribeToPushNotifications } = await import('../lib/push');
                const ok = await subscribeToPushNotifications(supabase, userId!);
                if (ok) alert('Kozmik bildirimler aktif! Biri sana istek attığında telefonuna bildirim gelecek.');
                else alert('Bildirim izni alınamadı veya tarayıcınız desteklemiyor.');
              }} 
              className="text-[12px] w-7 h-7 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
              title="Bildirimleri Aç"
            >
              🔔
            </button>
            <button 
              onClick={() => setShowPaywall(true)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-1 hover:scale-105 transition text-[10px]"
            >
              👑 {isPremium ? 'VIP' : 'Premium'}
            </button>
            <button onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} className="text-[10px] w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition font-bold">{lang.toUpperCase()}</button>
            <button onClick={handleLogout} className="text-[10px] px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition font-bold">Çıkış</button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs pr-2">
          <span className="text-white/60">Mesafe:</span>
          <input type="range" min="100" max="5000" step="100" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="flex-1 accent-fuchsia-500" />
          <span className="font-bold text-cyan-300 w-12 text-right">{radius < 1000 ? `${radius}m` : `${(radius/1000).toFixed(1)}km`}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40"><span className="text-4xl mb-3">🌌</span><p>Meydan sessiz.</p></div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === userId;
            const prof = nearbyProfiles[m.sender_id];
            const anonName = prof?.anonymous_name || 'Gizemli Ruh';
            const signEmoji = prof?.sun_sign ? SIGN_EMOJIS[prof.sun_sign] : '✨';
            const dist = m.delivery_distance ? Math.max(1, Math.round(m.delivery_distance) + (Math.floor(Math.random() * 41) - 20)) : '?';

            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div onClick={() => {
                  if (isMe || !prof) return;
                  if (activeChatIds.has(prof.id)) {
                    setActiveChatPartner(prof);
                  } else {
                    setSelectedProfile(prof);
                  }
                }} className={`flex flex-col max-w-[85%] ${!isMe ? 'cursor-pointer' : ''}`}>
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      {prof?.avatar_url ? (
                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                          <img src={prof.avatar_url} className="w-full h-full object-cover blur-[6px] scale-125 brightness-75" alt="Gizemli Yüz" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[10px]">👤</div>
                      )}
                      <span className="text-[10px] text-white/60">{anonName} {signEmoji} ~{dist}m</span>
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl ${isMe ? 'bg-fuchsia-600 rounded-tr-sm' : 'bg-white/10 rounded-tl-sm'} break-words`}>{m.message_text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10 rounded-b-[2rem]">
        <form onSubmit={sendPublicMessage} className="flex gap-2">
          <input type="text" value={publicInput} onChange={(e) => setPublicInput(e.target.value)} placeholder="Meydana fısılda..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5" />
          <button type="submit" className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 w-10 h-10 rounded-full">➤</button>
        </form>
      </div>

      {incomingRequests.length > 0 && (
        <div className="absolute top-20 left-4 right-4 z-40 space-y-2">
          {incomingRequests.map(req => {
             const sender = nearbyProfiles[req.sender_id];
             if (!sender) return null;
             return (
               <div key={req.id} className="bg-black/80 backdrop-blur p-4 rounded-xl border border-cyan-500/30 flex items-center justify-between">
                 <p className="text-sm">{sender.anonymous_name} sohbet istiyor!</p>
                 <div className="flex gap-2"><button onClick={() => acceptRequest(req)} className="bg-cyan-600 px-3 py-1 rounded-full">✓</button><button onClick={() => rejectRequest(req)} className="bg-red-900 px-3 py-1 rounded-full">✕</button></div>
               </div>
             )
          })}
        </div>
      )}

      {/* Premium Paywall Modal */}
      {showPaywall && (
        <PremiumPaywall 
          onClose={() => setShowPaywall(false)} 
          onSubscribe={async () => {
            setIsPremium(true);
            if (userId && supabase) {
              await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
            }
          }} 
        />
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f1a] w-full max-w-sm rounded-3xl p-6 border border-white/10">
            <h3 className="text-xl font-bold">{selectedProfile.anonymous_name}</h3>
            {selectedProfile.avatar_url && (
              <div className="w-24 h-24 mx-auto my-4 rounded-full overflow-hidden border-2 border-fuchsia-500/30">
                <img src={selectedProfile.avatar_url} className="w-full h-full object-cover blur-[12px] scale-125 brightness-75" alt="Gizemli Yüz" />
              </div>
            )}
            <p className="text-cyan-300 mt-2">Uyum: %{selectedProfile.matchScore}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedProfile(null)} className="flex-1 py-3 rounded-xl bg-white/10">İptal</button>
              <button onClick={handleSendRequest} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500">İstek Gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
