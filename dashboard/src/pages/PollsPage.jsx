import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  BarChart2, 
  Plus, 
  Trash2, 
  Play, 
  Square, 
  Users, 
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { cn } from '../utils/cn';

const PollsPage = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '']
  });
  const eventId = 1;

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const response = await api.get(`/polls/${eventId}/active`);
      // Note: Backend currently only returns active. We might need a full list.
      setPolls(response.data);
    } catch (err) {
      console.error("Failed to fetch polls");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!newPoll.question || newPoll.options.some(o => !o)) return;
    try {
      await api.post('/polls/', {
        event_id: eventId,
        question: newPoll.question,
        options: newPoll.options.map(o => ({ option_text: o }))
      });
      setShowAddModal(false);
      setNewPoll({ question: '', options: ['', ''] });
      fetchPolls();
    } catch (err) {
      alert("فشل إنشاء التصويت");
    }
  };

  const addOption = () => {
    setNewPoll(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (idx) => {
    if (newPoll.options.length <= 2) return;
    setNewPoll(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  };

  return (
    <DashboardLayout activePath="/dashboard/polls">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">استطلاعات الرأي</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            التفاعل المباشر مع الحضور عبر التصويت اللحظي
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          إنشاء تصويت جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {polls.map((poll, idx) => (
            <motion.div 
              key={poll.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-[32px] p-6 hover:bg-white/10 transition-all flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-6 flex-1">{poll.question}</h3>

              <div className="space-y-3 mb-8">
                {poll.options.map((opt, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold mb-1 px-1">
                      <span className="text-emerald-100/70">{opt.text}</span>
                      <span className="text-amber-500">0%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-0 transition-all duration-1000" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400/30 text-xs font-bold">
                  <Users className="w-4 h-4" />
                  <span>0 مشارك</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">نشط</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {polls.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10">
          <BarChart2 className="w-16 h-16 text-emerald-400/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">لا توجد تصويتات نشطة</h3>
          <p className="text-emerald-400/30 mt-2">ابدأ بإشراك جمهورك عبر إنشاء أول تصويت.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-emerald-950/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#022C22] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-8">إنشاء تصويت جديد</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">السؤال</label>
                <Input 
                  placeholder="اكتب سؤالك هنا..." 
                  value={newPoll.question} 
                  onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-bold text-emerald-100/50">الخيارات</label>
                {newPoll.options.map((opt, i) => (
                  <div key={i} className="flex gap-3">
                    <Input 
                      placeholder={`خيار ${i+1}`} 
                      value={opt} 
                      onChange={(e) => {
                        const next = [...newPoll.options];
                        next[i] = e.target.value;
                        setNewPoll(prev => ({ ...prev, options: next }));
                      }}
                    />
                    <button onClick={() => removeOption(i)} className="p-3 text-red-400/50 hover:text-red-400"><Trash2 className="w-5 h-5"/></button>
                  </div>
                ))}
                <button onClick={addOption} className="text-emerald-400 font-bold text-sm flex items-center gap-2 hover:text-emerald-300">
                  <Plus className="w-4 h-4" /> إضافة خيار
                </button>
              </div>
              <div className="flex gap-4 pt-6">
                <Button className="flex-1" variant="gold" onClick={handleCreatePoll}>نشر التصويت</Button>
                <Button className="flex-1" variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PollsPage;
