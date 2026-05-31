import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, HelpCircle, Book, MessageCircle, Phone, Mail, 
  ChevronLeft, ChevronRight, Search, Palette, Users, Award, QrCode 
} from 'lucide-react';
import { Button } from '../ui/Button';

const HelpModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'guide'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState(0);

  const guideTopics = [
    {
      title: "🚀 إطلاق الفعالية والإعداد الأساسي",
      icon: Palette,
      content: `مرحباً بك في نظام ديوان! لبدء فعاليتك الأولى، توجه إلى لوحة التحكم الرئيسية ثم انقر على "إنشاء فعالية جديدة". أدخل عنوان المؤتمر، التاريخ، والموقع الجغرافي.

لتخصيص الجمالية البصرية للفعالية، ادخل إلى "الإعدادات" ثم تبويب "الهوية البصرية" حيث يمكنك رفع شعار الفعالية وتعديل اللون الأساسي للنظام (نوصي باستخدام الأزرق الداكن المخملي الفاخر Velvet Navy والذهبي الدافئ Amber Gold للمؤتمرات الرسمية الكبرى).`
    },
    {
      title: "👥 استيراد وإدارة المشاركين بدقة",
      icon: Users,
      content: `يتيح لك النظام طريقتين لإدارة المشتركين:
1. الاستيراد المجمّع (Excel): انقر على زر "استيراد Excel" في صفحة المشاركين، وارفع ملفك، ثم قم بربط أعمدة الملف مع حقول النظام (الاسم الكامل، الجهة، القسم، البريد، رقم المقعد). يتميز النظام بمطابقة وتخطيط ذكي يتوقع الأعمدة تلقائياً.
2. الحذف المجمّع الآمن: إذا قمت باستيراد قائمة خاطئة، لا تقلق! قمنا بتوفير زر "حذف قائمة المستوردين" المخصص والمحمي بـ SweetAlert2 لحذف القائمة المستوردة بالكامل وبأمان بضغطة زر واحدة دون لمس بقية المسجلين.`
    },
    {
      title: "🎫 تصميم وطباعة البادجات والشهادات",
      icon: Award,
      content: `يتوفر في ديوان مصمم رسومي احترافي متكامل:
* تصميم الشارات (Badge Design): توجه إلى "مصمم القوالب" -> "تصميم الباج". يمكنك سحب وإفلات العناصر الحية كـ (الاسم الكامل، رمز QR، والجهة) وتحديد موضعها بدقة على خلفية الباج المرفوعة.
* الشهادات التلقائية: يمكن للنظام توليد شهادات الحضور بصيغة PDF عالية الدقة وإرسالها بضغطة زر واحدة لكافة المشاركين الذين تم إثبات حضورهم الفعلي لتوفير الجهد اليدوي للجان التنظيمية.`
    },
    {
      title: "📲 إدارة بوابة المشاركين والمميزات التفاعلية",
      icon: QrCode,
      content: `توفر البوابة التفاعلية للضيوف تجربة غنية بالخدمات. يمكنك تفعيل أو تعطيل التبويبات حسب رغبتك من صفحة "الإعدادات" -> "بوابة المشاركين":
* نظام الأسئلة (Q&A): يتيح للحاضرين تقديم الأسئلة للمحاضرين والتصويت عليها.
* استطلاعات الرأي (Polls): لطرح أسئلة تصويتية تفاعلية للجمهور وعرض النتائج حية.
* شبكة التواصل (Networking) والحائط الاجتماعي: لتشجيع الضيوف على تبادل الأفكار والتواصل المهني والتشبيك الذكي بنقرة زر.`
    },
    {
      title: "📷 كاميرا الحضور الذاتي والـ QR المستمر",
      icon: HelpCircle,
      content: `عند مداخل الفعالية، قم بتشغيل شاشة "تسجيل الحضور" وانقر على "ماسح الكاميرا":
* الكاميرا مبرمجة لتعمل باستمرار دون إغلاق تلقائي بعد عمليات المسح الناجحة، مما يضمن تدفقاً سلساً للمشاركين دون أي تأخير تقني.
* بمجرد مسح رمز الـ QR الخاص بالتذكرة، يصدر النظام نغمة تأكيد مسموعة ويسجل الحضور فوراً في قاعدة البيانات مع إبقاء الكاميرا نشطة للمشارك الموالي مباشرة للتسجيل التلقائي السريع.`
    }
  ];

  const filteredTopics = guideTopics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const helpItems = [
    {
      icon: Book,
      title: t('common.help.guide_title', 'دليل الاستخدام الذكي'),
      desc: t('common.help.guide_desc', 'اقرأ الدليل الشامل وتعرف على أسرار إدارة منصة ديوان كالمحترفين.'),
      action: t('common.help.guide_action', 'تصفح الدليل الشامل'),
      onClick: () => setActiveView('guide')
    },
    {
      icon: MessageCircle,
      title: t('common.help.live_support_title', 'الدعم المباشر'),
      desc: t('common.help.live_support_desc', 'تحدث مع أحد خبراء ديوان التقنيين المتواجدين لخدمتك الآن.'),
      action: t('common.help.live_support_action', 'بدء محادثة فورية'),
      onClick: () => window.open('https://e-diwan.net/support', '_blank')
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#050B18]/90 border border-white/10 rounded-[32px] shadow-2xl p-8 backdrop-blur-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-900/20">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {activeView === 'guide' ? 'دليل الاستخدام الذكي' : t('common.help.title', 'تحتاج مساعدة؟')}
                  </h2>
                  <p className="text-brand-secondary/40 text-xs">
                    {activeView === 'guide' ? 'كل إرشادات وخفايا منصة ديوان في مكان واحد' : t('common.help.subtitle', 'نحن هنا لضمان نجاح فعاليتك بمستويات عالمية.')}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {activeView === 'menu' ? (
                /* Main Menu View */
                <div className="space-y-4">
                  {helpItems.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={item.onClick}
                      className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-brand-primary/5 hover:border-brand-primary/20 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-dark transition-all shadow-inner">
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-base mb-1.5">{item.title}</h3>
                          <p className="text-xs text-white/50 leading-relaxed mb-4">{item.desc}</p>
                          <Button variant="gold" className="h-10 px-5 text-xs font-bold rounded-xl">
                            {item.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Phone Call Quick Card */}
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-right">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{t('common.help.call_title', 'اتصل بخبراء ديوان')}</h4>
                        <p className="text-[11px] text-white/40">{t('common.help.call_desc', 'فريقنا متواجد للرد على استفساراتكم الهاتفية الطارئة.')}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 px-6 text-xs font-bold border-white/10 text-white rounded-xl hover:bg-white/5">
                      +213 (0) 555 12 34 56
                    </Button>
                  </div>
                </div>
              ) : (
                /* Interactive Guide Book View */
                <div className="flex flex-col md:flex-row gap-6 h-full min-h-[350px]">
                  {/* Topics Sidebar */}
                  <div className="w-full md:w-1/3 flex flex-col gap-2 shrink-0 border-b md:border-b-0 md:border-l border-white/5 pb-4 md:pb-0 md:pl-4">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text"
                        placeholder="ابحث عن موضوع..."
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-1 overflow-y-auto max-h-[250px] md:max-h-[350px]">
                      {filteredTopics.map((topic, i) => {
                        const TopicIcon = topic.icon;
                        const originalIndex = guideTopics.findIndex(t => t.title === topic.title);
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveTopic(originalIndex)}
                            className={`w-full text-right flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTopic === originalIndex ? 'bg-brand-primary/20 text-brand-secondary border border-brand-primary/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                          >
                            <TopicIcon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{topic.title}</span>
                          </button>
                        );
                      })}
                      {filteredTopics.length === 0 && (
                        <div className="text-center py-6 text-xs text-white/30">لا توجد نتائج بحث</div>
                      )}
                    </div>
                  </div>

                  {/* Topic Detailed Content */}
                  <div className="flex-1 flex flex-col justify-between bg-white/5 border border-white/5 rounded-3xl p-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4 text-brand-secondary">
                        {React.createElement(guideTopics[activeTopic].icon, { className: "w-5 h-5" })}
                        <h3 className="font-black text-white text-base">{guideTopics[activeTopic].title}</h3>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line text-justify">
                        {guideTopics[activeTopic].content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 shrink-0">
                      <Button 
                        variant="outline" 
                        className="h-9 px-4 text-xs font-bold border-white/10 text-white rounded-lg hover:bg-white/5 flex items-center gap-1"
                        onClick={() => setActiveTopic(prev => Math.max(0, prev - 1))}
                        disabled={activeTopic === 0}
                      >
                        <ChevronRight className="w-4 h-4" />
                        السابق
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-9 px-4 text-xs font-bold border-white/10 text-white rounded-lg hover:bg-white/5 flex items-center gap-1"
                        onClick={() => setActiveTopic(prev => Math.min(guideTopics.length - 1, prev + 1))}
                        disabled={activeTopic === guideTopics.length - 1}
                      >
                        التالي
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              {activeView === 'guide' ? (
                <button 
                  onClick={() => setActiveView('menu')}
                  className="text-brand-secondary text-xs font-bold hover:underline flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  الرجوع لقائمة الدعم الرئيسية
                </button>
              ) : (
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{t('common.help.email_contact', 'تواصل عبر البريد')}</p>
              )}
              <a href="mailto:support@e-diwan.net" className="text-brand-secondary text-xs font-bold hover:underline flex items-center gap-2">
                <Mail className="w-4 h-4" />
                support@e-diwan.net
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
