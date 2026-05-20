import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Eye,
  Loader2,
  Coins
} from 'lucide-react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import CreateOrganizerModal from './CreateOrganizerModal';
import { toast } from 'react-hot-toast';
import { showSuccess, showError, showConfirm } from '../../utils/swal';
import Swal from '../../utils/swal';

const OrganizerManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);
  
  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get('super-admin/organizers');
      setOrganizers(response.data);
    } catch (err) {
      console.error("Failed to fetch organizers", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (orgId) => {
    setImpersonatingId(orgId);
    try {
      const response = await api.post(`super-admin/impersonate/${orgId}`);
      
      // حفظ التوكن الجديد وبيانات المستخدم المتقمص شخصيته
      localStorage.setItem('diwan_token', response.data.access_token);
      localStorage.setItem('diwan_refresh_token', response.data.refresh_token);
      localStorage.setItem('diwan_user', JSON.stringify(response.data.user));
      
      // مسح الفعالية المختارة السابقة لضمان بداية نظيفة للمنظم الجديد
      localStorage.removeItem('diwan_selected_event_id');
      
      // التوجيه للوحة تحكم المنظم
      window.location.href = '/dashboard';
    } catch (err) {
      console.error("Impersonation failed", err);
      alert("فشل الدخول كمنظم، يرجى المحاولة لاحقاً");
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleUpdateCredits = async (orgId, currentCredits) => {
    const { value: newCredits } = await Swal.fire({
      title: 'تحديث رصيد المنظم',
      input: 'number',
      inputLabel: 'أدخل عدد الاعتمادات الجديد',
      inputValue: currentCredits,
      background: '#022c22',
      color: '#fff',
      confirmButtonColor: '#10b981',
      confirmButtonText: 'تحديث',
      cancelButtonText: 'إلغاء',
      showCancelButton: true,
      customClass: {
        popup: 'rounded-[32px] border border-white/10 backdrop-blur-xl',
        input: 'bg-white/5 border-white/10 text-white rounded-xl'
      }
    });

    if (newCredits !== undefined) {
      try {
        await api.patch(`super-admin/organizers/${orgId}/credits`, { credits: parseInt(newCredits) });
        showSuccess("تم تحديث الرصيد بنجاح");
        fetchOrganizers();
      } catch (err) {
        showError("فشل تحديث الرصيد");
      }
    }
  };

  const handleDeactivate = async (orgId, currentStatus) => {
    const result = await showConfirm(
      currentStatus ? "تجميد الحساب" : "تفعيل الحساب",
      currentStatus ? "هل أنت متأكد من تجميد هذا الحساب؟ لن يتمكن المنظم من الدخول للوحة التحكم." : "هل أنت متأكد من تفعيل هذا الحساب؟"
    );
    if (!result.isConfirmed) return;
    try {
      await api.patch(`super-admin/organizers/${orgId}/status`, { is_active: !currentStatus });
      showSuccess(currentStatus ? "تم تجميد الحساب بنجاح" : "تم تفعيل الحساب بنجاح");
      fetchOrganizers();
    } catch (err) {
      showError("فشل تغيير حالة الحساب");
    }
  };

  const handleDelete = async (orgId) => {
    const result = await showConfirm(
      "حذف المنظم نهائياً",
      "تحذير: سيتم حذف المنظم وجميع بياناته وفعالياته بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه!"
    );
    if (!result.isConfirmed) return;
    try {
      await api.delete(`super-admin/organizers/${orgId}`);
      showSuccess("تم حذف المنظم بنجاح");
      fetchOrganizers();
    } catch (err) {
      showError("فشل حذف المنظم");
    }
  };

  const filteredOrganizers = organizers.filter(org => 
    org.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    org.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* Header with Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">إدارة المنظمين</h1>
          <p className="text-[#F0F4F2]/50 text-sm">تحكم في وصول المنظمين، مراقبة نشاطهم، وتعديل صلاحياتهم.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 bg-[#D4AF37] text-[#022C22] px-8 py-4 rounded-2xl font-black shadow-xl shadow-[#D4AF37]/20 hover:bg-[#F0C040] hover:scale-105 transition-all"
        >
          <UserPlus size={20} />
          <span>إضافة منظم جديد</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-[#0A3D2B] p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F0F4F2]/30" size={18} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-sm outline-none focus:border-[#D4AF37]/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 bg-white/5 px-6 py-3 rounded-xl text-sm font-bold border border-white/5 hover:bg-white/10 transition-all">
            <Filter size={16} />
            <span>تصفية</span>
          </button>
        </div>
      </div>

      {/* Organizers Table */}
      <div className="bg-[#0A3D2B] rounded-[2.5rem] border border-white/5">
        {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
                <p className="text-[#F0F4F2]/40 font-bold uppercase tracking-widest">جاري جلب المنظمين...</p>
            </div>
        ) : (
            <table className="w-full text-right">
            <thead>
                <tr className="bg-black/20 border-b border-white/5">
                    <th className="px-8 py-6 text-xs font-black text-[#F0F4F2]/40 uppercase tracking-widest">المنظم</th>
                    <th className="px-8 py-6 text-xs font-black text-[#F0F4F2]/40 uppercase tracking-widest text-center">الفعاليات</th>
                    <th className="px-8 py-6 text-xs font-black text-[#F0F4F2]/40 uppercase tracking-widest text-center">الرصيد</th>
                    <th className="px-8 py-6 text-xs font-black text-[#F0F4F2]/40 uppercase tracking-widest">الباقة</th>
                    <th className="px-8 py-6 text-xs font-black text-[#F0F4F2]/40 uppercase tracking-widest">الحالة</th>
                    <th className="px-8 py-6 text-xs font-black text-[#F0F4F2]/40 uppercase tracking-widest text-center">الإجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {filteredOrganizers.map((org) => (
                <tr key={org.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1DB58A] to-[#0A3D2B] flex items-center justify-center text-white font-black uppercase shadow-inner">
                        {org.full_name?.[0] || 'O'}
                        </div>
                        <div>
                        <div className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{org.full_name}</div>
                        <div className="text-xs text-[#F0F4F2]/30 flex items-center gap-1">
                            <Mail size={12} />
                            {org.email}
                        </div>
                        </div>
                    </div>
                    </td>
                    <td className="px-8 py-6 text-center font-bold text-white">{org.event_count || 0}</td>
                    <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-[#D4AF37]">{org.credits || 0}</span>
                            <span className="text-[10px] text-[#F0F4F2]/30">اعتماد</span>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                            org.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 
                            org.plan === 'Professional' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/20' : 
                            'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                        }`}>
                            {org.plan || 'Free'}
                        </span>
                    </td>
                    <td className="px-8 py-6">
                    {org.status ? (
                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                        <CheckCircle2 size={16} />
                        <span>نشط</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                        <ShieldAlert size={16} />
                        <span>معلق</span>
                        </div>
                    )}
                    </td>
                    <td className="px-8 py-6">
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => handleImpersonate(org.id)}
                            disabled={impersonatingId === org.id}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-emerald-500 hover:text-[#022C22] rounded-xl text-xs font-bold transition-all border border-white/10"
                        >
                        {impersonatingId === org.id ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Eye size={14} />
                        )}
                        <span>دخول كمنظم</span>
                        </button>
                        <button 
                            onClick={() => handleUpdateCredits(org.id, org.credits)}
                            className="p-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#022C22] rounded-xl transition-all border border-[#D4AF37]/20"
                            title="شحن رصيد"
                        >
                        <Coins size={16} />
                        </button>
                        <div className="relative">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === org.id ? null : org.id);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg text-[#F0F4F2]/40 hover:text-white transition-all"
                            >
                                <MoreHorizontal size={18} />
                            </button>
                            
                            <AnimatePresence>
                                {openMenuId === org.id && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute left-0 mt-2 w-48 bg-[#022C22] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                    >
                                        <div className="p-2 space-y-1">
                                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white text-xs font-bold rounded-xl transition-colors">
                                                <Calendar size={14} className="text-[#D4AF37]" />
                                                تعديل البيانات
                                            </button>
                                            <button 
                                                onClick={() => handleDeactivate(org.id, org.status)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-red-400 text-xs font-bold rounded-xl transition-colors"
                                            >
                                                <ShieldAlert size={14} />
                                                {org.status ? 'تجميد الحساب' : 'تفعيل الحساب'}
                                            </button>
                                            <div className="h-px bg-white/5 mx-2" />
                                            <button 
                                                onClick={() => handleDelete(org.id)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-500 text-xs font-bold rounded-xl transition-colors"
                                            >
                                                <XCircle size={14} />
                                                حذف المنظم
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
      </div>

      <CreateOrganizerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          toast.success('تمت إضافة المنظم الجديد بنجاح');
          fetchOrganizers();
        }}
      />
    </div>
  );
};

export default OrganizerManagement;
