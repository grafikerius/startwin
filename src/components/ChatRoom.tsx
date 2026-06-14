import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatRoom({ myId, partner, onBack }: { myId: string, partner: any, onBack: () => void }) {
  const lang = localStorage.getItem('startwin_lang') || 'tr';
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text?: string, loading?: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMessages = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });
        
      if (!cancelled && !error && data) {
        setMessages(data);
        setLoading(false);
      }
    };

    fetchMessages();

    if (!supabase) return;
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${partner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${myId}`
        },
        (payload) => {
          if (payload.new.sender_id === partner.id) {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${myId}`
        },
        (payload) => {
          if (payload.new.receiver_id === partner.id) {
            setMessages((prev) => {
              // check if it's already there (we insert locally sometimes, but to be safe)
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [myId, partner.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !supabase) return;
    
    const msg = input.trim();

    setInput('');
    
    // Optimistic UI update could be done here
    await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: partner.id,
      message_text: msg
    });
  };

  const handleTranslate = async (msgId: string, textToTranslate: string) => {
    if (!textToTranslate.trim()) return;
    setTranslatedMessages(prev => ({ ...prev, [msgId]: { loading: true } }));
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang: lang })
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslatedMessages(prev => ({ ...prev, [msgId]: { text: data.translatedText, loading: false } }));
      } else {
        setTranslatedMessages(prev => ({ ...prev, [msgId]: { text: 'Çeviri başarısız.', loading: false } }));
      }
    } catch (err) {
      setTranslatedMessages(prev => ({ ...prev, [msgId]: { text: 'Hata oluştu.', loading: false } }));
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-[#06060f] z-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70 transition">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        {partner.avatar_url && (
          <div className="w-10 h-10 rounded-full overflow-hidden border border-fuchsia-500/50 shadow-[0_0_10px_rgba(255,0,255,0.2)]">
            <img src={partner.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
          </div>
        )}
        <div className="flex flex-col">
          <h2 className="font-bold text-white flex items-center gap-2">
            {partner.anonymous_name}
            <span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full">
              {lang === 'tr' ? `%${partner.matchScore} Uyum` : `${partner.matchScore}% Match`}
            </span>
          </h2>
          <p className="text-[10px] text-cyan-300">{lang === 'tr' ? `~${Math.round(partner.distance_meters)}m ötede` : `~${Math.round(partner.distance_meters)}m away`}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
           <div className="flex justify-center p-4">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
           </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40">
            <span className="text-4xl mb-2">✨</span>
            <p className="text-sm">Yıldızların uyumu ile ilk mesajı sen gönder.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === myId;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                <div className={`max-w-[80%] rounded-2xl p-3 ${isMe ? 'bg-cyan-600 rounded-br-sm' : 'bg-white/15 rounded-bl-sm'}`}>
                  <p className="text-sm text-white">{m.message_text}</p>
                  
                  {translatedMessages[m.id]?.loading && <p className="text-[10px] text-cyan-300 mt-1 italic animate-pulse">{lang === 'tr' ? 'Çevriliyor...' : 'Translating...'}</p>}
                  {translatedMessages[m.id]?.text && <p className="text-xs text-cyan-200 mt-2 border-t border-white/10 pt-1 font-medium">{translatedMessages[m.id].text}</p>}

                  <span className="text-[10px] text-white/40 block mt-1 text-right">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {!isMe && (
                  <button 
                    onClick={() => handleTranslate(m.id, m.message_text)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition p-1.5 bg-white/10 rounded-full hover:bg-white/20 text-[10px]"
                    title={lang === 'tr' ? 'Çevir' : 'Translate'}
                  >
                    🌐
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === 'tr' ? 'Bir mesaj yaz...' : 'Write a message...'}
            className="flex-1 bg-black/50 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="bg-cyan-400 text-black p-3 rounded-full hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
