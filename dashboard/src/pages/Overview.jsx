import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Coins,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';

const StatCard = ({ icon: Icon, label, value, trend, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white/5 border border-white/10 rounded-[32px] p-6 hover:bg-white/10 transition-all group backdrop-blur-md"
  >
    <div className="flex items-center justify-between mb-6">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl", color)}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-brand-secondary text-[10px] font-black bg-brand-secondary/10 px-2 py-1 rounded-lg uppercase tracking-wider">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
    <div className="text-brand-secondary/30 text-xs font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className="text-3xl font-black text-white">{value}</div>
  </motion.div>
);


const OverviewPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasEvents, setHasEvents] = useState(false);

  useEffect(() => {
    checkEventsAndFetch();
  }, [eventId]);

  const checkEventsAndFetch = async () => {
    setLoading(true);
    try {
      // التحقق من وجود فعاليات أولاً
      const eventsRes = await api.get('events/');
      const eventsExist = eventsRes.data && eventsRes.data.length > 0;
      setHasEvents(eventsExist);

      if (eventId && eventsExist) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to check events");
    } finally {
      setLoading(false);
    }
  };

  useAttendanceSocket(eventId, (message) => {
    if (!eventId) return;
    if (message.type === 'checkin') {
      setData(prev => {
        if (!prev) return null;
        const newCheckedIn = prev.overview.checked_in + 1;
        return {
          ...prev,
          overview: {
            ...prev.overview,
            checked_in: newCheckedIn,
            not_present: prev.overview.not_present - 1,
            attendance_rate: Math.round((newCheckedIn / prev.overview.total_invited) * 100)
          }
        };
      });
    }
  });

  const fetchData = async () => {
    try {
      const summary = await api.get(`analytics/${eventId}/summary`);
      const peaks = await api.get(`analytics/${eventId}/peak-hours`);
      setData({ ...summary.data, peaks: peaks.data });
    } catch (err) {
      console.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="p-20 text-center flex flex-col items-center gap-6 justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
        <div className="text-brand-secondary font-bold animate-pulse">{t('dashboard.loading_data', 'جاري تحضير لوحة التحكم...')}</div>
      </div>
    </DashboardLayout>
  );

  if (!hasEvents) return (
    <DashboardLayout>
      <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-primary/20">
            <Calendar className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-4xl font-black text-white mb-4">
            أهلاً بك في <span className="text-brand-primary font-black">ديوان</span>
          </h1>
          <p className="text-brand-secondary/60 text-lg mb-10 leading-relaxed">
            يبدو أنك لم تقم بإنشاء أي فعالية بعد. ابدأ الآن بإنشاء فعاليتك الأولى وقم بإدارة المشاركين وتتبع الحضور بكل سهولة.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => window.location.href = '/dashboard/events'}
              className="px-10 py-4 bg-brand-primary text-brand-dark font-black rounded-2xl hover:bg-brand-secondary hover:scale-105 transition-all shadow-xl shadow-brand-dark/40"
            >
              إنشاء فعالية جديدة
            </button>
            <div className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-brand-secondary/40 font-bold">
              <Coins className="w-5 h-5 text-[#D4AF37]" />
              <span>رصيدك الحالي: 50 اعتماد</span>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );

  if (!eventId) return (
    <DashboardLayout>
      <div className="p-20 text-center flex flex-col items-center gap-6 justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-brand-secondary">
          <Calendar className="w-8 h-8" />
        </div>
        <div className="text-brand-secondary/60 font-bold">{t('dashboard.select_event', 'يرجى اختيار فعالية من القائمة بالأعلى لعرض الإحصائيات.')}</div>
      </div>
    </DashboardLayout>
  );

  if (!data) return <DashboardLayout><div className="p-20 text-center text-red-400">{t('dashboard.no_data', 'لا توجد بيانات متاحة لهذه الفعالية حالياً.')}</div></DashboardLayout>;

  return (
    <DashboardLayout activePath="/dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            {t('dashboard.welcome', 'أهلاً بك في ديوان')} <span className="text-brand-primary">.</span>
          </h1>
          <p className="text-brand-secondary/40 font-medium text-lg">
            {t('dashboard.overview_subtitle', 'إليك ملخص أداء الفعالية حتى اللحظة.')}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl">
          <div className="px-4 py-2 bg-brand-primary/10 text-brand-secondary rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">{t('dashboard.live_updates', 'Live Updates')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <StatCard 
          icon={Users} 
          label={t('dashboard.stats.total_invited', 'إجمالي المسجلين')} 
          value={data.overview.total_invited} 
          color="bg-blue-600 shadow-blue-900/40"
          delay={0.1}
        />
        <StatCard 
          icon={UserCheck} 
          label={t('dashboard.stats.checked_in', 'الموجودون بالقاعة')} 
          value={data.overview.checked_in} 
          color="bg-brand-primary shadow-brand-dark/40"
          delay={0.2}
        />
        <StatCard 
          icon={Clock} 
          label={t('dashboard.stats.not_present', 'الغائبون')} 
          value={data.overview.not_present} 
          color="bg-amber-600 shadow-amber-900/40"
          delay={0.3}
        />
        <StatCard 
          icon={TrendingUp} 
          label={t('dashboard.stats.occupancy', 'نسبة الامتلاء')} 
          value={`${data.overview.occupancy_rate}%`} 
          color="bg-indigo-600 shadow-indigo-900/40"
          delay={0.4}
        />
        <StatCard 
          icon={Coins} 
          label={t('dashboard.stats.credits', 'رصيد الاعتمادات')} 
          value={data.overview.organizer_credits === 999999 ? '∞' : data.overview.organizer_credits} 
          color="bg-[#D4AF37] shadow-[#D4AF37]/40"
          delay={0.5}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Curve Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="text-brand-primary" />
              {t('dashboard.attendance_curve', 'منحنى الحضور اللحظي')}
            </h3>
            <div className="flex gap-2 items-center">
               <div className="px-3 py-1 rounded-lg bg-brand-primary/10 text-[10px] text-brand-secondary font-bold">{t('dashboard.capacity', 'السعة الإجمالية')}: {data.overview.hall_capacity}</div>
               <div className="w-px h-4 bg-white/10 mx-2" />
               {data.halls_occupancy?.map(h => (
                 <div key={h.name} className="px-3 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 font-bold flex gap-2 items-center">
                   <div className={cn("w-1.5 h-1.5 rounded-full", h.rate > 90 ? "bg-red-500" : h.rate > 70 ? "bg-amber-500" : "bg-brand-primary")} />
                   {h.name}: {h.count}/{h.capacity} ({h.rate}%)
                 </div>
               ))}
               <div className="w-px h-4 bg-white/10 mx-2" />
               {data.gates_distribution?.map(g => (
                 <div key={g.gate} className="px-3 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 font-bold">
                   {g.gate}: {g.count}
                 </div>
               ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.peaks}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A64EC" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2A64EC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hour" stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050B18', border: '1px solid #ffffff10', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ color: '#2A64EC', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="#2A64EC" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center / Quick Status */}
        <div className="space-y-6">
          <div className={cn(
            "rounded-[40px] p-8 text-brand-dark flex flex-col justify-between h-[200px] relative overflow-hidden shadow-2xl transition-all duration-500",
            data.overview.occupancy_rate > 80 ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-900/40" : "bg-gradient-to-br from-brand-primary to-brand-primary shadow-brand-dark/40"
          )}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6" />
                {t('dashboard.room_status', 'حالة القاعة')}
              </h3>
              <p className="text-brand-dark/70 font-bold">
                {data.overview.occupancy_rate > 90 ? t('dashboard.status_messages.full', 'القاعة مكتملة العدد تماماً.') : 
                 data.overview.occupancy_rate > 70 ? t('dashboard.status_messages.almost_full', 'القاعة شارفت على الامتلاء.') : 
                 data.overview.occupancy_rate > 40 ? t('dashboard.status_messages.good', 'حضور جيد ومستمر للقاعة.') : 
                 t('dashboard.status_messages.early', 'القاعة في بداية استقبال الحضور.')}
              </p>
            </div>
            <div className="relative z-10 text-4xl font-black">
              {data.overview.occupancy_rate}%
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              {t('dashboard.system_alerts', 'تنبيهات النظام')}
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-2 h-2 rounded-full bg-brand-primary" />
                <div className="text-xs text-white/70">
                  {t('dashboard.alerts.sync_success', 'تمت مزامنة بيانات {{count}} مشارك بنجاح.', { count: data.overview.total_invited })}
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className={cn("w-2 h-2 rounded-full", data.overview.checked_in > 0 ? "bg-brand-primary" : "bg-amber-500")} />
                <div className="text-xs text-white/70">
                  {data.overview.checked_in > 0 
                    ? t('dashboard.alerts.checked_in_count', 'تم تسجيل دخول {{count}} مشارك حتى الآن.', { count: data.overview.checked_in }) 
                    : t('dashboard.alerts.waiting_start', 'بانتظار بدء عمليات تسجيل دخول المشاركين.')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OverviewPage;
