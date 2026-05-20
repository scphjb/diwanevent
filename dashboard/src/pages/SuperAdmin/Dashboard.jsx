import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  TrendingUp, 
  ArrowUpRight, 
  Activity,
  Globe,
  Database,
  Inbox
} from 'lucide-react';
import api from '../../services/api';
import CreatePlanModal from './CreatePlanModal';
import CreateOrganizerModal from './CreateOrganizerModal';
import { toast } from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, trend, color, loading }) => (
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
        {!loading && trend && (
          <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-full">
            <ArrowUpRight size={14} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <h3 className="text-[#F0F4F2]/60 text-sm font-bold mb-2 uppercase tracking-widest">{title}</h3>
      {loading ? (
        <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg" />
      ) : (
        <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
      )}
    </div>
  </motion.div>
);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    total_organizers: 0,
    total_events: 0,        // ← الـ backend يُرجع total_events وليس active_events
    total_participants: 0,
    active_subscriptions: 0,
    estimated_revenue: 0
  });
  const [recentOrganizers, setRecentOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, orgsRes] = await Promise.all([
        api.get('super-admin/stats'),
        api.get('super-admin/organizers')
      ]);
      
      setStats(statsRes.data);
      setRecentOrganizers(orgsRes.data.slice(0, 5)); // عرض آخر 5 منظمين فقط
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // BUG 4 FIX: أظهر رسالة خطأ واضحة بدلاً من صفحة فارغة
      const msg = error.response?.data?.detail || 'فشل تحميل البيانات — تحقق من تشغيل الـ migrations';
      toast.error(msg);
    } finally {
      setLoading(false); // ← finally يضمن تنفيذه دائماً
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleGenerateReport = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'جاري توليد تقرير الأداء...',
        success: 'تم تجهيز التقرير بنجاح! سيتم التحميل فوراً.',
        error: 'فشل في توليد التقرير.',
      }
    );
  };

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
        <StatCard title="إجمالي المنظمين" value={stats.total_organizers} icon={Users} trend="" color="[#D4AF37]" loading={loading} />
        <StatCard title="إجمالي الفعاليات" value={stats.total_events} icon={Calendar} trend="" color="[#1DB58A]" loading={loading} />
        <StatCard title="المشاركون الكلي" value={stats.total_participants} icon={UserCheck} trend="" color="[#D4AF37]" loading={loading} />
        <StatCard title="الاشتراكات النشطة" value={stats.active_subscriptions} icon={Activity} trend="" color="[#1DB58A]" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Recent Organizers List */}
        <div className="lg:col-span-2 bg-[#0A3D2B] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white">آخر المنظمين المنضمين</h3>
                <button className="text-sm font-bold text-[#D4AF37] hover:underline">عرض الكل</button>
            </div>

            <div className="space-y-6 min-h-[300px] flex flex-col justify-center">
                {recentOrganizers.length > 0 ? (
                    recentOrganizers.map((org, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#1DB58A]/20 flex items-center justify-center text-[#1DB58A] font-black text-lg">
                                    {/* FIX: backend يُرجع full_name وليس name */}
                                    {(org.full_name || org.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{org.full_name || org.email}</h4>
                                    <p className="text-xs text-[#F0F4F2]/40">{org.email}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-[#D4AF37]/20 text-[#D4AF37]">
                                    {org.plan}
                                </span>
                                {/* FIX: backend يُرجع event_count وليس events */}
                                <p className="text-[10px] text-[#F0F4F2]/30 mt-2 font-bold">{org.event_count ?? 0} فعالية منشأة</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center text-[#F0F4F2]/20 py-10">
                        <Inbox size={64} strokeWidth={1} className="mb-4" />
                        <p className="font-bold uppercase tracking-widest text-sm">لا يوجد منظمون منضمون حالياً</p>
                    </div>
                )}
            </div>
        </div>

        {/* Platform Health Sidebar */}
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1DB58A] to-[#0A3D2B] rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <Database size={32} className="text-[#D4AF37] mb-6" />
                    <h3 className="text-xl font-black mb-2">استهلاك الموارد</h3>
                    <p className="text-sm text-white/70 mb-8 leading-relaxed">قاعدة البيانات تعمل بكفاءة حالياً.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span>سعة التخزين</span>
                                <span>0%</span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: '0%' }} className="h-full bg-[#D4AF37]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span>استهلاك الـ API</span>
                                <span>0%</span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: '0%' }} className="h-full bg-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0A3D2B] border border-white/5 rounded-[2.5rem] p-10">
                <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest text-center">أوامر سريعة</h3>
                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={() => setIsOrgModalOpen(true)}
                        className="w-full py-4 bg-[#D4AF37] text-[#022C22] rounded-2xl transition-all font-bold text-sm text-center shadow-lg shadow-[#D4AF37]/10"
                    >
                        إضافة منظم جديد
                    </button>
                    <button 
                        onClick={() => setIsPlanModalOpen(true)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm text-center"
                    >
                        إنشاء باقة اشتراك جديدة
                    </button>
                    <button 
                        onClick={handleGenerateReport}
                        className="w-full py-4 bg-white/5 hover:bg-[#1DB58A] rounded-2xl transition-all font-bold text-sm text-center"
                    >
                        تقرير الأداء الشهري
                    </button>
                </div>
            </div>
        </div>

        <CreateOrganizerModal 
          isOpen={isOrgModalOpen}
          onClose={() => setIsOrgModalOpen(false)}
          onSuccess={() => {
            toast.success('تمت إضافة المنظم الجديد بنجاح');
            fetchDashboardData();
          }}
        />

        <CreatePlanModal 
          isOpen={isPlanModalOpen} 
          onClose={() => setIsPlanModalOpen(false)}
          onSuccess={() => {
            toast.success('تم إنشاء باقة الاشتراك الجديدة بنجاح');
            fetchDashboardData();
          }}
        />

      </div>
    </div>
  );
};

export default SuperAdminDashboard;
