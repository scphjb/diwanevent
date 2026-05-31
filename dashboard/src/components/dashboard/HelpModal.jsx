import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, HelpCircle, Book, MessageCircle, Phone, Mail, 
  ChevronLeft, ChevronRight, Search, Palette, Users, Award, QrCode,
  Mic, Heart, BarChart2, Cpu, Monitor, Globe, UserCheck, ShieldAlert, FileText, Home, LayoutDashboard, Calendar
} from 'lucide-react';
import { Button } from '../ui/Button';

const HelpModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'guide'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState(0);

  const guideTopics = [
    {
      title: "📊 إدارة الفعاليات ولوحة المراقبة العامة (Events & Overview)",
      icon: LayoutDashboard,
      content: `يوفر ديوان لوحة تحكم ذكية ومؤشرات أداء مباشرة لمتابعة الفعالية لحظة بلحظة.

1️⃣ قائمة الفعاليات (Events Page):
• طريقة الوصول: انقر على "الفعاليات" 📅 في أعلى القائمة الجانبية (مسار: /dashboard/events).
• خدماتها: إنشاء فعاليات جديدة، البحث السريع وتصفية الفعاليات، وتعديل بياناتها الأساسية، أو تجميد الفعالية (لوقف التسجيل والحضور)، وحذف الفعالية كلياً مع جميع البيانات المرتبطة بها في حال الرغبة.

2️⃣ لوحة التحكم الحية للفعالية (Dashboard Overview):
• طريقة الوصول: انقر على "لوحة التحكم" 📊 (مسار: /dashboard).
• خدماتها:
  - إجمالي المسجلين، الحاضرين الفعليين بالقاعة، الغائبين، ونسبة امتلاء القاعة لحظياً.
  - منحنى الحضور اللحظي لمراقبة أوقات الذروة وتدفق الجماهير.
  - مراقبة حالة البوابات الذكية وتدفق الدخول الفردي في الوقت الحقيقي.
  - شريط التنبيهات المباشرة الذي يعرض إشعارات النظام وتأكيدات الحضور اللحظية.`
    },
    {
      title: "👥 تسيير المشاركين، المقاعد والتسجيل الميداني (Check-In)",
      icon: Users,
      content: `نظام متطور لإدارة بيانات المشتركين وتسجيل الحضور الميداني بمرونة واحترافية.

3️⃣ إدارة المشاركين (Participants Manager):
• طريقة الوصول: القائمة الجانبية -> "المشاركين" 👥 (مسار: /dashboard/participants).
• خدماتها:
  - إضافة مشارك يدوياً أو البحث والتصفية الموحدة الفورية بالاسم، الجهة، أو رقم التذكرة.
  - استيراد Excel الذكي: ارفع ملف الإكسيل وقم بربط الحقول (الاسم، الجهة، القسم، البريد، والهاتف، ورقم المقعد Seat Number) لتخطيطها تلقائياً.
  - إسناد المقاعد (Seat Management): تتبع مقعد كل ضيف لسهولة توجيهه داخل القاعة.
  - الحذف المجمّع الآمن: زر مخصص لحذف قائمة الأسماء المستوردة كلياً بضغطة زر للتراجع الفوري عن أي خطأ استيراد.

4️⃣ تسجيل الحضور الميداني والماسح الضوئي (Check-In & Walk-in):
• طريقة الوصول: القائمة الجانبية -> "تسجيل الحضور" 👥 (مسار: /dashboard/check-in).
• خدماتها:
  - مسح الـ QR الذكي: تفعيل الكاميرا المبرمجة لتعمل باستمرار ودون توقف لقراءة تذاكر الضيوف فورا ومزامنتها.
  - تسجيل مشارك جديد ميدانياً (Walk-in): إدخال بيانات الضيوف الطارئين فوراً وطباعة شاراتهم فوراً.
  - التحكم بالطباعة التلقائية للشارات بمجرد مسح كود التذكرة.`
    },
    {
      title: "📅 أجندة الفعالية وتسيير الجلسات (Agenda & Sessions)",
      icon: Calendar,
      content: `تتيح لك الأجندة التفاعلية تنظيم برنامج المؤتمر والندوات اليومية وسير العمل البرامجي للفعالية.

5️⃣ أجندة الجلسات (Event Agenda):
• طريقة الوصول: القائمة الجانبية -> "الأجندة" 📋 (مسار: /dashboard/sessions).
• خدماتها:
  - إضافة وتخطيط جلسات مبرمجة مع تحديد القاعة (القاعة الرئيسية، قاعة الاستقبال، إلخ).
  - ضبط توقيت البداية والنهاية الدقيق لكل محاضرة أو ورشة عمل.
  - إرفاق وتخصيص وصف موجز لكل جلسة ومحاورها الأساسية.
  - ربط الجلسة بمتحدث محدد من قائمة المتحدثين لتظهر الأجندة متكاملة حية في بوابات الضيوف وشاشات العرض.`
    },
    {
      title: "🎤 إدارة ملفات المتحدثين الرسميين والرعاة (Profiles)",
      icon: Mic,
      content: `إظهار القيمة المعرفية والتسويقية للفعالية عبر تنظيم ملفات المتحدثين والرعاة الرسميين.

6️⃣ المتحدثون والخبراء (Speakers Directory):
• طريقة الوصول: القائمة الجانبية -> "المتحدثون" 🎤 (مسار: /dashboard/speakers).
• خدماتها: إضافة وتعديل المتحدثين، رفع الصورة الشخصية، تحديد المسمى الوظيفي، جهة العمل، موضوع المداخلة، مع نبذة مختصرة عن سيرتهم الذاتية.

7️⃣ شركاء النجاح والرعاة (Sponsors Manager):
• طريقة الوصول: القائمة الجانبية -> "الرعاة" 🏢 (مسار: /dashboard/sponsors).
• خدماتها:
  - إضافة شعارات الرعاة وإدراج روابط مواقعهم الإلكترونية الرسمية لتعزيز ظهورهم التسويقي.
  - تصنيف الرعاة حسب الفئات والمستويات (راعٍ ذهبي، راعٍ فضي، شريك إعلامي، إلخ) لعرضهم بشكل لائق ومنظم في شاشات القاعات والبوابة التفاعلية للضيوف.`
    },
    {
      title: "🎫 مصمم الشارات الرسومي والشهادات التلقائية (Designers)",
      icon: Award,
      content: `تصميم وطباعة الهوية البصرية وشارات الحضور والشهادات للضيوف بمرونة وسهولة كاملة.

8️⃣ مصمم الشارات التفاعلي (Badge Designer):
• طريقة الوصول: القائمة الجانبية -> قسم "التفاعل والجمالية" -> "مصمم الباج" 🎫 (مسار: /dashboard/designer/badge).
• خدماتها:
  - مصمم رسومي تفاعلي متكامل يسمح لك برفع صورة خلفية الشارة الخاصة بفعاليتك.
  - سحب وإفلات العناصر المتغيرة (الاسم الكامل، الجهة والمؤسسة، ورمز الـ QR الخاص بالتذكرة).
  - تخصيص كامل للخطوط، الألوان، المقاسات، والمواقع الجغرافية لكل عنصر على الشارة قبل الحفظ.

9️⃣ مصمم ومولد الشهادات الآلية (Certificate Designer):
• طريقة الوصول: القائمة الجانبية -> قسم "التفاعل والجمالية" -> "مصمم الشهادة" 🎫 (مسار: /dashboard/designer/certificate).
• خدماتها:
  - رفع قالب شهادة الحضور للفعالية بصيغة صورة.
  - تخصيص موضع وتنسيق اسم المشارك على الشهادة.
  - إرسال مجمع وآلي للشهادات المخصصة بصيغة PDF عالية الجودة عبر البريد الإلكتروني لكافة الحاضرين المسجلين كـ "مؤكد حضورهم" بالبوابة.`
    },
    {
      title: "🖥️ وحدة التحكم بشاشات العرض وقنوات البث (Display)",
      icon: Monitor,
      content: `نظام بث لحظي فائق الذكاء لتوزيع وإدارة محتوى شاشات القاعة الكبرى وشاشات الممرات والترحيب.

1️⃣0️⃣ إدارة الشاشات وقنوات البث (Public Screen Display):
• طريقة الوصول: القائمة الجانبية -> "شاشة العرض" 🖥️ (مسار: /dashboard/display).
• خدماتها:
  - تشغيل شاشات مخصصة بضغطة زر (شاشة الاستقبال، شاشة القاعة الرئيسية، شاشة الرعاة، شاشة الإعلام).
  - توجيه المشاهد حية لحظة بلحظة في الوقت الحقيقي؛ حيث يمكنك تحديد المشهد المعروض حالياً:
    * شاشة الترحيب بالضيوف: ترحيب فوري بأسماء الضيوف بمجرد مسح كود حضورهم عند المدخل.
    * حائط التواصل الاجتماعي: عرض منشورات الجمهور التفاعلية المعتمدة.
    * استطلاعات الرأي والـ Q&A: عرض التصويتات النشطة حية ونسبها، أو عرض السؤال المثبت أمام المتحدث على المنصة.`
    },
    {
      title: "💬 منصة التفاعل، الإشراف، المطورين والتحليلات (Advanced)",
      icon: Globe,
      content: `الأدوات المتقدمة لإثراء التفاعل والتحليل، ومراقبة العتاد، وتوفير تكامل برمجي مع الأنظمة الخارجية.

1️⃣1️⃣ حائط التواصل الاجتماعي والإشراف (Social Wall & Moderation):
• طريقة الوصول: "حائط التواصل" 💬 و "الإشراف" 💬 بالقائمة الجانبية.
• خدماتها: يتيح للجمهور مشاركة منشورات وصور من بواباتهم، مع لوحة إشرافية كاملة للمنظم لاعتماد المنشورات أو حجبها قبل البث العام.

1️⃣2️⃣ استطلاعات الرأي وأسئلة الجمهور (Polls & Q&A):
• طريقة الوصول: "استطلاعات الرأي" 📊 و "الأسئلة" 💬 بالقائمة الجانبية.
• خدماتها: إعداد وتفعيل استطلاعات الرأي الحية، وإدارة أسئلة المشاركين للمحاضرين، وتثبيتها.

1️⃣3️⃣ مركز الملفات والمستندات (Documents Center):
• طريقة الوصول: "مركز الملفات" 📂 بالقائمة الجانبية.
• خدماتها: رفع وعرض العروض التقديمية وكتيبات الإرشاد وروابط الملفات لتنزيلها مباشرة من بوابة المشاركين.

1️⃣4️⃣ إدارة العتاد والأجهزة (Hardware System):
• طريقة الوصول: "إدارة العتاد" 🖥️ بالقائمة الجانبية.
• خدماتها: مراقبة الماسحات واللوحيات وأجهزة تسجيل الحضور، ومتابعة شحن البطارية وحالة اتصالها بالإنترنت في الوقت الفعلي.

1️⃣5️⃣ مركز المطورين والـ API (Developer Portal):
• طريقة الوصول: "مركز المطورين" 🛠️ بالقائمة الجانبية.
• خدماتها: توليد مفاتيح API للربط الخارجي، إعداد وتتبع الـ Webhooks لتلقي أحداث تسجيل الحضور المباشر، وتجربة الأوامر بالـ Playground.`
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
