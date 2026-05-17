import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { 
  Search, 
  User, 
  Users,
  QrCode, 
  ChevronRight, 
  Info, 
  RotateCcw,
  Printer,
  Monitor
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import participantService from '../services/participantService';
import credentialService from '../services/credentialService';
import { cn } from '../utils/cn';

const SelfServicePage = () => {
  const { eid } = useParams();
  const eventId = eid || 1;

  const [view, setView] = useState('search'); // 'search' or 'result'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    welcome_title: 'بوابة الخدمة الذاتية',
    welcome_subtitle: 'ابحث عن بياناتك وحمل بطاقتك'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get(`events/${eventId}/settings`);
        if (response.data) setSettings(response.data);
      } catch (err) {
        console.error('Failed to fetch settings');
      }
    };
    fetchSettings();
  }, [eventId]);

  useEffect(() => {
    if (query.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await participantService.publicSearch(eventId, query);
      setResults(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (participant) => {
    setSelected(participant);
    setView('result');
  };

  return (
    <div className="min-h-screen bg-[#022C22] text-white flex flex-col items-center justify-center p-8 font-arabic selection:bg-amber-500 selection:text-emerald-950">
      {/* Background Decorative Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 blur-[100px] rounded-full" />
      </div>

      <header className="mb-12 text-center relative z-10">
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-2xl">
           <Monitor className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tighter">{settings.welcome_title}</h1>
        <p className="text-emerald-400/50 font-bold uppercase tracking-widest text-sm">{settings.welcome_subtitle}</p>
      </header>

      <main className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          {view === 'search' ? (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="relative">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7 text-amber-500/40" />
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="اكتب اسمك الكامل للبحث..."
                  className="w-full h-24 bg-white/5 border-2 border-white/10 rounded-[40px] pr-20 pl-10 text-2xl font-bold focus:border-amber-500 transition-all outline-none placeholder:text-white/10 shadow-2xl"
                  autoFocus
                />
              </div>

              <div className="space-y-4">
                {loading && (
                   <div className="text-center py-10">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
                   </div>
                )}

                {results.length > 0 && !loading && (
                  results.map((p, i) => (
                    <motion.button 
                      key={p.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelect(p)}
                      className="w-full bg-white/5 border border-white/10 hover:bg-white/10 p-8 rounded-[35px] flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-amber-500 group-hover:text-emerald-950 transition-colors border border-emerald-500/10">
                           <Users className="w-7 h-7" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{p.full_name}</div>
                          <div className="text-emerald-400/40 text-sm">{p.organization} • {p.department}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-8 h-8 text-white/20 group-hover:text-amber-500 transition-colors rtl:rotate-180" />
                    </motion.button>
                  ))
                )}

                {query.length >= 2 && results.length === 0 && !loading && (
                  <div className="text-center py-10 text-white/20 font-bold italic">
                    لم يتم العثور على نتائج تطابق هذا الاسم...
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="bg-white/5 border border-white/10 rounded-[50px] p-12 backdrop-blur-3xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                
                <h3 className="text-3xl font-black mb-2">{selected.full_name}</h3>
                <p className="text-emerald-400/40 font-bold mb-10 tracking-widest">{selected.organization}</p>

                <div className="bg-white p-8 rounded-[40px] inline-block shadow-2xl mb-10">
                   <img 
                     src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selected.qr_code)}`} 
                     alt="QR" 
                     className="w-48 h-48"
                   />
                </div>

                <div className="flex justify-center gap-12 mb-10">
                   <div>
                      <div className="text-[10px] text-emerald-400/30 font-black uppercase tracking-[0.2em] mb-1">رقم المقعد</div>
                      <div className="text-2xl font-black text-amber-500">{selected.seat_info || '--'}</div>
                   </div>
                   <div className="w-px h-12 bg-white/5" />
                   <div>
                      <div className="text-[10px] text-emerald-400/30 font-black uppercase tracking-[0.2em] mb-1">حالة الحساب</div>
                      <div className="text-2xl font-black text-emerald-400">مؤكد</div>
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Button 
                    variant="gold" 
                    className="h-20 text-xl font-black rounded-[28px] gap-3"
                    onClick={() => {
                      if(selected?.order_num) window.open(credentialService.getBadgeUrl(selected.order_num), '_blank');
                    }}
                  >
                    <Printer className="w-7 h-7" />
                    طباعة البطاقة / الشهادة
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 border-white/10 rounded-[28px] gap-2 hover:bg-white/5"
                    onClick={() => setView('search')}
                  >
                    <RotateCcw className="w-5 h-5" />
                    لست أنت؟ بحث جديد
                  </Button>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[40px] flex items-start gap-6">
                 <Info className="w-10 h-10 text-amber-500 flex-shrink-0" />
                 <p className="text-amber-500/60 text-lg font-bold leading-relaxed">
                    يرجى تصوير رمز الـ QR بهاتفك أو إظهاره للمنظم عند مدخل القاعة لتأكيد حضورك.
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 text-emerald-400/20 font-black uppercase tracking-[0.5em] text-xs">
        Diwan Event Platform • Self Service Console
      </footer>
    </div>
  );
};

export default SelfServicePage;
