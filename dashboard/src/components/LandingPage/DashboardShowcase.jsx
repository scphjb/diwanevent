import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Shield, Zap } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const DashboardShowcase = () => {
  const { L, isRtl } = useLang();

  return (
    <section className="py-24 bg-brand-dark overflow-hidden relative" id="dashboard-showcase" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest mb-6"
          >
            <Monitor size={14} />
            <span>{L({ ar: "واجهة الإدارة المتقدمة", en: "Advanced Admin Interface", fr: "Interface d'Administration Avancée", es: "Interfaz de Administración Avanzada" })}</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black text-brand-text mb-6 leading-tight">
            {L({ 
                ar: "تحكم في كل تفاصيل فعاليتك من مكان واحد", 
                en: "Control Every Detail from a Single Dashboard",
                fr: "Contrôlez chaque détail depuis un tableau de bord unique",
                es: "Controle cada detalle desde un único panel de control"
            })}
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-4 md:border-[12px] border-white/5 bg-brand-dark">
            <img 
              src="/diwan_branded_dashboard.png" 
              alt="Diwan Event Dashboard" 
              className="w-full h-auto object-cover shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/20 to-transparent pointer-events-none" />
          </div>

          {/* Floating Stats */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-10 end-[-40px] glass-card p-6 rounded-3xl shadow-2xl border border-brand-border hidden md:flex items-center gap-6 z-20"
          >
            <div className="flex items-center gap-4 pe-6 border-e border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Zap size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-brand-muted uppercase">{L({ ar: 'الاستجابة', en: 'Latency', fr: 'Latence', es: 'Latencia' })}</div>
                <div className="text-sm font-black text-brand-text">45ms</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Shield size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-brand-muted uppercase">{L({ ar: 'الأمان', en: 'Security', fr: 'Sécurité', es: 'Seguridad' })}</div>
                <div className="text-sm font-black text-brand-text">{L({ ar: 'مشفر', en: 'Encrypted', fr: 'Chiffré', es: 'Cifrado' })}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardShowcase;
