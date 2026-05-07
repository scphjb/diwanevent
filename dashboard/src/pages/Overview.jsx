import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  LayoutDashboard,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { cn } from '../utils/cn';

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
      <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black bg-emerald-400/10 px-2 py-1 rounded-lg uppercase tracking-wider">
        <TrendingUp className="w-3 h-3" />
        {trend}
      </div>
    </div>
    <div className="text-emerald-400/30 text-xs font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className="text-3xl font-black text-white">{value}</div>
  </motion.div>
);

const OverviewPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const eventId = 1;

  useEffect(() => {
    fetchData();
  }, []);

  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'checkin') {
      setData(prev => {
        if (!prev) return null;
        const newCheckedIn = prev.overview.checked_in + 1;
        return {
          ...prev,
          overview: {
            ...prev.overview,
            checked_in: newCheckedIn,
            pending: prev.overview.pending - 1,
            attendance_rate: Math.round((newCheckedIn / prev.overview.total_invited) * 100)
          }
        };
      });
    }
  });

  const fetchData = async () => {
    try {
      const summary = await api.get(`/analytics/${eventId}/summary`);
      const peaks = await api.get(`/analytics/${eventId}/peak-hours`);
      setData({ ...summary.data, peaks: peaks.data });
    } catch (err) {
      console.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-20 text-center text-emerald-400">جاري تحميل لوحة التحكم...</div></DashboardLayout>;
  if (!data) return <DashboardLayout><div className="p-20 text-center text-red-400">فشل في تحميل بيانات لوحة التحكم. يرجى التأكد من تشغيل الخادم.</div></DashboardLayout>;

  return (
    <DashboardLayout activePath="/dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            {t('dashboard.welcome', 'أهلاً بك في ديوان')} <span className="text-emerald-500">.</span>
          </h1>
          <p className="text-emerald-400/40 font-medium text-lg">
            {t('dashboard.overview_subtitle', 'إليك ملخص أداء الفعالية حتى اللحظة.')}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl">
          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Live Updates</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          icon={Users} 
          label="إجمالي المسجلين" 
          value={data.overview.total_invited} 
          trend="+12%" 
          color="bg-blue-600 shadow-blue-900/40"
          delay={0.1}
        />
        <StatCard 
          icon={UserCheck} 
          label="الموجودون بالقاعة" 
          value={data.overview.checked_in} 
          trend="+5%" 
          color="bg-emerald-600 shadow-emerald-900/40"
          delay={0.2}
        />
        <StatCard 
          icon={Clock} 
          label="الغائبون" 
          value={data.overview.pending} 
          trend="-2%" 
          color="bg-amber-600 shadow-amber-900/40"
          delay={0.3}
        />
        <StatCard 
          icon={TrendingUp} 
          label="نسبة الامتلاء" 
          value={`${data.overview.attendance_rate}%`} 
          trend="+8%" 
          color="bg-indigo-600 shadow-indigo-900/40"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Curve Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="text-emerald-500" />
              منحنى الحضور اللحظي
            </h3>
            <div className="flex gap-2">
               <div className="px-3 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 font-bold">بوابة 1</div>
               <div className="px-3 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 font-bold">بوابة 2</div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.peaks}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hour" stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#022C22', border: '1px solid #ffffff10', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center / Quick Status */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[40px] p-8 text-emerald-950 flex flex-col justify-between h-[200px] relative overflow-hidden shadow-2xl shadow-emerald-900/40">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6" />
                حالة القاعة
              </h3>
              <p className="text-emerald-950/70 font-bold">
                القاعة الرئيسية شارفت على الامتلاء.
              </p>
            </div>
            <div className="relative z-10 text-4xl font-black">
              {data.overview.attendance_rate}%
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              تنبيهات النظام
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="text-xs text-white/70">تمت مزامنة 12 ماسحاً ضوئياً بنجاح.</div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <div className="text-xs text-white/70">تم إرسال تقرير الصباح للمنظمين.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OverviewPage;
