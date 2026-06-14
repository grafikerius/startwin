// src/lib/badwords.ts

// Küfür/Argo/Uygunsuz kelime havuzu (Sadece kök kelimeleri koyuyoruz ki regex ile yakalayabilelim)
const BAD_WORDS = [
  'amk', 'aq', 'awq', 'oç', 'oc', 'orospu', 'pic', 'piç', 'siktir', 'sikerim', 'sikik', 
  'yarak', 'yarak', 'yarrak', 'yarrrak', 'amına', 'amina', 'sikiş', 'sikis', 'göt', 'got', 'gotveren',
  'fuck', 'bitch', 'shit', 'asshole', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'nude', 'porno',
  'orosbu', 'orospo', 'amcik', 'amcık', 'meme', 'yavsak', 'yavşak', 'ibne', 'ipne', 'pezevenk'
];

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Kelimeleri boşluklarla ayırıp tam kelime eşleşmesi aramak daha güvenlidir (örn: "kamyon" kelimesinde "am" geçerse engellemesin diye)
  // Ancak şimdilik en temel koruma için kelimenin içinde geçenleri de engelliyoruz.
  // Daha güvenlisi RegExp word boundary kullanmak:
  
  for (const word of BAD_WORDS) {
    // Sadece kelime tam eşleşiyorsa veya çok belirginse engelle (basit versiyon)
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      return true;
    }
  }
  
  return false;
}
