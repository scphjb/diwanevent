import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Presentation, 
  Users, 
  Building2, 
  Trophy, 
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/Button';

const SolutionsPage = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';

  const solutions = [
    { 
      icon: Presentation, 
      key: 's1',
      details: [
        "Interactive Session Management",
        "Speaker & Agenda Portal",
        "Live Q&A and Polling",
        "Attendee Engagement Analytics"
      ]
    },
    { 
      icon: Users, 
      key: 's2',
      details: [
        "Advanced Lead Retrieval",
        "Exhibitor Dashboard",
        "Floor Plan Integration",
        "Sponsorship Management"
      ]
    },
    { 
      icon: Building2, 
      key: 's3',
      details: [
        "Global Infrastructure Support",
        "SSO & Security Compliance",
        "Custom Workflow Automation",
        "Dedicated Support Team"
      ]
    },
    { 
      icon: Trophy, 
      key: 's4',
      details: [
        "Gamification & Leaderboards",
        "AI Networking Engine",
        "Seamless Check-in Flow",
        "Post-Event Impact Reports"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col overflow-hidden">
      <Header />
      
      <main className="flex-grow pt-32 lg:pt-48 pb-24 relative">
        {/* Background Orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[150px] -mr-40 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-secondary/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-secondary/10 border border-brand-secondary/20 mb-8"
            >
              <Sparkles className="text-brand-secondary w-4 h-4" />
              <span className="text-brand-secondary text-[10px] font-black uppercase tracking-[0.2em]">
                {t('landing.common_labels.solutions_badge')}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black text-white leading-tight mb-8"
            >
              {t('landing.solutions.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-brand-muted text-xl leading-relaxed"
            >
              {t('landing.common_labels.solutions_desc')}
            </motion.p>
          </div>

          {/* Solutions Grid */}
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {solutions.map((solution, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="group bg-white/5 border border-white/10 rounded-[48px] p-10 md:p-12 hover:bg-white/[0.08] hover:border-brand-secondary/30 transition-all duration-500 shadow-2xl"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="shrink-0">
                    <div className="w-20 h-20 rounded-3xl bg-brand-dark flex items-center justify-center border border-white/10 group-hover:bg-brand-secondary group-hover:border-brand-secondary transition-all duration-500 shadow-xl">
                      <solution.icon className="text-white group-hover:scale-110 transition-transform" size={36} />
                    </div>
                  </div>
                  <div className="space-y-6 flex-grow">
                    <h2 className="text-3xl font-black text-white group-hover:text-brand-secondary transition-colors">
                      {t(`landing.solutions.${solution.key}.title`)}
                    </h2>
                    <p className="text-brand-muted leading-relaxed">
                      {t(`landing.solutions.${solution.key}.desc`)}
                    </p>
                    
                    <ul className="grid sm:grid-cols-2 gap-4 pt-4">
                      {solution.details.map((detail, j) => (
                        <li key={j} className="flex items-center gap-3 text-sm text-white/60">
                          <CheckCircle2 size={16} className="text-brand-secondary shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-8">
                      <Link to="/request-demo">
                        <Button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl px-8 h-14 font-bold transition-all flex items-center gap-3">
                          {t('landing.nav.request_demo')}
                          <ArrowRight className={cn("transition-transform group-hover:translate-x-1", isRtl ? "rotate-180" : "")} size={18} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-32 p-12 md:p-24 bg-gradient-to-br from-brand-primary/20 to-transparent border border-white/10 rounded-[60px] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                {t('landing.cta_final.title')}
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary/90 text-white h-20 px-12 rounded-3xl text-xl font-black shadow-2xl shadow-brand-primary/20">
                    {t('landing.nav.start_trial')}
                  </Button>
                </Link>
                <Link to="/contact" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 h-20 px-12 rounded-3xl text-xl font-black backdrop-blur-xl">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SolutionsPage;
