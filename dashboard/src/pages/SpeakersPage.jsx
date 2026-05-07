import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Users, 
  Plus, 
  Trash2, 
  User as UserIcon,
  Mic,
  Briefcase,
  BookOpen,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { cn } from '../utils/cn';

const SpeakersPage = () => {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({
    name: '',
    title: '',
    bio: '',
    topic: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const eventId = 1;

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      const response = await api.get(`/speakers/${eventId}`);
      setSpeakers(response.data);
    } catch (err) {
      console.error("Failed to fetch speakers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpeaker = async () => {
    if (!newSpeaker.name) return;
    
    const formData = new FormData();
    formData.append('event_id', eventId);
    formData.append('name', newSpeaker.name);
    formData.append('title', newSpeaker.title);
    formData.append('bio', newSpeaker.bio);
    formData.append('topic', newSpeaker.topic);
    if (imageFile) formData.append('image', imageFile);

    try {
      await api.post('/speakers/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowAddModal(false);
      setNewSpeaker({ name: '', title: '', bio: '', topic: '' });
      setImageFile(null);
      fetchSpeakers();
    } catch (err) {
      alert("فشل إضافة المتحدث");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المتحدث؟")) return;
    try {
      await api.delete(`/speakers/${id}`);
      fetchSpeakers();
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/speakers">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">المتحدثون والخبراء</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <Mic className="w-4 h-4" />
            إدارة قائمة المتحدثين في الجلسات والورشات
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          إضافة متحدث
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {speakers.map((speaker, idx) => (
            <motion.div 
              key={speaker.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group hover:border-emerald-500/30 transition-all"
            >
              <div className="h-48 relative overflow-hidden bg-emerald-900/20">
                {speaker.image_url ? (
                  <img src={speaker.image_url} alt={speaker.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="w-16 h-16 text-emerald-400/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#022C22] to-transparent opacity-60" />
                <button 
                  onClick={() => handleDelete(speaker.id)}
                  className="absolute top-4 right-4 p-3 rounded-xl bg-red-500/10 text-red-500 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-8">
                <h3 className="text-xl font-bold text-white mb-1">{speaker.name}</h3>
                <div className="text-emerald-400/50 text-sm flex items-center gap-2 mb-4">
                  <Briefcase className="w-3 h-3" />
                  {speaker.title || 'متحدث رسمي'}
                </div>
                
                {speaker.topic && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
                    <div className="text-[10px] text-emerald-100/30 font-bold uppercase mb-1">الموضوع الرئيسي</div>
                    <div className="text-sm text-emerald-100/70 font-medium leading-relaxed">
                      {speaker.topic}
                    </div>
                  </div>
                )}

                {speaker.bio && (
                  <p className="text-emerald-100/30 text-xs line-clamp-2">
                    {speaker.bio}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {speakers.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10">
          <Mic className="w-16 h-16 text-emerald-400/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">لا يوجد متحدثون حالياً</h3>
          <p className="text-emerald-400/30 mt-2">ابدأ بإضافة أول متحدث للفعالية.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-emerald-950/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#022C22] border border-white/10 rounded-[40px] p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl font-bold text-white mb-8">إضافة متحدث جديد</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">الاسم الكامل</label>
                  <Input 
                    value={newSpeaker.name} 
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">المسمى الوظيفي</label>
                  <Input 
                    value={newSpeaker.title} 
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">موضوع المداخلة</label>
                  <Input 
                    value={newSpeaker.topic} 
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, topic: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">الصورة الشخصية</label>
                  <div 
                    className={cn(
                      "w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
                      imageFile ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                    onClick={() => document.getElementById('image-upload').click()}
                  >
                    {imageFile ? (
                      <div className="text-emerald-400 flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span className="font-bold">{imageFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-emerald-400/20 mb-2" />
                        <span className="text-xs text-emerald-400/30">اختر صورة المتحدث</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      id="image-upload" 
                      hidden 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">السيرة الذاتية (مختصرة)</label>
                  <textarea 
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 text-sm"
                    value={newSpeaker.bio}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, bio: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-10">
              <Button className="flex-1" variant="gold" onClick={handleCreateSpeaker}>إضافة المتحدث</Button>
              <Button className="flex-1" variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SpeakersPage;
