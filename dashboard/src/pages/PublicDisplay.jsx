import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Award,
  Calendar,
  MapPin,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import participantService from '../services/participantService';
import interactionService from '../services/interactionService';
import sponsorService from '../services/sponsorService';
import { cn } from '../utils/cn';
import { useParams } from 'react-router-dom';

const PublicDisplay = () => {
  const { eid } = useParams();
  const eventId = eid || 1;
  const [scene, setScene] = useState('stats');
  const [data, setData] = useState({
    stats: { total: 0, present: 0, recent: [] },
    wall: [],
    question: null,
    poll: { question: "ما هو انطباعك الأولي عن التنظيم؟", results: [{label: "ممتاز", count: 45}, {label: "جيد جداً", count: 12}] },
    sponsors: []
  });

  // Real-time Engine
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'checkin') {
      setData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          present: prev.stats.present + 1,
          recent: [message.participant, ...prev.stats.recent].slice(0, 10)
        }
      }));
    } else if (message.type === 'social_post_approved') {
      setData(prev => ({
        ...prev,
        wall: [message.post, ...prev.wall].slice(0, 6)
      }));
    } else if (message.type === 'question_pinned') {
      setData(prev => ({ ...prev, question: message.question }));
      setScene('questions');
    } else if (message.type === 'poll_update') {
      setData(prev => ({ ...prev, poll: message.data }));
      setScene('polls');
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [participants, wall, sponsors] = await Promise.all([
          participantService.getParticipants(eventId),
          interactionService.getPosts(eventId),
          sponsorService.getSponsors(eventId)
        ]);

        const presentParticipants = participants.filter(p => p.check_in_status === 'present');

        setData(prev => ({
          ...prev,
          stats: { 
            total: participants.length || 0, 
            present: presentParticipants.length, 
            recent: presentParticipants.slice(-10).reverse() 
          },
          wall: (wall || []).slice(0, 6),
          sponsors: sponsors || []
        }));
      } catch (err) {
        console.error('Sync error', err);
      }
    };

    fetchData();
    const syncInterval = setInterval(fetchData, 60000);
    
    const sceneCycle = setInterval(() => {
      setScene(prev => {
        const flow = ['stats', 'wall', 'questions', 'polls', 'sponsors'];
        const nextIdx = (flow.indexOf(prev) + 1) % flow.length;
        return flow[nextIdx];
      });
    }, 15000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(sceneCycle);
    };
  }, [eventId]);

  const percentage = data.stats.total > 0 ? Math.round((data.stats.present / data.stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#022C22] text-white flex flex-col items-center justify-center p-20 overflow-hidden relative font-arabic">
      {/* Premium Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-emerald-500/10 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-amber-500/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />
      </div>

      {/* Header Banner - Enterprise Grade */}
      <div className="absolute top-16 left-20 right-20 flex justify-between items-center z-50">
        <div className="flex items-center gap-8">
          <motion.div 
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_20px_50px_rgba(245,158,11,0.3)]"
          >
            <Award className="w-14 h-14 text-emerald-950" />
          </motion.div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-1">ديوان إيفنت</h1>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-emerald-400/40 font-bold uppercase tracking-[0.3em] text-sm">Live Broadcast Engine</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black text-amber-500 mb-1">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-emerald-400/20 font-black tracking-[0.5em] text-xs uppercase">Riyadh • Kingdom of Saudi Arabia</div>
        </div>
      </div>

      {/* Main Experience Stage */}
      <main className="relative z-10 w-full max-w-screen-2xl">
        <AnimatePresence mode="wait">
          
          {/* SCENE 1: MASSIVE STATS */}
          {scene === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
              className="flex flex-col items-center"
            >
              <h2 className="text-4xl font-black text-emerald-400/20 uppercase tracking-[1em] mb-20">الحضور المباشر الآن</h2>
              <div className="flex items-baseline gap-12 mb-20">
                <span className="text-[28rem] font-black leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20 drop-shadow-[0_35px_35px_rgba(255,255,255,0.1)]">
                  {data.stats.present}
                </span>
                <span className="text-9xl font-black text-white/5 italic">/ {data.stats.total}</span>
              </div>
              
              <div className="w-full max-w-5xl h-10 bg-white/5 rounded-full border border-white/10 p-2 relative overflow-hidden mb-20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-32 text-center">
                <div>
                   <div className="text-7xl font-black text-white">{percentage}%</div>
                   <div className="text-emerald-400/30 font-bold uppercase tracking-widest mt-2">نسبة الاكتمال</div>
                </div>
                <div className="w-px h-20 bg-white/10 mx-auto" />
                <div>
                   <div className="text-7xl font-black text-white">{data.stats.total - data.stats.present}</div>
                   <div className="text-emerald-400/30 font-bold uppercase tracking-widest mt-2">بانتظار الوصول</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCENE 2: INTERACTIVE WALL */}
          {scene === 'wall' && (
            <motion.div 
              key="wall"
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -200 }}
              className="space-y-16"
            >
              <div className="text-center mb-24">
                <h2 className="text-7xl font-black flex items-center justify-center gap-8">
                  <MessageSquare className="w-20 h-20 text-amber-500" /> حائط التفاعل المباشر
                </h2>
                <p className="text-emerald-400/30 text-2xl font-bold uppercase tracking-[0.5em] mt-4">نعتز بمشاركاتكم عبر تطبيق ديوان</p>
              </div>

              <div className="grid grid-cols-3 gap-12">
                {data.wall.map((post, i) => (
                  <motion.div 
                    key={post.id}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[60px] shadow-2xl relative"
                  >
                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-emerald-950 font-black text-2xl shadow-xl">“</div>
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-3xl font-black text-emerald-950">
                        {post.author_name[0]}
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white">{post.author_name}</div>
                        <div className="text-emerald-400/50 font-bold text-sm">مشارك في الفعالية</div>
                      </div>
                    </div>
                    <p className="text-3xl leading-relaxed text-white/80 font-medium">"{post.content}"</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 3: LIVE Q&A FOCUS */}
          {scene === 'questions' && (
            <motion.div 
              key="questions"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="flex flex-col items-center text-center max-w-6xl mx-auto"
            >
              <div className="w-40 h-40 bg-amber-500/10 rounded-full flex items-center justify-center mb-12 border-2 border-amber-500/20">
                <HelpCircle className="w-24 h-24 text-amber-500" />
              </div>
              <h2 className="text-8xl font-black mb-8 tracking-tighter">سؤال الجلسة الحالي</h2>
              <p className="text-emerald-400/30 text-3xl font-bold uppercase tracking-[0.4em] mb-20">بث مباشر من منصة المشاركين</p>

              {data.question ? (
                <div className="bg-white/5 backdrop-blur-2xl border-4 border-amber-500/30 p-24 rounded-[80px] shadow-[0_0_150px_rgba(245,158,11,0.15)] relative">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-10 py-3 bg-amber-500 text-emerald-950 font-black rounded-full text-xl uppercase tracking-widest shadow-xl">LIVE QUESTION</div>
                  <p className="text-7xl font-black leading-tight text-white italic mb-12">"{data.question.content}"</p>
                  <div className="text-emerald-400 text-3xl font-bold">— {data.question.author_name}</div>
                </div>
              ) : (
                <div className="text-white/10 text-5xl font-black italic animate-pulse">بانتظار أسئلة الجمهور...</div>
              )}
            </motion.div>
          )}

          {/* SCENE 4: POLLS VISUALIZATION */}
          {scene === 'polls' && (
            <motion.div 
              key="polls"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl mx-auto"
            >
              <div className="text-center mb-24">
                <TrendingUp className="w-24 h-24 text-amber-500 mx-auto mb-8" />
                <h2 className="text-7xl font-black mb-6">استطلاع رأي فوري</h2>
                <p className="text-emerald-400/30 text-3xl font-bold">{data.poll?.question || "ما هو تقييمك لمستوى الابتكار في الفعالية؟"}</p>
              </div>

              <div className="space-y-12">
                {data.poll?.results?.map((res, i) => (
                  <div key={i} className="space-y-6">
                    <div className="flex justify-between text-4xl font-black px-4">
                      <span className="text-white/80">{res.label || `الخيار ${i+1}`}</span>
                      <span className="text-amber-500">{res.count} صوت</span>
                    </div>
                    <div className="h-24 bg-white/5 rounded-[40px] border border-white/10 overflow-hidden p-3 relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(res.count / (data.poll.results.reduce((a,b) => a + b.count, 0) || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-[30px] shadow-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 5: SPONSORS GALA */}
          {scene === 'sponsors' && (
            <motion.div 
              key="sponsors"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center"
            >
              <h2 className="text-7xl font-black mb-32 flex items-center justify-center gap-10">
                <Award className="w-24 h-24 text-amber-500" /> شركاء النجاح والرعاية
              </h2>
              <div className="grid grid-cols-4 gap-16">
                {data.sponsors.map((s, i) => (
                  <motion.div 
                    key={s.id}
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-12 rounded-[50px] shadow-2xl h-56 flex items-center justify-center group hover:scale-105 transition-transform"
                  >
                    <img src={s.logo_url} alt={s.name} className="max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-700" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer Scroller - Real-time Arrivals */}
      <div className="absolute bottom-16 left-0 right-0 overflow-hidden py-8 border-y border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-20 animate-infinite-scroll whitespace-nowrap px-20">
          {data.stats.recent.concat(data.stats.recent).map((p, i) => (
            <div key={`${p.id}-${i}`} className="flex items-center gap-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                 <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <span className="text-4xl font-black text-white/90">أهلاً بك: <span className="text-amber-500">{p.full_name}</span></span>
              <span className="text-white/10 text-3xl font-black tracking-[1em] ml-12">///</span>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes infinite-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-infinite-scroll { animation: infinite-scroll 45s linear infinite; }
      `}} />
    </div>
  );
};

export default PublicDisplay;
