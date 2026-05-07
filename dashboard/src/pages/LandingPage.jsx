import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/LandingPage/Header';
import Hero from '../components/LandingPage/Hero';
import LogoMarquee from '../components/LandingPage/LogoMarquee';
import FeatureTabs from '../components/LandingPage/FeatureTabs';
import HowItWorks from '../components/LandingPage/HowItWorks';
import EventTypes from '../components/LandingPage/EventTypes';
import PricingSection from '../components/LandingPage/PricingSection';
import FAQ from '../components/LandingPage/FAQ';
import FinalCTA from '../components/LandingPage/FinalCTA';
import Footer from '../components/LandingPage/Footer';
import EfficiencyMatrix from '../components/LandingPage/EfficiencyMatrix';

import DashboardShowcase from '../components/LandingPage/DashboardShowcase';
import AttendeeAppPreview from '../components/LandingPage/AttendeeAppPreview';
import IntegrationsSection from '../components/LandingPage/IntegrationsSection';
import MetricsSection from '../components/LandingPage/MetricsSection';
import AdditionalFeatures from '../components/LandingPage/AdditionalFeatures';
import AccessFlexibility from '../components/LandingPage/AccessFlexibility';
import EcosystemSection from '../components/LandingPage/EcosystemSection';
import Newsletter from '../components/LandingPage/Newsletter';
import ScrollToTop from '../components/LandingPage/ScrollToTop';
import '../styles/landing.css';
import { useLang } from '../utils/useLang';

const LandingPage = () => {
  const { i18n } = useTranslation();
  const { L } = useLang();

  useEffect(() => {
    // Set document direction based on language
    const currentLang = i18n.language || 'ar';
    const isAr = currentLang === 'ar';
    document.dir = isAr ? 'rtl' : 'ltr';

    // SEO Metadata
    document.title = isAr ? "ديوان إيفنت | منصة إدارة الفعاليات الذكية" : "Diwan Event | Intelligent Event Management Platform";
    
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col text-brand-text overflow-x-hidden selection:bg-brand-secondary selection:text-brand-dark font-sans noise-bg">
      <Header />
      <main className="relative z-10">
        <Hero />
        
        <div className="py-12 bg-brand-dark/50 border-y border-white/5">
            <div className="container mx-auto px-6 overflow-hidden">
                <div className="text-center mb-6 text-[10px] font-black uppercase tracking-[0.4em] text-brand-muted">
                    {L({ ar: 'حلول ذكية مصممة خصيصاً لـ', en: 'SMART SOLUTIONS DESIGNED FOR', fr: 'SOLUTIONS INTELLIGENTES CONÇUES POUR', es: 'SOLUCIONES INTELIGENTES DISEÑADAS PARA' })}
                </div>
                <LogoMarquee />
            </div>
        </div>

        <EfficiencyMatrix />

        <DashboardShowcase />
        <FeatureTabs />
        <HowItWorks />
        <AccessFlexibility />
        <AttendeeAppPreview />
        <EventTypes />
        <EcosystemSection />
        <MetricsSection />
        <IntegrationsSection />
        <AdditionalFeatures />
        <PricingSection />
        <FAQ />
        <Newsletter />
        <FinalCTA />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default LandingPage;
