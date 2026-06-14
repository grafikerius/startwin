import React, { useState } from 'react';

interface PremiumPaywallProps {
  onClose: () => void;
  onSubscribe: () => void;
}

export default function PremiumPaywall({ onClose, onSubscribe }: PremiumPaywallProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    setLoading(true);
    // Stripe Test Modu Simülasyonu
    setTimeout(() => {
      onSubscribe(); // Şimdilik anında başarılı varsayıyoruz (Test)
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fade_.3s_ease]">
      <div className="relative w-full max-w-sm rounded-[2rem] border border-fuchsia-500/50 bg-[#0b0b1a] p-8 shadow-[0_0_60px_-15px_rgba(255,0,255,0.4)] text-center overflow-hidden">
        
        {/* Neon Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-fuchsia-500/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none"></div>

        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white text-xl z-10">✕</button>

        <div className="mb-6 relative z-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-4">
            👑
          </div>
          <h2 className="text-2xl font-black mb-2 text-white">VIP Üye Ol</h2>
          <p className="text-sm text-white/60">Kozmik sınırları aş ve sınırsız sosyalleş!</p>
        </div>

        <div className="space-y-4 text-left text-sm text-white/80 mb-8 relative z-10 bg-black/30 p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-fuchsia-400">✓</span> Sınırsız Sohbet İsteği Gönderme
          </div>
          <div className="flex items-center gap-3">
            <span className="text-fuchsia-400">✓</span> Gizli Eşleşme Oranlarını (Tam Uyum) Görme
          </div>
          <div className="flex items-center gap-3">
            <span className="text-fuchsia-400">✓</span> Reklamsız, Tertemiz Bir Deneyim
          </div>
          <div className="flex items-center gap-3">
            <span className="text-fuchsia-400">✓</span> Avatarınızda Altın VIP Tacı 👑
          </div>
        </div>

        <button 
          onClick={handleCheckout} 
          disabled={loading}
          className="relative z-10 w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold text-lg shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:scale-105 transition active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Bağlanıyor...' : 'Aylık Sadece ₺99'}
        </button>
        <p className="mt-4 text-[10px] text-white/40 relative z-10">Stripe Test Modu aktif. Gerçek para çekilmez.</p>
      </div>
    </div>
  );
}
