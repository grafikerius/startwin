import React from 'react';

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
  if (!settings || !settings.banner_enabled) return null;

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
