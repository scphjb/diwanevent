import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Save, AlertCircle, Mail, User, Shield } from 'lucide-react';
import api from '../../services/api';

const CreateOrganizerModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    organization_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('auth/register', {
        ...formData,
        role: 'organizer'
      });
      onSuccess();
      onClose();
      setFormData({ email: '', password: '', full_name: '', organization_name: '' });
    } catch (err) {
      console.error("Error creating organizer:", err);
      setError(err.response?.data?.detail || "فشل في إنشاء حساب المنظم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-[#0A3D2B] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <UserPlus className="text-[#D4AF37]" size={24} />
                إضافة منظم جديد
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> الاسم الكامل
                </label>
                <input
                  required
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="محمد أحمد"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> البريد الإلكتروني
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="organizer@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={12} /> كلمة المرور
                </label>
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    اسم المنظمة (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
                  placeholder="مؤسسة ديوان للفعاليات"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-grow py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow py-4 bg-[#1DB58A] text-white font-black rounded-2xl hover:bg-[#1DB58A]/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1DB58A]/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      تأكيد الإضافة
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateOrganizerModal;
