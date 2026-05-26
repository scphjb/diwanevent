import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../utils/useLang';

const DashboardMockup = memo(() => {
  const { L } = useLang();
  return (
    <div className="bg-[#0D1527] rounded-2xl p-4 border border-[#D4AF37]/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] transform rotate-2 hover:rotate-0 transition-transform duration-700">
    {/* Header bar */}
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
      <div className="flex gap-2">
        {['#ef4444','#f59e0b','#22c55e'].map((c,i)=>(
          <div key={i} className="w-3 h-3 rounded-full" style={{backgroundColor:c}}/>
        ))}
      </div>
      <div className="text-[10px] text-white/40 font-mono">Diwan Dashboard · Live</div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse"/>
        <span className="text-[10px] text-brand-secondary">{L({ ar: 'مباشر', en: 'Live', fr: 'Direct', es: 'En vivo' })}</span>
      </div>
    </div>
    
    {/* Stats row */}
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        {label: L({ ar: 'الحاضرون', en: 'Attendees', fr: 'Participants', es: 'Asistentes' }), value:'847', color:'#2A64EC'},
        {label: L({ ar: 'في الانتظار', en: 'Waiting', fr: 'En attente', es: 'En espera' }), value:'353', color:'#D4AF37'},
        {label: L({ ar: 'الإجمالي', en: 'Total', fr: 'Total', es: 'Total' }), value:'1,200', color:'#6B7280'},
      ].map((s,i)=>(
        <div key={i} className="bg-black/20 rounded-lg p-2 text-center">
          <div className="text-lg font-black text-white">{s.value}</div>
          <div className="text-[9px] text-white/50">{s.label}</div>
          <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-1 rounded-full"
              style={{backgroundColor:s.color}}
              initial={{width:0}}
              animate={{width:[40,65,85][i]+'%'}}
              transition={{duration:1.5, delay:i*0.2, repeat: Infinity, repeatDelay: 5}}
            />
          </div>
        </div>
      ))}
    </div>
    
    {/* Participant rows (animated) */}
    <div className="space-y-1">
      {[
        L({ ar: 'أحمد بن محمد ✓', en: 'Ahmed M. ✓', fr: 'Ahmed M. ✓', es: 'Ahmed M. ✓' }),
        L({ ar: 'فاطمة زهراء ✓', en: 'Fatima Z. ✓', fr: 'Fatima Z. ✓', es: 'Fatima Z. ✓' }),
        L({ ar: 'كريم بوعلام ✓', en: 'Karim B. ✓', fr: 'Karim B. ✓', es: 'Karim B. ✓' })
      ].map((name,i)=>(
        <motion.div
          key={i}
          initial={{opacity:0, x: -20}}
          animate={{opacity:1, x:0}}
          transition={{delay: 0.5 + i*0.3}}
          className="flex items-center justify-between bg-black/10 rounded px-2 py-1 border border-white/5"
        >
          <span className="text-[11px] text-white/80">{name}</span>
          <span className="text-[9px] text-brand-secondary font-mono">09:{30+i*3}:00</span>
        </motion.div>
      ))}
    </div>
    
    {/* Decorative QR Pattern */}
    <div className="mt-4 flex justify-end opacity-20">
        <div className="w-12 h-12 bg-white/10 rounded p-1">
            <div className="w-full h-full border-2 border-white/50 rounded-sm" />
        </div>
    </div>
  </div>
  );
});

const Hero = () => {
  const { L, isRtl, i18n } = useLang();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-brand-dark noise-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Real Background Image */}
      <div className="absolute inset-0 z-0">
          <img 
            src="/hero_conference_global_1777933989022.png" 
            alt="Conference Background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/80 via-brand-dark/90 to-brand-dark" />
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Right Side (if RTL) / Left Side: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`text-center ${isRtl ? 'lg:text-right' : 'lg:text-left'}`}
        >
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/20 rounded-full border border-brand-primary/30 text-brand-primary text-xs font-black mb-8"
          >
            <Zap size={14} />
            <span>{L({ ar: 'جديد · مدعوم بالذكاء الاصطناعي', en: 'NEW · Powered by AI Insights', fr: 'NOUVEAU · Propulsé par l\'IA', es: 'NUEVO · Impulsado por IA' })}</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black text-brand-text leading-[1.1] mb-6">
            {isRtl ? (
              <>
                إدارة فعاليتك <br />
                <span className="gold-text-gradient font-serif italic font-bold">بأقل جهد</span> <br />
                وأكثر احترافية
              </>
            ) : i18n.language === 'fr' ? (
              <>
                Gérez votre événement <br />
                <span className="gold-text-gradient font-serif italic font-bold">Sans effort</span> <br />
                En toute confiance
              </>
            ) : i18n.language === 'es' ? (
              <>
                Gestione su evento <br />
                <span className="gold-text-gradient font-serif italic font-bold">Sin esfuerzo</span> <br />
                Con total confianza
              </>
            ) : (
              <>
                Manage your event <br />
                <span className="gold-text-gradient font-serif italic font-bold">Effortlessly</span> <br />
                With confidence
              </>
            )}
          </h1>

          <p className="text-brand-muted text-lg md:text-xl mb-10 max-w-xl mx-auto lg:mr-0">
            {L({ 
              ar: "من تسجيل 1,200 مشارك في 40 دقيقة إلى شهادات تلقائية وتحليلات مباشرة — كل ما تحتاجه في منصة واحدة.", 
              en: "From scanning 1,200 attendees in 40 minutes to automated certificates and live analytics — everything you need in one place.",
              fr: "De l'enregistrement de 1 200 participants en 40 minutes aux certificats automatiques et analyses en direct — tout en une seule plateforme.",
              es: "Desde registrar 1.200 asistentes en 40 minutos hasta certificados automáticos y analíticas en vivo — todo en una sola plataforma."
            })}
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-start'}`}>
            <button 
              onClick={() => navigate('/register')}
              className={`px-8 py-4 bg-brand-secondary text-brand-dark font-black rounded-full shadow-2xl shadow-brand-secondary/30 hover:bg-brand-gold-light hover:scale-105 transition-all flex items-center justify-center gap-2 group ${isRtl ? 'flex-row-reverse' : ''}`}
            >
              <span>{L({ ar: 'ابدأ مجاناً — بدون بطاقة', en: 'Start for Free', fr: 'Commencer Gratuitement', es: 'Comenzar Gratis' })}</span>
              <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />
            </button>
            <button className={`px-8 py-4 border border-brand-text/20 text-brand-text font-bold rounded-full hover:bg-white/5 transition-all flex items-center justify-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Play size={18} fill="currentColor" />
              <span>{L({ ar: 'شاهد العرض التوضيحي', en: 'Watch Demo', fr: 'Voir la Démo', es: 'Ver Demo' })}</span>
            </button>
          </div>

          {/* Social Proof Stats */}
          <div className={`mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto ${isRtl ? 'lg:mr-0' : 'lg:ml-0'} border-t border-white/5 pt-10`}>
            {[
              { val: '1,200+', label: L({ ar: 'مشارك', en: 'Attendees', fr: 'Participants', es: 'Asistentes' }) },
              { val: '99.9%', label: L({ ar: 'دقة QR', en: 'QR Accuracy', fr: 'Précision QR', es: 'Precisión QR' }) },
              { val: '< 0.5s', label: L({ ar: 'لكل مسح', en: 'Per Scan', fr: 'Par Scan', es: 'Por Escaneo' }) },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black text-brand-text">{stat.val}</div>
                <div className="text-[10px] text-brand-muted uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual Dashboard Side */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 2 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="absolute -inset-10 bg-brand-primary/20 blur-[100px] rounded-full" />
          <DashboardMockup />
          
          {/* Floating Elements */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className={`absolute -top-10 ${isRtl ? '-left-10' : '-right-10'} bg-brand-surface border border-brand-secondary/20 p-4 rounded-xl shadow-2xl glass-card`}
          >
            <div className="text-[10px] text-brand-muted mb-1">{L({ ar: 'الشهادات المرسلة', en: 'Certs Sent', fr: 'Certs Envoyés', es: 'Certificados Enviados' })}</div>
            <div className="text-xl font-black text-brand-secondary">842</div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
