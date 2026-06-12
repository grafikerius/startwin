import React, { useState, useEffect } from 'react';
import type { AdSettings } from './AdBanner';

export function InterstitialAd({ settings, onComplete }: { settings: AdSettings | null, onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(settings?.interstitial_duration_seconds || 3);

  useEffect(() => {
    if (!settings || !settings.interstitial_enabled) {
      onComplete();
      return;
    }

    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, settings, onComplete]);

  if (!settings || !settings.interstitial_enabled) return null;

  const imgUrl = settings.interstitial_image_url || 'https://via.placeholder.com/400x600.png?text=Sponsor+Görseli+(Test)';
  const link = settings.interstitial_link || '#';

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-[fade_.3s_ease]">
      {/* Top Bar with Skip Button */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-end z-10 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => { if (timeLeft <= 0) onComplete(); }}
          disabled={timeLeft > 0}
          className={`px-4 py-2 rounded-full font-bold text-sm transition ${
            timeLeft > 0 
              ? 'bg-white/10 text-white/50 cursor-not-allowed' 
              : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
          }`}
        >
          {timeLeft > 0 ? `Reklamı Geç (${timeLeft})` : 'Reklamı Geç ✖'}
        </button>
      </div>

      {/* Ad Content */}
      <a href={link} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center p-4">
        <p className="text-white/40 text-xs mb-4">Sponsorlu İçerik</p>
        <img 
          src={imgUrl} 
          alt="Sponsor" 
          className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]"
        />
        <p className="text-white/60 text-sm mt-6 animate-pulse">Sponsorumuzu ziyaret edin...</p>
      </a>
    </div>
  );
}
