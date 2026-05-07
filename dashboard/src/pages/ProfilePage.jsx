import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Camera, 
  Bell, 
  Lock,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <DashboardLayout activePath="/dashboard/profile">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">الملف الشخصي</h1>
          <p className="text-emerald-400/50">إدارة معلوماتك الشخصية وإعدادات الأمان</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-2">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <User className="w-5 h-5" />
              <span className="font-bold">المعلومات الشخصية</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'security' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-bold">الأمان والخصوصية</span>
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'notifications' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'text-white/40 hover:bg-white/5'}`}
            >
              <Bell className="w-5 h-5" />
              <span className="font-bold">التنبيهات</span>
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
                      <h3 className="text-xl font-bold text-white mb-1">{user?.full_name || 'أحمد الإدريسي'}</h3>
                      <p className="text-emerald-400/50 text-sm">مدير نظام • ديوان إيفنت</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">الاسم الكامل</label>
                      <Input defaultValue={user?.full_name} icon={User} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">البريد الإلكتروني</label>
                      <Input defaultValue={user?.email} icon={Mail} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">رقم الهاتف</label>
                      <Input defaultValue="+213 555 00 00 00" icon={Smartphone} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">الموقع الوظيفي</label>
                      <Input defaultValue="مدير تنظيم فعاليات" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button variant="gold" className="px-10 h-14 rounded-2xl">حفظ التغييرات</Button>
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
                        <h4 className="font-bold text-white">تغيير كلمة المرور</h4>
                        <p className="text-emerald-400/30 text-xs">آخر تغيير كان قبل 3 أشهر</p>
                      </div>
                    </div>
                    <Button variant="outline">تحديث</Button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">المصادقة الثنائية (2FA)</h4>
                        <p className="text-emerald-400/30 text-xs">حماية إضافية لحسابك</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-emerald-600/40 rounded-full relative p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-emerald-400 rounded-full absolute right-1" />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
