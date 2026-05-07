import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Type, 
  Globe, 
  ShieldCheck, 
  Save,
  Image as ImageIcon,
  Check,
  CreditCard,
  Tv
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import eventService from '../services/eventService';
import api from '../services/api';
import { cn } from '../utils/cn';

const SettingsSection = ({ title, description, children, icon: Icon }) => (
  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 mb-8 backdrop-blur-md">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-emerald-400/30 text-sm">{description}</p>
      </div>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const eventId = 1;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await eventService.getEventSettings(eventId);
        setSettings(data);
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await eventService.updateEventSettings(eventId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("فشل حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <DashboardLayout><div className="p-20 text-center text-emerald-400">جاري تحميل الإعدادات...</div></DashboardLayout>;
  if (!settings) return <DashboardLayout><div className="p-20 text-center text-red-400">فشل في تحميل الإعدادات. يرجى التأكد من تشغيل الخادم.</div></DashboardLayout>;

  return (
    <DashboardLayout activePath="/dashboard/settings">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">إعدادات الفعالية</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            تخصيص الهوية والخيارات المتقدمة للنظام
          </p>
        </div>
        
        <Button 
          variant="gold" 
          className="flex items-center gap-2 h-14 px-8"
          onClick={handleSave}
          disabled={isSaving}
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ التغييرات'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-2">
          {[
            { id: 'general', label: 'الإعدادات العامة', icon: Globe },
            { id: 'design', label: 'الهوية البصرية', icon: Palette },
            { id: 'payments', label: 'الدفع والاشتراكات', icon: CreditCard },
            { id: 'welcome', label: 'شاشة الترحيب', icon: Tv },
            { id: 'labels', label: 'تخصيص المسميات', icon: Type },
            { id: 'advanced', label: 'إجراءات متقدمة', icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-right",
                activeTab === tab.id 
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30" 
                  : "text-emerald-400/40 hover:bg-white/5 hover:text-emerald-400"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-bold">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'general' && (
            <SettingsSection title="الإعدادات العامة" description="المعلومات الأساسية للفعالية." icon={Globe}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">اسم الفعالية</label>
                  <Input 
                    value={settings.event_name} 
                    onChange={(e) => handleChange('event_name', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">تاريخ الفعالية</label>
                  <Input 
                    type="date" 
                    value={settings.event_date} 
                    onChange={(e) => handleChange('event_date', e.target.value)} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-emerald-100/50">الموقع</label>
                  <Input 
                    value={settings.location} 
                    onChange={(e) => handleChange('location', e.target.value)} 
                  />
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'design' && (
            <SettingsSection title="الهوية البصرية" description="تخصيص الألوان والشعار." icon={Palette}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-emerald-100/50">الشعار (URL)</label>
                  <Input 
                    value={settings.logo_url} 
                    onChange={(e) => handleChange('logo_url', e.target.value)} 
                    placeholder="رابط صورة الشعار..."
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-emerald-100/50">اللون الأساسي</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer" 
                        value={settings.primary_color} 
                        onChange={(e) => handleChange('primary_color', e.target.value)} 
                      />
                      <Input value={settings.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'payments' && (
            <SettingsSection title="الدفع والاشتراكات" description="إعدادات بوابة الدفع وتذاكر الفعالية." icon={CreditCard}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl md:col-span-2">
                  <input 
                    type="checkbox" 
                    id="require_payment"
                    checked={settings.require_payment}
                    onChange={(e) => handleChange('require_payment', e.target.checked)}
                    className="w-5 h-5 accent-emerald-500"
                  />
                  <label htmlFor="require_payment" className="font-bold">تفعيل الدفع الإلزامي للتسجيل</label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">سعر التذكرة</label>
                  <Input 
                    type="number" 
                    value={settings.ticket_price} 
                    onChange={(e) => handleChange('ticket_price', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">العملة</label>
                  <Input 
                    value={settings.currency} 
                    onChange={(e) => handleChange('currency', e.target.value)} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-emerald-100/50">مفتاح API الخاص بـ Chargily Pay</label>
                  <Input 
                    type="password"
                    value={settings.chargily_api_key} 
                    onChange={(e) => handleChange('chargily_api_key', e.target.value)} 
                  />
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'welcome' && (
            <SettingsSection title="شاشة الترحيب" description="ما يظهر للضيوف عند مسح الكود أو الدخول للقاعة." icon={Tv}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">عنوان الترحيب</label>
                  <Input 
                    value={settings.welcome_title} 
                    onChange={(e) => handleChange('welcome_title', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">الوصف الفرعي</label>
                  <Input 
                    value={settings.welcome_subtitle} 
                    onChange={(e) => handleChange('welcome_subtitle', e.target.value)} 
                  />
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'labels' && (
            <SettingsSection title="تخصيص المسميات" description="تغيير مسميات الحقول." icon={Type}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'org_label_1', label: 'تسمية الحقل 1 (الجهة)' },
                  { id: 'org_label_2', label: 'تسمية الحقل 2 (القسم)' },
                  { id: 'org_label_3', label: 'تسمية الحقل 3 (الرتبة)' },
                  { id: 'org_label_4', label: 'تسمية الحقل 4 (الموقع)' },
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-bold text-emerald-100/50">{field.label}</label>
                    <Input 
                      value={settings[field.id]} 
                      onChange={(e) => handleChange(field.id, e.target.value)} 
                    />
                  </div>
                ))}
              </div>
            </SettingsSection>
          )}

          {activeTab === 'advanced' && (
            <SettingsSection title="إجراءات متقدمة" description="عمليات حساسة لإدارة حالة الفعالية." icon={ShieldCheck}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                   <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                     <Save className={cn("w-5 h-5", settings.list_frozen ? "text-blue-400" : "text-emerald-400")} />
                     تجميد القائمة
                   </h4>
                   <p className="text-emerald-400/30 text-sm mb-8">عند تجميد القائمة، لن يتمكن أحد من تسجيل حضور جديد أو تعديل البيانات.</p>
                   <Button 
                    variant={settings.list_frozen ? "outline" : "gold"} 
                    className="w-full h-14"
                    onClick={async () => {
                      try {
                        const res = await api.post(`/events/${eventId}/freeze`);
                        handleChange('list_frozen', res.data.is_frozen);
                      } catch(e) { alert("فشل تجميد القائمة"); }
                    }}
                   >
                     {settings.list_frozen ? 'إلغاء التجميد ❄️' : 'تجميد القائمة ❄️'}
                   </Button>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8">
                   <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                     <SettingsIcon className="w-5 h-5" />
                     تصفير الحضور
                   </h4>
                   <p className="text-red-400/30 text-sm mb-8">تحذير: سيتم مسح كافة سجلات الحضور وإعادتهم لحالة "غير حاضر".</p>
                   <Button 
                    variant="outline" 
                    className="w-full h-14 border-red-500/20 text-red-400 hover:bg-red-500/10"
                    onClick={async () => {
                      if(window.confirm("هل أنت متأكد من تصفير كافة سجلات الحضور؟ لا يمكن التراجع عن هذا الإجراء.")) {
                        try {
                          await api.post(`/events/${eventId}/reset-attendance`);
                          alert("تم تصفير السجلات بنجاح");
                        } catch(e) { alert("فشل تصفير السجلات"); }
                      }
                    }}
                   >
                     تصفير السجلات ⚠️
                   </Button>
                </div>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
