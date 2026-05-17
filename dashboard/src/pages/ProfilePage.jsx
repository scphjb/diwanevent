import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Camera, 
  Bell, 
  Lock,
  Smartphone,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { useLocation } from 'react-router-dom';
import notificationService from '../services/notificationService';


const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'personal';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // Password States
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error(t('profile.security.passwords_mismatch', 'كلمات المرور الجديدة غير متطابقة'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.new
      });
      toast.success(t('profile.security.password_success', 'تم تغيير كلمة المرور بنجاح'));
      setIsPasswordModalOpen(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || t('profile.security.password_error', 'فشل تغيير كلمة المرور'));
    } finally {
      setLoading(false);
    }
  };

  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState({ qr_code: '', secret: '' });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);

  const handle2faToggle = async () => {
    if (twoFactorEnabled) {
      // Disable 2FA
      try {
        await api.post('/auth/2fa/disable');
        setTwoFactorEnabled(false);
        toast.success(t('profile.security.2fa_disabled', 'تم إلغاء تفعيل المصادقة الثنائية'));
      } catch (err) {
        toast.error(t('profile.security.2fa_disable_error', 'فشل إلغاء تفعيل المصادقة الثنائية'));
      }
    } else {
      // Setup 2FA
      try {
        const res = await api.post('/auth/2fa/setup');
        setTwoFactorData(res.data);
        setIs2faModalOpen(true);
      } catch (err) {
        toast.error(t('profile.security.2fa_setup_error', 'فشل بدء إعداد المصادقة الثنائية'));
      }
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/2fa/enable', { code: twoFactorCode });
      setTwoFactorEnabled(true);
      setIs2faModalOpen(false);
      setTwoFactorCode('');
      toast.success(t('profile.security.2fa_enabled', 'تم تفعيل المصادقة الثنائية بنجاح'));
    } catch (err) {
      toast.error(err.response?.data?.detail || t('profile.security.2fa_verify_error', 'رمز التحقق غير صحيح'));
    } finally {
      setLoading(false);
    }
  };

  const [notificationSettings, setNotificationSettings] = useState({
    email_new_reg: true,
    sys_alerts: true,
    security_alerts: true,
    browser_push: false
  });

  const toggleNotification = (id) => {
    setNotificationSettings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [savingNotifs, setSavingNotifs] = useState(false);

  const handleSaveNotifications = async () => {
    setSavingNotifs(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setSavingNotifs(false);
    toast.success(t('profile.notifications.save_success', 'تم حفظ تفضيلات التنبيهات بنجاح'));
  };

  const [notificationsHistory, setNotificationsHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotificationsHistory(data.map(n => ({
        ...n,
        time: new Date(n.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { numberingSystem: 'latn' })
      })));
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <DashboardLayout activePath="/dashboard/profile">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{t('profile.title', 'الملف الشخصي')}</h1>
          <p className="text-emerald-400/50">{t('profile.subtitle', 'إدارة معلوماتك الشخصية وإعدادات الأمان')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-2">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <User className="w-5 h-5" />
              <span className="font-bold">{t('profile.tabs.personal', 'المعلومات الشخصية')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'security' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-bold">{t('profile.tabs.security', 'الأمان والخصوصية')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'alerts' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <Bell className="w-5 h-5" />
              <span className="font-bold">{t('profile.tabs.alerts', 'سجل التنبيهات')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'notifications' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <Key className="w-5 h-5" />
              <span className="font-bold">{t('profile.tabs.settings', 'إعدادات التنبيهات')}</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-md"
            >
              {activeTab === 'personal' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-8 pb-8 border-b border-white/5">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-emerald-600/20 flex items-center justify-center text-4xl font-bold border-2 border-dashed border-emerald-500/40">
                        {user?.full_name?.[0] || 'A'}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-emerald-950 shadow-lg group-hover:scale-110 transition-transform">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{user?.full_name || t('profile.personal.name_fallback', 'أحمد الإدريسي')}</h3>
                      <p className="text-emerald-400/50 text-sm">{t('profile.personal.role_fallback', 'مدير نظام • ديوان إيفنت')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">{t('profile.personal.fullName', 'الاسم الكامل')}</label>
                      <Input defaultValue={user?.full_name} icon={User} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">{t('profile.personal.email', 'البريد الإلكتروني')}</label>
                      <Input defaultValue={user?.email} icon={Mail} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">{t('profile.personal.phone', 'رقم الهاتف')}</label>
                      <Input defaultValue="+213 555 00 00 00" icon={Smartphone} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">{t('profile.personal.jobTitle', 'الموقع الوظيفي')}</label>
                      <Input defaultValue={t('profile.personal.job_title_placeholder', 'مدير تنظيم فعاليات')} />
                    </div>
                  </div>
 
                  <div className="pt-6">
                    <Button variant="gold" className="px-10 h-14 rounded-2xl">{t('profile.personal.save', 'حفظ التغييرات')}</Button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{t('profile.security.password_title', 'تغيير كلمة المرور')}</h4>
                        <p className="text-emerald-400/30 text-xs">{t('profile.security.password_last_change', 'آخر تغيير كان قبل 3 أشهر')}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>{t('profile.security.update_btn', 'تحديث')}</Button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{t('profile.security.2fa_title', 'المصادقة الثنائية (2FA)')}</h4>
                        <p className="text-emerald-400/30 text-xs">{t('profile.security.2fa_subtitle', 'حماية إضافية لحسابك')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handle2faToggle}
                      className={cn(
                        "w-12 h-6 rounded-full relative p-1 transition-all duration-300",
                        twoFactorEnabled ? "bg-emerald-500/40" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: twoFactorEnabled ? 24 : 0 }}
                        className={cn(
                          "w-4 h-4 rounded-full transition-colors",
                          twoFactorEnabled ? "bg-emerald-400" : "bg-white/20"
                        )}
                      />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{t('profile.notifications.title', 'إعدادات التنبيهات')}</h3>
                    <p className="text-emerald-400/30 text-sm">{t('profile.notifications.subtitle', 'اختر كيف ومتى ترغب في استلام التنبيهات من المنصة.')}</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'email_new_reg', title: t('profile.notifications.email_reg_title', 'تنبيهات التسجيل الجديد'), desc: t('profile.notifications.email_reg_desc', 'استلام بريد إلكتروني عند تسجيل مشارك جديد في فعاليتك.'), icon: Mail, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                      { id: 'sys_alerts', title: t('profile.notifications.sys_alerts_title', 'تنبيهات النظام'), desc: t('profile.notifications.sys_alerts_desc', 'الحصول على إشعارات حول حالة الخادم والمزامنة.'), icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                      { id: 'security_alerts', title: t('profile.notifications.security_alerts_title', 'الأمان والخصوصية'), desc: t('profile.notifications.security_alerts_desc', 'تنبيهك عند محاولات تسجيل الدخول المشبوهة أو تغيير كلمة المرور.'), icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                      { id: 'browser_push', title: t('profile.notifications.browser_push_title', 'إشعارات المتصفح'), desc: t('profile.notifications.browser_push_desc', 'تفعيل الإشعارات المباشرة على سطح المكتب.'), icon: Smartphone, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/[0.07] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.bg, item.color)}>
                            <item.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{item.title}</h4>
                            <p className="text-emerald-400/30 text-[11px] leading-relaxed max-w-sm">{item.desc}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleNotification(item.id)}
                          className={cn(
                            "w-10 h-5 rounded-full relative p-1 transition-all duration-300",
                            notificationSettings[item.id] ? "bg-emerald-500/40" : "bg-white/10"
                          )}
                        >
                          <motion.div 
                            animate={{ x: notificationSettings[item.id] ? 20 : 0 }}
                            className={cn(
                              "w-3 h-3 rounded-full transition-colors",
                              notificationSettings[item.id] ? "bg-emerald-400" : "bg-white/20"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6">
                    <Button 
                      variant="gold" 
                      className="w-full h-14 rounded-2xl font-bold"
                      onClick={handleSaveNotifications}
                      loading={savingNotifs}
                    >
                      {t('profile.notifications.save_btn', 'حفظ تفضيلات التنبيهات')}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white">{t('profile.alerts_history.title', 'سجل التنبيهات')}</h3>
                      <p className="text-emerald-400/40 text-xs">{t('profile.alerts_history.subtitle', 'استعرض كافة الإشعارات والعمليات الأخيرة')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {notificationsHistory.map((alert) => (
                      <div key={alert.id} className="p-5 bg-white/5 border border-white/5 rounded-[24px] hover:border-emerald-500/20 transition-all group">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            alert.level === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                            alert.level === 'warning' ? "bg-amber-500/10 text-amber-500" :
                            "bg-blue-500/10 text-blue-500"
                          )}>
                            <Bell size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{alert.title}</span>
                              <span className="text-[10px] text-white/20">{alert.time}</span>
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#032e24] border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('profile.security.modal.title', 'تغيير كلمة المرور')}</h3>
                    <p className="text-emerald-400/40 text-xs">{t('profile.security.modal.subtitle', 'يرجى إدخال كلمة المرور الحالية والجديدة')}</p>
                  </div>
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">{t('profile.security.modal.current_label', 'كلمة المرور الحالية')}</label>
                  <div className="relative">
                    <Input 
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">{t('profile.security.modal.new_label', 'كلمة المرور الجديدة')}</label>
                  <div className="relative">
                    <Input 
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">{t('profile.security.modal.confirm_label', 'تأكيد كلمة المرور الجديدة')}</label>
                  <div className="relative">
                    <Input 
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button 
                    type="submit" 
                    variant="gold" 
                    className="flex-1 h-14 rounded-2xl font-bold"
                    loading={loading}
                  >
                    {t('profile.security.modal.submit', 'تغيير كلمة المرور')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    {t('common.cancel', 'إلغاء')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {is2faModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIs2faModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#032e24] border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-2xl text-center"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mx-auto mb-4">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t('profile.security.2fa_setup.title', 'إعداد المصادقة الثنائية')}</h3>
                <p className="text-emerald-400/40 text-sm">{t('profile.security.2fa_setup.desc', 'امسح رمز QR التالي باستخدام تطبيق المصادقة الخاص بك (Google Authenticator أو Authy)')}</p>
              </div>

              <div className="bg-white p-4 rounded-3xl inline-block mb-6 shadow-xl">
                <img src={twoFactorData.qr_code} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="mb-8">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">{t('profile.security.2fa_setup.manual_entry', 'أو أدخل الرمز يدوياً')}</p>
                <code className="bg-white/5 px-4 py-2 rounded-xl text-emerald-400 font-mono text-sm block border border-white/5">
                  {twoFactorData.secret}
                </code>
              </div>

              <form onSubmit={handleVerify2fa} className="space-y-6 text-right">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">{t('profile.security.2fa_setup.verify_label', 'رمز التحقق المكون من 6 أرقام')}</label>
                  <Input 
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-black"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    variant="gold" 
                    className="flex-1 h-14 rounded-2xl font-bold"
                    loading={loading}
                  >
                    {t('profile.security.2fa_setup.enable_btn', 'تفعيل المصادقة')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIs2faModalOpen(false)}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    {t('common.cancel', 'إلغاء')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default ProfilePage;
