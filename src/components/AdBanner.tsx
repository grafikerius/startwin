import React, { useEffect } from 'react';

export type AdSettings = {
  banner_enabled: boolean;
  banner_image_url: string;
  banner_link: string;
  interstitial_enabled: boolean;
  interstitial_image_url: string;
  interstitial_link: string;
  interstitial_duration_seconds: number;
};

export function AdBanner({ settings, className = "" }: { settings: AdSettings | null, className?: string }) {
  useEffect(() => {
    if (settings?.banner_enabled && settings.banner_image_url.startsWith('adsense:')) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [settings]);

  if (!settings || !settings.banner_enabled) return null;

  if (settings.banner_image_url.startsWith('adsense:')) {
    const slot = settings.banner_image_url.split(':')[1];
    return (
      <div className={`w-full overflow-hidden flex justify-center text-center relative ${className}`}>
        <span className="absolute top-0 left-0 text-[8px] text-white/30 z-10 px-1">Reklam</span>
        <ins className="adsbygoogle w-full"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-2536958363581984"
             data-ad-slot={slot}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
    );
  }

  // Use test ad if url is empty
  const imgUrl = settings.banner_image_url || 'https://via.placeholder.com/728x90.png?text=Sponsor+Alanı+(Test)';
  const link = settings.banner_link || '#';

  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={`block w-full text-center relative group ${className}`}>
      <img src={imgUrl} alt="Advertisement" className="w-full max-h-24 object-cover mx-auto rounded-lg shadow-lg opacity-90 group-hover:opacity-100 transition" />
      <span className="absolute bottom-1 right-2 text-[8px] bg-black/50 text-white px-1 rounded">Sponsorlu</span>
    </a>
  );
}
