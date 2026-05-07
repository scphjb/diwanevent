import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const Newsletter = () => {
  const { L, isRtl, lang } = useLang();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      // Simulate API call
      setIsSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section className="py-24 bg-brand-dark relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="glass-card rounded-[3rem] p-12 md:p-20 border border-brand-border overflow-hidden relative">
          
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-secondary/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px]" />

          <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
            
            <div className={`lg:w-1/2 text-center ${isRtl ? 'lg:text-right' : 'lg:text-left'}`}>
              <h2 className={`text-3xl md:text-5xl font-bold text-brand-text mb-6 ${isRtl ? 'leading-relaxed' : 'leading-tight'}`}>
                {L({ ar: "ابقَ على اطلاع بأحدث تقنيات الفعاليات", en: "Stay Ahead with Event Tech Updates", fr: "Restez à la Pointe de la Tech Événementielle", es: "Manténgase al Día con la Tecnología de Eventos" })}
              </h2>
              <p className="text-brand-muted text-lg">
                {L({ 
                  ar: "اشترك في نشرتنا البريدية لتصلك أحدث الميزات وقصص النجاح ونصائح التنظيم الذكي.", 
                  en: "Subscribe to our newsletter for the latest features, success stories, and smart organizing tips.",
                  fr: "Abonnez-vous à notre newsletter pour les dernières fonctionnalités, retours d'expérience et conseils d'organisation.",
                  es: "Suscríbase a nuestro boletín para las últimas funcionalidades, historias de éxito y consejos de organización."
                })}
              </p>
            </div>

            <div className="lg:w-1/2 w-full">
              {isSubscribed ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-brand-primary/10 border border-brand-primary/20 rounded-[2rem] p-8 text-center"
                >
                  <div className="w-16 h-16 bg-brand-primary text-white rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-brand-text mb-2">
                    {L({ ar: "تم الاشتراك بنجاح!", en: "Successfully Subscribed!", fr: "Inscription Réussie !", es: "¡Suscripción Exitosa!" })}
                  </h3>
                  <p className="text-brand-muted">
                    {L({ ar: "شكراً لانضمامك إلينا. ستتلقى رسالة ترحيب قريباً.", en: "Thank you for joining us. You'll receive a welcome email soon.", fr: "Merci de nous rejoindre. Vous recevrez un email de bienvenue sous peu.", es: "Gracias por unirse. Recibirá un email de bienvenida pronto." })}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="relative group">
                  <input 
                    type="email" 
                    required
                    placeholder={L({ ar: "بريدك الإلكتروني", en: "Your Email Address", fr: "Votre Adresse Email", es: "Su Correo Electrónico" })}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-brand-dark/50 border-2 border-white/5 rounded-full py-6 px-10 text-brand-text placeholder:text-brand-muted focus:border-brand-secondary outline-none transition-all pr-32 lg:pr-40"
                  />
                  <button 
                    type="submit"
                    className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-2 bottom-2 bg-brand-secondary text-brand-dark font-black px-8 rounded-full hover:bg-brand-gold-light transition-all flex items-center gap-2`}
                  >
                    <span className="hidden sm:inline">{L({ ar: "اشترك", en: "Subscribe", fr: "S'abonner", es: "Suscribirse" })}</span>
                    <Send size={18} />
                  </button>
                </form>
              )}
              <p className="text-[10px] text-brand-muted mt-6 text-center">
                {L({ 
                  ar: "نحن نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.", 
                  en: "We respect your privacy. You can unsubscribe at any time.",
                  fr: "Nous respectons votre vie privée. Désabonnement possible à tout moment.",
                  es: "Respetamos su privacidad. Puede cancelar su suscripción en cualquier momento."
                })}
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
