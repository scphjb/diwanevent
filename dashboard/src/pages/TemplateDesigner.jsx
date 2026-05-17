import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Palette, 
  QrCode, 
  Check,
  Shield,
  Eye,
  UserCheck,
  Sparkles,
  Trophy,
  Layout,
  Type,
  Maximize2,
  Minimize2,
  Calendar,
  MapPin
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import credentialService from '../services/credentialService';
import { useEvent } from '../context/EventContext';
import { cn } from '../utils/cn';
import { toast, Toaster } from 'react-hot-toast';

const PRESET_STYLES = {
  royal: {
    id: 'royal',
    name: 'الملكي (Royal)',
    description: 'تصميم رسمي بقطاع علوي ملون وجسد نقي.',
    icon: Shield,
  },
  corporate: {
    id: 'corporate',
    name: 'المؤسسي (Corporate)',
    description: 'تصميم عصري مع عنوان علوي وشريط جانبي.',
    icon: Layout,
  }
};

const PAGE_SIZES = {
  'A6': { name: 'A6 (105x148mm)', w: 450, h: 636 },
  'CR80': { name: 'CR80 (ID Card)', w: 450, h: 285 },
  'B7': { name: 'B7 (88x125mm)', w: 377, h: 536 },
  'A7': { name: 'A7 (74x105mm)', w: 317, h: 450 },
  'Custom': { name: 'Badge (10x14cm)', w: 425, h: 595 },
};

const DiwanLogo = ({ className, color = "currentColor" }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <div className="relative w-8 h-8 shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full fill-none">
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="1.5" className="opacity-20" />
        <path d="M12 10C12 8.89543 12.8954 8 14 8H22C28.6274 8 34 13.3726 34 20C34 26.6274 28.6274 32 22 32H14C12.8954 32 12 31.1046 12 30V10Z" fill={color} />
        <circle cx="20" cy="20" r="4" fill="white" className="mix-blend-overlay" />
      </svg>
    </div>
    <div className="flex flex-col">
      <span className="text-[14px] font-black tracking-tighter leading-none" style={{ color }}>DIWAN</span>
      <span className="text-[7px] font-bold tracking-[0.3em] opacity-40 uppercase" style={{ color }}>Smart Events</span>
    </div>
  </div>
);

// --- المكون الموحد للبطاقة (النسخة الاحترافية v4.0) ---
const BadgePreview = ({ config, zoom, eventName, lang = 'ar' }) => {
  const { activeStyle, pageSize, headerBg, bodyBg, footerBg, accentColor } = config;
  const isCR80 = pageSize === 'CR80';
  const isAr = lang.startsWith('ar');
  
  const labels = {
    ar: { attendee: 'مشارك معتمد' },
    en: { attendee: 'OFFICIAL DELEGATE' }
  }[isAr ? 'ar' : 'en'];

  const fontClass = isAr ? "font-['Amiri']" : "font-sans";

  return (
    <motion.div 
      key={activeStyle + pageSize + headerBg + bodyBg + footerBg + accentColor}
      initial={{ opacity: 0, scale: 0.8 * zoom }}
      animate={{ opacity: 1, scale: 1 * zoom }}
      className={cn("relative shadow-[0_80px_120px_-30px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-700", fontClass)}
      style={{ 
        width: `${PAGE_SIZES[pageSize].w}px`, 
        height: `${PAGE_SIZES[pageSize].h}px`,
        backgroundColor: bodyBg,
        borderRadius: isCR80 ? '24px' : '8px',
      }}
    >
      <div className="absolute inset-0 flex flex-col">
        
        {/* --- النمط الملكي (Royal) - تكييف للحجم الصغير --- */}
        {activeStyle === 'royal' && (
          <div className="absolute inset-x-0 bottom-0 top-[30px] flex flex-col">
            <div 
              className={cn("flex flex-col items-center justify-center px-12 text-center", isCR80 ? "h-[20%]" : "h-[18%]")} 
              style={{ backgroundColor: headerBg }}
            >
               <div 
                 className={cn("font-bold leading-tight uppercase", isCR80 ? "text-md" : "text-xl")}
                 style={{ color: getContrastColor(headerBg) }}
               >
                 <span dir={isAr ? "rtl" : "ltr"}>{eventName || 'DIWAN EVENT 2026'}</span>
               </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
               <div 
                 className={cn("font-bold", isCR80 ? "text-3xl" : "text-5xl")} 
                 style={{ color: getContrastColor(bodyBg) }}
                 dir={isAr ? "rtl" : "ltr"}
               >أحمد محمد الإدريسي</div>
               <div 
                 className={cn("font-bold uppercase opacity-40", isCR80 ? "text-xs" : "text-lg")}
                 style={{ color: getContrastColor(bodyBg) }}
               >المؤسسة الوطنية للقضاء</div>
               
               {/* Event Logistics (Date & Location) */}
               <div 
                 className={cn("flex items-center gap-12 font-bold opacity-40", isCR80 ? "text-[7px]" : "text-[11px]")}
                 style={{ color: getContrastColor(bodyBg) }}
               >
                  <div className="flex flex-col items-center gap-1">
                     <Calendar className={cn("w-4 h-4 mb-1", getContrastColor(bodyBg) === '#FFFFFF' ? "text-white" : "text-emerald-600")} />
                     <span>20 - 22 مايو 2026</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                     <MapPin className={cn("w-4 h-4 mb-1", getContrastColor(bodyBg) === '#FFFFFF' ? "text-white" : "text-emerald-600")} />
                     <span>الجزائر، فندق الأوراسي</span>
                  </div>
               </div>
            </div>
             <div className={cn("flex items-center justify-between px-8 border-t border-black/5", isCR80 ? "h-[20%]" : "h-[15%]")} style={{ backgroundColor: footerBg }}>
                <QrCode className={cn(isCR80 ? "w-12 h-12" : "w-16 h-16", "text-emerald-950/20")} />
                
                <div 
                  className={cn("text-white font-black uppercase rounded-lg px-6 flex items-center justify-center", isCR80 ? "h-6 text-[7px]" : "h-10 text-[10px]")} 
                  style={{ backgroundColor: accentColor }}
                >
                   {labels.attendee}
                </div>
                
                <DiwanLogo color="#064e3b" className={isCR80 ? "scale-75" : ""} />
             </div>
          </div>
        )}


        {/* --- النمط المؤسسي المطور (Corporate v2.0) - تعميق الهوية الجانبية --- */}
        {activeStyle === 'corporate' && (
          <div className="absolute inset-x-0 bottom-0 top-[30px] flex flex-row-reverse overflow-hidden">
            {/* Sidebar Identity Section */}
            <div 
              className={cn("relative flex flex-col items-center justify-between py-10 px-4", isCR80 ? "w-1/4" : "w-1/3")} 
              style={{ backgroundColor: headerBg }}
            >
               {/* Digital Pattern Background */}
               <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
               </div>

               <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className={cn("rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/10", isCR80 ? "w-16 h-16" : "w-24 h-24")}>
                    <QrCode className="w-full h-full text-white" />
                  </div>
                  <div className="h-px w-8 bg-white/20" />
                  <div className={cn("rotate-[-90deg] whitespace-nowrap font-bold uppercase tracking-widest", isCR80 ? "text-xs mt-10" : "text-sm mt-20")} style={{ color: getContrastColor(headerBg) }}>
                     <span className="opacity-60" dir={isAr ? "rtl" : "ltr"}>{eventName || 'EVENT 2026'}</span>
                  </div>
               </div>

               <div className="relative z-10 flex flex-col items-center gap-4">
                  <div 
                    className={cn("text-white font-black uppercase rounded-lg px-4 flex items-center justify-center text-center", isCR80 ? "h-6 text-[6px]" : "h-10 text-[8px]")} 
                    style={{ backgroundColor: accentColor, width: '80%' }}
                  >
                    {labels.attendee}
                  </div>
                  <DiwanLogo color={getContrastColor(headerBg)} className="scale-75 opacity-20 hover:opacity-100 transition-opacity" />
               </div>
            </div>

            {/* Main Content Body */}
            <div className={cn("flex-1 relative flex flex-col justify-center", isCR80 ? "p-8" : "p-16")} style={{ backgroundColor: bodyBg }}>
               {/* Accent Geometric Shape */}
               <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none" style={{ backgroundColor: accentColor, borderRadius: '0 0 0 100%' }} />
               
               <div className="relative z-10">
                  <div 
                    className={cn("font-bold uppercase tracking-widest opacity-20 mb-2", isCR80 ? "text-[8px]" : "text-[10px]")}
                    style={{ color: getContrastColor(bodyBg) }}
                  >Official Delegate</div>
                  <div 
                    className={cn("font-bold leading-tight", isCR80 ? "text-3xl" : "text-5xl")} 
                    style={{ color: getContrastColor(bodyBg) }}
                    dir={isAr ? "rtl" : "ltr"}
                  >أحمد محمد الإدريسي</div>
                  <div className="flex items-center gap-3 mt-6">
                     <div className="w-1 h-8" style={{ backgroundColor: accentColor }} />
                     <div 
                       className={cn("font-bold uppercase opacity-40", isCR80 ? "text-[9px]" : "text-lg")}
                       style={{ color: getContrastColor(bodyBg) }}
                     >المؤسسة الوطنية للقضاء</div>
                  </div>

                  {/* Event Logistics (Date & Location) */}
                  <div 
                    className={cn("flex items-start gap-8 font-bold opacity-40 mb-6", isCR80 ? "text-[7px]" : "text-[11px]")}
                    style={{ color: getContrastColor(bodyBg) }}
                  >
                     <div className="flex flex-col items-start gap-1">
                        <Calendar className="w-4 h-4 text-emerald-600 mb-1" />
                        <span>20 - 22 مايو 2026</span>
                     </div>
                     <div className="flex flex-col items-start gap-1">
                        <MapPin className="w-4 h-4 text-emerald-600 mb-1" />
                        <span>الجزائر، فندق الأوراسي</span>
                     </div>
                  </div>
               </div>

            </div>
          </div>
        )}


      </div>
    </motion.div>
  );
};

const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000000';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#022C22' : '#FFFFFF';
};

const TemplateDesigner = () => {
  const { t, i18n } = useTranslation();
  const { selectedEventId: eventId } = useEvent();
  const [eventName, setEventName] = useState('');
  
  // التكوين الرئيسي المتقدم
  const [config, setConfig] = useState({
    activeStyle: 'royal',
    pageSize: 'A6',
    headerBg: '#022C22',
    bodyBg: '#FFFFFF',
    footerBg: '#F8FAFC',
    accentColor: '#D4AF37'
  });

  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(0.85);

  useEffect(() => {
    if (eventId) {
      credentialService.getBadgeDesign(eventId).then(data => {
        if (data.style_preset) setConfig(prev => ({ ...prev, activeStyle: data.style_preset }));
        if (data.page_size) setConfig(prev => ({ ...prev, pageSize: data.page_size }));
        if (data.event_name) setEventName(data.event_name);
        // تحميل الألوان المخصصة إذا وجدت
        if (data.header_bg) setConfig(prev => ({ ...prev, headerBg: data.header_bg }));
        if (data.body_bg) setConfig(prev => ({ ...prev, bodyBg: data.body_bg }));
        if (data.footer_bg) setConfig(prev => ({ ...prev, footerBg: data.footer_bg }));
        if (data.accent_color) setConfig(prev => ({ ...prev, accentColor: data.accent_color }));
      }).catch(err => console.error("Load failed", err));
    }
  }, [eventId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await credentialService.saveBadgeDesign(eventId, {
        style_preset: config.activeStyle,
        page_size: config.pageSize,
        header_bg: config.headerBg,
        body_bg: config.bodyBg,
        footer_bg: config.footerBg,
        accent_color: config.accentColor
      });
      toast.success("تم تفعيل الهوية البصرية الجديدة بنجاح");
    } catch (err) {
      toast.error("فشل في حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/designer">
      <Toaster position="top-center" />
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
              <Sparkles className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                Identity Studio
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 font-bold uppercase tracking-widest">Official v4.0</span>
              </h1>
              <p className="text-emerald-400/40 font-medium text-sm mt-1">تنسيق الهويات الرسمية والبعثات الدبلوماسية</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="h-16 px-10 bg-emerald-500 text-emerald-950 font-black rounded-[24px] shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group"
        >
          {saving ? <div className="w-5 h-5 border-2 border-emerald-950 border-t-transparent animate-spin rounded-full" /> : <Save className="w-5 h-5" />}
          تطبيق التغييرات
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 h-[calc(100vh-320px)]">
        
        {/* Controls Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4 pb-10">
          
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">نوع الهوية</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PRESET_STYLES).map(style => (
                <button
                  key={style.id}
                  onClick={() => setConfig(prev => ({ ...prev, activeStyle: style.id }))}
                  className={cn(
                    "flex flex-col items-center gap-3 p-5 rounded-[28px] border-2 transition-all",
                    config.activeStyle === style.id ? "bg-white/10 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  <style.icon className="w-6 h-6" />
                  <span className="text-[11px] font-black uppercase tracking-wider">{style.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-3">
              <Palette className="w-4 h-4 text-emerald-400" />
              تخصيص الألوان الرسمية
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              {[
                { label: 'لون القمة (Header)', key: 'headerBg' },
                { label: 'لون الجسد (Body)', key: 'bodyBg' },
                { label: 'لون القاعدة (Footer)', key: 'footerBg' },
                { label: 'لون التمييز (Accent)', key: 'accentColor' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between group">
                  <span className="text-[11px] font-bold text-white/60 group-hover:text-white transition-colors">{item.label}</span>
                  <div className="flex items-center gap-3 p-2 bg-black/20 rounded-2xl border border-white/5">
                    <input 
                      type="color" 
                      value={config[item.key]} 
                      onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.value }))}
                      className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer overflow-hidden" 
                    />
                    <span className="text-[10px] font-mono text-white/20 uppercase">{config[item.key]}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
             <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">حجم البطاقة</h3>
             <div className="flex gap-4">
               {Object.keys(PAGE_SIZES).map(size => (
                 <button
                   key={size}
                   onClick={() => setConfig(prev => ({ ...prev, pageSize: size }))}
                   className={cn(
                     "flex-1 h-14 rounded-2xl font-black text-[11px] uppercase transition-all",
                     config.pageSize === size ? "bg-white text-emerald-950 shadow-xl" : "bg-white/5 text-white/40 hover:text-white"
                   )}
                 >
                   {size}
                 </button>
               ))}
             </div>
          </section>

        </div>

        {/* Studio Preview Area */}
        <div className="xl:col-span-8 bg-black/40 border border-white/5 rounded-[64px] relative overflow-hidden flex flex-col items-center justify-center p-16">
          <div className="absolute top-12 left-12 right-12 flex items-center justify-between z-20">
             <div />
             <div className="flex gap-2">
                <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 1.2))} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"><Maximize2 className="w-4 h-4" /></button>
                <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"><Minimize2 className="w-4 h-4" /></button>
             </div>
          </div>

          <div className="relative z-10 perspective-1000">
            <AnimatePresence mode="wait">
              <BadgePreview config={config} zoom={zoom} eventName={eventName} lang={i18n.language} />
            </AnimatePresence>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default TemplateDesigner;
