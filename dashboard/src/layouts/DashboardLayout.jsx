import React, { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import EventSelector from '../components/dashboard/EventSelector';
import AdminNotifications from '../components/dashboard/AdminNotifications';
import LanguageSwitcher from '../components/dashboard/LanguageSwitcher';
import NotificationPanel from '../components/dashboard/NotificationPanel';
import HelpModal from '../components/dashboard/HelpModal';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';

import { useEvent } from '../context/EventContext';
import notificationService from '../services/notificationService';
import { useEffect } from 'react';

const DashboardLayout = ({ children, activePath }) => {
  const { t } = useTranslation();
  const { selectedEventId, setSelectedEventId } = useEvent();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // جلب بيانات المستخدم الحالية من المتصفح
  const user = JSON.parse(localStorage.getItem('diwan_user') || '{}');
  const userName = user.full_name || user.email || t('common.roles.fallback_name');
  const userRole = user.role === 'super_admin' ? t('common.roles.super_admin') : (user.role === 'organizer' ? t('common.roles.organizer') : t('common.roles.member'));

  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.map(n => ({
        ...n,
        time: new Date(n.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' })
      })));
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // اختياري: تحديث دوري كل دقيقة
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClearNotifications = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050B18] text-white" dir={t('dir', 'rtl')}>
      <AdminNotifications eventId={selectedEventId} />
      {/* Sidebar */}
      <Sidebar activePath={activePath} />


      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header / Topbar */}
        <header className="h-24 border-b border-white/10 flex items-center justify-between px-10 relative z-[60] backdrop-blur-md bg-[#050B18]/80 sticky top-0">
          <div className="flex items-center gap-8">
            <EventSelector
              selectedEventId={selectedEventId}
              onSelect={setSelectedEventId}
            />

            {/* Search Bar */}
            <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl w-80 focus-within:border-brand-primary/50 transition-all">
              <Search className="w-4 h-4 text-brand-secondary/50" />
              <input
                type="text"
                placeholder={t('common.search')}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-brand-secondary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={cn(
                  "w-12 h-12 rounded-xl border flex items-center justify-center transition-all relative",
                  isNotifOpen ? "bg-brand-primary text-brand-dark border-brand-primary shadow-lg shadow-brand-dark/40" : "bg-white/5 border-white/5 text-brand-secondary hover:bg-white/10"
                )}
              >
                <Bell className="w-5 h-5" />
                {!isNotifOpen && <span className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#050B18]" />}
              </button>
              <NotificationPanel
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                onClearAll={handleClearNotifications}
              />
            </div>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-brand-secondary hover:bg-white/10 transition-all"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-3 relative group cursor-pointer">
              <div className="text-right">
                <div className="text-sm font-bold">{userName}</div>
                <div className="text-[10px] text-brand-secondary/50 uppercase tracking-widest font-bold">{userRole}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-primary p-[2px]">
                <div className="w-full h-full rounded-[10px] bg-brand-dark flex items-center justify-center overflow-hidden">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=022C22&color=10B981`} alt="Avatar" />
                </div>
              </div>

              {/* Dropdown Menu on Hover */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#032e24] border border-white/10 rounded-[20px] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50 backdrop-blur-xl">
                <Link to="/dashboard/profile" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                  {t('common.profile')}
                </Link>
                <Link to="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  {t('common.settings')}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <section className="flex-1 p-10 relative z-0 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </section>

      </main>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
