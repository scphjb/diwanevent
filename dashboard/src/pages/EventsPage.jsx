import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Users, 
  Settings, 
  ExternalLink,
  ChevronRight,
  Clock,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import eventService from '../services/eventService';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError, showConfirm } from '../utils/swal';

const EventsPage = () => {
  const { setSelectedEventId, selectedEventId } = useEvent();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', location: '', date: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('events/');
      setEvents(response.data);
    } catch (err) {
      console.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name) return;
    setLoading(true);
    try {
      console.log("Creating event with data:", newEvent);
      // BUG 1 FIX: أزلنا الـ / الأمامية لأنها تُلغي baseURL
      await api.post('events/', null, {
        params: { 
          name: newEvent.name, 
          location: newEvent.location, 
          date: newEvent.date 
        }
      });
      setShowAddModal(false);
      setNewEvent({ name: '', location: '', date: '' });
      await fetchEvents();
      showSuccess(t('events.create_success', 'تم إنشاء الفعالية بنجاح ✅'));
    } catch (err) {
      console.error("Creation error:", err.response?.data || err.message);
      showError(t('events.create_error', 'فشل إنشاء الفعالية: ') + (err.response?.data?.detail || "خطأ غير معروف"));
    } finally {
      setLoading(false);
    }
  };

  // BUG 2 FIX: handler لحذف الفعالية
  const handleDeleteEvent = async (eventId, eventName) => {
    const result = await showConfirm(
      t('events.delete_confirm_title', 'حذف الفعالية'),
      t('events.delete_confirm', `هل أنت متأكد من حذف فعالية "${eventName}"؟\nهذا الإجراء لا يمكن التراجع عنه.`, { name: eventName })
    );
    if (!result.isConfirmed) return;
    try {
      await eventService.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      // إذا كانت الفعالية المحذوفة هي المحددة حالياً:
      if (selectedEventId === eventId) setSelectedEventId(null);
    } catch (err) {
      alert(t('events.delete_error', 'فشل حذف الفعالية: ') + (err.response?.data?.detail || err.message));
    }
  };


  const handleSwitchEvent = (id) => {
    setSelectedEventId(id);
    navigate('/dashboard');
  };

  const handleSettings = (id) => {
    setSelectedEventId(id);
    navigate('/dashboard/settings');
  };

  return (
    <DashboardLayout activePath="/dashboard/events">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('events.title', 'فعالياتك')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t('events.subtitle', 'إدارة كافة المؤتمرات والفعاليات الخاصة بك')}
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          {t('events.create_new', 'إنشاء فعالية جديدة')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {events.map((event, idx) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-[40px] p-8 group hover:bg-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-secondary border border-brand-primary/20">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
                    {t('events.status_active', 'Active')}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-secondary transition-colors">
                  {event.event_name}
                </h3>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-brand-secondary/30 text-sm">
                    <MapPin className="w-4 h-4" />
                    {event.location || t('events.location_not_set', 'لم يتم تحديد الموقع')}
                  </div>
                  <div className="flex items-center gap-3 text-brand-secondary/30 text-sm">
                    <Clock className="w-4 h-4" />
                    {event.event_date || t('events.coming_soon', 'قريباً')}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  className="flex-1 h-12 rounded-xl" 
                  variant="gold"
                  onClick={() => handleSwitchEvent(event.id)}
                >
                  {t('events.enter', 'دخول')}
                </Button>
                <Button 
                  className="h-12 w-12 rounded-xl p-0" 
                  variant="outline"
                  onClick={() => handleSettings(event.id)}
                  title={t('common.settings')}
                >
                  <Settings className="w-5 h-5" />
                </Button>
                {/* BUG 2 FIX: زر الحذف */}
                <Button 
                  className="h-12 w-12 rounded-xl p-0 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-colors" 
                  variant="outline"
                  onClick={() => handleDeleteEvent(event.id, event.event_name)}
                  title={t('events.delete_title', 'حذف الفعالية')}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#050B18] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-8">{t('events.add_modal.title', 'إطلاق فعالية جديدة')}</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-secondary/50">{t('events.add_modal.name_label', 'عنوان الفعالية')}</label>
                <Input 
                  value={newEvent.name} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('events.add_modal.name_placeholder', 'مثلاً: المؤتمر الدولي للقضاء 2026')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-secondary/50">{t('events.add_modal.location_label', 'الموقع')}</label>
                <Input 
                  value={newEvent.location} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder={t('events.add_modal.location_placeholder', 'الجزائر العاصمة، فندق الأوراسي')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-secondary/50">{t('events.add_modal.date_label', 'التاريخ')}</label>
                <Input 
                  type="date"
                  value={newEvent.date} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1" variant="gold" onClick={handleCreateEvent}>{t('events.add_modal.submit', 'إنشاء الآن')}</Button>
                <Button className="flex-1" variant="outline" onClick={() => setShowAddModal(false)}>{t('common.cancel')}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EventsPage;
