import React from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, QrCode, Smartphone, CheckCircle, FileText, Download } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const HowItWorks = () => {
  const { L, isRtl } = useLang();

  const steps = [
    {
      id: 1,
      title: L({ ar: "أضف قائمة المشاركين", en: "Add Participant List", fr: "Importez la Liste", es: "Añada la Lista" }),
      desc: L({ 
        ar: "Excel Import → QR تلقائي → بريد تأكيد", 
        en: "Excel Import → Auto QR → Confirmation Email",
        fr: "Import Excel → QR Auto → Email de Confirmation",
        es: "Importación Excel → QR Auto → Email de Confirmación"
      }),
      icon: FileSpreadsheet,
      visual: (
        <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <FileSpreadsheet size={40} className="text-emerald-500" />
            </div>
            <motion.div 
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-brand-secondary"
            >
                <QrCode size={24} />
            </motion.div>
        </div>
      )
    },
    {
      id: 2,
      title: L({ ar: "افتح بوابة الدخول", en: "Open the Entrance Gate", fr: "Ouvrez le Contrôle", es: "Abra el Control" }),
      desc: L({ 
        ar: "Scanner يعمل · Dashboard مباشر · بدون إنترنت", 
        en: "Scanner active · Live Dashboard · Works Offline",
        fr: "Scanner actif · Dashboard en direct · Hors ligne",
        es: "Escáner activo · Dashboard en vivo · Offline"
      }),
      icon: Smartphone,
      visual: (
        <div className="relative">
            <div className="p-4 bg-brand-primary/20 rounded-xl border border-brand-primary/30">
                <Smartphone size={40} className="text-brand-primary" />
            </div>
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-brand-secondary rounded-full flex items-center justify-center text-brand-dark"
            >
                <CheckCircle size={16} />
            </motion.div>
        </div>
      )
    },
    {
      id: 3,
      title: L({ ar: "صدّر تقاريرك", en: "Export Your Reports", fr: "Exportez vos Rapports", es: "Exporte sus Informes" }),
      desc: L({ 
        ar: "PDF · Excel · شهادات · إحصائيات", 
        en: "PDF · Excel · Certificates · Stats",
        fr: "PDF · Excel · Certificats · Stats",
        es: "PDF · Excel · Certificados · Stats"
      }),
      icon: FileText,
      visual: (
        <div className="flex flex-col items-center gap-2">
            <div className="p-4 bg-brand-secondary/20 rounded-xl border border-brand-secondary/30">
                <FileText size={40} className="text-brand-secondary" />
            </div>
            <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-brand-muted"
            >
                <Download size={20} />
            </motion.div>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 bg-brand-dark relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-transparent via-brand-primary/20 to-transparent hidden lg:block" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-brand-text mb-6">
            {L({ ar: "من الصفر للفعالية في 3 خطوات", en: "From Zero to Event in 3 Steps", fr: "Votre Événement en 3 Étapes", es: "Su Evento en 3 Pasos" })}
          </h2>
        </div>

        <div className="space-y-24">
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className={`flex-1 ${idx % 2 !== 0 ? (isRtl ? 'lg:text-left' : 'lg:text-right') : (isRtl ? 'lg:text-right' : 'lg:text-left')} text-center lg:text-inherit`}>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-secondary text-brand-dark text-3xl font-black rounded-full mb-6 shadow-2xl">
                    {step.id}
                  </div>
                  <h3 className="text-3xl font-black text-brand-text mb-4">{step.title}</h3>
                  <p className="text-xl text-brand-muted max-w-md mx-auto lg:mx-0">{step.desc}</p>
              </div>

              <div className="flex-1 flex justify-center">
                  <div className="w-64 h-64 glass-card rounded-[3rem] flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-brand-primary/5 rounded-[3rem] blur-2xl" />
                      {step.visual}
                  </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
