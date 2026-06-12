// src/lib/ebced.ts
// Basic Latin to Abjad (Ebced) mapping for viral name matching.
// This uses a simplified mapping commonly found in popular "name numerology" calculators.

const EBCED_MAP: Record<string, number> = {
  a: 1, b: 2, c: 3, ç: 3, d: 4, e: 5, f: 80, g: 1000, ğ: 1000,
  h: 8, ı: 10, i: 10, j: 3, k: 20, l: 30, m: 40, n: 50,
  o: 6, ö: 6, p: 2, r: 200, s: 60, ş: 300, t: 400,
  u: 6, ü: 6, v: 6, y: 10, z: 7, q: 100, w: 6, x: 60
};

export function calculateEbced(name: string): number {
  if (!name) return 0;
  
  const normalized = name.toLowerCase().replace(/[^a-zçğıöşü]/g, '');
  let sum = 0;
  
  for (const char of normalized) {
    sum += EBCED_MAP[char] || 0;
  }
  
  return sum;
}

// Geleneksel İsim Uyum ve Karakter Numerolojisi (Mod 9)
export function getEbcedInterpretation(userEbced: number, partnerEbced?: number): { title: string; desc: string } {
  if (partnerEbced !== undefined) {
    // Çift uyumu
    const total = userEbced + partnerEbced;
    if (total === 0) return { title: "Gizemli Bağ", desc: "Sayılar henüz aranızdaki bağı okuyamıyor." };
    
    const mod = total % 9 || 9;
    switch (mod) {
      case 1: return { title: "Tutkulu Birliktelik", desc: "Aralarında çok güçlü, yoğun ve tutku dolu bir bağ oluşur. Birbirlerinden kopmaları zordur." };
      case 2: return { title: "Didişen Aşuklar", desc: "Sürekli tatlı sert çekişmeler yaşasalar da, aslında birbirlerini tamamlayan ayrılmaz bir ikilidirler." };
      case 3: return { title: "Sağlam ve Sadık", desc: "Sürprizlerden çok, mantığa ve derin bir dostluğa dayanan, sarsılmaz ve güvenilir bir ilişkidir." };
      case 4: return { title: "Bereketli Ortaklık", desc: "Maddi ve manevi olarak birbirlerine şans getirirler. Birlikte kurdukları her şey büyür ve bereketlenir." };
      case 5: return { title: "Sınanan Sevgi", desc: "Zaman zaman fikir ayrılıkları ve inatlaşmalar yaşanabilir. İletişimi güçlü tutmaları gereken zorlu ama öğretici bir karmadır." };
      case 6: return { title: "Saf Sevgi", desc: "Fedakarlık, şefkat ve sonsuz bir koruma içgüdüsü barındırır. İki taraf da diğerinin iyiliğini ister." };
      case 7: return { title: "Dış Etkenler", desc: "İlişkileri çok yoğundur ama dışarıdan gelen sözlere ve nazara çok açıktır. Aralarındaki sırrı korumaları gerekir." };
      case 8: return { title: "Maceraperest Ruhlar", desc: "Birlikte asla sıkılmazlar. Sürekli hareket, seyahat ve yeni keşiflerle dolu dinamik bir bağdır." };
      case 9: return { title: "Karmik Ruh Eşleri", desc: "Evrenin özel olarak bir araya getirdiği, geçmiş yaşamlardan gelen derin ve ruhsal bir tamamlanmadır." };
    }
  } else {
    // Tekil karakter analizi
    if (userEbced === 0) return { title: "Kozmik Toz", desc: "Sayılarda karşılığın gizli." };
    const mod = userEbced % 9 || 9;
    switch (mod) {
      case 1: return { title: "Lider Ruh", desc: "Bağımsız, yenilikçi ve kendi yolunu çizen bir enerji." };
      case 2: return { title: "Uyum Elçisi", desc: "Nazik, dengeleyici ve takım çalışmasına yatkın." };
      case 3: return { title: "Yaratıcı Kıvılcım", desc: "Enerjik, iletişim gücü çok yüksek ve ilham verici." };
      case 4: return { title: "Sarsılmaz Sütun", desc: "Disiplinli, pratik zekalı ve son derece güvenilir." };
      case 5: return { title: "Özgür Kaşif", desc: "Maceracı, kurallara sığmayan, esnek ve vizyoner." };
      case 6: return { title: "Şifa Kaynağı", desc: "Sorumluluk sahibi, sevgi dolu, koruyucu ve şefkatli." };
      case 7: return { title: "Sezgisel Bilge", desc: "Gizemli, derin düşünen, araştırmacı ve ruhsal yanı kuvvetli." };
      case 8: return { title: "Güçlü Vizyon", desc: "Hırslı, liderlik vasfı yüksek, maddi ve manevi gücü temsil eden." };
      case 9: return { title: "Evrensel İdealist", desc: "Son derece şefkatli, yardımsever, insanlığa ışık tutan bir ruh." };
    }
  }
  return { title: "", desc: "" };
}
