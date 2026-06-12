import { useEffect, useState } from 'react';
import { supabase, updateLocation, getNearbyUsers } from '../lib/supabase';
import { calculateMatch, calculateSigns, type UserInput, type Celebrity } from '../lib/match';
import { calculateEbced } from '../lib/ebced';
import ChatRoom from './ChatRoom';

export default function NearbyMatches({ user, onRestart, t, lang }: { user: UserInput, onRestart: () => void, t: any, lang: string }) {
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initNearby = async () => {
      try {
        if (!navigator.geolocation) {
          throw new Error('Tarayıcınız konum özelliğini desteklemiyor.');
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // 1. Create a random UUID if not exists in localStorage
            let userId = localStorage.getItem('startwin_user_id');
            if (!userId) {
              userId = crypto.randomUUID();
              localStorage.setItem('startwin_user_id', userId);
            }

            // 2. Calculate user's full chart/ebced to save
            const userEbced = calculateEbced(user.name || '');
            const userSigns = calculateSigns(user.birth_date, user.birth_time, lat, lng);

            // 3. Update Location and Profile in Supabase
            const { error: updateErr } = await updateLocation({
              p_user_id: userId,
              p_lat: lat,
              p_lng: lng,
              p_anon_name: user.name || 'Gizemli Ruh',
              p_gender: user.gender,
              p_birth_date: user.birth_date,
              p_sun_sign: userSigns.sun,
              p_mbti_type: user.mbti_type,
              p_fields: user.fields,
              p_height: user.height,
              p_weight: user.weight,
              p_ebced_val: userEbced
            });

            if (updateErr) throw updateErr;

            // 4. Get Nearby Users
            const { data, error: fetchErr } = await getNearbyUsers(lat, lng, 500); // 500 meters
            if (fetchErr) throw fetchErr;

            if (!data || data.length === 0) {
              setNearby([]);
              setLoading(false);
              return;
            }

            // 5. Calculate Match Scores for each nearby user
            const matchedUsers = data.map((n: any) => {
              const partnerInput: Celebrity = {
                id: n.id,
                name_en: n.anonymous_name,
                name_tr: n.anonymous_name,
                gender: n.gender || 'other',
                birth_date: n.birth_date || '2000-01-01',
                sun_sign: n.sun_sign || 'Aries',
                fields: n.fields || [],
                fame: 0,
                mbti_type: n.mbti_type,
              };

              const matchRes = calculateMatch(user, partnerInput);
              return {
                ...n,
                matchScore: Math.round(matchRes.score),
                subScores: matchRes.breakdown
              };
            });

            // 6. Sort by match score and set state
            matchedUsers.sort((a: any, b: any) => b.matchScore - a.matchScore);
            setNearby(matchedUsers);
            setLoading(false);
          },
          (err) => {
            if (cancelled) return;
            console.error(err);
            setError('Konum alınamadı. Lütfen tarayıcı ayarlarından konum izni verdiğinizden emin olun.');
            setLoading(false);
          },
          { enableHighAccuracy: true }
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Bir hata oluştu');
          setLoading(false);
        }
      }
    };

    initNearby();

    return () => { cancelled = true; };
  }, [user]);

  if (activeChat) {
    const myId = localStorage.getItem('startwin_user_id') || '';
    return <ChatRoom myId={myId} partner={activeChat} onBack={() => setActiveChat(null)} />;
  }

  return (
    <div className="relative animate-[fade_.5s_ease] p-6 pt-12 text-white">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
          Yakındaki Ruh Eşleri
        </h2>
        <p className="text-xs text-white/50 mt-1">500 metre içindeki en uyumlu profiller</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-fuchsia-300 animate-pulse">Konum taranıyor ve yıldız haritaları çıkarılıyor...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-center text-sm text-red-200">
          {error}
        </div>
      ) : nearby.length === 0 ? (
        <div className="text-center py-12 border border-white/10 rounded-3xl bg-white/5">
          <span className="text-4xl mb-3 block">🏜️</span>
          <p className="text-sm text-white/70">Etrafında kimse yok gibi görünüyor.<br/>Biraz yürü veya uygulamayı arkadaşlarına öner!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {nearby.map((n) => (
            <div key={n.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition">
              <div>
                <h3 className="font-bold text-lg">{n.anonymous_name}</h3>
                <p className="text-xs text-cyan-300 font-medium">✨ %{n.matchScore} Uyum · {Math.round(n.distance_meters)}m ötede</p>
                <div className="flex gap-1 mt-2 text-[10px]">
                  <span className="px-2 py-0.5 bg-black/30 rounded-full border border-white/10">{n.sun_sign}</span>
                  {n.mbti_type && <span className="px-2 py-0.5 bg-black/30 rounded-full border border-white/10">{n.mbti_type}</span>}
                </div>
              </div>
              <button onClick={() => setActiveChat(n)} className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black font-bold px-4 py-2 rounded-xl text-xs hover:scale-105 transition">
                Sohbet Et
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <button onClick={onRestart} className="px-6 py-2 rounded-xl border border-white/20 text-sm hover:bg-white/5 transition">
          Geri Dön
        </button>
      </div>
    </div>
  );
}
