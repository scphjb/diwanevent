import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { Terminal, Key, Webhook, Activity, BookOpen, ShieldCheck } from "lucide-react";
import DashboardLayout from '../layouts/DashboardLayout';
import ApiKeysManager from "../components/ApiKeysManager";
import WebhooksManager from "../components/WebhooksManager";
import UsageMonitor from "../components/UsageMonitor";
import ApiPlayground from "../components/ApiPlayground";

const DeveloperPortal = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout activePath="/dashboard/developer">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[#d4af37] mb-1">
              <div className="p-2 bg-[#d4af37]/10 rounded-lg">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-sm font-black uppercase tracking-[0.2em]">{t('dev_portal.title', 'مركز المطورين')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              {t('dev_portal.hero_title', 'ابنِ تطبيقاتك مع')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-amber-500">
                {t('common.app_name', 'ديوان إيفنت')}
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
              {t('dev_portal.hero_subtitle', 'قم بدمج ذكاء الفعاليات المباشر في تطبيقاتك الخاصة باستخدام واجهة برمجة التطبيقات (API) ونظام الـ Webhooks المتطور لدينا.')}
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-brand-primary/5 border border-brand-primary/10 p-6 rounded-[2.5rem] backdrop-blur-3xl flex-1 md:flex-none min-w-[200px]">
              <div className="text-xs text-brand-primary/50 uppercase font-black mb-2 tracking-widest">{t('dev_portal.system_status', 'حالة النظام')}</div>
              <div className="flex items-center gap-3 text-brand-secondary font-black text-lg">
                <div className="w-2.5 h-2.5 bg-brand-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                {t('dev_portal.all_systems_operational', 'جميع الأنظمة تعمل بكفاءة')}
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs defaultValue="keys" className="space-y-10">
          <TabsList className="bg-white/5 p-2 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl flex items-center gap-2 overflow-x-auto no-scrollbar">
            <TabsTrigger value="keys" className="rounded-full px-8 py-4 whitespace-nowrap flex items-center gap-3 data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all duration-500">
              <Key className="w-4 h-4" /> 
              <span className="font-bold">{t('dev_portal.tabs.api_keys', 'مفاتيح API')}</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="rounded-full px-8 py-4 whitespace-nowrap flex items-center gap-3 data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all duration-500">
              <Webhook className="w-4 h-4" /> 
              <span className="font-bold">{t('dev_portal.tabs.webhooks', 'الويب هوكس')}</span>
            </TabsTrigger>
            <TabsTrigger value="monitor" className="rounded-full px-8 py-4 whitespace-nowrap flex items-center gap-3 data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all duration-500">
              <Activity className="w-4 h-4" /> 
              <span className="font-bold">{t('dev_portal.tabs.monitoring', 'المراقبة والاستهلاك')}</span>
            </TabsTrigger>
            <TabsTrigger value="playground" className="rounded-full px-8 py-4 whitespace-nowrap flex items-center gap-3 data-[state=active]:bg-brand-primary data-[state=active]:text-white transition-all duration-500">
              <BookOpen className="w-4 h-4" /> 
              <span className="font-bold">{t('dev_portal.tabs.playground', 'منطقة الاختبار')}</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="keys" className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <ApiKeysManager />
            </TabsContent>

            <TabsContent value="webhooks" className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <WebhooksManager />
            </TabsContent>

            <TabsContent value="monitor" className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <UsageMonitor />
            </TabsContent>

            <TabsContent value="playground" className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <ApiPlayground />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Support Section */}
        <div className="mt-24 p-12 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:bg-brand-primary/10 transition-colors duration-1000" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-right">
            <div className="p-6 bg-brand-primary/10 rounded-[2rem] border border-brand-primary/20 shadow-2xl">
              <ShieldCheck className="w-12 h-12 text-brand-secondary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">{t('dev_portal.support.title', 'هل تحتاج إلى دعم تقني متقدم؟')}</h3>
              <p className="text-slate-400 text-lg">{t('dev_portal.support.subtitle', 'فريق المهندسين لدينا جاهز لمساعدتك في عمليات الربط المعقدة والمخصصة.')}</p>
            </div>
          </div>
          
          <button className="bg-white text-black px-12 py-5 rounded-full font-black text-lg hover:scale-105 hover:bg-brand-secondary transition-all duration-500 shadow-xl relative z-10 whitespace-nowrap">
            {t('dev_portal.support.button', 'تواصل مع دعم المطورين')}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeveloperPortal;
