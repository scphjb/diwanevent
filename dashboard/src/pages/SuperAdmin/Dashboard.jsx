import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  TrendingUp, 
  ArrowUpRight, 
  Activity,
  Globe,
  Database
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-[#0A3D2B] border border-white/5 rounded-[2rem] p-8 glass-card relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/10 blur-[60px] rounded-full group-hover:bg-${color}/20 transition-all`} />
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl bg-black/20 text-${color}`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-full">
          <ArrowUpRight size={14} />
          <span>{trend}</span>
        </div>
      </div>
      <h3 className="text-[#F0F4F2]/60 text-sm font-bold mb-2 uppercase tracking-widest">{title}</h3>
      <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
    </div>
  </motion.div>
);

const SuperAdminDashboard = () => {
  return (
    <div className="space-y-10">
      
      {/* Welcome Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">مرحباً بك، المدير العام</h1>
          <p className="text-[#F0F4F2]/50 text-lg">إليك حالة منصة "ديوان" في الوقت الفعلي اليوم.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-[#D4AF37] uppercase mb-1">حالة الخادم</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-white">متصل وجاهز</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي المنظمين" value="42" icon={Users} trend="+12%" color="[#D4AF37]" />
        <StatCard title="الفعاليات الجارية" value="128" icon={Calendar} trend="+8%" color="[#1A8A6A]" />
        <StatCard title="المشاركون الكلي" value="12,482" icon={UserCheck} trend="+15%" color="[#D4AF37]" />
        <StatCard title="الاشتراكات النشطة" value="38" icon={Activity} trend="+4%" color="[#1A8A6A]" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Recent Organizers List */}
        <div className="lg:col-span-2 bg-[#0A3D2B] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white">آخر المنظمين المنضمين</h3>
                <button className="text-sm font-bold text-[#D4AF37] hover:underline">عرض الكل</button>
            </div>

            <div className="space-y-6">
                {[
                    { name: 'مؤسسة الغرفة الشرقية', email: 'contact@chamber.sa', events: 12, plan: 'Enterprise' },
                    { name: 'جمعية المحضرين القضائيين', email: 'info@justice.dz', events: 5, plan: 'Professional' },
                    { name: 'جامعة العلوم والتقنية', email: 'admin@ust.edu.dz', events: 24, plan: 'Enterprise' },
                    { name: 'مركز التدريب الوطني', email: 'training@gov.dz', events: 3, plan: 'Standard' },
                ].map((org, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#1A8A6A]/20 flex items-center justify-center text-[#1A8A6A] font-black text-lg">
                                {org.name[0]}
                            </div>
                            <div>
                                <h4 className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{org.name}</h4>
                                <p className="text-xs text-[#F0F4F2]/40">{org.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                org.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-400' : 
                                org.plan === 'Professional' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 
                                'bg-blue-500/20 text-blue-400'
                            }`}>
                                {org.plan}
                            </span>
                            <p className="text-[10px] text-[#F0F4F2]/30 mt-2 font-bold">{org.events} فعالية منشأة</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Platform Health Sidebar */}
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1A8A6A] to-[#0A3D2B] rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <Database size={32} className="text-[#D4AF37] mb-6" />
                    <h3 className="text-xl font-black mb-2">استهلاك الموارد</h3>
                    <p className="text-sm text-white/70 mb-8 leading-relaxed">قاعدة البيانات تعمل بكفاءة 98% حالياً.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span>سعة التخزين</span>
                                <span>42%</span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: '42%' }} className="h-full bg-[#D4AF37]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span>استهلاك الـ API</span>
                                <span>65%</span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} className="h-full bg-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0A3D2B] border border-white/5 rounded-[2.5rem] p-10">
                <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest text-center">أوامر سريعة</h3>
                <div className="grid grid-cols-1 gap-3">
                    <button className="w-full py-4 bg-white/5 hover:bg-[#D4AF37] hover:text-[#022C22] rounded-2xl transition-all font-bold text-sm text-center">
                        إنشاء باقة اشتراك جديدة
                    </button>
                    <button className="w-full py-4 bg-white/5 hover:bg-[#1A8A6A] rounded-2xl transition-all font-bold text-sm text-center">
                        تقرير الأداء الشهري
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;
