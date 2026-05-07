import React from 'react';
import { motion } from 'framer-motion';
import {
  XCircle,
  CheckCircle2,
  Clock,
  Zap,
  TrendingDown,
  Timer
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLang } from '../../utils/useLang';

const EfficiencyMatrix = () => {
  const { L, isRtl, i18n } = useLang();

  return (
    <section dir={i18n.dir()} className="py-32 bg-brand-dark relative overflow-hidden noise-bg">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[120px] -ml-64 -mb-64" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-brand-secondary text-sm font-bold mb-6"
          >
            <Timer size={16} />
            <span>{L({ ar: 'تحسين الأداء', en: 'PERFORMANCE OPTIMIZATION', fr: 'OPTIMISATION DES PERFORMANCES', es: 'OPTIMIZACIÓN DE RENDIMIENTO' })}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-6xl font-black text-brand-text mb-8 leading-tight"
            dangerouslySetInnerHTML={{
              __html: L({
                ar: "وفر مئات الساعات <br /> <span class='text-brand-secondary'>من وقت فريقك</span>",
                en: "Save Hundreds of Hours <br /> <span class='text-brand-secondary'>of Team Time</span>",
                fr: "Gagnez des Centaines d'Heures <br /> <span class='text-brand-secondary'>de Temps d'Équipe</span>",
                es: "Ahorre Cientos de Horas <br /> <span class='text-brand-secondary'>de Tiempo del Equipo</span>"
              })
            }}
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-brand-muted text-lg max-w-2xl mx-auto"
          >
            {L({
              ar: "لماذا تضيع الوقت في الطرق التقليدية؟ ديوان إيفنت يقوم بأتمتة كافة العمليات الميدانية ليوفر عليك الجهد والعناء.",
              en: "Why waste time on traditional methods? Diwan Event automates all field operations to save you effort and hassle.",
              fr: "Pourquoi perdre du temps avec les méthodes traditionnelles ? Diwan Event automatise toutes les opérations sur le terrain pour vous épargner des efforts.",
              es: "¿Por qué perder tiempo con métodos tradicionales? Diwan Event automatiza todas las operaciones de campo para ahorrarle esfuerzo y molestias."
            })}
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-stretch max-w-6xl mx-auto">

          {/* Legacy Side */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={cn("p-10 lg:p-16 rounded-[4rem] bg-white/5 border border-white/5 group relative overflow-hidden", isRtl ? "text-right" : "text-left")}
          >
            <div className={`flex items-center gap-4 mb-10 ${isRtl ? 'flex-row' : 'flex-row'}`}>
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white/40">{L({ ar: 'الطرق التقليدية', en: 'Traditional Methods', fr: 'Méthodes Traditionnelles', es: 'Métodos Tradicionales' })}</h3>
                <div className="text-white/20 text-[10px] font-black uppercase tracking-widest">{L({ ar: 'لكل مشارك', en: 'PER PARTICIPANT', fr: 'PAR PARTICIPANT', es: 'POR ASISTENTE' })}</div>
              </div>
            </div>

            <div className="mb-12">
              <div className="text-6xl font-black text-white/10 tracking-tighter mb-4 group-hover:text-red-400/20 transition-colors duration-500">
                {L({ ar: '15+ دقيقة', en: '15+ Minutes', fr: '15+ Minutes', es: '15+ Minutos' })}
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, ease: "linear" }}
                  className="h-full bg-white/10"
                />
              </div>
            </div>

            <ul className="space-y-6">
              {L({
                ar: ["قوائم ورقية", "إدخال بيانات يدوي", "طوابير طويلة", "طباعة بطاقات بطيئة"],
                en: ["Paper lists", "Manual data entry", "Long queues", "Slow badge printing"],
                fr: ["Listes papier", "Saisie de données manuelle", "Longues files d'attente", "Impression lente des badges"],
                es: ["Listas en papel", "Entrada de datos manual", "Largas colas", "Impresión lenta de acreditaciones"]
              }).map((step, i) => (
                <li key={i} className="flex items-center gap-4 text-white/30 font-bold">
                  <XCircle size={20} className="opacity-40 shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Diwan Side */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={cn("p-10 lg:p-16 rounded-[4rem] bg-brand-surface border border-brand-secondary/20 relative overflow-hidden group", isRtl ? "text-right" : "text-left")}
          >
            {/* Background Glow */}
            <div className={cn("absolute top-0 w-64 h-64 bg-brand-secondary/10 rounded-full blur-[100px] -mt-32", isRtl ? "left-0 -ml-32" : "right-0 -mr-32")} />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{L({ ar: 'مع ديوان إيفنت', en: 'With Diwan Event', fr: 'Avec Diwan Event', es: 'Con Diwan Event' })}</h3>
                  <div className="text-brand-secondary text-[10px] font-black uppercase tracking-widest">{L({ ar: 'لكل مشارك', en: 'PER PARTICIPANT', fr: 'PAR PARTICIPANT', es: 'POR ASISTENTE' })}</div>
                </div>
              </div>

              <div className="mb-12">
                <div className="text-6xl font-black text-brand-secondary tracking-tighter mb-4 animate-pulse">
                  {L({ ar: '3 ثوانٍ', en: '3 Seconds', fr: '3 Secondes', es: '3 Segundos' })}
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    whileInView={{ width: "3%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-brand-secondary"
                  />
                </div>
              </div>

              <ul className="space-y-6">
                {L({
                  ar: ["مسح QR فوري", "مزامنة بيانات آلية", "صفر طوابير", "طباعة فائقة السرعة"],
                  en: ["Instant QR scan", "Automatic data sync", "Zero queues", "Ultra-fast printing"],
                  fr: ["Scan QR instantané", "Synchronisation auto", "Zéro file d'attente", "Impression ultra-rapide"],
                  es: ["Escaneo QR instantáneo", "Sincronización automática", "Cero colas", "Impresión ultrarrápida"]
                }).map((step, i) => (
                  <li key={i} className="flex items-center gap-4 text-white/90 font-bold">
                    <CheckCircle2 size={20} className="text-brand-secondary shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>

              {/* Efficiency Savings Badge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-12 p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6 shadow-2xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-secondary flex items-center justify-center text-brand-dark shrink-0">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <div className="text-brand-secondary text-[10px] font-black uppercase tracking-widest">{L({ ar: 'تحسين الكفاءة', en: 'Efficiency Boost', fr: 'Gain d\'Efficacité', es: 'Impulso de Eficiencia' })}</div>
                  <div className="text-white font-bold text-lg">{L({ ar: 'دخول أسرع بـ 300 مرة', en: '300x Faster Check-in', fr: 'Enregistrement 300x plus rapide', es: 'Registro 300 veces más rápido' })}</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default EfficiencyMatrix;
