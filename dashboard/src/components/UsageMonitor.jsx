import React from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, ShieldCheck, Clock, TrendingUp } from "lucide-react";

const data = [
  { time: '00:00', requests: 400 },
  { time: '04:00', requests: 300 },
  { time: '08:00', requests: 1200 },
  { time: '12:00', requests: 4500 },
  { time: '16:00', requests: 3800 },
  { time: '20:00', requests: 1500 },
  { time: '23:59', requests: 600 },
];

const UsageMonitor = () => {
  const { t } = useTranslation();

  const stats = [
    { label: t('dev_portal.monitor.total_requests', 'إجمالي الطلبات (24 ساعة)'), value: '184,290', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: t('dev_portal.monitor.avg_response', 'متوسط زمن الاستجابة'), value: '124ms', icon: Clock, color: 'text-brand-secondary', bg: 'bg-brand-primary/10' },
    { label: t('dev_portal.monitor.uptime', 'وقت التشغيل'), value: '99.99%', icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: t('dev_portal.monitor.peak_rps', 'ذروة الطلبات/ثانية'), value: '142', icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ icon: Icon, ...stat }) => (
          <div key={stat.label} className="bg-white/5 border border-white/5 p-8 rounded-[3rem] hover:bg-white/10 hover:border-white/10 transition-all duration-500 group">
            <div className={`p-5 rounded-[1.5rem] w-fit mb-6 transition-transform duration-500 group-hover:scale-110 ${stat.bg}`}>
              <Icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-2">{stat.label}</div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Usage Chart */}
      <div className="bg-white/5 border border-white/5 p-12 rounded-[4rem] relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h3 className="text-2xl font-black text-white mb-2">{t('dev_portal.monitor.chart_title', 'حركة مرور الـ API (آخر 24 ساعة)')}</h3>
            <p className="text-slate-400 font-medium">{t('dev_portal.monitor.chart_desc', 'مراقبة حية لأداء الطلبات وتوزيعها الزمني.')}</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-black/20 px-4 py-2 rounded-full border border-white/5">
              <div className="w-2.5 h-2.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> {t('dev_portal.monitor.successful', 'طلبات ناجحة')}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-black/20 px-4 py-2 rounded-full border border-white/5">
              <div className="w-2.5 h-2.5 bg-rose-500/50 rounded-full" /> {t('dev_portal.monitor.errors', 'أخطاء برمجية')}
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2A64EC" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2A64EC" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="time" stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
              <YAxis stroke="#ffffff20" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0f0d', border: '1px solid #ffffff10', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '20px' }}
                itemStyle={{ color: '#2A64EC', fontWeight: '900' }}
                cursor={{ stroke: '#2A64EC', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area type="monotone" dataKey="requests" stroke="#2A64EC" strokeWidth={4} fillOpacity={1} fill="url(#colorRequests)" animationDuration={2000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default UsageMonitor;
