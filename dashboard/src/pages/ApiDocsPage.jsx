import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Terminal, Copy, CheckCircle2, Shield, Layers, Key, Server } from 'lucide-react';
import Header from '../components/LandingPage/Header';
import Footer from '../components/LandingPage/Footer';
import { useLang } from '../utils/useLang';
import '../styles/landing.css';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const ApiDocsPage = () => {
  const { L, isRtl } = useLang();
  const [copiedText, setCopiedText] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);

  useEffect(() => {
    document.title = `${L({ ar: 'توثيق الـ API', en: 'API Documentation', fr: 'Documentation API', es: 'Documentación API' })} | Diwan Event`;
    window.scrollTo(0, 0);
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v2/events',
      desc: L({
        ar: 'جلب قائمة الفعاليات النشطة والسابقة المتاحة للمنظم.',
        en: 'Retrieve a list of active and past events available to the organizer.',
        fr: 'Récupérer la liste des événements actifs et passés de l\'organisateur.',
        es: 'Obtener la lista de eventos activos y pasados del organizador.'
      }),
      params: [
        { name: 'limit', type: 'integer', desc: L({ ar: 'عدد النتائج المطلوبة (الافتراضي 20)', en: 'Number of results to return (default 20)', fr: 'Nombre de résultats (par défaut 20)', es: 'Número de resultados (por defecto 20)' }) },
        { name: 'status', type: 'string', desc: L({ ar: 'حالة الفعالية (active | completed)', en: 'Event status (active | completed)', fr: 'Statut de l\'événement (active | completed)', es: 'Estado del evento (active | completed)' }) }
      ],
      curl: `curl -X GET \\
  'https://api.e-diwan.net/api/v2/events?limit=10&status=active' \\
  -H 'Authorization: Bearer DW_KEY_YOUR_SECRET_TOKEN'`,
      response: `{
  "status": "success",
  "data": [
    {
      "id": "evt_7k9m2p1",
      "title": "الجمعية العامة للغرفة الجهوية للمحضرين القضائيين بالشرق",
      "date": "2026-05-20",
      "status": "active",
      "attendees_count": 1200
    }
  ]
}`
    },
    {
      method: 'POST',
      path: '/api/v2/participants/checkin',
      desc: L({
        ar: 'تسجيل حضور مشارك باستخدام رمز الاستجابة السريعة (QR Code).',
        en: 'Register participant attendance using their QR Code.',
        fr: 'Enregistrer la présence d\'un participant via son code QR.',
        es: 'Registrar asistencia de un participante usando su código QR.'
      }),
      body: `{
  "qr_code": "part_9b2d8e41a",
  "location_id": "loc_main_hall"
}`,
      curl: `curl -X POST \\
  'https://api.e-diwan.net/api/v2/participants/checkin' \\
  -H 'Authorization: Bearer DW_KEY_YOUR_SECRET_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "qr_code": "part_9b2d8e41a",
    "location_id": "loc_main_hall"
  }'`,
      response: `{
  "status": "success",
  "message": "Check-in completed successfully",
  "data": {
    "participant_name": "كمال داودي",
    "checkin_time": "2026-05-20T16:30:12Z",
    "location": "loc_main_hall"
  }
}`
    },
    {
      method: 'GET',
      path: '/api/v2/analytics/heatmap',
      desc: L({
        ar: 'جلب بيانات الحضور المباشرة ومعدلات الدخول لبناء لوحات العرض الحرارية.',
        en: 'Retrieve live attendance data and check-in rates for heatmaps.',
        fr: 'Récupérer les données de présence en direct pour les cartes thermiques.',
        es: 'Obtener datos de asistencia en vivo para mapas de calor.'
      }),
      params: [
        { name: 'event_id', type: 'string', desc: L({ ar: 'رقم الفعالية الفريد (مطلوب)', en: 'Unique event ID (required)', fr: 'ID unique de l\'événement (requis)', es: 'ID único del evento (requerido)' }) }
      ],
      curl: `curl -X GET \\
  'https://api.e-diwan.net/api/v2/analytics/heatmap?event_id=evt_7k9m2p1' \\
  -H 'Authorization: Bearer DW_KEY_YOUR_SECRET_TOKEN'`,
      response: `{
  "status": "success",
  "data": {
    "event_id": "evt_7k9m2p1",
    "total_checked_in": 845,
    "peak_hour": "10:00",
    "density_by_zone": {
      "main_hall": 450,
      "workshop_room_a": 120,
      "cafeteria": 275
    }
  }
}`
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans noise-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-white/5 py-4 pt-24">
        <div className="container mx-auto px-6">
          <nav className="flex items-center gap-2 text-xs text-brand-muted">
            <Link to="/" className="hover:text-brand-secondary transition-colors">{L({ ar: 'الرئيسية', en: 'Home', fr: 'Accueil', es: 'Inicio' })}</Link>
            <ChevronRight size={12} className={isRtl ? 'rotate-180' : ''} />
            <span className="text-brand-text">{L({ ar: 'توثيق الـ API', en: 'API Reference', fr: 'API Reference', es: 'API Reference' })}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,138,106,0.1)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10 max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6">
            <Terminal size={14} />
            <span>{L({ ar: 'واجهة برمجة تطبيقات المطورين', en: 'Developer API Interface', fr: 'Interface API Développeurs', es: 'Interfaz API Desarrolladores' })}</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-brand-text mb-6">
            {L({ ar: 'أدوات المطورين و', en: 'Developer Tools &', fr: 'Outils Développeur &', es: 'Herramientas de API &' })}{' '}
            <span className="text-brand-secondary">API</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-brand-muted text-lg max-w-2xl mx-auto">
            {L({
              ar: 'قم بدمج منصة ديوان وسجلات الحضور والتحليلات مباشرة في أنظمتك الخاصة.',
              en: 'Integrate the Diwan platform, attendance records, and analytics directly into your own systems.',
              fr: 'Intégrez la plateforme Diwan, les présences et les analyses directement dans vos systèmes.',
              es: 'Integre la plataforma Diwan, las asistencias y los análisis directamente en sus sistemas.'
            })}
          </motion.p>
        </div>
      </section>

      {/* API Reference Guide */}
      <main className="relative z-10 pb-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-12">
            
            {/* Left Column: Docs & Details */}
            <div className="lg:col-span-6 space-y-12">
              
              {/* Security & Authentication */}
              <motion.section {...fadeUp} className="glass-card rounded-[2rem] p-8 border border-white/8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-brand-secondary shrink-0">
                    <Shield size={20} />
                  </div>
                  <h2 className="text-xl font-black text-white">{L({ ar: 'المصادقة والأمان', en: 'Authentication & Security', fr: 'Authentification & Sécurité', es: 'Autenticación y Seguridad' })}</h2>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed mb-6">
                  {L({
                    ar: 'جميع طلبات واجهة برمجة التطبيقات تتطلب المصادقة باستخدام مفتاح API سري خاص بك. يتم إرسال المفتاح عبر ترويسة الطلب على النحو التالي:',
                    en: 'All API requests require authentication using your private API secret key. Pass the key in the Authorization header as follows:',
                    fr: 'Toutes les requêtes API nécessitent une authentification avec votre clé secrète API. Envoyez-la dans l\'en-tête :',
                    es: 'Todas las solicitudes API requieren autenticación usando su clave secreta API privada. Envíela en el encabezado:'
                  })}
                </p>
                <div className="bg-black/60 p-4 rounded-xl font-mono text-xs text-brand-secondary border border-white/5 flex items-center justify-between group">
                  <span className="truncate">Authorization: Bearer DW_KEY_YOUR_SECRET_TOKEN</span>
                  <button onClick={() => handleCopy('Authorization: Bearer DW_KEY_YOUR_SECRET_TOKEN', 'auth')} className="text-slate-500 hover:text-white transition-colors shrink-0">
                    {copiedText === 'auth' ? <CheckCircle2 size={14} className="text-brand-primary" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-amber-500 mt-4 leading-relaxed font-bold">
                  {L({
                    ar: '⚠️ تحذير: لا تقم بمشاركة مفتاح الـ API الخاص بك مطلقاً، ولا تضعه في أكواد الواجهة الأمامية العامة.',
                    en: '⚠️ Warning: Never share your API key publicly, and do not embed it in public client-side code.',
                    fr: '⚠️ Attention : Ne partagez jamais votre clé API et ne l\'intégrez pas dans du code côté client.',
                    es: '⚠️ Advertencia: Nunca comparta su clave API públicamente ni la incruste en código del lado del cliente.'
                  })}
                </p>
              </motion.section>

              {/* Rate Limits */}
              <motion.section {...fadeUp} className="glass-card rounded-[2rem] p-8 border border-white/8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shrink-0">
                    <Layers size={20} />
                  </div>
                  <h2 className="text-xl font-black text-white">{L({ ar: 'حدود الطلبات', en: 'Rate Limits', fr: 'Limites de Requêtes', es: 'Límites de Peticiones' })}</h2>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed">
                  {L({
                    ar: 'الحد الافتراضي لمعدل طلبات الـ API هو 60 طلباً في الدقيقة لكل مفتاح. في حال تجاوز الحد المسموح، سيرد الخادم برمز الاستجابة 429 (Too Many Requests). يمكنك طلب زيادة هذا الحد عبر التواصل مع الدعم التقني.',
                    en: 'The default API rate limit is 60 requests per minute per key. If exceeded, the server returns 429 (Too Many Requests). Contact technical support to increase this limit.',
                    fr: 'La limite par défaut est de 60 requêtes par minute. En cas de dépassement, le serveur renvoie une erreur 429. Contactez le support pour augmenter cette limite.',
                    es: 'El límite predeterminado es de 60 peticiones por minuto. Si se excede, el servidor devuelve 429 (Too Many Requests). Contacte al soporte para aumentarlo.'
                  })}
                </p>
              </motion.section>

              {/* API Endpoints List */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white px-2 flex items-center gap-2">
                  <Server size={18} className="text-brand-secondary" />
                  <span>{L({ ar: 'نقاط النهاية المتاحة', en: 'Available Endpoints', fr: 'Points de Terminaison', es: 'Endpoints Disponibles' })}</span>
                </h3>
                
                {endpoints.map((ep, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEndpoint(idx)}
                    className={`w-full text-right p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${selectedEndpoint === idx ? 'bg-brand-surface/80 border-brand-secondary/40 shadow-xl' : 'bg-brand-surface/30 border-white/5 hover:border-white/15'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${ep.method === 'GET' ? 'bg-brand-primary/20 text-brand-secondary' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        {ep.method}
                      </span>
                      <span className="text-sm font-mono text-white/90">{ep.path}</span>
                    </div>
                    <p className="text-xs text-brand-muted leading-relaxed line-clamp-2 pr-1">{ep.desc}</p>
                    {selectedEndpoint === idx && (
                      <div className="absolute top-0 right-0 w-1 h-full bg-brand-secondary" />
                    )}
                  </button>
                ))}
              </div>

            </div>

            {/* Right Column: Code & Response Playground Simulation */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Request Code Block */}
              <div className="glass-card rounded-[2rem] border border-white/8 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-muted uppercase tracking-widest">
                    <Terminal size={14} className="text-brand-secondary" />
                    <span>{L({ ar: 'رمز الطلب (cURL)', en: 'Request Code (cURL)', fr: 'Exemple de Requête (cURL)', es: 'Ejemplo de Petición (cURL)' })}</span>
                  </div>
                  <button onClick={() => handleCopy(endpoints[selectedEndpoint].curl, 'curl')} className="text-slate-500 hover:text-white transition-colors">
                    {copiedText === 'curl' ? <CheckCircle2 size={14} className="text-brand-primary" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="p-6 bg-black/60 font-mono text-[11px] text-brand-secondary overflow-auto max-h-[250px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                  <pre>{endpoints[selectedEndpoint].curl}</pre>
                </div>
              </div>

              {/* Query/Body Params */}
              {endpoints[selectedEndpoint].params && (
                <div className="glass-card rounded-[2rem] p-6 border border-white/8">
                  <h4 className="text-xs font-black uppercase text-brand-muted tracking-widest mb-4">{L({ ar: 'معاملات الاستعلام (Query Parameters)', en: 'Query Parameters', fr: 'Paramètres', es: 'Parámetros' })}</h4>
                  <div className="space-y-4">
                    {endpoints[selectedEndpoint].params.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-0 last:pb-0 text-xs">
                        <div>
                          <span className="font-mono font-bold text-brand-secondary">{p.name}</span>
                          <span className="mx-2 text-white/30">|</span>
                          <span className="text-slate-500 font-bold">{p.type}</span>
                        </div>
                        <div className="text-brand-muted text-right max-w-[60%]">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {endpoints[selectedEndpoint].body && (
                <div className="glass-card rounded-[2rem] p-6 border border-white/8">
                  <h4 className="text-xs font-black uppercase text-brand-muted tracking-widest mb-4">{L({ ar: 'محتوى الطلب (Request Body - JSON)', en: 'Request Body (JSON)', fr: 'Corps de la Requête (JSON)', es: 'Cuerpo de la Petición (JSON)' })}</h4>
                  <div className="bg-black/60 p-4 rounded-xl font-mono text-[11px] text-indigo-300 overflow-auto max-h-[200px]">
                    <pre>{endpoints[selectedEndpoint].body}</pre>
                  </div>
                </div>
              )}

              {/* Response Block */}
              <div className="glass-card rounded-[2rem] border border-white/8 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-muted uppercase tracking-widest">
                    <Layers size={14} className="text-brand-primary" />
                    <span>{L({ ar: 'الاستجابة المتوقعة (JSON)', en: 'Expected Response (JSON)', fr: 'Réponse Attendue (JSON)', es: 'Respuesta Esperada (JSON)' })}</span>
                  </div>
                  <button onClick={() => handleCopy(endpoints[selectedEndpoint].response, 'res')} className="text-slate-500 hover:text-white transition-colors">
                    {copiedText === 'res' ? <CheckCircle2 size={14} className="text-brand-primary" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="p-6 bg-black/60 font-mono text-[11px] text-indigo-300 overflow-auto max-h-[300px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                  <pre>{endpoints[selectedEndpoint].response}</pre>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApiDocsPage;
