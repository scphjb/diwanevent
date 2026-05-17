import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Book, MessageCircle, Phone, Mail } from 'lucide-react';
import { Button } from '../ui/Button';

const HelpModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const helpItems = [
    {
      icon: Book,
      title: t('common.help.guide_title'),
      desc: t('common.help.guide_desc'),
      action: t('common.help.guide_action')
    },
    {
      icon: MessageCircle,
      title: t('common.help.live_support_title'),
      desc: t('common.help.live_support_desc'),
      action: t('common.help.live_support_action')
    },
    {
      icon: Phone,
      title: t('common.help.call_title'),
      desc: t('common.help.call_desc'),
      action: t('common.help.call_action')
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#032e24] border border-white/10 rounded-[24px] shadow-2xl p-8 backdrop-blur-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-900/20">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('common.help.title')}</h2>
                  <p className="text-emerald-400/40 text-xs">{t('common.help.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-3">
              {helpItems.map((item, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-all shadow-inner">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                      <p className="text-[11px] text-white/40 mb-3">{item.desc}</p>
                      <Button variant="outline" className="h-9 px-4 text-[10px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-emerald-950 rounded-xl">
                        {item.action}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-emerald-400/30 font-bold mb-4">{t('common.help.email_contact')}</p>
              <a href="mailto:support@diwan.com" className="text-emerald-400 font-black hover:underline flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                support@diwan.com
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
