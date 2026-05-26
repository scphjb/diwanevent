import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Monitor, BarChart2, MessageSquare, HelpCircle, TrendingUp, Award, ExternalLink, Tv, QrCode } from 'lucide-react';
import { useEvent } from '../context/EventContext';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DisplayControlPage = () => {
  const { t } = useTranslation();
  const { selectedEventId: eventId } = useEvent();
  
  const channels = [
    { id: 'main', label: t('display_control.channels.main', 'الشاشة الرئيسية (القاعة)') },
    { id: 'lobby', label: t('display_control.channels.lobby', 'شاشة الاستقبال') },
    { id: 'networking', label: t('display_control.channels.networking', 'منطقة التواصل') },
    { id: 'sponsors_screen', label: t('display_control.channels.sponsors', 'شاشة الرعاة (Dedicated)') },
    { id: 'registration_screen', label: t('display_control.channels.registration', 'شاشة تسجيل الدخول') },
    { id: 'media_screen', label: t('display_control.channels.media', 'شاشة الإعلام والصحافة') }
  ];

  const [selectedChannel, setSelectedChannel] = useState(channels[0].id);
  const [activeScenes, setActiveScenes] = useState(() => {
    const cached = localStorage.getItem(`active_scenes_${eventId}`);
    return cached ? JSON.parse(cached) : { 
      main: 'stats', 
      lobby: 'wall', 
      networking: 'sponsors',
      sponsors_screen: 'sponsors',
      registration_screen: 'registration',
      media_screen: 'media'
    };
  });
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    if (eventId) {
      localStorage.setItem(`active_scenes_${eventId}`, JSON.stringify(activeScenes));
    }
  }, [activeScenes, eventId]);

  const currentScene = activeScenes[selectedChannel];

  const scenes = [
    { id: 'stats', label: t('display_control.scenes.stats', 'إحصائيات الحضور'), icon: BarChart2, color: 'text-blue-500' },
    { id: 'wall', label: t('display_control.scenes.wall', 'حائط التواصل'), icon: MessageSquare, color: 'text-brand-primary' },
    { id: 'questions', label: t('display_control.scenes.questions', 'سؤال الجلسة'), icon: HelpCircle, color: 'text-amber-500' },
    { id: 'polls', label: t('display_control.scenes.polls', 'الاستطلاعات'), icon: TrendingUp, color: 'text-purple-500' },
    { id: 'sponsors', label: t('display_control.scenes.sponsors', 'الرعاة'), icon: Award, color: 'text-rose-500' },
    { id: 'welcome', label: t('display_control.scenes.welcome', 'شاشة الترحيب'), icon: Tv, color: 'text-brand-secondary' },
    { id: 'registration', label: t('display_control.scenes.registration', 'بوابة التسجيل'), icon: QrCode, color: 'text-sky-500' },
    { id: 'media', label: t('display_control.scenes.media', 'الشركاء الإعلاميين'), icon: Monitor, color: 'text-orange-500' }
  ];

  const handlePushScene = async (sceneId) => {
    setIsPushing(true);
    try {
      await api.post(`events/${eventId}/display/scene`, { scene: sceneId, channel: selectedChannel });
      setActiveScenes(prev => ({ ...prev, [selectedChannel]: sceneId }));
    } catch (err) {
      alert(t('display_control.push_error', 'فشل في إرسال الأمر للشاشة'));
    } finally {
      setIsPushing(false);
    }
  };

  if (!eventId) {
    return (
      <DashboardLayout activePath="/dashboard/display">
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[32px] p-10 max-w-3xl mx-auto backdrop-blur-md">
          <Monitor className="w-16 h-16 text-brand-secondary/20 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">{t('display_control.no_event_selected', 'لم يتم اختيار فعالية')}</h3>
          <p className="text-brand-secondary/30 text-sm max-w-md mx-auto">{t('display_control.no_event_selected_desc', 'يرجى اختيار فعالية نشطة أو إنشاء فعالية جديدة للتحكم في شاشات العرض.')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/dashboard/display">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('display_control.title', 'وحدة التحكم بالشاشات')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            {t('display_control.subtitle', 'تحكم بما يعرض للجمهور على شاشات العرض المتعددة في الوقت الفعلي')}
          </p>
        </div>
      </div>

      {/* اختيار الشاشة (Channel Selection) */}
      <div className="flex flex-wrap gap-4 mb-8">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch.id)}
            className={`flex flex-col items-start gap-1 px-6 py-4 rounded-2xl transition-all font-bold ${
              selectedChannel === ch.id 
                ? 'bg-amber-500 text-brand-dark shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <Tv className="w-5 h-5" />
              {ch.label}
            </div>
            <div className={`text-xs opacity-60 mt-1 ${selectedChannel === ch.id ? 'text-brand-dark' : 'text-brand-secondary'}`}>
              {t('display_control.current_scene', 'المشهد الحالي:')} {scenes.find(s => s.id === activeScenes[ch.id])?.label || t('display_control.not_set', 'غير محدد')}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-brand-primary animate-pulse" />
            {t('display_control.select_scene', 'اختر المشهد المراد عرضه على')} ({channels.find(c => c.id === selectedChannel)?.label}):
          </h2>
          
          <Link 
            to={`/display/${eventId || 1}/${selectedChannel}?scene=${currentScene}`}
            target="_blank"
            className="flex items-center gap-2 h-12 px-4 rounded-xl border border-brand-primary/30 text-brand-secondary hover:bg-brand-primary/10 transition-colors font-bold"
          >
            <ExternalLink className="w-5 h-5" />
            {t('display_control.launch_screen', 'تشغيل هذه الشاشة (نافذة جديدة)')}
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => handlePushScene(scene.id)}
              disabled={isPushing}
              className={`relative flex flex-col items-center justify-center p-10 rounded-3xl transition-all border-2 ${
                currentScene === scene.id 
                  ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                  : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <scene.icon className={`w-16 h-16 mb-4 ${currentScene === scene.id ? 'text-brand-secondary' : scene.color}`} />
              <span className={`text-2xl font-bold ${currentScene === scene.id ? 'text-white' : 'text-white/70'}`}>
                {scene.label}
              </span>
              
              {currentScene === scene.id && (
                <div className="absolute top-4 right-4 flex items-center gap-2 text-brand-secondary text-sm font-bold bg-brand-primary/20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
                  {t('display_control.now_playing', 'يعرض الآن')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisplayControlPage;
