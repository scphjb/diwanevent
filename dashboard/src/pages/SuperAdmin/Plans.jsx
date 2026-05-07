import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit3, Trash2, Check, X, DollarSign, Users, Calendar, Sparkles } from 'lucide-react';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ name: '', price: 0, max_events: 1, max_participants_per_event: 100, features: '' });
  const token = localStorage.getItem('diwan_token');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/v1/super-admin/plans', { headers });
      if (res.ok) setPlans(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      max_events: parseInt(form.max_events),
      max_participants_per_event: parseInt(form.max_participants_per_event),
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
    };

    const url = editingPlan ? `/api/v1/super-admin/plans/${editingPlan.id}` : '/api/v1/super-admin/plans';
    const method = editingPlan ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (res.ok) { fetchPlans(); resetForm(); }
    } catch (e) { console.error(e); }
  };

  const deletePlan = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
    try {
      const res = await fetch(`/api/v1/super-admin/plans/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (res.ok) fetchPlans();
      else alert(data.detail);
    } catch (e) { console.error(e); }
  };

  const startEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      price: plan.price,
      max_events: plan.max_events,
      max_participants_per_event: plan.max_participants_per_event,
      features: (plan.features || []).join(', '),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setForm({ name: '', price: 0, max_events: 1, max_participants_per_event: 100, features: '' });
  };

  const tierColors = {
    'free': 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
    'pro': 'from-brand-primary/20 to-amber-600/10 border-brand-primary/30',
    'enterprise': 'from-purple-500/20 to-indigo-600/10 border-purple-500/30',
  };

  const getTierColor = (name) => {
    const n = name.toLowerCase();
    if (n.includes('free') || n.includes('مجان')) return tierColors.free;
    if (n.includes('enterprise') || n.includes('مؤسس')) return tierColors.enterprise;
    return tierColors.pro;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Package className="text-brand-primary" /> إدارة الباقات
          </h1>
          <p className="text-brand-muted mt-1">إنشاء وتعديل باقات الاشتراك للمنظمين</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-2xl transition-all shadow-lg shadow-brand-primary/20">
          {showForm ? <><X size={18} /> إلغاء</> : <><Plus size={18} /> باقة جديدة</>}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <h3 className="text-lg font-black text-white mb-6">{editingPlan ? 'تعديل الباقة' : 'باقة جديدة'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'name', label: 'اسم الباقة', type: 'text', placeholder: 'Pro', icon: Package },
              { name: 'price', label: 'السعر (شهري)', type: 'number', placeholder: '29.99', icon: DollarSign },
              { name: 'max_events', label: 'عدد الفعاليات', type: 'number', placeholder: '10', icon: Calendar },
              { name: 'max_participants_per_event', label: 'حد المشاركين/فعالية', type: 'number', placeholder: '500', icon: Users },
            ].map(f => (
              <div key={f.name} className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{f.label}</label>
                <div className="relative">
                  <f.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type={f.type} value={form[f.name]} onChange={e => setForm({...form, [f.name]: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary"
                    placeholder={f.placeholder} required />
                </div>
              </div>
            ))}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">الميزات (مفصولة بفواصل)</label>
              <div className="relative">
                <Sparkles size={16} className="absolute left-4 top-4 text-white/20" />
                <textarea value={form.features} onChange={e => setForm({...form, features: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-primary h-20 resize-none"
                  placeholder="شارات, شهادات, تحليلات, جدار اجتماعي" />
              </div>
            </div>
            <div className="md:col-span-2">
              <button type="submit"
                className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-xl transition-all flex items-center gap-2">
                <Check size={18} /> {editingPlan ? 'حفظ التعديلات' : 'إنشاء الباقة'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-20"><div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <Package size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 font-bold">لا توجد باقات — أنشئ أول باقة الآن</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${getTierColor(plan.name)} border rounded-3xl p-8 relative group`}>
              <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(plan)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><Edit3 size={14} className="text-white" /></button>
                <button onClick={() => deletePlan(plan.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 size={14} className="text-red-400" /></button>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black text-brand-primary">${plan.price}</span>
                  <span className="text-white/30 text-sm font-bold">/شهر</span>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-white/70 text-sm"><Calendar size={14} className="text-brand-secondary" /><span>{plan.max_events} فعالية</span></div>
                <div className="flex items-center gap-3 text-white/70 text-sm"><Users size={14} className="text-brand-secondary" /><span>{plan.max_participants_per_event} مشارك/فعالية</span></div>
              </div>
              {plan.features && plan.features.length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-white/50 text-xs"><Check size={12} className="text-emerald-400" /><span>{f}</span></div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Plans;
