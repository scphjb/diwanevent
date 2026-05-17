import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Info, AlertCircle, Award } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = ({ isOpen, onClose, notifications = [], onClearAll }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const getIcon = (level) => {
    switch (level) {
      case 'success': return <Award className="text-emerald-500" size={18} />;
      case 'warning': return <AlertCircle className="text-amber-500" size={18} />;
      case 'error': return <AlertCircle className="text-red-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-3 left-0 w-96 bg-[#032e24] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden z-[101] backdrop-blur-2xl"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Bell className="text-emerald-500 w-4 h-4" />
                </div>
                <h3 className="text-md font-bold text-white">{t('common.notifications.title')}</h3>
              </div>
              <button 
                onClick={onClearAll}
                className="text-[10px] uppercase tracking-widest font-bold text-emerald-500/50 hover:text-emerald-500 transition-colors"
              >
                {t('common.notifications.clear_all')}
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-5 border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                        {getIcon(notif.level)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{notif.title}</span>
                          <span className="text-[10px] text-emerald-400/30">{notif.time}</span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bell className="text-white/10 w-8 h-8" />
                  </div>
                  <p className="text-white/20 text-xs font-bold">{t('common.notifications.no_new')}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white/5 text-center">
              <button 
                onClick={() => {
                  navigate('/dashboard/profile?tab=alerts');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {t('common.notifications.view_all')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
