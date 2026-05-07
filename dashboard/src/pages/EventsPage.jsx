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
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { cn } from '../utils/cn';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', location: '', date: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events/');
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
      await api.post('/events/', null, {
        params: { 
          name: newEvent.name, 
          location: newEvent.location, 
          date: newEvent.date 
        }
      });
      setShowAddModal(false);
      setNewEvent({ name: '', location: '', date: '' });
      await fetchEvents();
      alert("تم إنشاء الفعالية بنجاح ✅");
    } catch (err) {
      console.error("Creation error:", err.response?.data || err.message);
      alert("فشل إنشاء الفعالية: " + (err.response?.data?.detail || "خطأ غير معروف"));
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchEvent = (id) => {
    // In a real app, this would update a context or localStorage
    localStorage.setItem('current_event_id', id);
    window.location.href = '/dashboard';
  };

  return (
    <DashboardLayout activePath="/dashboard/events">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">فعالياتك</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            إدارة كافة المؤتمرات والفعاليات الخاصة بك
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          إنشاء فعالية جديدة
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
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {event.event_name}
                </h3>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-emerald-400/30 text-sm">
                    <MapPin className="w-4 h-4" />
                    {event.location || 'لم يتم تحديد الموقع'}
                  </div>
                  <div className="flex items-center gap-3 text-emerald-400/30 text-sm">
                    <Clock className="w-4 h-4" />
                    {event.event_date || 'قريباً'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  className="flex-1 h-12 rounded-xl" 
                  variant="gold"
                  onClick={() => handleSwitchEvent(event.id)}
                >
                  دخول
                </Button>
                <Button className="h-12 w-12 rounded-xl p-0" variant="outline">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-emerald-950/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#022C22] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-8">إطلاق فعالية جديدة</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">عنوان الفعالية</label>
                <Input 
                  value={newEvent.name} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثلاً: المؤتمر الدولي للقضاء 2026"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">الموقع</label>
                <Input 
                  value={newEvent.location} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="الجزائر العاصمة، فندق الأوراسي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">التاريخ</label>
                <Input 
                  type="date"
                  value={newEvent.date} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1" variant="gold" onClick={handleCreateEvent}>إنشاء الآن</Button>
                <Button className="flex-1" variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EventsPage;
