import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useEvent } from '../context/EventContext';

import interactionService from '../services/interactionService';

const QuestionsPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { t, i18n } = useTranslation();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [agenda, setAgenda] = useState([]);

  // Real-time listener for new questions
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'new_question_moderation') {
      setQuestions(prev => [message.question, ...prev]);
    }
  });

  useEffect(() => {
    fetchQuestions();
    fetchAgenda();
  }, [eventId]);

  const fetchQuestions = async () => {
    try {
      const data = await interactionService.getQuestions(eventId);
      setQuestions(data || []);
    } catch (err) {
      console.error("Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgenda = async () => {
    try {
      const data = await api.get(`sessions/?event_id=${eventId}`);
      setAgenda(Array.isArray(data.data) ? data.data : []);
    } catch (e) { console.error("Failed to fetch agenda"); }
  };

  const getSessionTitle = (sId) => {
    if (!sId) return t('questions.general', 'عام');
    const session = agenda.find(s => s.id === sId);
    return session ? session.title : t('questions.general', 'عام');
  };

  const handleTogglePin = async (qId, status) => {
    try {
      await interactionService.pinQuestion(qId, status);
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, pinned: status } : (status ? { ...q, pinned: false } : q)));
      showToast(status ? t('common.pinned', 'تم التثبيت') : t('common.unpinned', 'تم إلغاء التثبيت'));
    } catch (err) {
      showError(t('common.pin_error', 'فشل التثبيت'));
    }
  };

  const handleToggleAnswered = async (qId, status) => {
    try {
      await api.patch(`interaction/questions/${qId}/status`, { answered: status });
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, answered: status, pinned: false } : q));
      showToast(t('common.updated', 'تم التحديث'));
    } catch (err) {
      showError(t('common.update_error', 'فشل التحديث'));
    }
  };

  const handleDelete = async (qId) => {
    const result = await showConfirm(t('common.confirm_delete', 'هل أنت متأكد من الحذف؟'));
    if (!result.isConfirmed) return;
    try {
      await interactionService.deleteQuestion(qId);
      setQuestions(prev => prev.filter(q => q.id !== qId));
      showSuccess(t('common.delete_success', 'تم الحذف بنجاح'));
    } catch (err) {
      showError(t('common.delete_error', 'فشل الحذف'));
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter === 'pending') return !q.pinned && !q.answered;
    if (filter === 'pinned') return q.pinned;
    if (filter === 'answered') return q.answered;
    return true;
  });

  return (
    <DashboardLayout activePath="/dashboard/questions">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('questions.title', 'الأسئلة والنقاشات')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            {t('questions.subtitle', 'إدارة أسئلة الجمهور الموجهة للمتحدثين')}
          </p>
        </div>
        
        <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setFilter('all')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'all' ? "bg-brand-primary text-brand-dark" : "text-brand-secondary/50 hover:text-brand-secondary")}
          >{t('common.all', 'الكل')}</button>
          <button 
            onClick={() => setFilter('pending')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'pending' ? "bg-amber-500 text-amber-950" : "text-brand-secondary/50 hover:text-brand-secondary")}
          >{t('questions.tabs.pending', 'في الانتظار')}</button>
          <button 
            onClick={() => setFilter('pinned')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'pinned' ? "bg-blue-500 text-white" : "text-brand-secondary/50 hover:text-brand-secondary")}
          >{t('questions.tabs.pinned', 'معروض حالياً')}</button>
          <button 
            onClick={() => setFilter('answered')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", filter === 'answered' ? "bg-brand-primary text-brand-dark" : "text-brand-secondary/50 hover:text-brand-secondary")}
          >{t('questions.tabs.answered', 'تمت الإجابة')}</button>
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
                q.pinned ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.05)]" : 
                q.answered ? "border-brand-primary/20 opacity-60" : "border-white/10"
              )}
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-secondary font-bold border border-brand-primary/20">
                      {q.name?.[0] || '؟'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {q.name || t('questions.anonymous', 'مشارك مجهول')}
                        {q.pinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        {q.answered && <CheckCircle className="w-4 h-4 text-brand-primary" />}
                      </h3>
                      <div className="text-brand-secondary/30 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {q.timestamp ? new Date(q.timestamp).toLocaleTimeString() : t('common.now', 'الآن')}
                      </div>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-xl font-medium leading-relaxed mb-6",
                    q.answered ? "text-brand-secondary/40 italic line-through" : "text-brand-secondary"
                  )}>
                    "{q.text}"
                  </p>

                  <div className="flex items-center gap-4 text-xs">
                    <span className={cn(
                      "px-3 py-1.5 rounded-full font-bold",
                      q.pinned ? "bg-amber-500 text-amber-950" : 
                      q.answered ? "bg-brand-primary/10 text-brand-secondary" : "bg-white/5 text-brand-secondary/50"
                    )}>
                      {q.pinned ? t('questions.status.pinned', 'معروض الآن') : 
                       q.answered ? t('questions.status.answered', 'تمت الإجابة') : t('questions.status.pending', 'بانتظار العرض')}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-white/5 text-brand-secondary/50 font-bold border border-white/5">
                      الجلسة: {getSessionTitle(q.session_id)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-3">
                  {!q.answered && (
                    <button 
                      onClick={() => handleTogglePin(q.id, !q.pinned)}
                      className={cn(
                        "p-4 rounded-2xl transition-all",
                        q.pinned ? "bg-amber-500 text-amber-950" : "bg-white/5 text-brand-secondary/50 hover:bg-white/10"
                      )}
                      title={q.pinned ? t('questions.unpin', 'إلغاء التثبيت') : t('questions.pin', 'تثبيت السؤال')}
                    >
                      <Pin className={cn("w-6 h-6", q.pinned && "fill-current")} />
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleToggleAnswered(q.id, !q.answered)}
                    className={cn(
                      "p-4 rounded-2xl transition-all",
                      q.answered ? "bg-brand-primary text-brand-dark" : "bg-white/5 text-brand-secondary/50 hover:bg-white/10"
                    )}
                    title={q.answered ? t('questions.mark_unanswered', 'إعادة للانتظار') : t('questions.mark_answered', 'تحديد كمجاب')}
                  >
                    <CheckCircle className="w-6 h-6" />
                  </button>

                  <button 
                    onClick={() => handleDelete(q.id)}
                    className="p-4 rounded-2xl bg-white/5 text-red-400/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
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
          <MessageSquare className="w-16 h-16 text-brand-secondary/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">{t('questions.no_questions', 'لا توجد أسئلة حتى الآن')}</h3>
          <p className="text-brand-secondary/30 mt-2">{t('questions.activate_desc', 'تأكد من تفعيل ميزة الأسئلة في بوابة المشارك.')}</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuestionsPage;
