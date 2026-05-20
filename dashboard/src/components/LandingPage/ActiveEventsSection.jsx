import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Sparkles, Loader2, UserCheck, Lock, CheckCircle, Clock } from 'lucide-react';
import { useLang } from '../../utils/useLang';
import eventService from '../../services/eventService';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

// ─── تحديد حالة الفعالية بالنسبة للتاريخ ──────────────────────────────────────
const getEventTimeStatus = (eventDate) => {
  if (!eventDate) return 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(eventDate);
  if (date < today) return 'past';
  if (date.toDateString() === today.toDateString()) return 'today';
  return 'upcoming';
};

const ActiveEventsSection = () => {
  const { L, isRtl } = useLang();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | upcoming | past

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventService.getPublicActiveEvents();
        setEvents(data || []);
      } catch (err) {
        console.error("Failed to load public events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Mock events للعرض إذا لم تكن هناك فعاليات من السيرفر
  const mockEvents = [
    {
      id: 1,
      event_name: L({ ar: "المؤتمر السنوي للتكنولوجيا والابتكار 2026", en: "Annual Tech & Innovation Summit 2026", fr: "Sommet Annuel Tech & Innovation 2026", es: "Cumbre Anual de Tecnología e Innovación 2026" }),
      event_date: "2026-07-25",
      location: L({ ar: "قصر المؤتمرات، الجزائر العاصمة", en: "Palais des Congrès, Algiers", fr: "Palais des Congrès, Alger", es: "Palais des Congrès, Argel" }),
      app_subtitle: L({ ar: "بوابة التسجيل للوفود والمحاضرين", en: "Registration portal for delegates and speakers", fr: "Portail d'inscription des délégués", es: "Portal de registro para delegados" }),
      organizer_text: L({ ar: "وزارة الرقمنة والإحصاء", en: "Ministry of Digitalization", fr: "Ministère de la Numérisation", es: "Ministerio de Digitalización" }),
      logo_url: null,
      primary_color: "#1A8A6A",
      registration_enabled: true,
    },
    {
      id: 2,
      event_name: L({ ar: "الجمعية العامة العادية للغرفة الجهوية للمحضرين القضائيين بالشرق", en: "Regional Chamber of Judicial Officers — East General Assembly", fr: "AG de la Chambre Régionale des Huissiers de Justice de l'Est", es: "AG Cámara Regional Funcionarios Judiciales del Este" }),
      event_date: "2026-05-10",
      location: L({ ar: "قاعة الاجتماعات الكبرى، قسنطينة", en: "Grand Hall, Constantine", fr: "Grande Salle, Constantine", es: "Gran Salón, Constantina" }),
      app_subtitle: L({ ar: "التصويت وتأكيد الحضور الرقمي", en: "Voting and digital attendance confirmation", fr: "Vote et confirmation de présence", es: "Votación y confirmación de asistencia" }),
      organizer_text: L({ ar: "غرفة المحضرين القضائيين – جهة الشرق", en: "Chamber of Judicial Officers – East Region", fr: "Chambre des Huissiers – Région Est", es: "Cámara de Funcionarios – Región Este" }),
      logo_url: null,
      primary_color: "#D4AF37",
      registration_enabled: false,
    },
  ];

  const displayEvents = events.length > 0 ? events : mockEvents;

  // ─── فلترة الفعاليات ──────────────────────────────────────────────────────
  const filteredEvents = displayEvents.filter(evt => {
    const ts = getEventTimeStatus(evt.event_date);
    if (filter === 'upcoming') return ts === 'upcoming' || ts === 'today';
    if (filter === 'past') return ts === 'past';
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return L({ ar: 'يحدد لاحقاً', en: 'TBD', fr: 'À déterminer', es: 'Por determinar' });
    try {
      return new Date(dateStr).toLocaleDateString(isRtl ? 'ar-DZ' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return dateStr; }
  };

  // ─── بادج الحالة الزمنية ────────────────────────────────────────────────────
  const TimeBadge = ({ eventDate }) => {
    const ts = getEventTimeStatus(eventDate);
    if (ts === 'today') return (
      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
        {L({ ar: 'اليوم', en: 'Today', fr: "Aujourd'hui", es: 'Hoy' })}
      </span>
    );
    if (ts === 'upcoming') return (
      <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
        <Clock size={10} />
        {L({ ar: 'قادمة', en: 'Upcoming', fr: 'À venir', es: 'Próximo' })}
      </span>
    );
    return (
      <span className="px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/30 text-slate-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
        <CheckCircle size={10} />
        {L({ ar: 'مكتملة', en: 'Completed', fr: 'Terminé', es: 'Completado' })}
      </span>
    );
  };

  return (
    <section id="public-events" className="py-24 bg-brand-dark/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">

        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary/15 rounded-full border border-brand-secondary/30 text-brand-secondary text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles size={12} className="animate-pulse" />
            <span>{L({ ar: 'دليل الفعاليات', en: 'EVENTS DIRECTORY', fr: 'RÉPERTOIRE DES ÉVÉNEMENTS', es: 'DIRECTORIO DE EVENTOS' })}</span>
          </motion.div>

          <motion.h2 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black text-brand-text mb-4">
            {L({ ar: 'فعاليات مُدارة بمنصة ديوان', en: 'Events Powered by Diwan', fr: 'Événements sur Diwan', es: 'Eventos en Diwan' })}
          </motion.h2>

          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted text-lg max-w-xl mx-auto leading-relaxed mb-8">
            {L({
              ar: 'اكتشف الفعاليات المقامة عبر المنصة. إذا كان التسجيل مفتوحاً انضم الآن، وإن كان مغلقاً تصفح معلومات الفعالية.',
              en: 'Discover events powered by Diwan. Register if open, or browse event info if registration is closed.',
              fr: 'Découvrez les événements sur Diwan. Inscrivez-vous si ouvert, ou consultez les infos.',
              es: 'Descubre eventos en Diwan. Regístrate si está abierto o consulta la información del evento.',
            })}
          </motion.p>

          {/* ─── Filter Tabs ───────────────────────────────────────────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1">
            {[
              { key: 'all',      label: L({ ar: 'الكل', en: 'All', fr: 'Tout', es: 'Todo' }) },
              { key: 'upcoming', label: L({ ar: 'القادمة', en: 'Upcoming', fr: 'À venir', es: 'Próximos' }) },
              { key: 'past',     label: L({ ar: 'المنتهية', en: 'Past', fr: 'Passés', es: 'Pasados' }) },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  filter === tab.key
                    ? 'bg-brand-secondary text-brand-dark shadow-lg'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        </div>

        {/* ─── Events Grid ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-brand-secondary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <motion.div {...fadeUp} className="text-center py-16 text-brand-muted">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-bold">{L({ ar: 'لا توجد فعاليات في هذا الفلتر', en: 'No events in this filter', fr: 'Aucun événement', es: 'Sin eventos' })}</p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredEvents.map((evt, idx) => {
              const isOpen = evt.registration_enabled;
              const timeStatus = getEventTimeStatus(evt.event_date);
              const isPast = timeStatus === 'past';

              return (
                <motion.div
                  key={evt.id}
                  {...fadeUp}
                  transition={{ delay: idx * 0.1 }}
                  style={{ borderColor: isPast ? undefined : `${evt.primary_color}33` }}
                  className={`p-7 rounded-[2.5rem] border flex flex-col justify-between group relative overflow-hidden transition-all duration-500 ${
                    isPast
                      ? 'bg-white/3 border-white/5 opacity-70 hover:opacity-90'
                      : 'bg-brand-surface/20 border-white/5 glass-card hover:border-brand-secondary/40'
                  }`}
                >
                  {/* Glow spot */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-10 rounded-full pointer-events-none"
                    style={{ backgroundColor: evt.primary_color || '#D4AF37' }}
                  />

                  {/* ─── Top Row ─── */}
                  <div>
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        {evt.logo_url ? (
                          <img src={evt.logo_url} alt={evt.event_name} className="w-8 h-8 object-contain rounded-lg" />
                        ) : (
                          <UserCheck className="w-5 h-5" style={{ color: evt.primary_color || '#D4AF37' }} />
                        )}
                      </div>
                      <TimeBadge eventDate={evt.event_date} />
                    </div>

                    <h3 className="text-lg font-black text-brand-text mb-2 group-hover:text-brand-secondary transition-colors leading-snug line-clamp-3">
                      {evt.event_name}
                    </h3>

                    {evt.organizer_text && (
                      <p className="text-brand-muted text-xs font-semibold mb-4 line-clamp-1">
                        🏛 {evt.organizer_text}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="space-y-2 text-xs text-brand-muted font-semibold mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-brand-secondary shrink-0" />
                        <span>{formatDate(evt.event_date)}</span>
                      </div>
                      {evt.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-brand-primary shrink-0" />
                          <span className="line-clamp-1">{evt.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── Action Button ─── */}
                  {isOpen && !isPast ? (
                    <button
                      onClick={() => navigate(`/register/${evt.id}`)}
                      className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 hover:scale-[1.02]"
                      style={{
                        backgroundColor: evt.primary_color || '#D4AF37',
                        color: '#022C22',
                        boxShadow: `0 8px 24px ${evt.primary_color}30`,
                      }}
                    >
                      <span>{L({ ar: 'سجّل الآن', en: 'Register Now', fr: "S'inscrire", es: 'Inscribirse' })}</span>
                      <ArrowRight size={15} className={isRtl ? 'rotate-180' : ''} />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/register/${evt.id}`)}
                      className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-brand-muted hover:bg-white/10 hover:text-brand-text transition-all active:scale-95"
                    >
                      <Lock size={14} />
                      <span>{L({ ar: 'عرض تفاصيل الفعالية', en: 'View Event Details', fr: 'Voir les détails', es: 'Ver detalles' })}</span>
                    </button>
                  )}
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
