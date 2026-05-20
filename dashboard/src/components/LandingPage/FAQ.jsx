import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const { L, isRtl } = useLang();

  const faqs = [
    {
      q: L({ 
        ar: "هل تعمل المنصة بدون إنترنت؟", 
        en: "Does it work offline?", 
        fr: "Est-ce que ça fonctionne hors ligne ?", 
        es: "¿Funciona sin conexión?" 
      }),
      a: L({ 
        ar: "نعم — الماسح يعمل على الشبكة المحلية (LAN) وبوابة المشارك تعمل كـ PWA offline. يتم مزامنة البيانات تلقائياً عند عودة الاتصال.", 
        en: "Yes — the scanner works on local LAN and the participant portal works as a PWA offline. Data syncs automatically when reconnected.",
        fr: "Oui — le scanner fonctionne sur le réseau local (LAN) et le portail participant fonctionne en PWA hors ligne. Les données se synchronisent automatiquement.",
        es: "Sí — el escáner funciona en red local (LAN) y el portal del participante funciona como PWA offline. Los datos se sincronizan automáticamente."
      })
    },
    {
      q: L({ 
        ar: "كيف يُعرَّف مشارك جديد؟", 
        en: "How is a new participant identified?", 
        fr: "Comment un nouveau participant est-il identifié ?", 
        es: "¿Cómo se identifica a un nuevo participante?" 
      }),
      a: L({ 
        ar: "عبر استيراد ملف Excel أو التسجيل المباشر عبر الرابط العام. يحصل كل مشارك على رمز QR فريد تلقائياً.", 
        en: "Via Excel import or direct registration through a public link. Each participant gets a unique QR code automatically.",
        fr: "Via l'import Excel ou l'inscription directe via un lien public. Chaque participant reçoit automatiquement un code QR unique.",
        es: "A través de la importación de Excel o registro directo mediante un enlace público. Cada participante recibe automáticamente un código QR único."
      })
    },
    {
      q: L({ 
        ar: "هل الشهادات قانونية؟", 
        en: "Are the certificates legal?", 
        fr: "Les certificats sont-ils légaux ?", 
        es: "¿Son legales los certificados?" 
      }),
      a: L({ 
        ar: "تحمل الشهادات شعار جهتك، تاريخ الفعالية، ورمز QR للتحقق السريع. صالحة كوثيقة رسمية قابلة للتحقق إلكترونياً.", 
        en: "Certificates bear your entity's logo, event date, and a quick verification QR. Valid as an electronically verifiable official document.",
        fr: "Les certificats portent le logo de votre entité, la date et un QR de vérification. Valables comme document officiel vérifiable.",
        es: "Los certificados llevan el logo de su entidad, fecha y un QR de verificación rápida. Válidos como documento oficial verificable."
      })
    },
    {
      q: L({ 
        ar: "ماذا لو فاق عدد المشاركين الـ plan؟", 
        en: "What if participants exceed the plan?", 
        fr: "Que se passe-t-il si le nombre dépasse le forfait ?", 
        es: "¿Qué pasa si los asistentes superan el plan?" 
      }),
      a: L({ 
        ar: "ستتلقى إشعاراً فورياً وتستطيع الترقية بلحظتها. نضمن عدم انقطاع الخدمة أثناء الفعالية.", 
        en: "You'll get an instant notification and can upgrade immediately. We ensure no service disruption during the event.",
        fr: "Vous recevrez une notification instantanée et pourrez upgrader immédiatement. Pas d'interruption de service pendant l'événement.",
        es: "Recibirá una notificación instantánea y podrá subir de plan al momento. Garantizamos que no haya interrupción del servicio."
      })
    },
    {
      q: L({ 
        ar: "هل يوجد دعم عربي؟", 
        en: "Is there Arabic support?", 
        fr: "Y a-t-il un support en français ?", 
        es: "¿Hay soporte en español?" 
      }),
      a: L({ 
        ar: "نعم — المنصة بالكامل عربية-أولاً (Arabic-first) مع دعم فني متكامل باللغة العربية، والفرنسية والإنجليزية أيضاً.", 
        en: "Yes — the platform is fully multilingual with comprehensive technical support in Arabic, French, Spanish and English.",
        fr: "Oui — la plateforme est multilingue avec un support technique complet en français, arabe, espagnol et anglais.",
        es: "Sí — la plataforma es multilingüe con soporte técnico completo en español, árabe, francés e inglés."
      })
    }
  ];

  return (
    <section className="py-32 bg-brand-dark relative overflow-hidden" id="faq" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-6 max-w-4xl">
        
        <div className={`flex items-center gap-4 mb-16 ${isRtl ? 'justify-center' : 'justify-center'}`}>
            <div className="p-3 bg-brand-primary/20 rounded-2xl text-brand-primary">
                <HelpCircle size={32} />
            </div>
            <h2 className="text-4xl font-black text-brand-text">
                {L({ ar: "الأسئلة الشائعة", en: "Frequently Asked Questions", fr: "Foire Aux Questions", es: "Preguntas Frecuentes" })}
            </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="glass-card rounded-[2rem] overflow-hidden border-brand-border"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-8 text-start"
              >
                <span className={`text-xl font-bold transition-colors ${openIndex === idx ? 'text-brand-secondary' : 'text-brand-text'}`}>
                  {faq.q}
                </span>
                <div className={`p-2 rounded-full transition-all ${openIndex === idx ? 'bg-brand-secondary text-brand-dark rotate-180' : 'bg-white/5 text-brand-muted'}`}>
                  {openIndex === idx ? <Minus size={20} /> : <Plus size={20} />}
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-8 pb-8 text-brand-muted leading-relaxed text-lg border-t border-white/5 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
