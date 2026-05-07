import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Building2, Presentation, GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const EventTypesSection = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const eventTypes = [
    {
      title: isRtl ? "المؤتمرات الكبرى" : "Major Conferences",
      icon: Users,
      features: isRtl 
        ? ["إدارة آلاف المشاركين", "توزيع بادجات احترافية", "تحليلات التدفق"] 
        : ["Manage thousands", "Professional badges", "Flow analytics"],
      color: "from-blue-500/20 to-brand-primary/20",
      accent: "text-blue-600"
    },
    {
      title: isRtl ? "الجمعيات العامة" : "General Assemblies",
      icon: Building2,
      features: isRtl 
        ? ["ضبط النصاب القانوني", "تسجيل حضور الأعضاء", "تقارير رسمية فورية"] 
        : ["Quorum control", "Member check-in", "Instant official reports"],
      color: "from-brand-secondary/20 to-orange-500/20",
      accent: "text-brand-secondary"
    },
    {
      title: isRtl ? "المعارض والملتقيات" : "Exhibitions & Forums",
      icon: Presentation,
      features: isRtl 
        ? ["ماسحات متعددة المنافذ", "تتبع زوار الأجنحة", "شهادات حضور رقمية"] 
        : ["Multi-gate scanning", "Booth visitor tracking", "Digital certificates"],
      color: "from-teal-500/20 to-brand-primary/20",
      accent: "text-teal-600"
    },
    {
      title: isRtl ? "ورش العمل" : "Workshops",
      icon: GraduationCap,
      features: isRtl 
        ? ["تسجيل حضور يومي", "إصدار شهادات أوتوماتيكي", "متابعة الحصص"] 
        : ["Daily attendance", "Auto certificate issue", "Session tracking"],
      color: "from-purple-500/20 to-brand-primary/20",
      accent: "text-purple-600"
    }
  ];

  return (
    <section className="py-24 bg-brand-light">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-brand-dark mb-4">
            {isRtl ? "منصة واحدة لكافة أنواع الفعاليات" : "One Platform for All Events"}
          </h2>
          <p className="text-brand-muted max-w-2xl mx-auto">
            {isRtl ? "مهما كان حجم فعاليتك أو طبيعتها، منصة ديوان توفر لك الأدوات المناسبة." : "Whatever the size or nature of your event, Diwan provides the right tools."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {eventTypes.map((type, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8 }}
              className={`p-8 bg-white rounded-3xl border border-brand-primary/5 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${type.color} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className={`p-4 rounded-2xl bg-brand-light ${type.accent} w-fit mb-6 relative z-10`}>
                <type.icon size={32} />
              </div>

              <h3 className="text-xl font-bold text-brand-dark mb-6 relative z-10">
                {type.title}
              </h3>

              <ul className="space-y-3 mb-8 relative z-10">
                {type.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-3 text-sm text-brand-muted">
                    <CheckCircle2 size={16} className="text-brand-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="flex items-center gap-2 text-sm font-bold text-brand-primary group-hover:gap-4 transition-all">
                <span>{isRtl ? "اكتشف المزيد" : "Learn More"}</span>
                <ArrowRight size={16} className={isRtl ? "rotate-180" : ""} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventTypesSection;
