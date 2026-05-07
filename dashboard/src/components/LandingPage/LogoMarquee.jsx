import React from 'react';
import { motion } from 'framer-motion';
import { Landmark, GraduationCap, Users2, Briefcase, Presentation, School } from 'lucide-react';
import { useLang } from '../../utils/useLang';

const LogoMarquee = () => {
  const { L } = useLang();

  const sectors = [
    { name: L({ ar: "الوزارات والهيئات الحكومية", en: "Government Ministries", fr: "Ministères et Institutions", es: "Ministerios e Instituciones" }), icon: Landmark },
    { name: L({ ar: "الجامعات والمراكز البحثية", en: "Universities & Research", fr: "Universités et Recherche", es: "Universidades e Investigación" }), icon: GraduationCap },
    { name: L({ ar: "المنظمات والاتحادات المهنية", en: "Professional Unions", fr: "Ordres et Syndicats Professionnels", es: "Colegios y Asociaciones Profesionales" }), icon: Users2 },
    { name: L({ ar: "شركات تنظيم الفعاليات", en: "Event Management Firms", fr: "Agences Événementielles", es: "Agencias de Eventos" }), icon: Briefcase },
    { name: L({ ar: "مراكز التدريب والتعليم", en: "Training & Education", fr: "Formation et Éducation", es: "Formación y Educación" }), icon: School },
    { name: L({ ar: "الملتقيات والندوات الدولية", en: "International Symposiums", fr: "Colloques Internationaux", es: "Simposios Internacionales" }), icon: Presentation },
  ];

  // Duplicate for seamless loop
  const displaySectors = [...sectors, ...sectors, ...sectors];

  return (
    <div className="relative flex overflow-hidden py-4 select-none">
      <div className="marquee-slow gap-12 whitespace-nowrap">
        {displaySectors.map((sector, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/5 hover:border-brand-primary/20 transition-all group"
          >
            <sector.icon size={20} className="text-brand-primary/60 group-hover:text-brand-primary transition-colors" />
            <span className="text-sm font-bold text-brand-text/60 group-hover:text-brand-text transition-colors">
              {sector.name}
            </span>
          </div>
        ))}
      </div>
      
      {/* Gradients for fading edges */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-brand-dark to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-brand-dark to-transparent z-10" />
    </div>
  );
};

export default LogoMarquee;
