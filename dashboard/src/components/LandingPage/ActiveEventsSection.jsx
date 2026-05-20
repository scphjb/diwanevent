import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Sparkles, Loader2, UserCheck } from 'lucide-react';
import { useLang } from '../../utils/useLang';
import eventService from '../../services/eventService';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const ActiveEventsSection = () => {
  const { L, isRtl } = useLang();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventService.getPublicActiveEvents();
        setEvents(data || []);
      } catch (err) {
        console.error("Failed to load active events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Mock events to display if none are fetched from server
  const mockEvents = [
    {
      id: 1,
      event_name: L({ ar: "المؤتمر السنوي للتكنولوجيا والابتكار 2026", en: "Annual Tech & Innovation Summit 2026", fr: "Sommet Annuel Tech & Innovation 2026", es: "Cumbre Anual de Tecnología e Innovación 2026" }),
      event_date: "2026-05-25",
      location: L({ ar: "قصر المؤتمرات، الجزائر العاصمة", en: "Palais des Congrès, Algiers", fr: "Palais des Congrès, Alger", es: "Palais des Congrès, Argel" }),
      app_subtitle: L({ ar: "بوابة التسجيل للوفود والمحاضرين", en: "Registration portal for delegates and speakers", fr: "Portail d'inscription des délégués", es: "Portal de registro para delegados" }),
      logo_url: null,
      primary_color: "#1A8A6A"
    },
    {
      id: 2,
      event_name: L({ ar: "الجمعية العامة العادية للغرفة الجهوية للمحضرين القضائيين بالشرق", en: "Regional Chamber of Judicial Officers of the East General Assembly Meeting", fr: "Assemblée Générale de la Chambre Régionale des Huissiers de Justice de l'Est", es: "Asamblea General de la Cámara Regional de Funcionarios Judiciales del Este" }),
      event_date: "2026-06-12",
      location: L({ ar: "قاعة الاجتماعات الكبرى، قسنطينة", en: "Grand Hall, Constantine", fr: "Grande Salle, Constantine", es: "Gran Salón, Constantina" }),
      app_subtitle: L({ ar: "التصويت وتأكيد الحضور الرقمي", en: "Voting and digital attendance confirmation", fr: "Vote et confirmation de présence", es: "Votación y confirmación de asistencia" }),
      logo_url: null,
      primary_color: "#D4AF37"
    }
  ];

  const displayEvents = events.length > 0 ? events : mockEvents;

  return (
    <section id="public-events" className="py-24 bg-brand-dark/40 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary/15 rounded-full border border-brand-secondary/30 text-brand-secondary text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles size={12} className="animate-pulse" />
            <span>{L({ ar: 'بوابة الحضور والمشاركة', en: 'ATTENDEE & REGISTRATION GATEPORTAL', fr: 'PORTAIL D\'INSCRIPTION', es: 'PORTAL DE REGISTRO' })}</span>
          </motion.div>
          
          <motion.h2 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black text-brand-text mb-6">
            {L({ ar: 'الفعاليات الجارية والمقبلة', en: 'Active & Upcoming Events', fr: 'Événements Actifs & À Venir', es: 'Eventos Activos y Próximos' })}
          </motion.h2>
          
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted text-lg max-w-xl mx-auto leading-relaxed">
            {L({
              ar: 'اختر فعالية مقامة عبر منصتنا وسجل حضورك فوراً للحصول على شارتك الذكية ودخول القاعة.',
              en: 'Select an event powered by our platform and register instantly to claim your smart badge.',
              fr: 'Sélectionnez un événement propulsé par notre plateforme et inscrivez-vous instantanément.',
              es: 'Seleccione un evento impulsado por nuestra plataforma y regístrese al instante.'
            })}
          </motion.p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-brand-secondary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {displayEvents.map((evt, idx) => {
              const borderStyles = evt.primary_color ? { borderColor: `${evt.primary_color}33` } : {};
              const eventDateStr = evt.event_date ? new Date(evt.event_date).toLocaleDateString(isRtl ? 'ar-DZ' : 'en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              }) : L({ ar: 'يحدد لاحقاً', en: 'To be determined', fr: 'À déterminer', es: 'Por determinar' });

              return (
                <motion.div
                  key={evt.id}
                  {...fadeUp}
                  transition={{ delay: idx * 0.15 }}
                  style={borderStyles}
                  className="p-8 rounded-[2.5rem] bg-brand-surface/20 border border-white/5 glass-card hover:border-brand-secondary/40 transition-all duration-500 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle color highlight in corner */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-10 rounded-full"
                    style={{ backgroundColor: evt.primary_color || '#1A8A6A' }}
                  />

                  <div>
                    {/* Event Logo/Badge Icon */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-brand-secondary">
                        {evt.logo_url ? (
                          <img src={evt.logo_url} alt={evt.event_name} className="w-10 h-10 object-contain rounded-lg" />
                        ) : (
                          <UserCheck className="w-6 h-6" style={{ color: evt.primary_color || '#D4AF37' }} />
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-wider">
                        {L({ ar: 'تسجيل مفتوح', en: 'Open Registration', fr: 'Inscription Ouverte', es: 'Registro Abierto' })}
                      </span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-brand-text mb-3 group-hover:text-brand-secondary transition-colors leading-snug">
                      {evt.event_name}
                    </h3>
                    
                    {evt.app_subtitle && (
                      <p className="text-brand-muted text-sm leading-relaxed mb-6">
                        {evt.app_subtitle}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="space-y-3 text-xs text-brand-muted font-semibold mb-8">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-brand-secondary" />
                        <span>{eventDateStr}</span>
                      </div>
                      {evt.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-brand-primary" />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/register/${evt.id}`)}
                    className="w-full py-4 rounded-2xl bg-brand-primary text-brand-dark font-black text-sm flex items-center justify-center gap-2 hover:bg-brand-secondary hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-primary/10 hover:shadow-brand-secondary/20"
                  >
                    <span>{L({ ar: 'سجل حضورك الآن', en: 'Register attendance now', fr: 'S\'inscrire maintenant', es: 'Registrarse ahora' })}</span>
                    <ArrowRight size={16} className={isRtl ? 'rotate-180' : ''} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};

export default ActiveEventsSection;
