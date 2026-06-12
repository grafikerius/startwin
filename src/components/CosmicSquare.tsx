import { useEffect, useState, useRef } from 'react';
import { supabase, updateLocation, registerOrLogin, getNearbyUsers } from '../lib/supabase';
import { calculateMatch, calculateSigns, type UserInput, type Celebrity } from '../lib/match';
import { calculateEbced } from '../lib/ebced';
import ChatRoom from './ChatRoom';
import { KvkkModal, TermsModal } from './LegalModals';
import { AdBanner, type AdSettings } from './AdBanner';
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

  const safeName = user?.name || '';
  const bioStr = `${safeName.trim().toLowerCase()}_${user?.birth_date || ''}_${user?.birth_time || ''}`;
  const bioHash = btoa(encodeURIComponent(bioStr));

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
             return [...prev, { ...msgData, delivery_distance: delivery.distance_meters }];
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
             const partnerProf = nearbyProfiles[payload.new.receiver_id];
             if (partnerProf) setActiveChatPartner(partnerProf);
          }
        }
      )
      .subscribe();

    supabase.from('chat_requests').select('*').eq('receiver_id', userId).eq('status', 'pending')
      .then(({ data }) => { if (data) setIncomingRequests(data); });

    return () => { supabase.removeChannel(channel); supabase.removeChannel(reqChannel); };
  }, [authStep, userId, radius, nearbyProfiles, supabase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendPublicMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicInput.trim() || !userId || !supabase || !coords) return;
    const content = publicInput.trim();
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
    await supabase.from('chat_requests').insert({ sender_id: userId, receiver_id: selectedProfile.id, status: 'pending' });
    setSelectedProfile(null);
  };

  const acceptRequest = async (req: any) => {
    await supabase!.from('chat_requests').update({ status: 'accepted' }).eq('id', req.id);
    setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
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
    <div className="relative animate-[fade_.5s_ease] flex flex-col h-[600px] text-white">
      <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md rounded-t-[2rem]">
        <h2 className="font-black text-lg bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Kozmik Meydan</h2>
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
                <div onClick={() => !isMe && prof && setSelectedProfile(prof)} className="flex flex-col">
                  {!isMe && <div className="text-[10px] text-white/60 mb-1">{anonName} {signEmoji} ~{dist}m</div>}
                  <div className={`p-3 rounded-2xl ${isMe ? 'bg-fuchsia-600' : 'bg-white/10'}`}>{m.message_text}</div>
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

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f1a] w-full max-w-sm rounded-3xl p-6 border border-white/10">
            <h3 className="text-xl font-bold">{selectedProfile.anonymous_name}</h3>
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
