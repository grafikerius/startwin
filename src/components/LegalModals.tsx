import React from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function KvkkModal({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fade_.3s_ease]">
      <div className="bg-[#131320] border border-fuchsia-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl shadow-fuchsia-900/20">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">
            KVKK ve Gizlilik Politikası
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-white/80 space-y-4 font-light leading-relaxed">
          <p><strong>Son Güncelleme:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
          
          <h3 className="text-fuchsia-300 font-bold text-base mt-6">1. Veri Sorumlusu</h3>
          <p>StarTwin ("Platform"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve Avrupa Genel Veri Koruma Yönetmeliği ("GDPR") kapsamında veri sorumlusu sıfatıyla hareket etmektedir.</p>

          <h3 className="text-fuchsia-300 font-bold text-base mt-6">2. Toplanan Kişisel Veriler ve İşlenme Amaçları</h3>
          <p>Platformun "Kozmik Uyum" algoritmasının çalışabilmesi için aşağıdaki verileriniz toplanmaktadır:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Kimlik Bilgileri:</strong> İsim, Doğum Tarihi ve Doğum Saati. (Astrolojik harita ve Ebced hesabı için kullanılır).</li>
            <li><strong>Konum Verisi (GPS):</strong> Anlık enlem ve boylam verileriniz. ("Kozmik Meydan" radyus eşleştirmesi ve mesaj yayını için <strong>sadece uygulama açıkken</strong> işlenir).</li>
            <li><strong>Cihaz ve Bağlantı Verileri:</strong> Güvenlik ve anonimlik yönetimi için IP ve log kayıtları.</li>
          </ul>

          <h3 className="text-fuchsia-300 font-bold text-base mt-6">3. Kriptografik Koruma ve Anonimlik (Bio-Auth)</h3>
          <p>StarTwin, eşsiz bir güvenlik mimarisi kullanır. İsim ve doğum bilgileriniz tek yönlü kriptografik bir formüle sokularak bir <strong>'Kozmik Parmak İzi' (Bio-Hash)</strong> oluşturulur. Sistem içerisindeki diğer kullanıcılar gerçek adınızı <strong>asla</strong> göremez. Yalnızca sistem tarafından size atanan anonim isimler (Örn: Kozmik Kaplan) ile görünürsünüz.</p>

          <h3 className="text-fuchsia-300 font-bold text-base mt-6">4. Konum Verilerinin İşlenmesi</h3>
          <p>GPS konumunuz, mesajlarınızın sadece bulunduğunuz 5 kilometrelik çaptaki kullanıcılara iletilmesi için kullanılır. Güvenliğiniz için ekranda gösterilen mesafelere <strong>sistem tarafından otomatik sapma (jitter)</strong> eklenerek nokta atışı yerinizin tespiti imkansız hale getirilir. Konum verileriniz geçmişe dönük izleme için saklanmaz, sadece anlık yayın için güncellenir.</p>

          <h3 className="text-fuchsia-300 font-bold text-base mt-6">5. Veri Paylaşımı</h3>
          <p>Kişisel verileriniz, yasal zorunluluklar (mahkeme kararları) haricinde <strong>hiçbir üçüncü taraf kurum, reklam veren veya şirket ile paylaşılmamaktadır.</strong></p>

          <h3 className="text-fuchsia-300 font-bold text-base mt-6">6. Haklarınız</h3>
          <p>KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, silinmesini (Unutulma Hakkı) talep etme ve düzeltilmesini isteme hakkına sahipsiniz. Silme işlemi durumunda Bio-Hash kimliğiniz ve eşleşmeleriniz kalıcı olarak yok edilir.</p>
        </div>
        <div className="p-4 border-t border-white/10 bg-black/50 text-right">
          <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition font-medium">Anladım</button>
        </div>
      </div>
    </div>
  );
}

export function TermsModal({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fade_.3s_ease]">
      <div className="bg-[#131320] border border-cyan-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl shadow-cyan-900/20">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
            Kullanım Şartları ve Topluluk Kuralları
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-white/80 space-y-4 font-light leading-relaxed">
          <p>StarTwin Kozmik Meydan'a katılarak aşağıdaki kuralları kabul etmiş sayılırsınız:</p>
          
          <h3 className="text-cyan-300 font-bold text-base mt-6">1. Yaş Sınırı</h3>
          <p>Platformu kullanabilmek için <strong>18 yaşını doldurmuş</strong> olmanız gerekmektedir. Yanlış doğum tarihi beyanından doğacak hukuki sorumluluklar kullanıcıya aittir.</p>

          <h3 className="text-cyan-300 font-bold text-base mt-6">2. Anonimlik ve Sorumluluk</h3>
          <p>StarTwin, kullanıcılarına anonim bir sohbet imkanı sunar. Ancak bu anonimlik, yasa dışı eylemler için bir kalkan değildir. Gönderilen tüm mesajların hukuki sorumluluğu göndericiye aittir. Yasal mercilerden gelecek resmi talepler doğrultusunda sistem kayıtları adli makamlarla paylaşılabilir.</p>

          <h3 className="text-cyan-300 font-bold text-base mt-6">3. Yasaklı Davranışlar (Sıfır Tolerans Politikası)</h3>
          <p>Aşağıdaki eylemlerden herhangi birinin yapılması durumunda hesabınız kalıcı olarak <strong>Kozmik Boşluğa</strong> atılacak (Banlanacak) ve bir daha platforma girişiniz engellenecektir:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kozmik Meydan'da veya özel odalarda diğer kullanıcılara yönelik hakaret, küfür, tehdit ve nefret söylemi.</li>
            <li>Cinsel içerikli rahatsız edici (taciz boyutunda) mesajlar göndermek.</li>
            <li>Herhangi bir ürünün, hizmetin veya başka bir platformun reklamını/spam'ini yapmak.</li>
            <li>Kişisel iletişim bilgilerini (Telefon numarası, IBAN vb.) genel meydanda kasten paylaşmak.</li>
          </ul>

          <h3 className="text-cyan-300 font-bold text-base mt-6">4. Hesap Güvenliği</h3>
          <p>Belirlediğiniz hesap şifresinin güvenliği sizin sorumluluğunuzdadır. Bio-Auth sistemimiz sayesinde şifrenizi unuttuğunuzda sıfırlama işlemi yapılamaz, bu nedenle şifrenizi güvenli bir yere not ediniz.</p>

          <h3 className="text-cyan-300 font-bold text-base mt-6">5. Hizmetin Kesintiye Uğraması</h3>
          <p>Platform yönetimi, altyapı çalışmaları veya güncellemeler nedeniyle hizmeti geçici olarak durdurma hakkını saklı tutar.</p>
        </div>
        <div className="p-4 border-t border-white/10 bg-black/50 text-right">
          <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition font-medium">Kabul Ediyorum</button>
        </div>
      </div>
    </div>
  );
}
