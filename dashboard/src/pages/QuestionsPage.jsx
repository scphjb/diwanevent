import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  HelpCircle, 
  MessageSquare, 
  CheckCircle, 
  Pin, 
  Trash2,
  User,
  Clock,
  Send,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { cn } from '../utils/cn';
import useAttendanceSocket from '../hooks/useAttendanceSocket';

const QuestionsPage = ({ eventId = 1 }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Real-time listener for new questions
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'new_question') {
      setQuestions(prev => [message.question, ...prev]);
    }
  });

  useEffect(() => {
    fetchQuestions();
  }, [eventId]);

  const fetchQuestions = async () => {
    try {
      const response = await api.get(`/social/${eventId}/questions`);
      setQuestions(response.data || []);
    } catch (err) {
      console.error("Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAnswered = async (qId, status) => {
    try {
      await api.patch(`/social/questions/${qId}`, { answered: status });
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, answered: status } : q));
    } catch (err) {
      alert("فشل تحديث الحالة");
    }
  };

  const handleTogglePin = async (qId, status) => {
    try {
      await api.patch(`/social/questions/${qId}`, { pinned: status });
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, pinned: status } : q));
    } catch (err) {
      alert("فشل التثبيت");
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter === 'pending') return !q.answered;
    if (filter === 'answered') return q.answered;
    return true;
  });

  return (
    <DashboardLayout activePath="/dashboard/questions">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">الأسئلة والنقاشات</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            إدارة أسئلة الجمهور الموجهة للمتحدثين
          </p>
        </div>
        
        <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setFilter('all')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'all' ? "bg-emerald-500 text-emerald-950" : "text-emerald-400/50 hover:text-emerald-400")}
          >الكل</button>
          <button 
            onClick={() => setFilter('pending')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'pending' ? "bg-amber-500 text-amber-950" : "text-emerald-400/50 hover:text-emerald-400")}
          >بانتظار الإجابة</button>
          <button 
            onClick={() => setFilter('answered')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'answered' ? "bg-blue-500 text-white" : "text-emerald-400/50 hover:text-emerald-400")}
          >تمت الإجابة</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {filteredQuestions.map((q, idx) => (
            <motion.div 
              key={q.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white/5 border rounded-[32px] p-8 backdrop-blur-md transition-all",
                q.pinned ? "border-amber-500/30 bg-amber-500/5" : "border-white/10"
              )}
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                      {q.name?.[0] || '؟'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {q.name || 'مشارك مجهول'}
                        {q.pinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      </h3>
                      <div className="text-emerald-400/30 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(q.timestamp).toLocaleTimeString('ar-EG')}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xl text-emerald-100 font-medium leading-relaxed mb-6">
                    "{q.text}"
                  </p>

                  <div className="flex items-center gap-4 text-xs">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full font-bold",
                      q.answered ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    )}>
                      {q.answered ? 'تمت الإجابة' : 'بانتظار الإجابة'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-3">
                  <button 
                    onClick={() => handleToggleAnswered(q.id, !q.answered)}
                    className={cn(
                      "p-4 rounded-2xl transition-all",
                      q.answered ? "bg-emerald-500 text-emerald-950" : "bg-white/5 text-emerald-400/50 hover:bg-white/10"
                    )}
                    title={q.answered ? "وضع كغير مجاب" : "تحديد كمجاب"}
                  >
                    <CheckCircle className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleTogglePin(q.id, !q.pinned)}
                    className={cn(
                      "p-4 rounded-2xl transition-all",
                      q.pinned ? "bg-amber-500 text-amber-950" : "bg-white/5 text-amber-400/50 hover:bg-white/10"
                    )}
                    title={q.pinned ? "إلغاء التثبيت" : "تثبيت السؤال"}
                  >
                    <Pin className="w-6 h-6" />
                  </button>
                  <button className="p-4 rounded-2xl bg-white/5 text-red-400/30 hover:bg-red-500/10 hover:text-red-400 transition-all">
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredQuestions.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
          <MessageSquare className="w-16 h-16 text-emerald-400/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">لا توجد أسئلة في هذا التصنيف</h3>
          <p className="text-emerald-400/30 mt-2">تأكد من تفعيل ميزة الأسئلة في بوابة المشارك.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuestionsPage;
