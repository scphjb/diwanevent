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
  Users as NetworkingIcon,
  Shield,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Smartphone
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import agendaService from '../services/agendaService';
import interactionService from '../services/interactionService';
import credentialService from '../services/credentialService';
import participantService from '../services/participantService';
import AIConcierge from '../components/ai/AIConcierge';
import { cn } from '../utils/cn';

const ParticipantPortal = () => {
  const { eid, pid } = useParams();
  const eventId = eid;
  const participantId = pid;
  
  const [activeTab, setActiveTab] = useState('home');
  const [participant, setParticipant] = useState(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [agenda, setAgenda] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId && participantId) {
      fetchInitialData();
    }
  }, [eventId, participantId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const p = await participantService.getParticipant(participantId);
      setParticipant(p);
      
      const [ag, lead, dir] = await Promise.all([
        agendaService.getSessions(eventId),
        interactionService.getLeaderboard(eventId),
        participantService.getParticipants(eventId, { only_visible: true })
      ]);
      setAgenda(ag);
      setLeaderboard(lead);
      setDirectory(dir);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostToWall = async () => {
    if (!newPost.trim()) return;
    try {
      await interactionService.createPost({
        event_id: eventId,
        author_name: participant.full_name,
        content: newPost
      });
      setNewPost('');
      alert("تم إرسال المنشور للمراجعة بنجاح ✅");
    } catch (err) { alert("فشل النشر"); }
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      await interactionService.createQuestion({
        event_id: eventId,
        name: participant.full_name,
        text: newQuestion
      });
      setNewQuestion('');
      alert("تم إرسال سؤالك بنجاح ✅");
    } catch (err) { alert("فشل إرسال السؤال"); }
  };

  const handleOptInToggle = async () => {
    try {
      // Logic for networking visibility toggle
      setIsOptedIn(!isOptedIn);
      alert(isOptedIn ? "تم إخفاء ملفك الشخصي" : "أنت الآن مرئي للمشاركين");
    } catch (err) { alert("حدث خطأ"); }
  };

  const tabs = [
    { id: 'home', label: 'أنا', icon: User },
    { id: 'agenda', label: 'الجدول', icon: Calendar },
    { id: 'leaderboard', label: 'المتصدرون', icon: BarChart2 },
    { id: 'social', label: 'الحائط', icon: MessageSquare },
    { id: 'networking', label: 'التواصل', icon: NetworkingIcon },
    { id: 'cert', label: 'الشهادة', icon: Award },
    { id: 'ai', label: 'المساعد', icon: HelpCircle },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#022C22] flex items-center justify-center">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
    </div>
  );

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(participant?.qr_code || '')}`;

  return (
    <div className="min-h-screen bg-[#022C22] text-white selection:bg-amber-500 selection:text-emerald-950 flex flex-col font-arabic overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="p-6 bg-white/[0.03] backdrop-blur-3xl border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-emerald-950 shadow-xl">D</div>
          <div>
            <h1 className="font-black text-base tracking-tight leading-none uppercase">DIWAN <span className="text-amber-500">PORTAL</span></h1>
            <p className="text-[10px] text-emerald-400/50 font-bold uppercase tracking-widest mt-1">Digital Identity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black">ONLINE</div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-40 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
               <div className="bg-white/5 border border-white/10 rounded-[50px] p-10 backdrop-blur-3xl text-center relative overflow-hidden">
                  <div className="w-32 h-32 rounded-[40px] bg-emerald-600/20 mx-auto mb-8 flex items-center justify-center text-5xl font-black border-2 border-emerald-500/20 text-emerald-400 shadow-2xl">
                    {participant.full_name[0]}
                  </div>
                  <h2 className="text-4xl font-black mb-2 tracking-tight">{participant.full_name}</h2>
                  <p className="text-emerald-400/50 font-bold text-sm mb-12 uppercase tracking-widest">{participant.council}</p>
                  
                  <div className="relative inline-block group">
                    <div className="absolute -inset-10 bg-amber-500/20 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-white p-8 rounded-[45px] shadow-2xl">
                      <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-white/5 grid grid-cols-2 gap-8">
                     <div className="text-center">
                        <div className="text-[10px] text-emerald-400/30 font-black uppercase tracking-widest mb-1">المقعد</div>
                        <div className="font-black text-2xl text-white">{participant.seat_info || '--'}</div>
                     </div>
                     <div className="text-center">
                        <div className="text-[10px] text-emerald-400/30 font-black uppercase tracking-widest mb-1">التسجيل</div>
                        <div className="font-black text-2xl text-white">#{participant.order_num.split('-')[1]}</div>
                     </div>
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
                          <p className="text-emerald-400/50 text-xs font-bold">{item.speaker_name} • {item.hall}</p>
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
                            idx === 0 ? "bg-amber-500 text-emerald-950" : "bg-white/5 text-emerald-400"
                          )}>
                             {idx + 1}
                          </div>
                          <div>
                             <div className="font-black text-white">{p.name} {p.id === participant.id && "(أنت)"}</div>
                             <div className="text-[10px] text-emerald-400/30 font-bold uppercase tracking-widest">{p.points} نقطة</div>
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
               <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[45px] p-10 text-emerald-950">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-2xl font-black">شبكة التواصل</h3>
                     <NetworkingIcon className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-emerald-950/70 text-sm font-bold leading-relaxed mb-8">فعل ظهورك لتتمكن من تبادل الخبرات والتواصل مع الخبراء والمشاركين الآخرين.</p>
                  <button 
                    onClick={handleOptInToggle}
                    className={cn(
                      "w-full h-16 rounded-[24px] flex items-center justify-center gap-3 font-black transition-all shadow-xl",
                      isOptedIn ? "bg-emerald-950 text-white" : "bg-white/20 text-emerald-950 border border-white/20"
                    )}
                  >
                     {isOptedIn ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                     {isOptedIn ? "أنت مرئي الآن" : "تفعيل الظهور الميداني"}
                  </button>
               </div>

               <div className="space-y-3">
                  <h4 className="text-sm font-black text-emerald-400/30 uppercase tracking-[0.2em] mb-4">المشاركون المتاحون</h4>
                  {directory.map((p) => (
                    <div key={p.id} className="bg-white/5 border border-white/10 p-5 rounded-[30px] flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black border border-emerald-500/10">
                             {p.full_name[0]}
                          </div>
                          <div>
                             <div className="font-black text-white group-hover:text-amber-500 transition-colors">{p.full_name}</div>
                             <div className="text-[10px] text-emerald-400/30 font-bold uppercase tracking-widest">{p.council}</div>
                          </div>
                       </div>
                       <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 hover:bg-amber-500 hover:text-emerald-950 transition-all">
                          <LinkIcon className="w-5 h-5" />
                       </button>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'social' && (
            <motion.div key="social" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black">الحائط التفاعلي 💬</h3>
               <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl">
                  <textarea 
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="شاركنا انطباعك عن الفعالية..." 
                    className="w-full bg-transparent border-none outline-none text-xl font-bold placeholder:text-white/10 min-h-[180px] resize-none"
                  />
                  <div className="flex items-center justify-between pt-8 border-t border-white/5">
                     <button className="w-14 h-14 rounded-2xl bg-white/5 text-emerald-400 flex items-center justify-center border border-white/10">
                        <Camera className="w-6 h-6" />
                     </button>
                     <Button variant="gold" className="px-12 h-14 rounded-[20px] text-lg font-black shadow-lg" onClick={handlePostToWall}>نشر</Button>
                  </div>
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
               <p className="text-emerald-400/50 font-bold mb-12 max-w-xs mx-auto leading-relaxed">تهانينا! يمكنك الآن تحميل شهادة حضورك المعتمدة والموثقة رقمياً.</p>
               <Button 
                 variant="gold" 
                 className="w-full h-20 text-xl font-black gap-3 rounded-[35px] shadow-[0_20px_50px_rgba(245,158,11,0.2)]"
                 onClick={() => {
                   const id = String(participant?.id || '').replace(/[^a-zA-Z0-9-]/g, '');
                   if(id) window.open(credentialService.getCertificateUrl(id), '_blank');
                 }}
               >
                 <Download className="w-7 h-7" />
                 تحميل الـ PDF
               </Button>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="text-center mb-10">
                  <HelpCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                  <h3 className="text-3xl font-black">المساعد الذكي 🤖</h3>
                  <p className="text-emerald-400/50 font-bold mt-2">اسأل أي شيء حول الفعالية، المتحدثين، أو الخدمات.</p>
               </div>
               <AIConcierge eventId={eventId} participant={participant} />
               
               <div className="mt-12 pt-10 border-t border-white/5">
                  <h4 className="text-sm font-black mb-6 uppercase tracking-widest text-emerald-400/30">طرح سؤال على المنصة</h4>
                  <textarea 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="سؤالك سيظهر للمنظمين مباشرة..." 
                    className="w-full bg-white/5 border border-white/10 rounded-[30px] p-6 text-lg font-bold min-h-[120px] outline-none focus:border-amber-500/50 transition-all"
                  />
                  <Button variant="gold" className="w-full h-16 rounded-[24px] mt-6 text-xl font-black gap-3" onClick={handleAskQuestion}>
                     <Send className="w-6 h-6 ltr:rotate-0 rtl:rotate-180" />
                     إرسال السؤال
                  </Button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#022C22]/90 backdrop-blur-3xl border-t border-white/10 px-6 pt-4 pb-12 flex justify-around items-center z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-2 relative transition-all",
              activeTab === tab.id ? "text-amber-500 scale-110" : "text-emerald-400/30 hover:text-emerald-400"
            )}
          >
            {activeTab === tab.id && (
               <motion.div layoutId="nav-pill" className="absolute -inset-2 bg-amber-500/10 blur-xl rounded-full" />
            )}
            <tab.icon className="w-7 h-7" />
            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ParticipantPortal;
