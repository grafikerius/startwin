import { toBlob } from 'html-to-image';

export async function shareAsImage(elementId: string, fileName: string, text: string, url?: string) {
  const node = document.getElementById(elementId);
  if (!node) return false;

  try {
    const blob = await toBlob(node, { 
      quality: 0.95,
      pixelRatio: 2, // Yüksek çözünürlük için (Instagram'da bulanık durmaması için)
      style: {
        background: '#06060f', // Arka planın şeffaf çıkmasını önler
        borderRadius: '24px', // Köşeleri hafif yumuşatır
      }
    });
    
    if (!blob) return false;

    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

    // Cihazın yerel paylaşım menüsünü açmayı dene (Instagram, WhatsApp vb. için resim + metin + link)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      const shareData: ShareData = {
        title: 'StarTwin',
        text: text,
        files: [file]
      };
      if (url) shareData.url = url;
      
      await navigator.share(shareData);
      return true;
    } else {
      // Bilgisayardaysa veya tarayıcı desteklemiyorsa, resmi direkt indir
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Metni de panoya kopyala ki eksik kalmasın
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      return false; 
    }
  } catch (error) {
    console.error('Paylaşım hatası:', error);
    return false;
  }
}
