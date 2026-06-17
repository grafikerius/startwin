import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSystemSettings, updateSystemSettings } from '../lib/supabase';
import type { AdSettings } from './AdBanner';

type AdminStats = {
  total_users: number;
  active_users_24h: number;
  public_messages: number;
  private_messages: number;
};

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'stats' | 'ads'>('stats');
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_stats', { p_password: password });
      
      if (rpcError) throw rpcError;
      
      setStats(data as AdminStats);
      
      // Fetch Ad Settings
      const settings = await getSystemSettings();
      if (settings) setAdSettings(settings as AdSettings);
      
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error(err);
      setError('Geçersiz admin şifresi veya veritabanı hatası.');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_stats', { p_password: password });
      if (rpcError) throw rpcError;
      setStats(data as AdminStats);
      
      const settings = await getSystemSettings();
      if (settings) setAdSettings(settings as AdSettings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveAdSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adSettings) return;
    setLoading(true);
    setSaveStatus('');
    try {
      const { error } = await updateSystemSettings({
        p_password: password,
        p_banner_enabled: adSettings.banner_enabled,
        p_banner_image_url: adSettings.banner_image_url,
        p_banner_link: adSettings.banner_link,
        p_interstitial_enabled: adSettings.interstitial_enabled,
        p_interstitial_image_url: adSettings.interstitial_image_url,
        p_interstitial_link: adSettings.interstitial_link,
        p_interstitial_duration: adSettings.interstitial_duration_seconds
      });
      if (error) throw error;
      setSaveStatus('Reklam ayarları başarıyla kaydedildi!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-[fade_.3s_ease]">
        <div className="bg-[#0b0b14] border border-fuchsia-500/50 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(217,70,239,0.15)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black bg-gradient-to-r from-red-500 to-fuchsia-500 bg-clip-text text-transparent">Yönetim Üssü</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white">&times;</button>
          </div>
          <p className="text-xs text-white/50 mb-6">Yalnızca StarTwin yöneticileri içindir. Lütfen Master Şifreyi girin.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master Şifre"
              className="w-full bg-black/50 border border-fuchsia-500/30 rounded-xl px-4 py-3 text-red-100 focus:outline-none focus:border-red-500"
              required
            />
            {error && <p className="text-xs text-red-400 font-bold bg-red-500/20 p-2 rounded">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-fuchsia-600 text-white font-bold py-3 rounded-xl hover:brightness-110 transition disabled:opacity-50">
              {loading ? 'Doğrulanıyor...' : 'Erişim İste'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05050a] animate-[fade_.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0b0b14]">
        <h1 className="text-xl font-black bg-gradient-to-r from-red-500 to-fuchsia-500 bg-clip-text text-transparent">StarTwin Kontrol Merkezi</h1>
        <div className="flex items-center gap-3">
          <button onClick={refreshStats} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-2">
            <span className={loading ? 'animate-spin' : ''}>🔄</span> Yenile
          </button>
          <button onClick={onClose} className="text-xs px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">Çıkış</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-6 pt-4 bg-[#0b0b14]">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 border-b-2 font-bold transition ${activeTab === 'stats' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-white/50 hover:text-white'}`}
        >
          📊 İstatistikler
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 border-b-2 font-bold transition ${activeTab === 'ads' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-white/50 hover:text-white'}`}
        >
          💰 Reklam Yönetimi
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'stats' ? (
          <>
            <h2 className="text-white/80 font-bold mb-6 text-lg">Sistem İstatistikleri</h2>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Toplam Ruh (Kullanıcı)" value={stats.total_users} icon="👥" color="from-cyan-500 to-blue-600" />
                <StatCard title="24 Saatlik Aktif" value={stats.active_users_24h} icon="🔥" color="from-fuchsia-500 to-red-600" />
                <StatCard title="Meydan Mesajları" value={stats.public_messages} icon="🌌" color="from-purple-500 to-indigo-600" />
                <StatCard title="Özel Mesajlar" value={stats.private_messages} icon="🔒" color="from-emerald-500 to-teal-600" />
              </div>
            ) : (
              <div className="text-white/40 text-sm">Veriler yüklenemedi...</div>
            )}
          </>
        ) : (
          <div className="max-w-2xl">
            <h2 className="text-white/80 font-bold mb-6 text-lg">Reklam ve Sponsorluk Ayarları</h2>
            
            {adSettings ? (
              <form onSubmit={saveAdSettings} className="space-y-8 bg-white/5 border border-white/10 rounded-2xl p-6">
                
                {/* Banner Ad Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="font-bold text-cyan-400">Sabit Banner Reklamı</h3>
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={adSettings.banner_enabled} 
                        onChange={(e) => setAdSettings({...adSettings, banner_enabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 relative"></div>
                      <span className="ml-3 text-sm font-medium text-white/80">{adSettings.banner_enabled ? 'Aktif' : 'Kapalı'}</span>
                    </label>
                  </div>
                  
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Görsel URL (veya AdSense için adsense:SLOT_ID yazın)</label>
                      <input type="text" value={adSettings.banner_image_url} onChange={(e) => setAdSettings({...adSettings, banner_image_url: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none" placeholder="https://... veya adsense:123456" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Yönlendirme Linki (Tıklanınca gidilecek adres)</label>
                      <input type="text" value={adSettings.banner_link} onChange={(e) => setAdSettings({...adSettings, banner_link: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none" placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {/* Interstitial Ad Settings */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="font-bold text-fuchsia-400">Geçiş Reklamı (Interstitial)</h3>
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={adSettings.interstitial_enabled} 
                        onChange={(e) => setAdSettings({...adSettings, interstitial_enabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-500 relative"></div>
                      <span className="ml-3 text-sm font-medium text-white/80">{adSettings.interstitial_enabled ? 'Aktif' : 'Kapalı'}</span>
                    </label>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Gösterim Süresi (Saniye)</label>
                      <input type="number" min="0" max="30" value={adSettings.interstitial_duration_seconds} onChange={(e) => setAdSettings({...adSettings, interstitial_duration_seconds: Number(e.target.value)})} className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Tam Ekran Görsel URL</label>
                      <input type="text" value={adSettings.interstitial_image_url} onChange={(e) => setAdSettings({...adSettings, interstitial_image_url: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Yönlendirme Linki</label>
                      <input type="text" value={adSettings.interstitial_link} onChange={(e) => setAdSettings({...adSettings, interstitial_link: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none" placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {saveStatus && (
                  <div className={`p-3 rounded-lg text-sm font-bold ${saveStatus.includes('Hata') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {saveStatus}
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold py-3 rounded-xl hover:brightness-110 transition disabled:opacity-50">
                  {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
              </form>
            ) : (
              <div className="text-white/40 text-sm">Reklam ayarları yükleniyor veya veritabanı bağlantısı yok... (Lütfen 008_system_settings.sql dosyasını çalıştırdığınızdan emin olun)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) {
  return (
    <div className="bg-[#0b0b14] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/20 transition">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/50 text-xs font-semibold">{title}</span>
        <span className="text-xl opacity-80 group-hover:scale-110 transition-transform">{icon}</span>
      </div>
      <div className="text-3xl font-black text-white">{value?.toLocaleString('tr-TR') || '0'}</div>
    </div>
  );
}
