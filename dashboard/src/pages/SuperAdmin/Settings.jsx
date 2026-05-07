import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Globe, Mail, CreditCard, Database, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const StatusBadge = ({ active, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
    active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
  }`}>
    {active ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
    {label}
  </span>
);

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('diwan_token');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/v1/super-admin/settings', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) setSettings(await res.json());
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  const sections = [
    {
      title: 'معلومات عامة',
      icon: Globe,
      color: 'text-blue-400',
      items: [
        { label: 'اسم المنصة', value: settings?.project_name },
        { label: 'نسخة الـ API', value: settings?.api_version },
        { label: 'النطاق', value: settings?.app_domain },
      ],
    },
    {
      title: 'CORS — النطاقات المسموحة',
      icon: Shield,
      color: 'text-amber-400',
      items: (settings?.allowed_origins || []).map((o, i) => ({ label: `النطاق ${i + 1}`, value: o })),
    },
    {
      title: 'البريد الإلكتروني (SMTP)',
      icon: Mail,
      color: 'text-emerald-400',
      items: [
        { label: 'الحالة', value: settings?.smtp_configured ? 'مُعدّ ✅' : 'غير مُعدّ ❌', highlight: settings?.smtp_configured },
      ],
    },
    {
      title: 'بوابات الدفع',
      icon: CreditCard,
      color: 'text-purple-400',
      items: [
        { label: 'Chargily Pay', value: settings?.chargily_configured ? 'مُفعّل' : 'غير مُفعّل', highlight: settings?.chargily_configured },
        { label: 'Stripe', value: settings?.stripe_configured ? 'مُفعّل' : 'غير مُفعّل', highlight: settings?.stripe_configured },
      ],
    },
    {
      title: 'قاعدة البيانات',
      icon: Database,
      color: 'text-cyan-400',
      items: [
        { label: 'حجم Pool', value: settings?.db_pool_size },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <SettingsIcon className="text-brand-primary" /> إعدادات المنصة
        </h1>
        <p className="text-brand-muted mt-1">عرض الإعدادات العامة للمنصة — يتم التعديل عبر ملف .env</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${section.color}`}>
                <section.icon size={20} />
              </div>
              <h3 className="text-lg font-black text-white">{section.title}</h3>
            </div>
            <div className="space-y-4">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white/40 font-bold">{item.label}</span>
                  {item.highlight !== undefined ? (
                    <StatusBadge active={item.highlight} label={item.value} />
                  ) : (
                    <span className="text-sm text-white font-bold font-mono">{item.value || '—'}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 text-center">
        <p className="text-amber-400/80 text-sm font-bold">
          💡 لتعديل هذه الإعدادات، قم بتحديث ملف <code className="bg-white/5 px-2 py-1 rounded-lg text-xs">.env</code> ثم أعد تشغيل الخادم
        </p>
      </div>
    </div>
  );
};

export default Settings;
