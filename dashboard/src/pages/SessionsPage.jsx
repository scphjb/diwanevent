import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import agendaService from '../services/agendaService';
import { cn } from '../utils/cn';

const SessionCard = ({ session, idx }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="bg-white/5 border border-white/10 rounded-[32px] p-6 hover:bg-white/10 transition-all group relative overflow-hidden"
  >
    {/* Status Indicator */}
    <div className={cn(
      "absolute top-0 right-0 w-2 h-full bg-blue-500"
    )} />

    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
            {session.hall || 'Main Hall'}
          </span>
          <span className="text-emerald-400/30 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.start_time} - {session.end_time}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-4 group-hover:text-amber-500 transition-colors">
          {session.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-emerald-100/60 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-500" />
            </div>
            {session.speaker_name}
          </div>
          <div className="flex items-center gap-2 text-emerald-100/60 text-sm">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-amber-500" />
            </div>
            {session.hall}
          </div>
        </div>
      </div>

      <div className="flex md:flex-col gap-2">
        <Button variant="outline" className="p-3 h-12 w-12 rounded-2xl">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
        <Button variant="primary" className="p-3 h-12 w-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  </motion.div>
);

const SessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [eventId] = useState(1);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await agendaService.getSessions(eventId);
        setSessions(data);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [eventId]);

  return (
    <DashboardLayout activePath="/dashboard/sessions">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">أجندة الفعالية</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            إدارة الجلسات وورش العمل ({sessions.length} جلسات مبرمجة)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex gap-1 mr-4">
            <button 
              onClick={() => setView('grid')}
              className={cn("p-2 rounded-lg transition-all", view === 'grid' ? "bg-emerald-600 text-white" : "text-emerald-400/30")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-emerald-600 text-white" : "text-emerald-400/30")}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <Button variant="gold" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة جلسة جديدة
          </Button>
        </div>
      </div>

      <div className="mb-8 relative max-w-xl">
        <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/30" />
        <input 
          type="text" 
          placeholder="ابحث عن جلسة أو متحدث..." 
          className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl ltr:pl-12 rtl:pr-12 text-white outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          </div>
        ) : sessions.length > 0 ? (
          sessions.map((session, idx) => (
            <SessionCard key={session.id} session={session} idx={idx} />
          ))
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10">
            <Calendar className="w-16 h-16 text-emerald-400/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">لا توجد جلسات مضافة بعد</h3>
            <p className="text-emerald-400/30 mt-2">ابدأ بإضافة جلسات الأجندة لفعاليتك.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SessionsPage;
