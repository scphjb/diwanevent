import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Save, Plus, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const CreatePlanModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    max_events: 10,
    max_participants_per_event: 100,
    features: ['']
  });

  const handleAddFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const handleRemoveFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // تنظيف المميزات الفارغة
      const cleanedData = {
        ...formData,
        features: formData.features.filter(f => f.trim() !== '')
      };

      await api.post('super-admin/plans', cleanedData);
      onSuccess();
      onClose();
      // إعادة ضبط النموذج
      setFormData({
        name: '',
        price: 0,
        max_events: 10,
        max_participants_per_event: 100,
        features: ['']
      });
    } catch (err) {
      console.error("Error creating plan:", err);
      setError(err.response?.data?.detail || "فشل في إنشاء الباقة. تأكد من البيانات.");
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
            className="relative w-full max-w-2xl bg-[#0A3D2B] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-2xl font-black text-white">إنشاء باقة اشتراك جديدة</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">اسم الباقة</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="مثال: الباقة الذهبية"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">السعر (DA)</label>
                  <input
                    required
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">أقصى عدد للفعاليات</label>
                  <input
                    required
                    type="number"
                    value={formData.max_events}
                    onChange={(e) => setFormData({...formData, max_events: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">المشاركين لكل فعالية</label>
                  <input
                    required
                    type="number"
                    value={formData.max_participants_per_event}
                    onChange={(e) => setFormData({...formData, max_participants_per_event: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">المميزات</label>
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      placeholder="مثال: دعم فني 24/7"
                      className="flex-grow bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="p-4 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase"
                >
                  <Plus size={16} />
                  إضافة ميزة جديدة
                </button>
              </div>
            </form>

            <div className="p-8 border-t border-white/5 flex gap-4 bg-white/5">
              <button
                type="button"
                onClick={onClose}
                className="flex-grow py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-grow py-4 bg-[#D4AF37] text-[#022C22] font-black rounded-2xl hover:bg-[#D4AF37]/90 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#022C22]/20 border-t-[#022C22] rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    حفظ الباقة
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreatePlanModal;
