import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import {
  Home,
  Users,
  Calendar,
  Settings,
  Award,
  LogOut,
  ShieldAlert,
  Globe,
  LayoutDashboard,
  Cpu,
  Palette,
  Monitor,
  UserCheck,
  MessageSquare,
  BarChart2,
  Mic,
  Heart,
  HelpCircle,
  TrendingUp,
  CreditCard,
  FileText,
  Shield
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const menuItems = [
  { icon: LayoutDashboard, path: '/dashboard/events' },
  { icon: Home, path: '/dashboard' },
  { icon: Users, path: '/dashboard/participants' },
  { icon: UserCheck, path: '/dashboard/check-in' },
  { icon: Shield, path: '/dashboard/operations' },
  { icon: Calendar, path: '/dashboard/sessions' },
  { icon: Mic, path: '/dashboard/speakers' },
  { icon: Heart, path: '/dashboard/sponsors' },
  { icon: TrendingUp, path: '/dashboard/stats' },
];

const engagementItems = [
  { icon: MessageSquare, path: '/dashboard/wall' },
  { icon: HelpCircle, path: '/dashboard/questions' },
  { icon: ShieldAlert, path: '/dashboard/moderation' },
  { icon: Palette, path: '/dashboard/designer/badge' },
  { icon: Award, path: '/dashboard/designer/certificate' },
  { icon: BarChart2, path: '/dashboard/polls' },
  { icon: FileText, path: '/dashboard/documents' },
];

const technicalItems = [
  { icon: Cpu, path: '/dashboard/hardware' },
  { icon: Monitor, path: '/dashboard/display' },
  { icon: Globe, path: '/dashboard/developer' },
];

const Sidebar = ({ activePath }) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('diwan_token');
    window.location.href = '/login';
  };

  const superAdminItems = [
    { icon: LayoutDashboard, label: 'الإدارة الشاملة', path: '/super-admin' },
    { icon: Users, label: 'إدارة المنظمين', path: '/super-admin/organizers' },
    { icon: CreditCard, label: 'الباقات والائتمان', path: '/super-admin/plans' },
  ];

  return (
    <aside className="w-72 h-screen bg-[#050B18] border-r border-white/10 flex flex-col sticky top-0">
      {/* Logo Section */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40">
            <span className="text-brand-dark font-bold text-xl">D</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{t('common.app_name', 'ديوان')}</h2>
            <p className="text-brand-secondary/50 text-xs">{t('common.app_subtitle', 'منصة تسيير الفعاليات')}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">

        <div className="px-4 mb-3 text-[10px] uppercase tracking-widest text-brand-primary/50 font-bold">{t('common.sidebar.events_group')}</div>
        {menuItems.map((item) => {
          const isActive = activePath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group",
                isActive
                  ? "bg-brand-primary/20 text-brand-secondary border border-brand-primary/30"
                  : "text-brand-secondary/40 hover:text-brand-secondary hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "group-hover:text-amber-500")} />
              <span className="flex-1 font-medium">{t(`common.${item.path.split('/').pop() || 'dashboard'}`)}</span>
              {isActive && (
                <motion.div layoutId="active" className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}

        {/* Engagement Section */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="px-4 mb-3 text-[10px] uppercase tracking-widest text-brand-primary/50 font-bold">{t('common.sidebar.engagement_group')}</div>
          {engagementItems.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group",
                  isActive
                    ? "bg-brand-primary/20 text-brand-secondary border border-brand-primary/30"
                    : "text-brand-secondary/40 hover:text-brand-secondary hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "group-hover:text-amber-500")} />
                <span className="flex-1 font-medium">{t(`common.${item.path.split('/').pop()}`)}</span>
              </Link>
            );
          })}
        </div>

        {/* Technical Section */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="px-4 mb-3 text-[10px] uppercase tracking-widest text-brand-primary/50 font-bold">{t('common.sidebar.technical_group')}</div>
          {technicalItems.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group",
                  isActive
                    ? "bg-brand-primary/20 text-brand-secondary border border-brand-primary/30"
                    : "text-brand-secondary/40 hover:text-brand-secondary hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "group-hover:text-amber-500")} />
                <span className="flex-1 font-medium">{t(`common.${item.path.split('/').pop()}`)}</span>
              </Link>
            );
          })}
        </div>

      </nav>

      {/* User / Logout Section */}
      <div className="p-6 mt-auto">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
