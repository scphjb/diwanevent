import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { 
  Calendar, 
  MessageSquare, 
  BarChart2, 
  Award, 
  User, 
  Send,
  Camera,
  Download,
  HelpCircle,
  X,
  Search, 
  Users,
  Users as NetworkingIcon,
  Shield, 
  Eye,
  EyeOff,
  Link as LinkIcon,
  Smartphone,
  Monitor,
  Printer,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import agendaService from '../services/agendaService';
import eventService from '../services/eventService';
import interactionService from '../services/interactionService';
import credentialService from '../services/credentialService';
import participantService from '../services/participantService';
import api from '../services/api';
import AIConcierge from '../components/ai/AIConcierge';
import { cn } from '../utils/cn';
import NetworkingHub from './portal/NetworkingHub';
import toast, { Toaster } from 'react-hot-toast';

const getFullUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/').replace('/api/v1/', '');
  return `${baseUrl}${url}`;
};

const ParticipantPortal = () => {
  const { eid, token } = useParams();
  const eventId = eid;
  const participantToken = token;
  
  const [activeTab, setActiveTab] = useState('home');
  const [eventSettings, setEventSettings] = useState({});
  const [participant, setParticipant] = useState(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [agenda, setAgenda] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [posts, setPosts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    linkedin: '',
    specialties: [],
    website: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // مراقبة حالة الشبكة
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  toast.success('تم استعادة الاتصال ✅'); };
    const handleOffline = () => { setIsOnline(false); toast.error('انقطع الاتصال بالإنترنت'); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (eventId && participantToken) {
      fetchInitialData();
    }
  }, [eventId, participantToken]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // استخدام الـ endpoint العام الجديد (بالـ Token) لضمان الأمان
      const pRes = await api.get(`participants/public/access/${participantToken}`);
      setParticipant(pRes.data);
      
      setProfileData({
        bio: pRes.data.custom_values?.bio || '',
        linkedin: pRes.data.custom_values?.linkedin || '',
        specialties: pRes.data.custom_values?.specialties || [],
        website: pRes.data.custom_values?.website || ''
      });
      
      // دائماً نرسل التوكن في الـ Header للطلبات اللاحقة (يدعم JWT أو رقم الطلب)
      if (participantToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${participantToken}`;
      }
      
      setIsOptedIn(pRes.data.custom_values?.is_visible || false);
        
        try {
          const [settings, ag, lead, dirRes, wallPosts, activePolls, eventDocs] = await Promise.all([
          api.get(`events/public/${eventId}`).then(res => res.data),
          agendaService.getSessions(eventId),
          interactionService.getLeaderboard(eventId),
          api.get(`networking/directory?event_id=${eventId}`),
          interactionService.getPosts(eventId),
          interactionService.getActivePolls(eventId),
          interactionService.getDocuments(eventId).catch(() => [])
        ]);
        setEventSettings(settings || {});
        setAgenda(ag || []);
        setLeaderboard(lead || []);
        setDirectory(dirRes.data || []);
        setPosts(wallPosts || []);
        setPolls(activePolls || []);
        setDocuments(eventDocs || []);
      } catch (e) {
        // البيانات الإضافية اختيارية — لا نوقف الصفحة إذا فشلت
        console.warn('Optional data fetch failed', e);
      }
    } catch (err) {
      console.error('Failed to fetch participant data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostToWall = async () => {
    if (!newPost.trim()) return;
    try {
      const response = await interactionService.createPost({
        event_id: eventId,
        author_name: participant.full_name,
        content: newPost
      });
      // Backend returns { message: "...", post_id: ... }
      const newOptimisticPost = {
        id: response.post_id || Date.now(),
        author_name: participant.full_name,
        content: newPost,
        is_pending: true
      };
      
      setPosts([newOptimisticPost, ...posts]);
      setNewPost('');
    } catch (err) { toast.error('فشل النشر'); }
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      await interactionService.createQuestion({
        event_id: eventId,
        name: participant.full_name,
        text: newQuestion,
        session_id: selectedSessionId ? parseInt(selectedSessionId) : null
      });
      setNewQuestion('');
      toast.success('تم إرسال سؤالك بنجاح ✅');
    } catch (err) { toast.error('فشل إرسال السؤال'); }
  };

  const handleOptInToggle = async () => {
    try {
      const res = await api.patch(`participants/public/visibility/${participantToken}`);
      const newStatus = res.data.is_visible;
      setIsOptedIn(newStatus);
      
      // تحديث الدليل فوراً ليظهر المشترك نفسه أو يختفي
      const dirRes = await api.get(`networking/directory?event_id=${eventId}`);
      setDirectory(dirRes.data || []);
      toast.success(newStatus ? 'أنت الآن مرئي للمشاركين' : 'تم إخفاء ملفك الشخصي');
    } catch (err) { toast.error('حدث خطأ أثناء تحديث الإعدادات'); }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      await interactionService.submitVote(pollId, optionId, participant.id);
      setVotedPolls([...votedPolls, pollId]);
      toast.success('تم تسجيل صوتك بنجاح ✅');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التصويت');
    }
  };

  const handleConnect = (contact) => {
    setSelectedContact(contact);
  };

  const handleRequestConnection = async () => {
    if (!selectedContact || !participant) return;
    try {
      await api.post(`networking/connect?requested_qr=${selectedContact.qr_code}`);
      toast.success('تم إرسال طلب التواصل الاحترافي بنجاح ✅');
      setSelectedContact(null);
      const dirRes = await api.get(`networking/directory?event_id=${eventId}`);
      setDirectory(dirRes.data || []);
    } catch (err) {
      toast.error('فشل إرسال الطلب. ربما أرسلته مسبقاً.');
    }
  };



  const handleUpdateProfile = async () => {
    try {
      const data = {
        ...profileData
      };
      await api.patch('participants/public/profile', data);
      setParticipant({ ...participant, custom_values: { ...participant.custom_values, ...data } });
      setIsEditingProfile(false);
      toast.success('تم تحديث ملفك الشخصي بنجاح ✅');
    } catch (err) {
      toast.error('فشل تحديث الملف الشخصي');
    }
  };

  const handleDownloadVCard = (contact) => {
    const url = `${api.defaults.baseURL}networking/vcard/${contact.qr_code}`;
    window.open(url, '_blank');
  };

  const handleWalletClick = (walletType) => {
    toast('ميزة الإضافة إلى ' + walletType + ' ستُفعَّل قريباً 💳', { icon: '⏳' });
  };

  const tabs = [
    { id: 'home', label: 'أنا', icon: User },
    { id: 'agenda', label: 'الجدول', icon: Calendar },
    { id: 'polls', label: 'الاستطلاعات', icon: BarChart2, show: eventSettings.show_polls !== false },
    { id: 'social', label: 'الحائط', icon: MessageSquare, show: eventSettings.show_social_wall !== false },
    { id: 'networking', label: 'التواصل', icon: NetworkingIcon, show: eventSettings.show_networking !== false },
    { id: 'leaderboard', label: 'المتصدرون', icon: Award, show: eventSettings.show_leaderboard === true }, // مخفية افتراضياً إلا لو فُعلت
    { id: 'cert', label: 'الشهادة', icon: Award },
    { id: 'docs', label: 'المستندات', icon: FileText, show: eventSettings.show_docs !== false },
    { id: 'ai', label: 'الأسئلة', icon: HelpCircle, show: eventSettings.show_qa !== false },
  ].filter(t => t.show !== false);

  if (loading) return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
    </div>
  );
  
  if (!participant) return (
    <div className="min-h-screen bg-[#050B18] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <X className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-black mb-2">عذراً، الرابط غير صالح</h2>
      <p className="text-brand-secondary/50 font-bold mb-8">لم نتمكن من العثور على بيانات المشارك لهذا الرابط. يرجى التأكد من الرمز أو التواصل مع المنظمين.</p>
      <Button variant="outline" onClick={() => window.location.href = '/'}>العودة للرئيسية</Button>
    </div>
  );

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(participant?.qr_code || '')}`;

  return (
    <div className="min-h-screen bg-[#050B18] text-white selection:bg-amber-500 selection:text-brand-dark flex flex-col font-arabic overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="p-6 bg-white/[0.03] backdrop-blur-3xl border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-brand-dark shadow-xl">D</div>
          <div>
            <h1 className="font-black text-base tracking-tight leading-none uppercase">DIWAN <span className="text-amber-500">PORTAL</span></h1>
            <p className="text-[10px] text-brand-secondary/50 font-bold uppercase tracking-widest mt-1">Digital Identity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={cn(
             "px-3 py-1 rounded-full text-[10px] font-black border transition-all",
             isOnline
               ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
               : "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
           )}>
             {isOnline ? '🟢 متصل' : '🔴 غير متصل'}
           </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-red-500 text-center py-2 text-[10px] font-black uppercase tracking-widest sticky top-[88px] z-40">
           أنت تعمل الآن في وضع عدم الاتصال
        </div>
      )}

      <main className="flex-1 p-6 pb-40 relative z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
               
               {/* 1. Profile Card */}
               <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl text-center relative shadow-2xl">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    {participant?.avatar_url ? (
                      <img 
                        src={participant.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-[32px] border-2 border-brand-primary/30 shadow-[0_0_30px_rgba(42,100,236,0.2)]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[32px] bg-gradient-to-br from-brand-primary/20 to-brand-dark/40 flex items-center justify-center border-2 border-brand-primary/20 text-brand-secondary shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <span className="text-5xl font-black">{participant?.full_name?.charAt(0) || 'U'}</span>
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-3xl font-black mb-1 tracking-tight text-[#F0F4F2]">{participant.full_name}</h2>
                  <p className="text-brand-secondary/60 font-bold text-sm mb-6 uppercase tracking-wider">{participant.organization}</p>
                  
                  {participant.custom_values?.specialties?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                       {participant.custom_values.specialties.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[11px] font-black text-brand-secondary">
                             {s}
                          </span>
                       ))}
                    </div>
                  )}

                  {!isEditingProfile ? (
                    <div className="space-y-6">
                      {participant.custom_values?.bio && (
                        <p className="text-white/70 text-sm leading-relaxed mb-4 px-4">{participant.custom_values.bio}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="rounded-2xl border-white/10 text-white font-bold py-3 text-xs" onClick={() => setIsEditingProfile(true)}>
                          تعديل الملف
                        </Button>
                        <Button variant="gold" className="rounded-2xl font-bold py-3 text-xs" onClick={() => setActiveTab('networking')}>
                          التواصل المهني
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-black/20 p-6 rounded-[30px] border border-white/5 text-right mt-4">
                       <div>
                          <label className="text-[11px] text-white/50 font-bold mb-2 block">النبذة المهنية</label>
                          <textarea 
                            value={profileData.bio}
                            onChange={e => setProfileData({...profileData, bio: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none min-h-[80px] resize-none"
                            placeholder="نبذة قصيرة..."
                          />
                       </div>
                       <div>
                          <label className="text-[11px] text-white/50 font-bold mb-2 block">رابط LinkedIn</label>
                          <input 
                            type="text"
                            value={profileData.linkedin}
                            onChange={e => setProfileData({...profileData, linkedin: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                          />
                       </div>
                       <div>
                          <label className="text-[11px] text-white/50 font-bold mb-2 block">التخصصات المهنية</label>
                          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-2 flex flex-wrap gap-2 focus-within:border-brand-primary transition-all min-h-[50px] cursor-text" onClick={() => document.getElementById('tag-input-field')?.focus()}>
                            {(profileData.specialties || []).map((tag, i) => (
                              <span key={i} className="bg-brand-primary/20 text-brand-secondary px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 border border-brand-primary/20">
                                {tag}
                                <button onClick={(e) => { e.stopPropagation(); setProfileData({...profileData, specialties: profileData.specialties.filter((_, idx) => idx !== i)}); }} className="hover:text-white">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                            <input 
                              id="tag-input-field"
                              type="text"
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault();
                                  const val = tagInput.trim().replace(',', '');
                                  if (val && !profileData.specialties.includes(val)) {
                                    setProfileData({...profileData, specialties: [...profileData.specialties, val]});
                                    setTagInput('');
                                  }
                                }
                              }}
                              className="flex-1 bg-transparent border-none outline-none text-white text-sm p-1 min-w-[100px]"
                              placeholder="أضف تخصص..."
                            />
                          </div>
                          <p className="text-[9px] text-white/20 mt-2">اضغط Enter أو فاصلة للإضافة</p>
                       </div>
                        <div className="flex gap-2 pt-2">
                          <Button className="flex-1 rounded-xl font-bold bg-brand-primary text-brand-dark py-2" onClick={handleUpdateProfile}>حفظ</Button>
                          <Button variant="outline" className="flex-1 rounded-xl font-bold border-white/10 py-2" onClick={() => setIsEditingProfile(false)}>إلغاء</Button>
                       </div>
                    </div>
                  )}
               </div>

               {/* 2. Digital Badge Card */}
               <div className="bg-gradient-to-br from-[#0D1527] to-[#050B18] border border-brand-primary/20 rounded-[40px] p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                  <h3 className="text-brand-secondary font-black mb-6 tracking-widest text-sm uppercase">البطاقة الرقمية</h3>
                  
                  <div className="relative inline-block group mb-8">
                    <div className="absolute -inset-6 bg-amber-500/20 blur-[40px] rounded-full opacity-50 transition-opacity" />
                    <div className="relative bg-white p-4 rounded-[30px] shadow-2xl">
                      <img src={qrUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-brand-secondary/50 font-bold uppercase tracking-widest mb-1">المقعد</div>
                        <div className="font-black text-xl text-amber-500">{participant.seat_info || '--'}</div>
                     </div>
                     <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-brand-secondary/50 font-bold uppercase tracking-widest mb-1">رقم التسجيل</div>
                        <div className="font-black text-xl text-white">#{participant.order_num?.split('-')[1] || participant.order_num}</div>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                     <button onClick={() => handleWalletClick('Apple Wallet')} className="flex-1 h-12 bg-black border border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
                        <Smartphone className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Apple Wallet</span>
                     </button>
                     <button onClick={() => handleWalletClick('Google Wallet')} className="flex-1 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600/40 transition-all">
                        <Monitor className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Google Wallet</span>
                     </button>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div key="agenda" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black tracking-tight mb-8">أجندة الفعالية 📅</h3>
               <div className="space-y-4">
                  {agenda.map((item) => (
                    <div key={item.id} className="bg-white/5 border border-white/10 p-6 rounded-[35px] flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer">
                       <div className="w-20 text-center flex flex-col items-center">
                          <div className="text-amber-500 font-black text-sm">{item.start_time}</div>
                          <div className="w-1 h-8 bg-white/5 rounded-full mt-2" />
                       </div>
                       <div className="flex-1">
                          <h4 className="font-black text-lg mb-1 group-hover:text-amber-500 transition-colors">{item.title}</h4>
                          <p className="text-brand-secondary/50 text-xs font-bold">{item.speaker_name} • {item.hall}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black tracking-tight mb-8">لوحة المتصدرين 🏆</h3>
               <div className="space-y-3">
                  {leaderboard.map((p, idx) => (
                    <div key={p.id} className={cn(
                      "p-5 rounded-[30px] flex items-center justify-between border transition-all",
                      p.id === participant.id ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"
                    )}>
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                            idx === 0 ? "bg-amber-500 text-brand-dark" : "bg-white/5 text-brand-secondary"
                          )}>
                             {idx + 1}
                          </div>
                          <div>
                             <div className="font-black text-white">{p.name} {p.id === participant.id && "(أنت)"}</div>
                             <div className="text-[10px] text-brand-secondary/30 font-bold uppercase tracking-widest">{p.points} نقطة</div>
                          </div>
                       </div>
                       {idx === 0 && <Award className="w-5 h-5 text-amber-500" />}
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'networking' && (
            <motion.div key="networking" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               <div style={{ margin: '-24px -24px 0 -24px', height: 'calc(100vh - 80px)' }}>
                 <NetworkingHub eventId={eventId} participant={participant} />
               </div>
            </motion.div>
          )}

          {/* Contact Card Modal */}
          <AnimatePresence>
            {selectedContact && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#050B18]/80 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-[#050B18] border border-white/20 rounded-[50px] p-8 w-full max-sm:max-w-full max-w-sm backdrop-blur-3xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-amber-500 to-amber-600 -z-10" />
                  <button 
                    onClick={() => setSelectedContact(null)}
                    className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="pt-12 text-center">
                    <div className="w-24 h-24 rounded-[30px] bg-white mx-auto mb-6 flex items-center justify-center shadow-2xl border-4 border-white/10">
                      <User className="w-12 h-12 text-brand-dark" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-1">{selectedContact.full_name}</h4>
                    <p className="text-amber-500 font-bold text-sm mb-6">{selectedContact.organization}</p>
                    
                    {selectedContact.bio && (
                      <p className="text-white/60 text-[11px] leading-relaxed mb-6 px-4">{selectedContact.bio}</p>
                    )}

                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                       {(selectedContact.specialties || []).map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-brand-secondary">
                             #{s}
                          </span>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 mb-8">
                      {selectedContact.connection_status === 'accepted' ? (
                        <>
                          <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20 flex items-center gap-4">
                            <Smartphone className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-brand-secondary/50 font-bold uppercase">الهاتف</div>
                              <div className="text-sm font-black text-white">{selectedContact.phone || 'غير متوفر'}</div>
                            </div>
                            <button 
                              onClick={() => window.open(`https://wa.me/${selectedContact.phone?.replace(/[^0-9]/g, '')}`, '_blank')}
                              className="w-10 h-10 rounded-xl bg-brand-primary text-brand-dark flex items-center justify-center hover:scale-110 transition-all"
                            >
                               <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20 flex items-center gap-4">
                            <FileText className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-brand-secondary/50 font-bold uppercase">البريد الإلكتروني</div>
                              <div className="text-sm font-black text-white">{selectedContact.email || 'غير متوفر'}</div>
                            </div>
                          </div>
                          
                          {selectedContact.linkedin && (
                            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex items-center gap-4 cursor-pointer" onClick={() => window.open(selectedContact.linkedin, '_blank')}>
                               <LinkIcon className="w-5 h-5 text-blue-400" />
                               <div className="text-right flex-1">
                                  <div className="text-[10px] text-blue-400/50 font-bold uppercase">LinkedIn</div>
                                  <div className="text-sm font-black text-white">زيارة الملف الشخصي</div>
                               </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                            <Shield className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-white/30 font-bold uppercase">الدور</div>
                              <div className="text-sm font-black text-white">{selectedContact.role || 'مشارك'}</div>
                            </div>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-white/30 font-bold uppercase">الجهة</div>
                              <div className="text-sm font-black text-white">{selectedContact.court || '---'}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Button 
                        variant={selectedContact.connection_status === 'accepted' ? 'outline' : 'gold'} 
                        className="w-full h-16 rounded-2xl font-black text-lg gap-2" 
                        onClick={handleRequestConnection}
                        disabled={selectedContact.connection_status !== 'none'}
                      >
                        {selectedContact.connection_status === 'accepted' ? (
                          <><CheckCircle className="w-5 h-5" /> تم التواصل الاحترافي</>
                        ) : selectedContact.connection_status === 'pending' ? (
                          <><Calendar className="w-5 h-5" /> قيد الانتظار</>
                        ) : (
                          <><LinkIcon className="w-5 h-5" /> طلب بيانات التواصل</>
                        )}
                      </Button>
                      
                      {selectedContact.connection_status === 'accepted' && (
                        <Button 
                          variant="gold" 
                          className="w-full h-16 rounded-2xl font-black text-lg gap-2" 
                          onClick={() => handleDownloadVCard(selectedContact)}
                        >
                           <Download className="w-5 h-5" />
                           حفظ في جهات الاتصال
                        </Button>
                      )}
                    </div>
                    
                    <p className="mt-4 text-[10px] text-white/30 font-bold text-center">
                      {selectedContact.connection_status === 'accepted' ? "بيانات التواصل ظاهرة لك الآن" : "سيتم إرسال طلبك لهذا المشارك للموافقة"}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'social' && (
            <motion.div key="social" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black">الحائط التفاعلي 💬</h3>
               <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl mb-8">
                  <textarea 
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="شاركنا انطباعك عن الفعالية..." 
                    className="w-full bg-transparent border-none outline-none text-xl font-bold placeholder:text-white/10 min-h-[120px] resize-none"
                  />
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                     <button className="w-14 h-14 rounded-2xl bg-white/5 text-brand-secondary flex items-center justify-center border border-white/10">
                        <Camera className="w-6 h-6" />
                     </button>
                     <Button variant="gold" className="px-12 h-14 rounded-[20px] text-lg font-black shadow-lg" onClick={handlePostToWall}>نشر</Button>
                  </div>
               </div>

               <div className="space-y-4">
                 {posts.map(post => (
                   <div key={post.id} className="bg-white/5 border border-white/10 rounded-[30px] p-6 relative">
                     {post.is_pending && (
                       <span className="absolute top-4 left-4 bg-amber-500/20 text-amber-500 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/30">
                         قيد المراجعة
                       </span>
                     )}
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-secondary font-bold border border-brand-primary/20">
                         {post.author_name[0]}
                       </div>
                       <div>
                         <div className="font-black text-white text-sm">{post.author_name}</div>
                         <div className="text-[10px] text-brand-secondary/40 font-bold">الآن</div>
                       </div>
                     </div>
                     <p className="text-white/80 font-bold text-lg leading-relaxed">{post.content}</p>
                   </div>
                 ))}
                 {posts.length === 0 && (
                   <div className="text-center py-10 text-white/30 font-bold">لا توجد منشورات حتى الآن. كن أول من يشارك!</div>
                 )}
               </div>
            </motion.div>
          )}

          {activeTab === 'cert' && (
            <motion.div key="cert" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 px-4">
               <div className="relative inline-block mb-12">
                  <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />
                  <Award className="relative w-24 h-24 text-amber-500 mx-auto" />
               </div>
               <h3 className="text-4xl font-black mb-4 tracking-tight">شهادة الحضور</h3>
               <p className="text-brand-secondary/50 font-bold mb-12 max-w-xs mx-auto leading-relaxed">تهانينا! يمكنك الآن تحميل شهادة حضورك المعتمدة والموثقة رقمياً.</p>
               <Button 
                 variant="gold" 
                 className="w-full h-20 text-xl font-black gap-3 rounded-[35px] shadow-[0_20px_50px_rgba(245,158,11,0.2)]"
                 onClick={() => {
                   if(participant?.order_num) window.open(credentialService.getCertificateUrl(participant.order_num), '_blank');
                 }}
               >
                 <Download className="w-7 h-7" />
                 تحميل الشهادة المعتمدة
               </Button>
               <Button 
                 variant="outline" 
                 className="w-full h-16 text-lg font-black gap-3 rounded-[28px] mt-4 border-white/10 hover:bg-white/5"
                 onClick={() => {
                   if(participant?.order_num) window.open(credentialService.getBadgeUrl(participant.order_num), '_blank');
                 }}
               >
                 <Printer className="w-6 h-6" />
                 تحميل بطاقة الحضور (Badge)
               </Button>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div key="docs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black mb-8 text-center">مركز المستندات والملفات 📂</h3>
               
               {documents.length === 0 && (
                 <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/10">
                    <FileText className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 font-bold">لا توجد مستندات متاحة حالياً.</p>
                 </div>
               )}

               <div className="grid grid-cols-1 gap-4">
                 {documents.map((doc) => (
                   <div key={doc.id} className="bg-white/5 border border-white/10 rounded-[35px] p-6 flex items-center gap-6 group hover:bg-white/10 transition-all">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10 shrink-0">
                         <FileText className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-black text-lg mb-1 line-clamp-2 text-white" title={doc.title}>{doc.title}</h4>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] text-brand-secondary font-bold uppercase tracking-widest px-2 py-0.5 bg-brand-primary/10 rounded-md">
                               {doc.file_type || 'PDF'}
                            </span>
                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                               {doc.file_size || '---'}
                            </span>
                         </div>
                         {doc.description && <p className="text-white/40 text-xs mt-2 line-clamp-1">{doc.description}</p>}
                      </div>
                      <button 
                        onClick={() => window.open(getFullUrl(doc.file_url), '_blank')}
                        className="w-12 h-12 rounded-xl bg-amber-500 text-brand-dark flex items-center justify-center hover:scale-110 transition-all shadow-lg shrink-0"
                      >
                         <Download className="w-5 h-5" />
                      </button>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'polls' && (
             <motion.div key="polls" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-2xl font-black mb-8 text-center">استطلاعات الرأي النشطة 📊</h3>
                
                {polls.length === 0 && (
                  <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/10">
                     <BarChart2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
                     <p className="text-white/30 font-bold">لا توجد استطلاعات رأي نشطة في الوقت الحالي.</p>
                  </div>
                )}

                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl">
                     <h4 className="text-xl font-bold mb-8 text-brand-secondary">{poll.question}</h4>
                     
                     <div className="space-y-4">
                        {poll.options.map((opt) => {
                          const isVoted = votedPolls.includes(poll.id);
                          return (
                            <button
                              key={opt.id}
                              disabled={isVoted}
                              onClick={() => handleVote(poll.id, opt.id)}
                              className={cn(
                                "w-full p-6 rounded-[24px] text-right font-bold transition-all border flex justify-between items-center",
                                isVoted 
                                  ? "bg-brand-primary/10 border-brand-primary/20 text-brand-secondary opacity-50"
                                  : "bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-white/10 text-white"
                              )}
                            >
                               <span>{opt.text}</span>
                               {isVoted && <CheckCircle className="w-5 h-5" />}
                            </button>
                          );
                        })}
                     </div>
                     {votedPolls.includes(poll.id) && (
                       <p className="text-center mt-6 text-brand-secondary/50 text-sm font-bold">شكراً لمشاركتك!</p>
                     )}
                  </div>
                ))}
             </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="text-center mb-10">
                  <HelpCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                  <h3 className="text-3xl font-black">الأسئلة التفاعلية 💬</h3>
                  <p className="text-brand-secondary/50 font-bold mt-2">اطرح سؤالك على المنظمين أو المتحدثين للمناقشة المباشرة.</p>
               </div>
               {/* <AIConcierge eventId={eventId} participant={participant} /> */}
               
               <div className="mt-12 pt-10 border-t border-white/5">
                  <h4 className="text-sm font-black mb-6 uppercase tracking-widest text-brand-secondary/30">طرح سؤال على المنصة</h4>
                  
                  <div className="mb-4">
                     <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">اختر الجلسة الموجه لها السؤال</label>
                     <select 
                       value={selectedSessionId}
                       onChange={(e) => setSelectedSessionId(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-4 outline-none text-brand-secondary font-bold"
                     >
                       <option value="">عام (كل الجلسات)</option>
                       {agenda.map(session => (
                         <option key={session.id} value={session.id} className="bg-slate-900">{session.title}</option>
                       ))}
                     </select>
                   </div>

                  <textarea 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="سؤالك سيظهر للمنظمين مباشرة..." 
                    className="w-full bg-white/5 border border-white/10 rounded-[30px] p-6 text-lg font-bold min-h-[120px] outline-none focus:border-amber-500/50 transition-all"
                  />
                  <Button variant="gold" className="w-full h-16 rounded-[24px] mt-6 text-xl font-black gap-3" onClick={() => handleAskQuestion(selectedSessionId)}>
                     <Send className="w-6 h-6 ltr:rotate-0 rtl:rotate-180" />
                     إرسال السؤال
                  </Button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toaster للإشعارات */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(13,21,39,0.95)',
            color: '#F0F4F2',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontFamily: 'Cairo, sans-serif',
            fontSize: '14px',
            fontWeight: '700',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#38BDF8', secondary: '#050B18' } },
          error:   { iconTheme: { primary: '#F87171', secondary: '#050B18' } },
        }}
      />

      <nav
        className="fixed bottom-0 left-0 right-0 bg-[#050B18]/90 backdrop-blur-3xl border-t border-white/10 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
      >
        <div
          className="flex items-center gap-1 px-3 pt-3 pb-3 overflow-x-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl relative transition-all min-w-[60px]",
                activeTab === tab.id
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-white/30 hover:text-white/60"
              )}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-wide whitespace-nowrap">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-amber-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ParticipantPortal;
