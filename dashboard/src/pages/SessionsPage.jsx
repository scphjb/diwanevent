import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  Search,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import agendaService from '../services/agendaService';
import api from '../services/api';
import { useEvent } from '../context/EventContext';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import Swal, { showSuccess, showError, showConfirm } from '../utils/swal';

/* ─────────────────────────── Session Card ─────────────────────────── */
const SessionCard = ({ session, idx, onEdit, onDelete, t }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="bg-white/5 border border-white/10 rounded-[32px] p-6 hover:bg-white/10 transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-2 h-full bg-blue-500" />
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-brand-secondary text-[10px] font-bold uppercase tracking-wider border border-brand-primary/20">
            {session.hall || t('sessions.main_hall', 'Main Hall')}
          </span>
          <span className="text-brand-secondary/30 text-xs flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {session.start_time} - {session.end_time}
          </span>
          {session.session_date && (
            <span className="text-brand-secondary/30 text-xs flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              {session.session_date}
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-white mb-4 group-hover:text-amber-500 transition-colors">
          {session.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-brand-secondary/60 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-500" />
            </div>
            {session.speaker_name || t('sessions.no_speaker', '—')}
          </div>
          <div className="flex items-center gap-2 text-brand-secondary/60 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-amber-500" />
            </div>
            {session.hall || t('sessions.no_location', '—')}
          </div>
        </div>
      </div>
      <div className="flex md:flex-col gap-2">
        <Button variant="outline" className="p-3 h-12 w-12 rounded-2xl text-amber-500 animate-pulse-slow hover:animate-none" onClick={(e) => { e.stopPropagation(); onEdit(session); }}>
          <Plus className="w-5 h-5 rotate-45 scale-125" />
        </Button>
        <Button variant="outline" className="p-3 h-12 w-12 rounded-2xl text-red-500" onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}>
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  </motion.div>
);

/* ──────────────── Reusable text input field ────────────────────────── */
/* ⚠️ مُعرَّف خارج SessionsPage تماماً لتجنب إعادة الإنشاء عند كل render */
const FormField = ({ label, name, type = 'text', required = false, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm text-brand-secondary/70 font-medium">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm outline-none focus:border-brand-primary/60 transition-all placeholder:text-white/20"
    />
  </div>
);

/* ─────────────────────── Add Session Modal ─────────────────────────── */
/* ⚠️ مُعرَّف خارج SessionsPage تماماً لتجنب إعادة الإنشاء عند كل render */
const EMPTY_FORM = {
  title: '',
  speaker_name: '',
  hall: '',
  start_time: '',
  end_time: '',
  session_date: '',
  description: '',
};

const SessionModal = ({ eventId, onClose, onSaved, initialData = null }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError(t('sessions.modal.form.title_required', 'عنوان الجلسة مطلوب')); return; }
    if (!form.start_time || !form.end_time) { setError(t('sessions.modal.form.times_required', 'وقت البداية والنهاية مطلوبان')); return; }

    setSaving(true);
    try {
      let result;
      if (initialData) {
        result = await agendaService.updateSession(eventId, initialData.id, form);
      } else {
        result = await agendaService.createSession(eventId, form);
      }
      onSaved(result);
      onClose();
    } catch (err) {
      setError(t('sessions.modal.form.save_error', 'فشل حفظ الجلسة. حاول مجدداً.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="modal-panel"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-lg bg-[#0D1527] border border-white/10 rounded-[28px] p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {initialData ? t('sessions.modal.edit_title', 'تعديل الجلسة') : t('sessions.modal.add_title', 'إضافة جلسة جديدة')}
              </h2>
              <p className="text-brand-secondary/40 text-sm mt-0.5">{t('sessions.modal.subtitle', 'أدخل تفاصيل الجلسة أدناه')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label={t('sessions.modal.form.title', 'عنوان الجلسة')}    name="title"        required value={form.title}        onChange={handleChange} />
            <FormField label={t('sessions.modal.form.speaker', 'اسم المتحدث')}     name="speaker_name"          value={form.speaker_name} onChange={handleChange} />
            <FormField label={t('sessions.modal.form.location', 'القاعة / المكان')} name="hall"                   value={form.hall}         onChange={handleChange} />

            <div className="grid grid-cols-2 gap-4">
              <FormField label={t('sessions.modal.form.start_time', 'وقت البداية')} name="start_time" type="time" required value={form.start_time} onChange={handleChange} />
              <FormField label={t('sessions.modal.form.end_time', 'وقت النهاية')} name="end_time"   type="time" required value={form.end_time}   onChange={handleChange} />
            </div>

            <FormField 
              label={t('sessions.modal.form.session_date', 'تاريخ الجلسة')} 
              name="session_date" 
              type="date" 
              value={form.session_date || ''} 
              onChange={handleChange} 
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-brand-secondary/70 font-medium">{t('sessions.modal.form.description', 'وصف الجلسة')}</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary/60 transition-all resize-none placeholder:text-white/20"
                placeholder={t('sessions.modal.form.description_placeholder', 'اختياري...')}
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('sessions.modal.form.saving', 'جاري الحفظ...')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {initialData ? t('sessions.modal.form.submit_edit', 'حفظ التعديلات') : t('sessions.modal.form.submit_add', 'إضافة الجلسة')}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ─────────────────────────── Main Page ────────────────────────────── */
const SessionsPage = () => {
  const { selectedEventId: eventId, searchQuery: search, setSearchQuery: setSearch } = useEvent();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const fetchSessions = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await agendaService.getSessions(eventId);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSaved = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleEdit = (session) => {
    setEditingSession(session);
    setShowModal(true);
  };

  const handleDelete = async (sessionId) => {
    try {
      const result = await showConfirm(
        t('sessions.delete_confirm_title', 'حذف الجلسة'),
        t('sessions.delete_confirm', "هل أنت متأكد من حذف هذه الجلسة؟")
      );
      
      if (result.isConfirmed) {
        Swal.showLoading();
        await api.delete(`sessions/${eventId}/${sessionId}`);
        fetchSessions();
        showSuccess(t('sessions.delete_success', 'تم حذف الجلسة بنجاح'));
      }
    } catch (err) {
      console.error("Delete session error:", err);
      showError(t('sessions.delete_error', "فشل حذف الجلسة"));
    }
  };

  const filtered = sessions.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.speaker_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout activePath="/dashboard/sessions">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('sessions.title', 'أجندة الفعالية')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t('sessions.subtitle', 'إدارة الجلسات وورش العمل ({{count}} جلسات مبرمجة)', { count: sessions.length })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex gap-1 mr-4">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 rounded-lg transition-all', view === 'grid' ? 'bg-brand-primary text-white' : 'text-brand-secondary/30')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-2 rounded-lg transition-all', view === 'list' ? 'bg-brand-primary text-white' : 'text-brand-secondary/30')}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="gold"
            className="flex items-center gap-2"
            onClick={() => { setEditingSession(null); setShowModal(true); }}
            disabled={!eventId}
          >
            <Plus className="w-4 h-4" />
            {t('sessions.add_session', 'إضافة جلسة جديدة')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8 relative max-w-xl">
        <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-secondary/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('sessions.search_placeholder', "ابحث عن جلسة أو متحدث...")}
          className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl ltr:pl-12 rtl:pr-12 text-white outline-none focus:border-brand-primary/50 transition-all"
        />
      </div>

      {/* No event selected */}
      {!eventId && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10">
          <Calendar className="w-16 h-16 text-brand-secondary/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">{t('sessions.no_event_selected', 'لم يتم اختيار فعالية')}</h3>
          <p className="text-brand-secondary/30 mt-2">{t('sessions.select_event_desc', 'يرجى اختيار فعالية أولاً من القائمة العلوية.')}</p>
        </div>
      )}

      {/* Session List */}
      {eventId && (
        <div className={cn('gap-6', view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col')}>
          {loading ? (
            <div className="flex justify-center py-20 col-span-2">
              <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((session, idx) => (
              <SessionCard 
                key={session.id} 
                session={session} 
                idx={idx} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                t={t}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10 col-span-2">
              <Calendar className="w-16 h-16 text-brand-secondary/10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white">
                {search ? t('sessions.no_results', 'لا توجد نتائج مطابقة') : t('sessions.no_sessions_yet', 'لا توجد جلسات مضافة بعد')}
              </h3>
              <p className="text-brand-secondary/30 mt-2">
                {search ? t('sessions.try_another', 'جرّب كلمة بحث أخرى.') : t('sessions.start_adding', 'ابدأ بإضافة جلسات الأجندة لفعاليتك.')}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-6 px-6 py-3 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 text-brand-secondary text-sm font-medium hover:bg-brand-primary/30 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('sessions.add_first', 'إضافة أول جلسة')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SessionModal
          eventId={eventId}
          initialData={editingSession}
          onClose={() => { setShowModal(false); setEditingSession(null); }}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
};

export default SessionsPage;
