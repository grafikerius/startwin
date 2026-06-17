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
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text?: string, loading?: boolean }>>({});
  const [replyingTo, setReplyingTo] = useState<{ senderName: string, text: string } | null>(null);
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
             profMap[n.id] = { ...n, matchScore: Math.round(matchRes.overall), distance_meters: finalDist };
          });
          setNearbyProfiles(profMap);
        }

        setAuthStep('ready');
      },
      (err) => {
        if (!cancelled) setAuthError(lang === 'tr' ? 'Konum alınamadı. Lütfen izin verin.' : 'Location could not be retrieved. Please allow.');
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
    
    // Alıntı formatı: [REPLY:SenderName:::MessageText]GerçekMesaj
    let finalContent = publicInput.trim();
    if (replyingTo) {
      // Clean up the reply text to prevent injection of fake replies
      const cleanReplyText = replyingTo.text.replace(/\[REPLY:.*?\]/g, '').substring(0, 50);
      finalContent = `[REPLY:${replyingTo.senderName}:::${cleanReplyText}]${finalContent}`;
    }

    if (containsProfanity(finalContent)) {
      alert(lang === 'tr' ? "Kozmik enerjiyi kirleten kelimeler kullanamazsın!" : "You cannot use words that pollute the cosmic energy!");
      setPublicInput('');
      setReplyingTo(null);
      return;
    }

    setPublicInput('');
    setReplyingTo(null);

    const tempMsg = {
      id: crypto.randomUUID(),
      sender_id: userId,
      message_text: finalContent,
      created_at: new Date().toISOString(),
      delivery_distance: 0,
      receiver_id: null
    };
    setMessages(prev => [...prev, tempMsg]);

    const pointStr = `POINT(${coords.lng} ${coords.lat})`;
    const { error } = await supabase.from('messages').insert({
      sender_id: userId,
      message_text: finalContent,
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
        title: lang === 'tr' ? 'Yeni Kozmik Sohbet İsteği' : 'New Cosmic Chat Request',
        body: lang === 'tr' ? 'Gizemli bir ruh seninle eşleşmek istiyor! Meydana dön ve kim olduğuna bak.' : 'A mysterious soul wants to match with you! Return to the square and see who it is.',
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

  const handleTranslate = async (msgId: string, textToTranslate: string) => {
    if (!textToTranslate.trim()) return;
    
    setTranslatedMessages(prev => ({ ...prev, [msgId]: { loading: true } }));
    
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang: lang })
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslatedMessages(prev => ({ ...prev, [msgId]: { text: data.translatedText, loading: false } }));
      } else {
        setTranslatedMessages(prev => ({ ...prev, [msgId]: { text: 'Çeviri başarısız.', loading: false } }));
      }
    } catch (err) {
      setTranslatedMessages(prev => ({ ...prev, [msgId]: { text: 'Hata oluştu.', loading: false } }));
    }
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
            
            {/* Gizli Kompakt Burç Paylaşım Şablonu */}
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
              <div 
                id="compact-horoscope-share" 
                className="w-[400px] overflow-hidden rounded-[32px] p-8 text-white border border-fuchsia-500/30"
                style={{ background: 'linear-gradient(135deg, #1a0b2e 0%, #06060f 50%, #0f1b29 100%)' }}
              >
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-400">
                  <span className="text-xl">✨</span> StarTwin <span className="text-xl">✨</span>
                </div>
                
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-fuchsia-500/50 bg-white/5 text-6xl shadow-[0_0_40px_rgba(255,80,220,0.4)] mb-6">
                  {SIGN[profile?.sun_sign || 'Aries']?.emoji || '🌟'}
                </div>
                
                <h2 className="text-3xl font-black mb-2">Günün Kozmik Falı</h2>
                <p className="text-cyan-200/80 mb-6 font-medium text-lg">
                  {SIGN[profile?.sun_sign || 'Aries']?.tr || profile?.sun_sign} Burcu
                </p>
                
                <div className="mt-4 pt-5 w-full flex flex-col items-center justify-center text-sm border-t border-white/10 gap-1">
                  <span className="text-white/50">Yıldızların sana mesajı var</span>
                  <span className="font-bold text-cyan-400 tracking-wider">startwin.vercel.app</span>
                </div>
              </div>
            </div>
            </div>
            
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
                        'compact-horoscope-share', 
                        'startwin-gunluk-fal', 
                        `Günün Kozmik Falı: ${horoscopeText.substring(0, 100).replace(/\*\*/g, '')}...\n\n👇 Devamını okumak ve kendi kozmik falına bakmak için bu linke tıkla:`,
                        'https://startwin-eta.vercel.app'
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
        <div className="flex justify-between items-center mb-3 pr-2">
          <h2 className="font-black text-lg bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">{lang === 'tr' ? 'Kozmik Meydan' : 'Cosmic Square'}</h2>
          
          <div className="flex items-center gap-1.5 p-1.5 bg-black/40 border border-white/10 backdrop-blur-xl rounded-full shadow-[0_0_20px_rgba(192,38,211,0.15)] z-10">
            <button onClick={fetchHoroscope} className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-fuchsia-600/20 text-fuchsia-300 hover:from-fuchsia-500/40 hover:to-fuchsia-600/40 transition font-bold shadow-[inset_0_1px_rgba(255,255,255,0.1)] border border-fuchsia-500/30 group" title={lang === 'tr' ? 'Falım' : 'My Oracle'}>
              <span className="text-sm group-hover:scale-110 transition-transform">🔮</span>
            </button>
            
            <div className="w-[1px] h-4 bg-white/10 mx-0.5"></div>
            
            <button 
              onClick={async () => {
                const { subscribeToPushNotifications } = await import('../lib/push');
                const ok = await subscribeToPushNotifications(supabase, userId!);
                if (ok) alert(lang === 'tr' ? 'Kozmik bildirimler aktif! Biri sana istek attığında telefonuna bildirim gelecek.' : 'Cosmic notifications active! You will get a notification when someone sends a request.');
                else alert(lang === 'tr' ? 'Bildirim izni alınamadı veya tarayıcınız desteklemiyor.' : 'Notification permission denied or not supported by your browser.');
              }} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition text-blue-300 relative group"
              title={lang === 'tr' ? 'Bildirimleri Aç' : 'Enable Notifications'}
            >
              <span className="text-sm drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">🔔</span>
              <div className="absolute -inset-1 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
            </button>
            
            <div className="w-[1px] h-4 bg-white/10 mx-0.5"></div>
            
            <button 
              onClick={() => setShowPaywall(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-300 border border-yellow-500/30 hover:from-yellow-500/40 hover:to-amber-600/40 transition font-bold relative group"
              title={isPremium ? 'VIP' : 'Premium'}
            >
              <span className="text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] group-hover:scale-110 transition-transform">👑</span>
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-0.5"></div>
            
            <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 transition text-red-400 group" title={lang === 'tr' ? 'Çıkış' : 'Logout'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs pr-2">
          <span className="text-white/60">{lang === 'tr' ? 'Mesafe:' : 'Distance:'}</span>
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
            const localUser = JSON.parse(localStorage.getItem('startwin_user') || '{}');
            const prof = isMe ? localUser : (nearbyProfiles[m.sender_id] || { anonymous_name: (m as any).sender_anonymous_name });
            const anonName = prof?.anonymous_name || (lang === 'tr' ? 'Gizemli Ruh' : 'Mysterious Soul');
            const signEmoji = prof?.sun_sign ? SIGN_EMOJIS[prof.sun_sign] : '✨';
            const dist = m.delivery_distance ? Math.max(1, Math.round(m.delivery_distance) + (Math.floor(Math.random() * 41) - 20)) : '?';

            // Alıntı ayrıştırma
            let isReply = false;
            let replySender = '';
            let replyText = '';
            let displayMessage = m.message_text;
            
            const replyMatch = displayMessage.match(/^\[REPLY:(.*?):::(.*?)\](.*)$/s);
            if (replyMatch) {
              isReply = true;
              replySender = replyMatch[1];
              replyText = replyMatch[2];
              displayMessage = replyMatch[3];
            }

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
                  <div className={`p-3 rounded-2xl ${isMe ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 rounded-tr-sm' : 'bg-white/10 rounded-tl-sm border border-white/5'} shadow-lg break-words max-w-full relative group`}>
                    
                    {isReply && (
                      <div className="mb-2 p-2 bg-black/20 rounded border-l-2 border-fuchsia-400 text-xs text-white/70">
                        <span className="font-bold text-fuchsia-300">{replySender}</span>
                        <p className="truncate">{replyText}</p>
                      </div>
                    )}
                    
                    <p className="text-sm">{displayMessage}</p>
                    {translatedMessages[m.id]?.loading && <p className="text-[10px] text-cyan-300 mt-1 italic animate-pulse">{lang === 'tr' ? 'Çevriliyor...' : 'Translating...'}</p>}
                    {translatedMessages[m.id]?.text && <p className="text-xs text-cyan-200 mt-2 border-t border-white/10 pt-1 font-medium">{translatedMessages[m.id].text}</p>}
                    
                    {!isMe && (
                      <div className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTranslate(m.id, displayMessage); }}
                          className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 text-[10px]"
                          title={lang === 'tr' ? 'Çevir' : 'Translate'}
                        >
                          🌐
                        </button>
                        {prof?.anonymous_name && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setReplyingTo({ senderName: prof.anonymous_name, text: displayMessage }); }}
                            className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 text-[10px]"
                            title={lang === 'tr' ? 'Yanıtla' : 'Reply'}
                          >
                            ↩️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10 rounded-b-[2rem] flex flex-col">
        {replyingTo && (
          <div className="flex items-center justify-between bg-black/40 p-2 rounded-t-xl border-l-2 border-fuchsia-400 mb-1 text-xs">
            <div className="truncate flex-1">
              <span className="text-fuchsia-300 font-bold mr-2">{replyingTo.senderName}:</span>
              <span className="text-white/60">{replyingTo.text}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="ml-2 text-white/50 hover:text-white">✕</button>
          </div>
        )}
        <form onSubmit={sendPublicMessage} className="flex gap-2">
          <input type="text" value={publicInput} onChange={(e) => setPublicInput(e.target.value)} placeholder={lang === 'tr' ? 'Meydana fısılda...' : 'Whisper to the square...'} className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5" />
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
                 <p className="text-sm">{sender.anonymous_name} {lang === 'tr' ? 'sohbet istiyor!' : 'wants to chat!'}</p>
                 <div className="flex gap-2"><button onClick={() => acceptRequest(req)} className="bg-cyan-600 px-3 py-1 rounded-full">✓</button><button onClick={() => rejectRequest(req)} className="bg-red-900 px-3 py-1 rounded-full">✕</button></div>
               </div>
             )
          })}
        </div>
      )}

      {/* Premium Paywall Modal */}
      {showPaywall && (
        <PremiumPaywall 
          lang={lang}
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
          <div className="bg-[#0f0f1a] w-full max-w-sm rounded-3xl p-6 border border-white/10 text-center">
            <h3 className="text-xl font-black mb-2">{selectedProfile.anonymous_name}</h3>
            {selectedProfile.avatar_url && (
              <div className="w-24 h-24 mx-auto my-4 rounded-full overflow-hidden border-2 border-fuchsia-500/30">
                <img src={selectedProfile.avatar_url} className="w-full h-full object-cover blur-[12px] scale-125 brightness-75" alt="Gizemli Yüz" />
              </div>
            )}
            <p className="text-sm text-white/60 mb-6">{lang === 'tr' ? 'Biri sana, sen de ona bakıyorsun...' : 'Someone is looking at you, and you are looking at them...'}</p>
            <button onClick={handleSendRequest} className="w-full py-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 font-bold mb-3">{lang === 'tr' ? 'Özel Sohbete Davet Et' : 'Invite to Private Chat'}</button>
            <button onClick={() => setSelectedProfile(null)} className="w-full py-3 rounded-full bg-white/5 font-bold">{lang === 'tr' ? 'Geri Dön' : 'Go Back'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
