import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  HelpCircle,
  Monitor,
  QrCode,
  Globe,
  Share2
} from 'lucide-react';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import participantService from '../services/participantService';
import interactionService from '../services/interactionService';
import sponsorService from '../services/sponsorService';
import eventService from '../services/eventService';
import { cn } from '../utils/cn';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.split('/api/v1')[0]
    : (import.meta.env.PROD ? '' : 'http://localhost:8000');
  return `${baseUrl}${url}`;
};

import { formatTime, getCurrentTime } from '../utils/time';
import { useParams } from 'react-router-dom';
import { useEvent } from '../context/EventContext';
const WallCarousel = ({ posts, eventSettings }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 8000); // Rotate every 8 seconds
    return () => clearInterval(timer);
  }, [posts]);

  if (!posts || posts.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <MessageSquare className="w-32 h-32 text-white/10 mb-8" />
        <p className="text-4xl text-white/30 font-bold">{t('public_display.waiting_interaction', 'بانتظار تفاعل الجمهور...')}</p>
      </div>
    );
  }

  const post = posts[currentIndex];

  return (
    <motion.div
      key="wall-carousel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col pt-4 md:pt-8 px-4 md:px-12 relative"
    >
      <div className="text-center mb-6 2xl:mb-10 shrink-0">
        <h2 className="text-4xl lg:text-6xl 2xl:text-7xl font-black flex items-center justify-center gap-6">
          <MessageSquare className="w-12 h-12 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20 text-amber-500" /> {t('public_display.live_wall', 'حائط التفاعل المباشر')}
        </h2>
        <p className="text-emerald-400/40 text-lg lg:text-xl 2xl:text-2xl font-bold uppercase tracking-[0.5em] mt-4">{t('public_display.live_subtitle', 'مباشر من تطبيق المشاركين')}</p>
      </div>

      <div className="flex-1 w-full flex items-center justify-center pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-[90vw] xl:max-w-[85vw] 2xl:max-w-[75vw] max-h-[70vh] flex flex-col bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 2xl:p-20 rounded-[40px] 2xl:rounded-[60px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] relative"
          >
            <div className="absolute -top-6 -right-6 2xl:-top-10 2xl:-right-10 w-16 h-16 2xl:w-28 2xl:h-28 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-emerald-950 font-black text-4xl 2xl:text-6xl shadow-[0_0_50px_rgba(245,158,11,0.4)]">“</div>

            <div className="flex items-center gap-6 2xl:gap-8 mb-6 2xl:mb-10 border-b border-white/10 pb-6 shrink-0">
              <div className="w-16 h-16 2xl:w-24 2xl:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-3xl 2xl:text-5xl font-black text-emerald-400">
                {post.author_name[0]}
              </div>
              <div>
                <div className="text-2xl 2xl:text-4xl font-black text-white">{post.author_name}</div>
                <div className="text-emerald-400/50 font-bold text-sm 2xl:text-xl mt-1 2xl:mt-2 tracking-widest uppercase">{t('public_display.participant', 'مشارك في الفعالية')}</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 2xl:gap-10 items-center overflow-hidden">
              {post.image_url && (
                <div className="w-full md:w-1/3 rounded-[20px] 2xl:rounded-[30px] overflow-hidden border-4 border-white/5 shadow-2xl shrink-0">
                  <img src={getImageUrl(post.image_url)} alt="مرفق" className="w-full h-auto max-h-[30vh] 2xl:max-h-[40vh] object-cover" />
                </div>
              )}
              <div className="flex-1 w-full flex items-center">
                <p className={cn(
                  "text-white/90 font-medium italic leading-loose",
                  // Truncate text after a certain number of lines depending on whether there's an image
                  post.image_url ? "line-clamp-3 2xl:line-clamp-4" : "line-clamp-5 2xl:line-clamp-6",
                  post.content.length > 300 ? (post.image_url ? "text-xl 2xl:text-3xl" : "text-2xl 2xl:text-4xl") :
                    post.content.length > 100 ? (post.image_url ? "text-2xl 2xl:text-4xl" : "text-3xl 2xl:text-5xl") :
                      (post.image_url ? "text-3xl 2xl:text-5xl" : "text-4xl 2xl:text-6xl text-center")
                )}>
                  "{post.content}"
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-3">
        {posts.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              idx === currentIndex ? "w-12 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "w-3 bg-white/20"
            )}
          />
        ))}
      </div>
    </motion.div>
  );
};

const PublicDisplay = () => {
  const { t } = useTranslation();
  const { eid, channel } = useParams();
  const { selectedEventId } = useEvent();
  const eventId = eid || selectedEventId || 1;
  const displayChannel = channel || 'main';
  const cacheKey = `display_${eventId}_${displayChannel}`;
  const defaultScenes = { main: 'stats', lobby: 'wall', networking: 'sponsors' };

  const [scene, setScene] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlScene = params.get('scene');
    if (urlScene) return urlScene;

    const cached = localStorage.getItem(`${cacheKey}_scene`);
    return cached || defaultScenes[displayChannel] || 'stats';
  });

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [data, setData] = useState(() => {
    const cached = localStorage.getItem(`${cacheKey}_data`);
    let parsed = cached ? JSON.parse(cached) : null;

    // إذا كان الكاش يحتوي على البيانات التجريبية القديمة أو أسماء تجريبية في شريط الحضور، نقوم بتصفيره
    if (parsed && (
      (parsed.poll && parsed.poll.results && parsed.poll.results.length > 0) || 
      (parsed.stats && parsed.stats.recent && parsed.stats.recent.length > 3)
    )) {
       parsed = null;
       localStorage.removeItem(`${cacheKey}_data`);
    }

    return parsed || {
      stats: { total: 0, present: 0, recent: [] },
      wall: [],
      question: null,
      poll: { question: "بانتظار بدء الاستطلاع...", results: [] },
      sponsors: [],
      eventSettings: {}
    };
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(`${cacheKey}_scene`, scene);
  }, [scene, cacheKey]);

  useEffect(() => {
    localStorage.setItem(`${cacheKey}_data`, JSON.stringify(data));
  }, [data, cacheKey]);

  // Real-time Engine
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'checkin' || message.type === 'check_in') {
      setData(prev => {
        const newPerson = {
          ...message.participant,
          time: getCurrentTime()
        };
        const alreadyExists = prev.stats.recent.some(p => p.id === newPerson.id);
        if (alreadyExists) return prev;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            present: prev.stats.present + 1,
            recent: [newPerson, ...prev.stats.recent].slice(0, 6)
          }
        };
      });
    } else if (message.type === 'social_post_approved') {
      setData(prev => ({
        ...prev,
        wall: [message.post, ...prev.wall].slice(0, 6)
      }));
    } else if (message.type === 'question_pinned' || message.type === 'new_question') {
      setData(prev => ({ ...prev, question: message.question }));
      setScene('questions');
    } else if (message.type === 'poll_update') {
      setData(prev => ({ ...prev, poll: message.data }));
      setScene('polls');
    } else if (message.type === 'scene_change' && (message.channel === displayChannel || message.channel === 'all')) {
      setScene(message.scene);
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [participants, wall, sponsors, settings, pinnedQ] = await Promise.all([
          participantService.getParticipants(eventId).catch(() => ({ total: 0, items: [] })),
          interactionService.getPosts(eventId).catch(() => []),
          sponsorService.getSponsors(eventId).catch(() => []),
          eventService.getEventSettings(eventId).catch(() => ({})),
          interactionService.getPinnedQuestion(eventId).catch(() => null)
        ]);

        const items = participants.items || (Array.isArray(participants) ? participants : []);
        const totalCount = participants.total !== undefined ? participants.total : items.length;
        const presentParticipants = items
          .filter(p => p.check_in_time)
          .sort((a, b) => new Date(a.check_in_time) - new Date(b.check_in_time));

        setData(prev => ({
          ...prev,
          stats: {
            total: totalCount,
            present: presentParticipants.length,
            recent: presentParticipants.slice(-10).reverse()
          },
          wall: (wall || []).slice(0, 6),
          sponsors: sponsors || [],
          eventSettings: settings || {},
          question: pinnedQ
        }));

        if (pinnedQ) {
          setScene('questions');
        }
      } catch (err) {
        console.error('Sync error', err);
      }
    };

    fetchData();
    const syncInterval = setInterval(fetchData, 60000);

    return () => {
      clearInterval(syncInterval);
    };
  }, [eventId]);

  const percentage = data.stats.total > 0 ? Math.round((data.stats.present / data.stats.total) * 100) : 0;

  return (
    <div className="min-h-screen h-screen bg-[#022C22] text-white flex flex-col pt-4 px-4 pb-0 md:pt-8 md:px-8 md:pb-0 lg:pt-12 lg:px-12 lg:pb-0 overflow-hidden relative font-arabic">
      {/* Premium Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-emerald-500/10 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-amber-500/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />
      </div>

      {/* Header Banner - Enterprise Grade */}
      <div className="flex justify-between items-center w-full z-50 shrink-0 mb-4 md:mb-8">
        <div className="flex items-center gap-4 md:gap-8">
          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px ${data.eventSettings.primary_color || '#F59E0B'}44`,
                `0 0 40px ${data.eventSettings.primary_color || '#F59E0B'}66`,
                `0 0 20px ${data.eventSettings.primary_color || '#F59E0B'}44`
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-[28px] overflow-hidden bg-white flex items-center justify-center p-2 md:p-3 border-2 shadow-2xl shrink-0"
            style={{ borderColor: data.eventSettings.primary_color || '#F59E0B' }}
          >
            {data.eventSettings.logo_url ? (
              <img src={getImageUrl(data.eventSettings.logo_url)} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Award className="w-6 h-6 md:w-12 md:h-12 text-emerald-950" style={{ color: data.eventSettings.secondary_color || '#022C22' }} />
            )}
          </motion.div>
          <div>
            {(data.eventSettings.organizer_text || '').split('\n').filter(line => line.trim()).map((line, i) => (
               <div key={i} className="text-emerald-400/60 font-bold text-xs md:text-lg lg:text-xl uppercase tracking-[0.2em] mb-1">
                 {line}
               </div>
            ))}
            <h1 className={cn(
              "font-black tracking-tighter leading-tight text-balance",
              (data.eventSettings.event_name?.length || 0) > 40 ? "text-sm md:text-xl lg:text-2xl" :
                (data.eventSettings.event_name?.length || 0) > 20 ? "text-lg md:text-2xl lg:text-3xl" :
                  "text-xl md:text-3xl lg:text-4xl"
            )}>
              {data.eventSettings.event_name || 'ديوان إيفنت'}
            </h1>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl md:text-3xl lg:text-5xl font-black text-amber-500 leading-none">
            {currentTime}
          </div>
          <div className="text-emerald-400/20 font-black tracking-[0.2em] md:tracking-[0.5em] text-[8px] md:text-xs uppercase mt-1">
            {data.eventSettings.location || 'الموقع غير محدد'}
          </div>
        </div>
      </div>

      {/* Main Experience Stage */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center overflow-hidden py-6 md:py-10">
        <AnimatePresence mode="wait">

          {/* SCENE 1: MASSIVE STATS & RECENT CHECK-INS */}
          {scene === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center w-full max-w-[1800px] flex-1 min-h-0"
            >
              {/* Right Column (Big Stats) */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-right shrink-0">
                <h2 className="text-xl lg:text-3xl font-black text-emerald-400/20 uppercase tracking-[0.5em] mb-4 lg:mb-8">{t('public_display.now_live', 'الحضور المباشر الآن')}</h2>
                <div className="flex items-baseline gap-4 lg:gap-8 mb-4 lg:mb-8">
                  <span className="text-[8rem] md:text-[12rem] lg:text-[16rem] font-black leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20 drop-shadow-[0_35px_35px_rgba(255,255,255,0.1)]">
                    {data.stats.present}
                  </span>
                  <span className="text-4xl lg:text-7xl font-black text-white/5 italic">/ {data.stats.total}</span>
                </div>

                <div className="w-full max-w-2xl h-8 bg-white/5 rounded-full border border-white/10 p-2 relative overflow-hidden mb-6">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    style={{
                      background: `linear-gradient(to right, ${data.eventSettings.primary_color || '#10B981'}, #fbbf24)`
                    }}
                  />
                </div>

                <div className="flex gap-20 justify-center lg:justify-start">
                  <div>
                    <div className="text-5xl font-black text-white">{percentage}%</div>
                    <div className="text-emerald-400/30 font-bold uppercase tracking-widest mt-2">{t('public_display.completion_rate', 'نسبة الاكتمال')}</div>
                  </div>
                  <div className="w-px h-16 bg-white/10" />
                  <div>
                    <div className="text-5xl font-black text-white">{data.stats.total > 0 ? (data.stats.total - data.stats.present) : 0}</div>
                    <div className="text-emerald-400/30 font-bold uppercase tracking-widest mt-2">{t('public_display.awaiting_arrival', 'بانتظار الوصول')}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 lg:p-10 backdrop-blur-3xl w-full max-h-[60vh] lg:max-h-[70vh] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(to right, ${data.eventSettings.primary_color || '#F59E0B'}, ${data.eventSettings.accent_color || '#10B981'})` }} />
                <h3 className="text-2xl lg:text-3xl font-black text-white mb-6 flex items-center gap-4 shrink-0">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: data.eventSettings.accent_color || '#10B981' }}></span>
                    <span className="relative inline-flex rounded-full h-4 w-4" style={{ backgroundColor: data.eventSettings.accent_color || '#10B981' }}></span>
                  </span>
                  {t('public_display.recent_checkins', 'أحدث الملتحقين بالفعالية')}
                </h3>

                <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {data.stats.recent.length > 0 ? (
                      data.stats.recent.map((person, idx) => (
                        <motion.div
                          key={`${person.id || idx}-${idx}`}
                          layout
                          initial={{ opacity: 0, x: -50, scale: 0.9 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            scale: 1,
                            borderColor: idx === 0 ? (data.eventSettings.primary_color || '#F59E0B') : 'rgba(255,255,255,0.05)',
                            backgroundColor: idx === 0 ? `${data.eventSettings.primary_color || '#F59E0B'}11` : 'rgba(255,255,255,0.1)'
                          }}
                          exit={{ opacity: 0, scale: 0.9, height: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className={`border p-5 rounded-2xl flex items-center gap-5 transition-colors duration-500 ${idx === 0 ? 'shadow-[0_0_20px_rgba(245,158,11,0.2)]' : ''}`}
                        >
                          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-2xl">
                            {person.full_name ? person.full_name[0] : 'U'}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-white">{person.full_name}</h4>
                            <div className="text-emerald-400/50 text-sm font-medium">{person.council || 'مشارك'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-500 font-bold text-lg">
                              {person.time || formatTime(person.check_in_time)}
                            </div>
                            <div className="text-white/30 text-xs">{t('public_display.checkin_time', 'وقت الدخول')}</div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                        <Clock className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-2xl font-bold">{t('public_display.waiting_participants', 'بانتظار وصول المشاركين...')}</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </motion.div>
          )}

          {/* SCENE 2: INTERACTIVE WALL */}
          {scene === 'wall' && (
            <WallCarousel posts={data.wall} eventSettings={data.eventSettings} />
          )}

          {/* SCENE 3: LIVE Q&A FOCUS */}
          {scene === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -30 }}
              className="flex flex-col items-center text-center max-w-6xl mx-auto w-full px-6 py-4"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 md:mb-6 border-2 border-amber-500/20 shrink-0">
                <HelpCircle className="w-10 h-10 md:w-14 md:h-14 text-amber-500" />
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 tracking-tighter shrink-0">{t('public_display.session_question', 'سؤال الجلسة الحالي')}</h2>
              <p className="text-emerald-400/30 text-base md:text-xl font-bold uppercase tracking-[0.4em] mb-8 md:mb-12 shrink-0">{t('public_display.live_from_platform', 'بث مباشر من منصة المشاركين')}</p>
              
              {data.question ? (
                <div className="bg-white/5 backdrop-blur-2xl border-2 border-amber-500/30 p-10 md:p-16 rounded-[40px] md:rounded-[60px] shadow-[0_0_100px_rgba(245,158,11,0.1)] relative w-full max-h-[70vh] overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-2 bg-amber-500 text-emerald-950 font-black rounded-b-2xl text-xs md:text-sm uppercase tracking-widest shadow-xl z-10">
                    {t('public_display.live_question', 'سؤال مباشر')}
                  </div>
                  
                  <div className={cn(
                    "w-full",
                    data.question.content.length > 400 ? "animate-vertical-scroll-slow" : ""
                  )}>
                    <p className={cn(
                      "font-black leading-tight text-white italic mb-8 text-balance",
                      data.question.content.length > 600 ? "text-lg md:text-2xl" :
                      data.question.content.length > 300 ? "text-xl md:text-3xl" :
                      data.question.content.length > 150 ? "text-2xl md:text-4xl" : 
                      "text-3xl md:text-5xl lg:text-7xl"
                    )}>
                      "{data.question.content}"
                    </p>
                  </div>
                  
                  <div className="text-emerald-400 text-xl md:text-3xl font-bold mt-auto shrink-0">— {data.question.author_name}</div>
                </div>
              ) : (
                <div className="text-white/10 text-3xl md:text-5xl font-black italic animate-pulse">{t('public_display.waiting_questions', 'بانتظار أسئلة الجمهور...')}</div>
              )}
            </motion.div>
          )}

          {/* SCENE 4: POLLS VISUALIZATION */}
          {scene === 'polls' && (
            <motion.div
              key="polls"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl mx-auto px-4 overflow-y-auto max-h-[70vh] custom-scrollbar"
            >
              <div className="text-center mb-8 md:mb-16">
                <TrendingUp className="w-12 h-12 md:w-20 md:h-20 text-amber-500 mx-auto mb-4 md:mb-6" />
                <h2 className="text-3xl md:text-6xl font-black mb-4">{t('public_display.live_poll', 'استطلاع رأي فوري')}</h2>
                <p className="text-emerald-400/40 text-lg md:text-2xl font-bold">{data.poll?.question || "لا يوجد استطلاع نشط حالياً"}</p>
              </div>

              <div className="space-y-6 md:space-y-8">
                {data.poll?.results?.map((res, i) => (
                  <div key={i} className="space-y-3 md:space-y-4">
                    <div className="flex justify-between text-xl md:text-3xl font-black px-2 md:px-4">
                      <span className="text-white/80">{res.label || `${t('public_display.option')} ${i + 1}`}</span>
                      <span className="text-amber-500">{res.count} {t('public_display.votes', 'صوت')}</span>
                    </div>
                    <div className="h-12 md:h-16 bg-white/5 rounded-2xl md:rounded-[30px] border border-white/10 overflow-hidden p-1.5 md:p-2 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(res.count / (data.poll.results.reduce((a, b) => a + b.count, 0) || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-xl md:rounded-[24px] shadow-lg"
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
                <Award className="w-24 h-24 text-amber-500" /> {t('public_display.sponsors_title', 'شركاء النجاح والرعاية')}
              </h2>
              <div className="grid grid-cols-4 gap-16">
                {(data.sponsors || []).filter(s => (s.type || 'sponsor') === 'sponsor').map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-12 rounded-[50px] shadow-2xl h-56 flex items-center justify-center group hover:scale-105 transition-transform"
                  >
                    <img src={getImageUrl(s.logo_url)} alt={s.name} className="max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-700" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 6: CINEMATIC WELCOME */}
          {scene === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center text-center w-full max-w-5xl mx-auto px-4"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0]
                }}
                transition={{ duration: 6, repeat: Infinity }}
                className="w-20 h-20 md:w-32 md:h-32 bg-white/5 rounded-[30px] md:rounded-[50px] flex items-center justify-center mb-6 md:mb-10 border-2 border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
              >
                <Monitor className="w-10 h-10 md:w-16 md:h-16 text-amber-500" />
              </motion.div>
              <h2 className="text-3xl md:text-5xl lg:text-[6.5rem] font-black mb-4 md:mb-8 tracking-tighter leading-[1.6] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 px-4 py-4 whitespace-nowrap">
                {data.eventSettings.welcome_title || t('public_display.welcome_default', 'أهلاً وسهلاً بكم')}
              </h2>
              <div className="h-1 md:h-1.5 w-16 md:w-32 bg-amber-500 mx-auto mb-6 md:mb-12 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
              <p className="text-lg md:text-2xl lg:text-4xl font-bold leading-relaxed max-w-4xl text-emerald-400/60 px-4">
                {data.eventSettings.welcome_subtitle || t('public_display.enjoy_time', 'نتمنى لكم وقتاً ممتعاً ومفيداً')}
              </p>
            </motion.div>
          )}

          {/* SCENE 7: REGISTRATION GATEWAY */}
          {scene === 'registration' && (
            <motion.div
              key="registration"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center max-w-4xl mx-auto px-6"
            >
              <div className="bg-white p-8 md:p-12 rounded-[50px] shadow-[0_0_100px_rgba(255,255,255,0.1)] mb-8 md:mb-12">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin + '/kiosk/' + eventId)}`}
                  alt="Registration QR"
                  className="w-48 h-48 md:w-80 md:h-80"
                />
              </div>
              <h2 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter">{t('public_display.registration_gateway', 'بوابة تسجيل الحضور')}</h2>
              <p className="text-xl md:text-3xl font-bold text-emerald-400/60 leading-relaxed max-w-3xl">
                {t('public_display.scan_to_confirm', 'امسح الكود لتأكيد حضورك، الحصول على الشهادة، والمشاركة في التفاعل المباشر')}
              </p>
            </motion.div>
          )}

          {/* SCENE 8: MEDIA PARTNERS */}
          {scene === 'media' && (
            <motion.div
              key="media"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full text-center px-6"
            >
              <h2 className="text-4xl md:text-6xl font-black mb-12 md:mb-20 flex items-center justify-center gap-6 md:gap-10">
                <Share2 className="w-12 h-12 md:w-20 md:h-20 text-orange-500" /> {t('public_display.media_partners', 'الشركاء الإعلاميين والتغطية')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10">
                {(data.sponsors || []).filter(s => s.type === 'media').map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-6 md:p-8 rounded-[35px] flex items-center justify-center h-32 md:h-40 group hover:scale-105 transition-all shadow-xl"
                  >
                    <img src={getImageUrl(m.logo_url)} alt={m.name} className="max-h-full object-contain" />
                  </motion.div>
                ))}
                {/* Fallback if no media partners */}
                {(data.sponsors || []).filter(s => s.type === 'media').length === 0 && (
                  <div className="col-span-full py-20 text-white/10 text-2xl font-bold italic">
                    {t('public_display.waiting_media', 'في انتظار تأكيد الشركاء الإعلاميين...')}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer Scroller - Real-time Arrivals - Hidden during Polls/Questions to focus on content */}
      {(scene !== 'polls' && scene !== 'questions') && (
        <div className="w-full shrink-0 overflow-hidden pt-4 pb-0 border-y border-white/5 bg-white/[0.02] mt-auto">
          <div className="flex items-center gap-20 animate-infinite-scroll whitespace-nowrap px-20">
            {data.stats.recent.concat(data.stats.recent).map((p, i) => (
              <div key={`${p.id}-${i}`} className="flex items-center gap-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-2xl font-black text-white/90">{t('public_display.welcome_visitor', { name: p.full_name })}</span>
                <span className="text-white/10 text-xl font-black tracking-[1em] ml-12">///</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="flex justify-center items-center w-full shrink-0 py-1">
        <div className="flex items-center gap-3 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">{t('public_display.powered_by', 'Powered by Diwan Event')}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes infinite-scroll { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .animate-infinite-scroll { animation: infinite-scroll 60s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
};

export default PublicDisplay;
