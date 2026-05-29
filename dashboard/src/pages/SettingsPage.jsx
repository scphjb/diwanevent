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
  Tv,
  ListPlus,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  BarChart2,
  MessageSquare,
  Users,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import eventService from '../services/eventService';
import api from '../services/api';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';
import PushNotificationManager from '../components/pwa/PushNotificationManager';
import { Bell } from 'lucide-react';
import { getImageUrl } from '../utils/image';

const SettingsSection = ({ title, description, children, icon: Icon }) => (
  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 mb-8 backdrop-blur-md">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
        <Icon className="w-6 h-6 text-brand-secondary" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-brand-secondary/30 text-sm">{description}</p>
      </div>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

const SettingsPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [halls, setHalls] = useState([]);
  const [newHall, setNewHall] = useState({ name: '', capacity: 100 });
  const [loading, setLoading] = useState(true);
  const { selectedEventId: eventId } = useEvent();

  // State for new field
  const [newField, setNewField] = useState({
    display_label: '',
    field_type: 'text',
    is_required: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, fieldsData, hallsData] = await Promise.all([
          eventService.getEventSettings(eventId),
          api.get(`events/${eventId}/registration-fields`),
          api.get(`events/${eventId}/halls`)
        ]);
        setSettings(settingsData);
        setCustomFields(fieldsData.data);
        setHalls(hallsData.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await eventService.updateEventSettings(eventId, settings);
      setSaved(true);
      showToast(t('settings.save_success', 'تم حفظ الإعدادات بنجاح'));
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showError(t('settings.save_error', "فشل حفظ الإعدادات"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAddField = async () => {
    if (!newField.display_label) return;
    try {
      const field_name = `custom_${Math.random().toString(36).substr(2, 9)}`;
      const res = await api.post(`events/${eventId}/registration-fields`, {
        ...newField,
        field_name
      });
      setCustomFields([...customFields, res.data]);
      setNewField({ display_label: '', field_type: 'text', is_required: false });
      showToast(t('settings.registration.add_success', 'تم إضافة الحقل'));
    } catch (err) {
      showError(t('settings.registration.add_error', "فشل إضافة الحقل"));
    }
  };

  const handleDeleteField = async (fieldId) => {
    const result = await showConfirm(
      t('settings.registration.delete_confirm', "هل أنت متأكد من حذف هذا الحقل؟"),
      t('settings.registration.delete_desc', "سيؤدي هذا لحذف البيانات المرتبطة بهذا الحقل لجميع المشاركين.")
    );
    if (!result.isConfirmed) return;
    try {
      await api.delete(`events/${eventId}/registration-fields/${fieldId}`);
      setCustomFields(customFields.filter(f => f.id !== fieldId));
      showToast(t('settings.registration.delete_success', 'تم حذف الحقل'));
    } catch (err) {
      showError(t('settings.registration.delete_error', "فشل حذف الحقل"));
    }
  };

  const handleAddHall = async () => {
    if (!newHall.name) return;
    try {
      const res = await api.post(`events/${eventId}/halls`, newHall);
      setHalls([...halls, res.data]);
      setNewHall({ name: '', capacity: 100 });
      showToast(t('settings.halls.add_success', 'تم إضافة القاعة'));
    } catch (err) {
      showError(t('settings.halls.add_error', "فشل إضافة القاعة"));
    }
  };

  const handleDeleteHall = async (hallId) => {
    const result = await showConfirm(
      t('settings.halls.delete_confirm', "هل أنت متأكد من حذف هذه القاعة؟")
    );
    if (!result.isConfirmed) return;
    try {
      await api.delete(`events/${eventId}/halls/${hallId}`);
      setHalls(halls.filter(h => h.id !== hallId));
      showToast(t('settings.halls.delete_success', 'تم حذف القاعة'));
    } catch (err) {
      showError(t('settings.halls.delete_error', "فشل حذف القاعة"));
    }
  };

  if (loading) return <DashboardLayout><div className="p-20 text-center text-brand-secondary">{t('settings.loading', 'جاري تحميل الإعدادات...')}</div></DashboardLayout>;
  if (!settings) return <DashboardLayout><div className="p-20 text-center text-red-400">{t('settings.load_error', 'فشل في تحميل الإعدادات.')}</div></DashboardLayout>;

  return (
    <DashboardLayout activePath="/dashboard/settings">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('settings.title', 'إعدادات الفعالية')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            {t('settings.subtitle', 'تخصيص الهوية والخيارات المتقدمة للنظام')}
          </p>
        </div>
        
        <Button 
          variant="gold" 
          className="flex items-center gap-2 h-14 px-8"
          onClick={handleSave}
          disabled={isSaving}
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {isSaving ? t('settings.saving', 'جاري الحفظ...') : saved ? t('settings.saved', 'تم الحفظ') : t('settings.save_changes', 'حفظ التغييرات')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-2">
          {[
            { id: 'general', label: t('settings.tabs.general', 'الإعدادات العامة'), icon: Globe },
            { id: 'portal', label: t('settings.tabs.portal', 'مميزات البوابة'), icon: ListPlus },
            { id: 'design', label: t('settings.tabs.design', 'الهوية البصرية'), icon: Palette },
            { id: 'registration', label: t('settings.tabs.registration', 'نموذج التسجيل'), icon: ListPlus },
            { id: 'payments', label: t('settings.tabs.payments', 'الدفع والاشتراكات'), icon: CreditCard },
            { id: 'halls', label: t('settings.tabs.halls', 'إدارة القاعات'), icon: Tv },
            { id: 'welcome', label: t('settings.tabs.welcome', 'شاشة الترحيب'), icon: Tv },
            { id: 'labels', label: t('settings.tabs.labels', 'تخصيص المسميات'), icon: Type },
            { id: 'pwa', label: 'التطبيق والإشعارات', icon: Bell },
            { id: 'advanced', label: t('settings.tabs.advanced', 'إجراءات متقدمة'), icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-right",
                activeTab === tab.id 
                  ? "bg-brand-primary/20 text-brand-secondary border border-brand-primary/30" 
                  : "text-brand-secondary/40 hover:bg-white/5 hover:text-brand-secondary"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-bold">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'general' && (
                <SettingsSection title={t('settings.general.title', 'الإعدادات العامة')} description={t('settings.general.desc', 'المعلومات الأساسية للفعالية.')} icon={Globe}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.general.event_name', 'اسم الفعالية')}</label>
                      <Input value={settings.event_name} onChange={(e) => handleChange('event_name', e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 bg-brand-primary/10 p-4 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="registration_enabled"
                        checked={settings.registration_enabled}
                        onChange={(e) => handleChange('registration_enabled', e.target.checked)}
                        className="w-5 h-5 accent-brand-primary"
                      />
                      <label htmlFor="registration_enabled" className="font-bold text-brand-secondary">{t('settings.general.registration_enabled', 'فتح باب التسجيل للجمهور')}</label>
                    </div>
                     <div className="flex items-center gap-3 bg-brand-primary/10 p-4 rounded-2xl">
                       <input 
                         type="checkbox" 
                         id="verify_email_on_register"
                         checked={settings.verify_email_on_register || false}
                         onChange={(e) => handleChange('verify_email_on_register', e.target.checked)}
                         className="w-5 h-5 accent-brand-primary"
                       />
                       <label htmlFor="verify_email_on_register" className="font-bold text-brand-secondary">التحقق الصارم من البريد (إرسال OTP للتفعيل أثناء التسجيل)</label>
                     </div>
                    <div className="flex items-center gap-3 bg-amber-500/10 p-4 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="is_public"
                        checked={settings.is_public !== false}
                        onChange={(e) => handleChange('is_public', e.target.checked)}
                        className="w-5 h-5 accent-amber-500"
                      />
                      <label htmlFor="is_public" className="font-bold text-amber-400">عرض الفعالية في الدليل العام (صفحة الهبوط)</label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.general.max_registration', 'الحد الأقصى للمسجلين (0 تعني غير محدود)')}</label>
                      <Input 
                        type="number" 
                        value={settings.total_invited} 
                        onChange={(e) => handleChange('total_invited', parseInt(e.target.value) || 0)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.general.event_date', 'تاريخ الفعالية')}</label>
                      <Input type="date" value={settings.event_date} onChange={(e) => handleChange('event_date', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.general.language', 'لغة النظام والبطاقات')}</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 outline-none text-brand-secondary font-bold"
                        value={settings.language || 'ar'}
                        onChange={(e) => handleChange('language', e.target.value)}
                      >
                        <option value="ar" className="bg-slate-900">العربية (Arabic)</option>
                        <option value="en" className="bg-slate-900">الإنجليزية (English)</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.general.organizer_text', 'الجهات المنظمة / العناوين الرئيسية (سطر لكل جهة)')}</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none text-brand-secondary font-bold min-h-[120px]"
                        value={settings.organizer_text || ''} 
                        placeholder="وزارة العدل&#10;الغرفة الوطنية للمحضرين القضائيين"
                        onChange={(e) => handleChange('organizer_text', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.general.location', 'الموقع')}</label>
                      <Input value={settings.location} onChange={(e) => handleChange('location', e.target.value)} />
                    </div>
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'portal' && (
                <SettingsSection title={t('settings.portal.title', 'مميزات بوابة المشاركين')} description={t('settings.portal.desc', 'تحكم في الأقسام التي تظهر للمشاركين في هواتفهم.')} icon={ListPlus}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'show_qa', label: 'نظام الأسئلة والتحاور (Q&A)', icon: HelpCircle },
                      { id: 'show_polls', label: 'استطلاعات الرأي (Polls)', icon: BarChart2 },
                      { id: 'show_social_wall', label: 'الحائط التفاعلي (Social Wall)', icon: MessageSquare },
                      { id: 'show_networking', label: 'شبكة التواصل (Networking)', icon: Users },
                      { id: 'show_leaderboard', label: 'لوحة المتصدرين (Leaderboard)', icon: Award },
                      { id: 'show_docs', label: 'مركز المستندات والملفات', icon: ListPlus },
                    ].map(feat => (
                      <div key={feat.id} className="flex items-center justify-between bg-white/5 p-6 rounded-[24px] border border-white/5 hover:bg-white/10 transition-all group">
                         <div className="flex items-center gap-4">
                           <div className="text-brand-secondary/50 group-hover:text-brand-secondary transition-colors">
                              <feat.icon size={24} />
                           </div>
                           <span className="font-bold text-white">{feat.label}</span>
                         </div>
                         <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={settings[feat.id]}
                              onChange={(e) => handleChange(feat.id, e.target.checked)}
                            />
                            <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-primary"></div>
                         </div>
                      </div>
                    ))}
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'registration' && (
                <SettingsSection title={t('settings.registration.title', 'بناء نموذج التسجيل')} description={t('settings.registration.desc', 'حدد البيانات التي تطلبها من المشاركين عند التسجيل الذاتي.')} icon={ListPlus}>
                  <div className="space-y-6">
                    {/* New Field Form */}
                    <div className="bg-brand-primary/5 border border-brand-primary/10 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-1">
                        <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{t('settings.registration.new_field_label', 'اسم الحقل (مثلاً: رقم الهاتف)')}</label>
                        <Input 
                          placeholder={t('settings.registration.placeholder', 'الاسم المعروض...')} 
                          value={newField.display_label}
                          onChange={e => setNewField({...newField, display_label: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{t('settings.registration.field_type', 'نوع الحقل')}</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 outline-none text-brand-secondary"
                          value={newField.field_type}
                          onChange={e => setNewField({...newField, field_type: e.target.value})}
                        >
                          <option value="text">{t('settings.registration.types.text', 'نص (Text)')}</option>
                          <option value="number">{t('settings.registration.types.number', 'رقم (Number)')}</option>
                          <option value="date">{t('settings.registration.types.date', 'تاريخ (Date)')}</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3 h-12">
                        <input 
                          type="checkbox" 
                          id="is_req" 
                          checked={newField.is_required}
                          onChange={e => setNewField({...newField, is_required: e.target.checked})}
                          className="w-5 h-5 accent-brand-primary"
                        />
                        <label htmlFor="is_req" className="text-sm font-bold">{t('settings.registration.is_required', 'إجباري؟')}</label>
                      </div>
                      <Button onClick={handleAddField} className="h-12 bg-brand-primary hover:bg-brand-primary text-brand-dark">
                        <Plus className="w-5 h-5 mr-2" /> {t('settings.registration.add_field', 'إضافة حقل')}
                      </Button>
                    </div>

                    {/* Fields List */}
                    <div className="space-y-3">
                      {customFields.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[32px] text-brand-secondary/20 italic">
                          {t('settings.registration.no_custom_fields', 'لا توجد حقول مخصصة حالياً. الحقول الافتراضية هي (الاسم، البريد، الجهة).')}
                        </div>
                      ) : (
                        customFields.map(field => (
                          <div key={field.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                                {field.field_type === 'text' ? 'T' : field.field_type === 'number' ? '#' : 'D'}
                              </div>
                              <div>
                                <div className="font-bold text-white">{field.display_label}</div>
                                <div className="text-xs text-brand-secondary/40">{field.is_required ? 'حقل إجباري' : 'حقل اختياري'} • {field.field_type}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteField(field.id)}
                              className="p-3 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-amber-500 text-xs leading-relaxed">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>{t('settings.registration.note', 'ملاحظة: الحقول الأساسية (الاسم الكامل، البريد الإلكتروني، الجهة) هي حقول ثابتة في النظام لضمان عمل التقارير والبطاقات بشكل صحيح. الحقول التي تضيفها هنا ستظهر كبيانات إضافية في ملف المشارك.')}</p>
                    </div>
                  </div>
                </SettingsSection>
              )}

              {/* ... Rest of tabs (Design, Payments, etc.) same as before but wrapped in motion ... */}
              {activeTab === 'design' && (
                <SettingsSection title={t('settings.design.title', 'الهوية البصرية')} description={t('settings.design.desc', 'تخصيص الألوان والشعار.')} icon={Palette}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.design.logo_label', 'شعار الفعالية')}</label>
                      <div className="flex flex-col gap-4">
                        {settings.logo_url && (
                          <div className="w-32 h-32 rounded-2xl bg-white p-4 border border-white/10 overflow-hidden shadow-xl">
                            <img 
                              src={getImageUrl(settings.logo_url)} 
                              alt="Logo Preview" 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <label className="flex-1 flex items-center justify-center gap-3 h-14 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-brand-primary/50 transition-all cursor-pointer text-brand-secondary font-bold group">
                            <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span>{settings.logo_url ? t('settings.design.change_logo', 'تغيير الشعار') : t('settings.design.upload_logo', 'رفع الشعار')}</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                try {
                                  const res = await eventService.uploadLogo(eventId, file);
                                  handleChange('logo_url', res.logo_url);
                                  showSuccess(t('settings.design.upload_success', 'تم رفع الشعار بنجاح'));
                                } catch (err) {
                                  showError(t('settings.design.upload_error', "فشل رفع الشعار"));
                                }
                              }} 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-brand-secondary/50">{t('settings.design.primary_color', 'اللون الأساسي')}</label>
                        <div className="flex items-center gap-4">
                          <input type="color" className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer" value={settings.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} />
                          <Input value={settings.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'halls' && (
                <SettingsSection title={t('settings.halls.title', 'إدارة القاعات')} description={t('settings.halls.desc', 'تعريف القاعات المختلفة وسعة كل منها.')} icon={Tv}>
                   <div className="space-y-6">
                    <div className="bg-brand-primary/5 border border-brand-primary/10 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{t('settings.halls.name_label', 'اسم القاعة (مثلاً: القاعة الكبرى)')}</label>
                        <Input 
                          placeholder={t('settings.halls.name_placeholder', 'اسم القاعة...')} 
                          value={newHall.name}
                          onChange={e => setNewHall({...newHall, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{t('settings.halls.capacity_label', 'السعة الاستيعابية')}</label>
                        <Input 
                          type="number"
                          value={newHall.capacity}
                          onChange={e => setNewHall({...newHall, capacity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <Button onClick={handleAddHall} className="h-12 bg-brand-primary hover:bg-brand-primary text-brand-dark">
                        <Plus className="w-5 h-5 mr-2" /> {t('settings.halls.add_hall', 'إضافة قاعة')}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {halls.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[32px] text-brand-secondary/20 italic">
                          {t('settings.halls.no_halls', 'لا توجد قاعات معرفة حالياً.')}
                        </div>
                      ) : (
                        halls.map(hall => (
                          <div key={hall.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                                <Tv className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-white">{hall.name}</div>
                                <div className="text-xs text-brand-secondary/40">{t('settings.halls.capacity_count', 'السعة: {{count}} مقعد', { count: hall.capacity })}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteHall(hall.id)}
                              className="p-3 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'payments' && (
                <SettingsSection title={t('settings.payments.title', 'الدفع والاشتراكات')} description={t('settings.payments.desc', 'إعدادات بوابة الدفع وتذاكر الفعالية.')} icon={CreditCard}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl md:col-span-2">
                      <input type="checkbox" id="require_payment" checked={settings.require_payment} onChange={(e) => handleChange('require_payment', e.target.checked)} className="w-5 h-5 accent-brand-primary" />
                      <label htmlFor="require_payment" className="font-bold">{t('settings.payments.require_payment', 'تفعيل الدفع الإلزامي للتسجيل')}</label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.payments.ticket_price', 'مبلغ الاشتراك')}</label>
                      <Input type="number" value={settings.ticket_price} onChange={(e) => handleChange('ticket_price', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.payments.currency', 'العملة')}</label>
                      <Input value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.payments.chargily_api_key', 'مفتاح API الخاص بـ Chargily Pay')}</label>
                      <Input type="password" value={settings.chargily_api_key} onChange={(e) => handleChange('chargily_api_key', e.target.value)} />
                    </div>
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'welcome' && (
                <SettingsSection title={t('settings.welcome.title', 'شاشة الترحيب')} description={t('settings.welcome.desc', 'ما يظهر للضيوف عند مسح الكود أو الدخول للقاعة.')} icon={Tv}>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.welcome.welcome_title', 'عنوان الترحيب')}</label>
                      <Input value={settings.welcome_title} onChange={(e) => handleChange('welcome_title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary/50">{t('settings.welcome.welcome_subtitle', 'الوصف الفرعي')}</label>
                      <Input value={settings.welcome_subtitle} onChange={(e) => handleChange('welcome_subtitle', e.target.value)} />
                    </div>
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'labels' && (
                <SettingsSection title={t('settings.labels.title', 'تخصيص المسميات')} description={t('settings.labels.desc', 'تغيير مسميات الحقول الأساسية.')} icon={Type}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { id: 'org_label_1', label: t('settings.labels.org_label_1', 'تسمية الحقل 1 (الجهة)') },
                      { id: 'org_label_2', label: t('settings.labels.org_label_2', 'تسمية الحقل 2 (القسم)') },
                      { id: 'org_label_3', label: t('settings.labels.org_label_3', 'تسمية الحقل 3 (الرتبة)') },
                      { id: 'org_label_4', label: t('settings.labels.org_label_4', 'تسمية الحقل 4 (الموقع)') },
                    ].map(field => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-bold text-brand-secondary/50">{field.label}</label>
                        <Input value={settings[field.id]} onChange={(e) => handleChange(field.id, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'pwa' && (
                <SettingsSection title="التطبيق والإشعارات" description="إعدادات PWA وإشعارات الدفع الفورية" icon={Bell}>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-bold mb-1">إشعارات الدفع (Push Notifications)</h4>
                      <p className="text-white/30 text-sm mb-4">احصل على تنبيهات فورية حتى عند إغلاق التطبيق</p>
                      <PushNotificationManager />
                    </div>
                    <div
                      className="p-4 rounded-2xl text-sm"
                      style={{ background: 'rgba(42,100,236,0.08)', border: '1px solid rgba(42,100,236,0.2)' }}
                    >
                      <p className="text-white/60 font-bold mb-1">ديوان إيفنت كـ PWA</p>
                      <p className="text-white/30 text-xs leading-relaxed">
                        يمكنك تثبيت المنصة كتطبيق على هاتفك. ابحث عن زر "تثبيت" أسفل الشاشة أو من قائمة المتصفح &rarr; "إضافة إلى الشاشة الرئيسية".
                      </p>
                    </div>
                  </div>
                </SettingsSection>
              )}

              {activeTab === 'advanced' && (
                <SettingsSection title={t('settings.advanced.title', 'إجراءات متقدمة')} description={t('settings.advanced.desc', 'عمليات حساسة لإدارة حالة الفعالية.')} icon={ShieldCheck}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                       <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                         <Save className={cn("w-5 h-5", settings.list_frozen ? "text-blue-400" : "text-brand-secondary")} />
                         {t('settings.advanced.freeze_title', 'تجميد القائمة')}
                       </h4>
                       <p className="text-brand-secondary/30 text-sm mb-8">{t('settings.advanced.freeze_desc', 'عند تجميد القائمة، لن يتمكن أحد من تسجيل حضور جديد أو تعديل البيانات.')}</p>
                       <Button 
                        variant={settings.list_frozen ? "outline" : "gold"} 
                        className="w-full h-14"
                        onClick={async () => {
                          try {
                            const res = await api.post(`events/${eventId}/freeze`);
                            handleChange('list_frozen', res.data.is_frozen);
                            showSuccess(res.data.is_frozen ? t('settings.advanced.freeze_success', 'تم تجميد القائمة') : t('settings.advanced.unfreeze_success', 'تم إلغاء التجميد'));
                          } catch(e) { showError(t('settings.advanced.freeze_error', "فشل العملية")); }
                        }}
                       >
                         {settings.list_frozen ? t('settings.advanced.unfreeze', 'إلغاء التجميد ❄️') : t('settings.advanced.freeze', 'تجميد القائمة ❄️')}
                       </Button>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8">
                       <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                         <SettingsIcon className="w-5 h-5" />
                         {t('settings.advanced.reset_attendance_title', 'تصفير الحضور')}
                       </h4>
                       <p className="text-red-400/30 text-sm mb-8">{t('settings.advanced.reset_attendance_desc', 'تحذير: سيتم مسح كافة سجلات الحضور وإعادتهم لحالة "غير حاضر".')}</p>
                       <Button 
                        variant="outline" 
                        className="w-full h-14 border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={async () => {
                          const result = await showConfirm(
                            t('settings.advanced.reset_attendance_confirm', "هل أنت متأكد من تصفير كافة سجلات الحضور؟"),
                            t('settings.advanced.reset_attendance_warning', "⚠️ هذا الإجراء لا يمكن التراجع عنه وسيمسح تاريخ الحضور الميداني.")
                          );
                          if(result.isConfirmed) {
                            try {
                              await api.post(`events/${eventId}/reset-attendance`);
                              showSuccess(t('settings.advanced.reset_success', "تم تصفير السجلات بنجاح"));
                            } catch(e) { showError(t('settings.advanced.reset_error', "فشل تصفير السجلات")); }
                          }
                        }}
                       >
                         {t('settings.advanced.reset_btn', 'تصفير السجلات ⚠️')}
                       </Button>
                    </div>
                  </div>
                </SettingsSection>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
