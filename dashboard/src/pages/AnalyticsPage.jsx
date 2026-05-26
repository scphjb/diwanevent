import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  BarChart2, 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp,
  Download,
  Filter,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';

const AnalyticsPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [eventId]);

  const fetchStats = async () => {
    if (!eventId) return;
    try {
      const summary = await api.get(`analytics/${eventId}/summary`);
      const peaks = await api.get(`analytics/${eventId}/peak-hours`);
      setData({ ...summary.data, peaks: peaks.data });
    } catch (err) {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  if (!eventId) {
    return (
      <DashboardLayout activePath="/dashboard/stats">
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[32px] p-10 max-w-3xl mx-auto backdrop-blur-md">
          <BarChart2 className="w-16 h-16 text-brand-secondary/20 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">{t('analytics.no_event_selected', 'لم يتم اختيار فعالية')}</h3>
          <p className="text-brand-secondary/30 text-sm max-w-md mx-auto">{t('analytics.no_event_selected_desc', 'يرجى اختيار فعالية نشطة أو إنشاء فعالية جديدة لعرض إحصائيات الحضور والتقارير.')}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout><div className="p-20 text-center text-brand-secondary">{t('analytics.loading', 'جاري تحليل البيانات...')}</div></DashboardLayout>;
  if (!data) return <DashboardLayout><div className="p-20 text-center text-red-400">{t('analytics.load_error', 'فشل في تحميل التحليلات.')}</div></DashboardLayout>;

  const COLORS = ['#2A64EC', '#f59e0b', '#3b82f6', '#ef4444'];

  return (
    <DashboardLayout activePath="/dashboard/stats">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('analytics.title', 'مركز التحليلات')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('analytics.subtitle', 'تحليل حي لأداء الفعالية ومعدلات الحضور')}
          </p>
        </div>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t('analytics.export_btn', 'تصدير التقرير النهائي')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: t('analytics.stats.total_invited', 'إجمالي المسجلين'), value: data.overview.total_invited, icon: Users, color: 'text-blue-400' },
          { label: t('analytics.stats.checked_in', 'تم تسجيل دخولهم'), value: data.overview.checked_in, icon: UserCheck, color: 'text-brand-secondary' },
          { label: t('analytics.stats.attendance_rate', 'نسبة الحضور'), value: `${data.overview.attendance_rate}%`, icon: TrendingUp, color: 'text-amber-400' },
          { label: t('analytics.stats.pending', 'بانتظار الوصول'), value: data.overview.not_present, icon: Clock, color: 'text-slate-400' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
            <div className="text-brand-secondary/30 text-sm font-bold uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Attendance Peak Chart */}
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
            <Clock className="text-amber-500" />
            {t('analytics.peak_title', 'ذروة الحضور خلال اليوم')}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.peaks}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A64EC" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2A64EC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hour" stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050B18', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  itemStyle={{ color: '#2A64EC' }}
                />
                <Area type="monotone" dataKey="count" stroke="#2A64EC" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Organizations Distribution */}
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
            <PieChartIcon className="text-blue-500" />
            {t('analytics.councils_title', 'توزيع الحضور حسب الجهات')}
          </h3>
          <div className="h-[300px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.councils_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total"
                >
                  {data.councils_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#050B18', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/2 space-y-4">
              {data.councils_distribution.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-brand-secondary/70 truncate max-w-[120px]">{c.name}</span>
                  </div>
                  <span className="font-bold text-white">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
