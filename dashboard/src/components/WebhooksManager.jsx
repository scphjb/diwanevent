import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Webhook, Plus, ExternalLink, Activity, ToggleLeft as Toggle, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

const WebhooksManager = () => {
  const { t } = useTranslation();
  const webhooks = [
    { 
      id: '1', 
      url: 'https://api.zapier.com/hooks/catch/12345', 
      events: [t('dev_portal.webhooks.event_checkin', 'دخول المشاركين'), t('dev_portal.webhooks.event_start', 'بدء الفعالية')], 
      status: 'stable',
      lastDelivery: t('dev_portal.webhooks.two_mins_ago', 'منذ دقيقتين'),
      successRate: '99.8%'
    },
    { 
      id: '2', 
      url: 'https://hooks.slack.com/services/T000/B000', 
      events: [t('dev_portal.webhooks.event_exhibitor', 'التقاط بيانات العارضين')], 
      status: 'warning',
      lastDelivery: t('dev_portal.webhooks.one_hour_ago', 'منذ ساعة'),
      successRate: '85.2%'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">{t('dev_portal.webhooks.heading', 'نقاط الويب هوكس (Webhooks)')}</h2>
          <p className="text-slate-400 font-medium text-sm">{t('dev_portal.webhooks.desc', 'اشترك في أحداث الفعالية المباشرة واستلم التنبيهات فور حدوثها.')}</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-8 py-6 h-auto font-black shadow-lg shadow-indigo-900/20 transition-all hover:scale-105">
          <Plus className="w-5 h-5 ml-2" /> {t('dev_portal.webhooks.add_btn', 'إضافة رابط استلام')}
        </Button>
      </div>

      <div className="grid gap-6">
        {webhooks.map((hook) => (
          <div key={hook.id} className="bg-white/5 border border-white/5 rounded-[3rem] p-10 hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-colors" />
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 relative z-10">
              <div className="flex-1 space-y-6 w-full">
                <div className="flex items-start gap-6 w-full">
                  <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-500">
                    <Webhook className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-white truncate max-w-2xl mb-3 font-mono">{hook.url}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <Badge variant="outline" className={`rounded-full border-0 px-5 py-1.5 font-bold text-xs ${hook.status === 'stable' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                        {hook.status === 'stable' ? <CheckCircle className="w-3 h-3 ml-2" /> : <AlertCircle className="w-3 h-3 ml-2" />}
                        {hook.status === 'stable' ? t('dev_portal.webhooks.status_stable', 'مستقر') : t('dev_portal.webhooks.status_warning', 'تحذير')}
                      </Badge>
                      <span className="text-xs text-slate-500 font-bold flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full">
                        <Activity className="w-3 h-3" /> {t('dev_portal.webhooks.last_delivery', 'آخر إرسال')}: {hook.lastDelivery}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pr-[88px]">
                  {hook.events.map(event => (
                    <span key={event} className="text-[10px] bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/20 font-black uppercase tracking-widest">
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between w-full lg:w-auto gap-12 border-t lg:border-t-0 border-white/5 pt-8 lg:pt-0">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{t('dev_portal.webhooks.success_rate', 'معدل النجاح')}</div>
                  <div className="text-3xl font-black text-white tracking-tighter">{hook.successRate}</div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-indigo-500/10 hover:text-indigo-400">
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:text-rose-500">
                    <Toggle className="w-5 h-5" />
                  </Button>
                  <Button className="h-14 rounded-2xl px-10 bg-white text-black font-black hover:scale-105 transition-all shadow-xl">
                    {t('dev_portal.webhooks.delivery_logs', 'سجلات الإرسال')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebhooksManager;
