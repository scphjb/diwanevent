import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../utils/useLang';

const FinalCTA = () => {
  const { L, isRtl } = useLang();
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-brand-dark overflow-hidden relative noise-bg">
      <div className="container mx-auto px-6 relative z-10">
        
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-brand-primary to-brand-surface rounded-[4rem] p-12 md:p-24 text-center border border-white/10 shadow-[0_50px_100px_-20px_rgba(26,138,106,0.3)] overflow-hidden"
        >
            {/* Animated Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/20 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full" />

            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 text-brand-text text-sm font-bold mb-8 shimmer">
                    <Sparkles size={18} className="text-brand-secondary" />
                    <span>{L({ ar: 'جاهز للانطلاق؟', en: 'Ready to Launch?', fr: 'Prêt à commencer ?', es: '¿Listo para empezar?' })}</span>
                </div>

                <h2 className="text-4xl md:text-6xl font-black text-brand-text mb-8 leading-tight">
                    {L({ 
                        ar: <>فعاليتك القادمة تستحق <br /> أفضل من الورق والقلم</>,
                        en: <>Your next event deserves <br /> better than pen and paper</>,
                        fr: <>Votre prochain événement mérite <br /> mieux que le papier-crayon</>,
                        es: <>Su próximo evento merece <br /> algo mejor que papel y lápiz</>
                    })}
                </h2>

                <p className="text-xl text-white/70 max-w-2xl mx-auto mb-12">
                    {L({ 
                        ar: "كن من بين الرواد الأوائل الذين سيعتمدون ديوان لإدارة فعالياتهم بأعلى مستوى من الاحترافية والدقة الرقمية.", 
                        en: "Be among the first pioneers to adopt Diwan for managing your events with the highest level of digital professionalism and accuracy.",
                        fr: "Soyez parmi les premiers pionniers à adopter Diwan pour gérer vos événements avec le plus haut niveau de professionnalisme numérique.",
                        es: "Sea uno de los primeros pioneros en adoptar Diwan para gestionar sus eventos con el más alto nivel de profesionalismo digital."
                    })}
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <button 
                        onClick={() => navigate('/register')}
                        className={`px-10 py-5 bg-brand-secondary text-brand-dark text-xl font-black rounded-full shadow-2xl hover:bg-brand-gold-light hover:scale-105 transition-all flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}
                    >
                        <span>{L({ ar: 'ابدأ مجاناً — بدون بطاقة', en: 'Start for Free Now', fr: 'Commencer gratuitement', es: 'Empezar gratis ahora' })}</span>
                        <ArrowRight size={22} className={isRtl ? 'rotate-180' : ''} />
                    </button>
                    <button className="text-lg font-bold text-brand-text underline underline-offset-8 hover:text-brand-secondary transition-colors">
                        {L({ ar: 'تحدث مع فريقنا', en: 'Talk to our team', fr: 'Parler à l\'équipe', es: 'Hablar con el equipo' })}
                    </button>
                </div>
            </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FinalCTA;
