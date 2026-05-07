import React, { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import EventSelector from '../components/dashboard/EventSelector';
import AdminNotifications from '../components/dashboard/AdminNotifications';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DashboardLayout = ({ children, activePath }) => {
  const { t } = useTranslation();
  const [selectedEventId, setSelectedEventId] = useState(1);

  return (
    <div className="flex min-h-screen bg-[#022C22] text-white" dir={t('dir', 'rtl')}>
      <AdminNotifications eventId={selectedEventId} />
      {/* Sidebar */}
      <Sidebar activePath={activePath} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header / Topbar */}
        <header className="h-24 border-b border-white/10 flex items-center justify-between px-10 relative z-10 backdrop-blur-md bg-[#022C22]/80 sticky top-0">
          <div className="flex items-center gap-8">
            <EventSelector 
              selectedEventId={selectedEventId} 
              onSelect={setSelectedEventId} 
            />
            
            {/* Search Bar */}
            <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl w-80 focus-within:border-emerald-500/50 transition-all">
              <Search className="w-4 h-4 text-emerald-400/50" />
              <input 
                type="text" 
                placeholder={t('common.search')} 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-emerald-400/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-emerald-400 hover:bg-white/10 transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#022C22]" />
            </button>
            <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-emerald-400 hover:bg-white/10 transition-all">
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-3 relative group cursor-pointer">
              <div className="text-right">
                <div className="text-sm font-bold">{t('common.admin_name', 'أحمد الإدريسي')}</div>
                <div className="text-[10px] text-emerald-400/50 uppercase tracking-widest font-bold">{t('common.admin_role', 'مدير النظام')}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-[2px]">
                <div className="w-full h-full rounded-[10px] bg-emerald-950 flex items-center justify-center overflow-hidden">
                   <img src="https://ui-avatars.com/api/?name=Ahmed+Idrissi&background=022C22&color=10B981" alt="Avatar" />
                </div>
              </div>
              
              {/* Dropdown Menu on Hover */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#0A3D2B] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50">
                <Link to="/dashboard/profile" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {t('common.profile', 'الملف الشخصي')}
                </Link>
                <Link to="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  {t('common.settings', 'إعدادات الحساب')}
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
    </div>
  );
};

export default DashboardLayout;
