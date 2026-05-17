import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Copy, Code, Layers, Search, Server } from "lucide-react";
import { Button } from "./ui/Button";

const ApiPlayground = () => {
  const { t } = useTranslation();

  const endpoints = [
    { method: 'GET', path: '/api/v2/events', description: t('dev_portal.playground.ep_events', 'عرض قائمة الفعاليات النشطة'), params: ['limit', 'offset'] },
    { method: 'POST', path: '/api/v2/participants/checkin', description: t('dev_portal.playground.ep_checkin', 'تسجيل دخول مشارك جديد'), body: '{ "qr_code": "...", "location_id": "..." }' },
    { method: 'GET', path: '/api/v2/analytics/heatmap', description: t('dev_portal.playground.ep_heatmap', 'جلب بيانات الخريطة الحرارية المباشرة'), params: ['event_id'] },
  ];

  const [selectedPath, setSelectedPath] = useState(endpoints[0].path);
  const selectedEndpoint = endpoints.find(ep => ep.path === selectedPath) || endpoints[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
      {/* Sidebar: Endpoints List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-sm focus:border-emerald-500/50 transition-all outline-none text-white font-medium"
            placeholder={t('dev_portal.playground.search_placeholder', 'البحث عن نقطة نهاية...')}
          />
        </div>

        <div className="space-y-3">
          {endpoints.map((ep) => (
            <button
              key={ep.path}
              onClick={() => setSelectedPath(ep.path)}
              className={`w-full text-right p-5 rounded-[2rem] border transition-all duration-500 group relative overflow-hidden ${selectedPath === ep.path ? 'bg-emerald-500/10 border-emerald-500/30 shadow-2xl shadow-emerald-900/20' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {ep.method}
                </span>
                <span className="text-sm font-mono text-white/90 truncate">{ep.path}</span>
              </div>
              <p className="text-xs text-slate-500 font-bold pr-1 relative z-10">{ep.description}</p>
              
              {selectedPath === ep.path && (
                <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main: Playground Area */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-xl">
          {/* Endpoint Details */}
          <div className="p-10 border-b border-white/5 bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-white">{t('dev_portal.playground.request_details', 'تفاصيل الطلب')}</h3>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-10 py-6 h-auto font-black shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                <Play className="w-5 h-5 ml-2" /> {t('dev_portal.playground.run_request', 'تنفيذ الطلب')}
              </Button>
            </div>

            <div className="bg-black/40 p-6 rounded-[2rem] border border-white/10 font-mono text-sm flex items-center justify-between gap-4 group">
              <span className="text-slate-300 truncate">
                <span className="text-emerald-500 font-black ml-2">{selectedEndpoint.method}</span> 
                <span className="opacity-50">https://api.diwan.event</span>{selectedEndpoint.path}
              </span>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 transition-colors shrink-0" onClick={() => navigator.clipboard.writeText(`https://api.diwan.event${selectedEndpoint.path}`)}>
                <Copy className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </Button>
            </div>
          </div>

          {/* Request/Response View */}
          <div className="p-10 grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2">
                <Code className="w-4 h-4 text-emerald-500" /> {t('dev_portal.playground.curl_label', 'شفرة الاستدعاء (cURL)')}
              </div>
              <div className="bg-black/60 rounded-[2.5rem] p-8 font-mono text-xs text-emerald-400/90 h-[320px] overflow-auto border border-white/5 scrollbar-thin scrollbar-thumb-white/10">
                <pre className="leading-relaxed">
{`curl -X ${selectedEndpoint.method} \\
  'https://api.diwan.event${selectedEndpoint.path}' \\
  -H 'Authorization: Bearer DW_KEY_...' \\
  -H 'Content-Type: application/json' ${selectedEndpoint.body ? `\\
  -d '${selectedEndpoint.body}'` : ''}`}
                </pre>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2">
                <Layers className="w-4 h-4 text-indigo-400" /> {t('dev_portal.playground.response_label', 'استجابة الخادم المتوقعة')}
              </div>
              <div className="bg-slate-950/80 rounded-[2.5rem] p-8 font-mono text-xs text-indigo-300 h-[320px] overflow-auto border border-white/5 scrollbar-thin scrollbar-thumb-white/10">
                <pre className="leading-relaxed">
{`{
  "status": "success",
  "data": {
    "id": "evt_7k9m2p1",
    "timestamp": "2026-05-03T18:30:00Z",
    "message": "تمت العملية بنجاح تام"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-amber-500/20 rounded-[1.5rem] text-amber-500 border border-amber-500/20">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-black text-white text-xl mb-1">{t('dev_portal.playground.auth_title', 'وضع المصادقة الحالية')}</h4>
              <p className="text-sm text-slate-500 font-bold">{t('dev_portal.playground.auth_desc', 'يتم استخدام "مفتاح الاختبار" التلقائي لتجربة واجهة البرمجة.')}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black h-14 px-8 font-black transition-all">
            {t('dev_portal.playground.change_key', 'تغيير مفتاح الاختبار')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
