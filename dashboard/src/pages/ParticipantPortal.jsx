import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { 
  Calendar, 
  MessageSquare, 
  BarChart2, 
  Award, 
  User, 
  Send,
  Camera,
  Download,
  HelpCircle,
  X,
  Heart,
  MessageCircle,
  Search, 
  Users,
  Users as NetworkingIcon,
  Shield, 
  Eye,
  EyeOff,
  Link as LinkIcon,
  Smartphone,
  Printer,
  CheckCircle,
  FileText,
  Star,
  Sun,
  Moon,
  Trash2,
  Clock,
  MapPin,
  Truck,
  Compass,
  Utensils,
  Bell
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import agendaService from '../services/agendaService';
import eventService from '../services/eventService';
import interactionService from '../services/interactionService';
import credentialService from '../services/credentialService';
import participantService from '../services/participantService';
import api from '../services/api';
import AIConcierge from '../components/ai/AIConcierge';
import { cn } from '../utils/cn';
import NetworkingHub from './portal/NetworkingHub';
import toast, { Toaster } from 'react-hot-toast';
import PushNotificationManager from '../components/pwa/PushNotificationManager';

const getFullUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  
  let baseApi = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/';
  // In production, fallback to the current dynamic domain origin if no custom VITE_API_URL is supplied or it points to localhost
  if (!import.meta.env.DEV && (!import.meta.env.VITE_API_URL || baseApi.includes('localhost'))) {
    baseApi = window.location.origin + '/api/v1/';
  }
  const baseUrl = baseApi.replace('/api/v1/', '');
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : '/' + url;
  return `${cleanBase}${cleanUrl}`;
};

const formatPostTime = (timestamp) => {
  if (!timestamp) return 'الآن';
  // إضافة 'Z' لإجبار التفسير كـ UTC وتجنب خطأ الساعة
  const ts = (timestamp || '').endsWith('Z') || (timestamp || '').includes('+') ? timestamp : timestamp + 'Z';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return 'الآن';
  const now = new Date();
  const diffSecs = Math.floor((now - date) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString('ar-EG', { numberingSystem: 'latn', day: 'numeric', month: 'long' }) + ' · ' + date.toLocaleTimeString('ar-EG', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit' });
};

const COMMITTEE_TASK_PRESETS = {
  reception: [
    { titleAr: 'استقبال الوفود وتوجيههم لمقراتهم', titleEn: 'Welcome delegates and guide them to quarters', descAr: 'استقبال الضيوف وتوجيههم لغرفهم أو مقاعدهم', descEn: 'Welcome guests and guide them to rooms/seats' },
    { titleAr: 'تسجيل وصول المشاركين وتوزيع الشارات', titleEn: 'Register arrivals and distribute badges', descAr: 'التحقق من الهوية وطباعة أو تسليم شارة الدخول', descEn: 'Verify identity and print/distribute entry badges' },
    { titleAr: 'مسح شارات الدخول عند البوابات', titleEn: 'Scan entry badges at gates', descAr: 'استخدام الهاتف لمسح شارة الباركود للضيوف عند المداخل', descEn: 'Use scanner/phone to scan participant badges' },
    { titleAr: 'توجيه الضيوف VIP لقاعة كبار الشخصيات', titleEn: 'Guide VIP guests to the VIP hall', descAr: 'مرافقة الشخصيات الهامة وتأمين متطلباتهم', descEn: 'Accompany VIPs and ensure hospitality requirements' }
  ],
  catering: [
    { titleAr: 'متابعة تجهيز وجبات الإفطار والضيافة الصباحية', titleEn: 'Monitor morning breakfast and catering', descAr: 'التأكد من جهوزية البوفيه والقهوة الصباحية', descEn: 'Verify readiness of morning buffet and coffee' },
    { titleAr: 'متابعة تجهيز وجبات الغداء', titleEn: 'Monitor lunch preparation', descAr: 'التنسيق مع المطعم أو المطبخ لتنظيم بوفيه الغداء', descEn: 'Coordinate with catering for lunch buffet' },
    { titleAr: 'متابعة تجهيز وجبات العشاء', titleEn: 'Monitor dinner preparation', descAr: 'التأكد من تقديم وجبات العشاء في موعدها المخطط', descEn: 'Ensure dinners are served on time' },
    { titleAr: 'التنسيق مع المطبخ لتلبية الحميات الخاصة', titleEn: 'Coordinate catering special diets', descAr: 'تأمين الوجبات النباتية أو الخالية من الجلوتين للمسجلين', descEn: 'Coordinate gluten-free/vegetarian meals for registered guests' }
  ],
  accommodation: [
    { titleAr: 'استلام غرف الفندق وتأكيد جهوزيتها', titleEn: 'Inspect hotel rooms and verify readiness', descAr: 'التنسيق مع إدارة الفندق والتأكد من نظافة وجاهزية الغرف', descEn: 'Check cleanliness and readiness of rooms' },
    { titleAr: 'تسليم مفاتيح الغرف للضيوف وتأكيد التسكين', titleEn: 'Hand over keys and confirm lodging', descAr: 'تسكين الضيوف في الغرف المحددة وتأكيد استلامهم المفاتيح', descEn: 'Assign rooms to guests and verify key delivery' },
    { titleAr: 'تسوية النزاعات والطلبات الخاصة بالفندق', titleEn: 'Resolve lodging issues and requests', descAr: 'متابعة أي طلبات أو شكاوى خاصة بالغرف وحلها فوراً', descEn: 'Resolve any guest requests/complaints with hotel' }
  ],
  logistics: [
    { titleAr: 'تنسيق استقبال الضيوف من المطار', titleEn: 'Coordinate airport guest reception', descAr: 'متابعة توقيت هبوط الطائرة وتوجيه السائق المخصص للانتظار', descEn: 'Monitor flight landing and dispatch driver' },
    { titleAr: 'توجيه سيارة النقل لنقل وفد محدد', titleEn: 'Dispatch shuttle for delegation', descAr: 'إرسال سائق محدد بالسيارة لتوصيل وفد من أو إلى الفعالية', descEn: 'Dispatch a driver to transport delegation' },
    { titleAr: 'توصيل الضيوف من الفندق إلى مقر الفعالية', titleEn: 'Shuttle guests from hotel to venue', descAr: 'تأمين نقل الضيوف صباحاً لمقر الفعالية والتأكد من المواعيد', descEn: 'Coordinate morning shuttle from hotel to venue' }
  ],
  entertainment: [
    { titleAr: 'تنظيم ومرافقة جولة سياحية ترفيهية', titleEn: 'Accompany recreation/sightseeing tour', descAr: 'التنسيق مع حافلة النقل ومرافقة الوفود في الجولة السياحية', descEn: 'Coordinate sightseeing tour bus and accompany delegates' },
    { titleAr: 'إدارة وتوزيع منشورات الفعالية الترفيهية', titleEn: 'Distribute recreation pamphlets', descAr: 'توزيع تذاكر أو كتيبات الأنشطة والتعريف بالبرنامج الترفيهي', descEn: 'Distribute event tour books or activity tickets' },
    { titleAr: 'تنظيم الفعالية الترفيهية المسائية', titleEn: 'Organize evening entertainment event', descAr: 'الإشراف على التجمع المسائي وتأمين متطلبات الضيافة فيه', descEn: 'Supervise evening gathering and catering requirements' }
  ]
};
COMMITTEE_TASK_PRESETS.transport = COMMITTEE_TASK_PRESETS.logistics;

const ParticipantPortal = () => {
  const { eid, token } = useParams();
  const eventId = eid;
  const participantToken = token;
  
  const [activeTab, setActiveTab] = useState('home');

  // فتح التاب الصحيح عند الضغط على إشعار Push (يحمل ?section=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const validTabs = ['home','notifications','agenda','polls','social','networking','cert','docs','ai','logistics','activities','catering'];
    if (section && validTabs.includes(section)) {
      setActiveTab(section);
      // مسح الـ param من الـ URL دون إعادة تحميل الصفحة
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  const [eventSettings, setEventSettings] = useState({});
  const [participant, setParticipant] = useState(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [agenda, setAgenda] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [posts, setPosts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [logistics, setLogistics] = useState({
    transport_type: 'none',
    flight_number: '',
    arrival_time: '',
    departure_time: '',
    arrival_location: '',
    hotel_name: '',
    room_number: '',
    check_in_date: '',
    check_out_date: '',
    driver_name: '',
    driver_phone: '',
    vehicle_details: '',
    shuttle_time: '',
    status: 'pending'
  });
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);
  const [activities, setActivities] = useState([]);
  const [isRegisteringActivity, setIsRegisteringActivity] = useState(false);
  const [catering, setCatering] = useState({
    dietary_type: 'none',
    allergies: '',
    notes: ''
  });
  const [isSavingCatering, setIsSavingCatering] = useState(false);
  const [eventMeals, setEventMeals] = useState([]);
  const [isTogglingMealRsvp, setIsTogglingMealRsvp] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  // Organizer Staff Panel States
  const [staffActiveSubTab, setStaffActiveSubTab] = useState('logistics'); // logistics, catering, accommodation, qr_scan
  const [staffLogisticsList, setStaffLogisticsList] = useState([]);
  const [staffCateringList, setStaffCateringList] = useState([]);
  const [isLoadingStaffCatering, setIsLoadingStaffCatering] = useState(false);
  const [searchStaffCatering, setSearchStaffCatering] = useState('');
  const [isLoadingStaffLogistics, setIsLoadingStaffLogistics] = useState(false);
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  const [selectedStaffParticipant, setSelectedStaffParticipant] = useState(null);
  const [isStaffDispatchModalOpen, setIsStaffDispatchModalOpen] = useState(false);
  const [staffDispatchForm, setStaffDispatchForm] = useState({
    driver_name: '',
    driver_phone: '',
    vehicle_details: '',
    status: 'pending'
  });
  const [isSavingStaffDispatch, setIsSavingStaffDispatch] = useState(false);
  const [driversList, setDriversList] = useState([]);
  const [isAddingNewDriver, setIsAddingNewDriver] = useState(false);
  const [newDriverForm, setNewDriverForm] = useState({
    name: '',
    phone: '',
    vehicle_details: ''
  });
  const [isSavingNewDriver, setIsSavingNewDriver] = useState(false);
  const [selectedActivityForList, setSelectedActivityForList] = useState(null);
  const [activityRegistrationsList, setActivityRegistrationsList] = useState([]);
  const [isActivityRegistrationsOpen, setIsActivityRegistrationsOpen] = useState(false);
  const [receptionList, setReceptionList] = useState([]);
  const [isLoadingReception, setIsLoadingReception] = useState(false);
  const [searchReceptionQuery, setSearchReceptionQuery] = useState('');
  const [tasksList, setTasksList] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedTaskIdFromNotif, setSelectedTaskIdFromNotif] = useState(null);
  const [detailedTask, setDetailedTask] = useState(null);
  const [isApologizing, setIsApologizing] = useState(false);
  const [apologyReasonText, setApologyReasonText] = useState('');
  const [selectedReassigneeId, setSelectedReassigneeId] = useState('');
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    participant_id: '',
    assigned_to_id: '',
    due_time: ''
  });
  const [selectedTaskCommittee, setSelectedTaskCommittee] = useState('transport');

  const [polls, setPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portalError, setPortalError] = useState(null); // 'expired' | 'event_ended' | 'not_found' | null
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    linkedin: '',
    specialties: [],
    website: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [isOnline, setIsOnline] = useState(true); // managed via window events below
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(`diwan_favorites_${eventId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [agendaFilter, setAgendaFilter] = useState('all');
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // States for likes & comments (Instagram-style mini social platform)
  const [likedPosts, setLikedPosts] = useState(() => {
    try {
      const saved = localStorage.getItem(`diwan_liked_${eventId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState(null);
  const [postComments, setPostComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Session Rating & Offline support states
  const [sessionRatings, setSessionRatings] = useState(() => {
    try {
      const saved = localStorage.getItem(`diwan_ratings_${eventId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(`diwan_theme_${eventId}`);
      return saved || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`diwan_theme_${eventId}`, theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
    } catch (e) {
      console.error('Failed to set theme classes', e);
    }
  }, [theme, eventId]);

  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(`diwan_lang_${eventId}`);
      return saved || 'ar';
    } catch (e) {
      return 'ar';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`diwan_lang_${eventId}`, lang);
    } catch (e) {}
  }, [lang, eventId]);

  const formatDateTime = (dateObj, options = {}) => {
    if (!dateObj) return '---';
    const d = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
    if (isNaN(d.getTime())) return '---';
    if (lang === 'ar') {
      let formatted = d.toLocaleString('ar-EG', { numberingSystem: 'latn', ...options });
      const monthMap = {
        'يناير': 'جانفي',
        'فبراير': 'فيفري',
        'أبريل': 'أفريل',
        'ابريل': 'أفريل',
        'مايو': 'ماي',
        'يونيو': 'جوان',
        'يونية': 'جوان',
        'يوليو': 'جويلية',
        'يولية': 'جويلية',
        'أغسطس': 'أوت',
      };
      Object.keys(monthMap).forEach(key => {
        formatted = formatted.replace(new RegExp(key, 'g'), monthMap[key]);
      });
      return formatted;
    }
    return d.toLocaleString('en-US', options);
  };

  const formatDuration = (durationStr) => {
    if (!durationStr) return '';
    if (lang === 'en') return durationStr;
    const cleaned = durationStr.toLowerCase().trim();
    if (cleaned === '2 hours') return 'ساعتان';
    if (cleaned === '1 hour') return 'ساعة واحدة';
    if (cleaned === '30 minutes') return '30 دقيقة';
    if (cleaned === '1.5 hours' || cleaned === '1 hour 30 minutes' || cleaned === '1 hour and 30 minutes') return 'ساعة ونصف';
    
    const hoursMatch = cleaned.match(/^(\d+)\s*hours?$/);
    if (hoursMatch) {
      const num = parseInt(hoursMatch[1]);
      if (num === 1) return 'ساعة';
      if (num === 2) return 'ساعتان';
      if (num >= 3 && num <= 10) return `${num} ساعات`;
      return `${num} ساعة`;
    }
    
    const minutesMatch = cleaned.match(/^(\d+)\s*minutes?$/);
    if (minutesMatch) {
      const num = parseInt(minutesMatch[1]);
      return `${num} دقيقة`;
    }
    return durationStr;
  };

  const [sessionNotes, setSessionNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(`diwan_notes_${eventId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [showPremiumCard, setShowPremiumCard] = useState(false);

  const handleSaveNote = (sessionId, text) => {
    const updated = { ...sessionNotes, [sessionId]: text };
    setSessionNotes(updated);
    try {
      localStorage.setItem(`diwan_notes_${eventId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const translations = {
    ar: {
      offline_warning: 'أنت تتصفح البوابة حالياً دون اتصال بالإنترنت. تم تفعيل الحفظ المحلي للأجندة والشارة.',
      tab_me: 'أنا',
      tab_agenda: 'الجدول',
      tab_polls: 'الاستطلاعات',
      tab_social: 'الحائط',
      tab_networking: 'التواصل',
      tab_leaderboard: 'المتصدرون',
      tab_cert: 'الشهادة',
      tab_docs: 'المستندات',
      tab_qa: 'الأسئلة',
      tab_logistics: 'اللوجستيات 🚗',
      tab_activities: 'الأنشطة 🏕️',
      tab_catering: 'الإطعام والضيافة 🍽️',
      profile_title: 'البوابة الرقمية للمشارك',
      profile_online: '🟢 متصل',
      profile_offline: '🔴 غير متصل',
      profile_edit: 'تعديل الملف',
      profile_networking: 'التواصل المهني',
      profile_bio: 'النبذة المهنية',
      profile_bio_placeholder: 'نبذة قصيرة عن اهتماماتك المهنية...',
      profile_linkedin: 'رابط حساب LinkedIn',
      profile_specialties: 'التخصصات المهنية',
      profile_specialties_placeholder: 'أضف تخصص...',
      profile_specialties_hint: 'اضغط Enter أو فاصلة للإضافة',
      profile_save: 'حفظ',
      profile_cancel: 'إلغاء',
      badge_title: 'البطاقة الرقمية',
      badge_scan_mode: 'تفعيل وضع المسح السريع ⚡',
      badge_seat: 'المقعد',
      badge_reg_num: 'رقم التسجيل',
      badge_map: 'موقع الفعالية على الخريطة 📍',
      scan_title: 'منصة ديوان الذكية · وضع المسح السريع',
      scan_active: 'تم تنشيط الشاشة ومنع القفل التلقائي تلقائياً',
      scan_end: 'إنهاء وضع المسح',
      scan_role_vip: 'ضيف شرف ⭐ VIP',
      scan_role_speaker: 'متحدث / خبير 🎤 SPEAKER',
      scan_role_press: 'صحافة وإعلام 📰 PRESS',
      scan_role_attendee: 'مشارك معتمد 👤 ATTENDEE',
      agenda_title: 'أجندة الفعالية 📅',
      agenda_all: 'كل الجلسات',
      agenda_favorites: '⭐ مفضلتي',
      agenda_empty: 'لا توجد جلسات في القائمة حالياً.',
      agenda_empty_hint: 'قم بالضغط على النجمة في أي جلسة لإضافتها لجدولك الخاص!',
      agenda_google_cal: 'تقويم Google',
      agenda_ical: 'تقويم الهاتف (iCal)',
      agenda_rate_title: 'تقييم الجلسة والمتحدث:',
      agenda_rate_thanks: 'شكراً لتقييمك! تم حفظ مشاركتك بنجاح ❤️',
      agenda_rate_prompt: 'ما هو تقييمك لمحتوى وأداء هذه الجلسة؟',
      leaderboard_title: 'لوحة المتصدرين 🏆',
      leaderboard_you: '(أنت)',
      leaderboard_points: 'نقطة تفاعلية',
      docs_title: 'مركز المستندات والملفات 📂',
      docs_empty: 'لا توجد مستندات متاحة حالياً.',
      polls_title: 'استطلاعات الرأي النشطة 📊',
      polls_empty: 'لا توجد استطلاعات رأي نشطة في الوقت الحالي.',
      polls_thanks: 'شكراً لمشاركتك!',
      qa_title: 'الأسئلة التفاعلية 💬',
      qa_subtitle: 'اطرح سؤالك على المنظمين أو المتحدثين للمناقشة المباشرة.',
      qa_form_title: 'طرح سؤال على المنصة',
      qa_session_select: 'اختر الجلسة الموجه لها السؤال',
      qa_session_all: 'عام (كل الجلسات)',
      qa_input_placeholder: 'سؤالك سيظهر للمنظمين مباشرة...',
      qa_send: 'إرسال السؤال',
      cert_title: 'شهادة الحضور',
      cert_subtitle: 'تهانينا! يمكنك الآن تحميل شهادة حضورك المعتمدة والموثقة رقمياً.',
      cert_download: 'تحميل الشهادة المعتمدة',
      cert_badge: 'تحميل بطاقة الحضور (Badge)',
      live_now: 'يجري الآن 🔴',
      live_next: 'الجلسة القادمة ⏳ تبدأ خلال {time} دقيقة',
      live_ended: 'انتهت الجلسات اليوم 🎉',
      minutes: 'دقيقة',
    },
    en: {
      offline_warning: 'You are currently browsing the portal offline. Local caching is enabled.',
      tab_me: 'Me',
      tab_agenda: 'Agenda',
      tab_polls: 'Polls',
      tab_social: 'Wall',
      tab_networking: 'Networking',
      tab_leaderboard: 'Leaderboard',
      tab_cert: 'Certificate',
      tab_docs: 'Documents',
      tab_qa: 'Q&A',
      tab_logistics: 'Logistics 🚗',
      tab_activities: 'Excursions 🏕️',
      tab_catering: 'Catering 🍽️',
      profile_title: 'Digital Participant Portal',
      profile_online: '🟢 Online',
      profile_offline: '🔴 Offline',
      profile_edit: 'Edit Profile',
      profile_networking: 'Networking',
      profile_bio: 'Bio',
      profile_bio_placeholder: 'Write a short bio...',
      profile_linkedin: 'LinkedIn Link',
      profile_specialties: 'Professional Specialties',
      profile_specialties_placeholder: 'Add specialty...',
      profile_specialties_hint: 'Press Enter or comma to add',
      profile_save: 'Save',
      profile_cancel: 'Cancel',
      badge_title: 'Digital Badge',
      badge_scan_mode: 'Enable Fast Scan Mode ⚡',
      badge_seat: 'Seat',
      badge_reg_num: 'Reg Number',
      badge_map: 'Event Location on Map 📍',
      scan_title: 'Diwan Smart Platform · Fast Scan Mode',
      scan_active: 'Screen is active and auto-lock is automatically prevented',
      scan_end: 'End Scan Mode',
      scan_role_vip: 'Guest of Honor ⭐ VIP',
      scan_role_speaker: 'Speaker / Expert 🎤 SPEAKER',
      scan_role_press: 'Press & Media 📰 PRESS',
      scan_role_attendee: 'Certified Attendee 👤 ATTENDEE',
      agenda_title: 'Event Agenda 📅',
      agenda_all: 'All Sessions',
      agenda_favorites: '⭐ My Schedule',
      agenda_empty: 'No sessions available in the list currently.',
      agenda_empty_hint: 'Click the star icon on any session to add it to your schedule!',
      agenda_google_cal: 'Google Calendar',
      agenda_ical: 'Phone Calendar (iCal)',
      agenda_rate_title: 'Rate Session & Speaker:',
      agenda_rate_thanks: 'Thank you for your rating! Saved successfully ❤️',
      agenda_rate_prompt: 'How would you rate the content and performance of this session?',
      leaderboard_title: 'Leaderboard 🏆',
      leaderboard_you: '(You)',
      leaderboard_points: 'pts',
      docs_title: 'Documents Center 📂',
      docs_empty: 'No documents available currently.',
      polls_title: 'Active Polls 📊',
      polls_empty: 'No active polls at the moment.',
      polls_thanks: 'Thank you for participating!',
      qa_title: 'Interactive Q&A 💬',
      qa_subtitle: 'Ask your questions to the organizers or speakers for live discussion.',
      qa_form_title: 'Ask a Question on Stage',
      qa_session_select: 'Select target session',
      qa_session_all: 'General (All Sessions)',
      qa_input_placeholder: 'Your question will appear directly to organizers...',
      qa_send: 'Send Question',
      cert_title: 'Attendance Certificate',
      cert_subtitle: 'Congratulations! You can now download your certified and digitally verified attendance certificate.',
      cert_download: 'Download Certified Certificate',
      cert_badge: 'Download Attendance Badge',
      live_now: 'Live Now 🔴',
      live_next: 'Next session starts in {time} min ⏳',
      live_ended: 'All sessions ended today 🎉',
      minutes: 'min',
    }
  };

  const t = (key, params = {}) => {
    let text = translations[lang]?.[key] || key;
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  };

  const getCurrentAndNextSession = () => {
    if (!agenda || agenda.length === 0) return { current: null, next: null };
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const activeSessions = agenda.filter(s => s.is_active !== false);
    
    let current = null;
    let next = null;
    let minDiff = Infinity;
    
    for (const session of activeSessions) {
      if (session.start_time <= currentHHMM && session.end_time >= currentHHMM) {
        current = session;
      } else if (session.start_time > currentHHMM) {
        const [sh, sm] = session.start_time.split(':').map(Number);
        const [nh, nm] = currentHHMM.split(':').map(Number);
        const diff = (sh * 60 + sm) - (nh * 60 + nm);
        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
          next = { session, minutesLeft: diff };
        }
      }
    }
    
    // Fallback simulation: if no current or next sessions based on real time,
    // we simulate using the first two sessions so the user always sees the glowing live status bar!
    if (!current && !next && activeSessions.length > 0) {
      current = activeSessions[0];
      if (activeSessions.length > 1) {
        next = { session: activeSessions[1], minutesLeft: 15 };
      }
    }
    
    return { current, next };
  };

  const renderLiveStatusBar = () => {
    const { current, next } = getCurrentAndNextSession();
    if (!current && !next) return null;
    
    return (
      <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent animate-pulse pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <span className="text-xs font-black uppercase text-red-400 tracking-widest">{t('live_now')}</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-sm font-black text-[#F0F4F2]">
            {current ? current.title : (next ? t('live_next', { time: next.minutesLeft }) : '')}
          </span>
        </div>
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto justify-between md:justify-end">
          {current && (
            <span className="text-xs text-[#F0F4F2]/60 font-bold">
              🎤 {current.speaker_name} | 📍 {current.hall}
            </span>
          )}
          {current && (
            <button 
              onClick={() => {
                setActiveTab('agenda');
                setAgendaFilter('all');
                setExpandedSessionId(current.id);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-brand-dark text-xs font-black rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.35)]"
            >
              {lang === 'ar' ? 'عرض التفاصيل ⚡' : 'View Details ⚡'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  useEffect(() => {
    try {
      localStorage.setItem(`diwan_favorites_${eventId}`, JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }
  }, [favorites, eventId]);

  useEffect(() => {
    try {
      localStorage.setItem(`diwan_liked_${eventId}`, JSON.stringify(likedPosts));
    } catch (e) {
      console.error('Failed to save liked posts to localStorage', e);
    }
  }, [likedPosts, eventId]);

  useEffect(() => {
    try {
      localStorage.setItem(`diwan_ratings_${eventId}`, JSON.stringify(sessionRatings));
    } catch (e) {
      console.error('Failed to save session ratings', e);
    }
  }, [sessionRatings, eventId]);

  const toggleFavorite = (sessionId, e) => {
    if (e) e.stopPropagation();
    if (favorites.includes(sessionId)) {
      setFavorites(favorites.filter(id => id !== sessionId));
      toast(lang === 'ar' ? 'تمت الإزالة من جدولك الخاص ⭐' : 'Removed from schedule ⭐', { icon: '🗑️' });
    } else {
      // Conflict Detection Engine
      const sessionToAdd = agenda.find(s => s.id === sessionId);
      if (sessionToAdd && sessionToAdd.start_time && sessionToAdd.end_time) {
        const overlap = agenda.find(s => 
          favorites.includes(s.id) &&
          s.id !== sessionId &&
          ((s.start_time >= sessionToAdd.start_time && s.start_time < sessionToAdd.end_time) ||
           (s.end_time > sessionToAdd.start_time && s.end_time <= sessionToAdd.end_time) ||
           (s.start_time <= sessionToAdd.start_time && s.end_time >= sessionToAdd.end_time))
        );
        
        if (overlap) {
          toast.error(
            lang === 'ar' 
              ? `تنبيه تداخل مواعيد: هذه الجلسة تتعارض في الوقت مع: "${overlap.title}"!`
              : `Time conflict: This session overlaps with: "${overlap.title}"!`,
            { duration: 5000 }
          );
        }
      }
      setFavorites([...favorites, sessionId]);
      toast(lang === 'ar' ? 'تمت الإضافة إلى جدولك الخاص ⭐' : 'Added to schedule ⭐', { icon: '💖' });
    }
  };

  const downloadAllFavoritesIcs = () => {
    try {
      const favoritedSessions = agenda.filter(item => favorites.includes(item.id));
      if (favoritedSessions.length === 0) {
        toast.error(lang === 'ar' ? 'جدول مفضلتك فارغ لتصديره!' : 'Your favorites schedule is empty!');
        return;
      }
      
      const dateStr = eventSettings.event_date ? eventSettings.event_date.split('T')[0] : new Date().toISOString().split('T')[0];
      const dateFormatted = dateStr.replace(/-/g, '');
      
      const icsEvents = favoritedSessions.map(session => {
        const startTime = session.start_time || '09:00';
        const endTime = session.end_time || '10:00';
        const startISO = `${dateFormatted}T${startTime.replace(/:/g, '')}00`;
        const endISO = `${dateFormatted}T${endTime.replace(/:/g, '')}00`;
        
        return [
          'BEGIN:VEVENT',
          `SUMMARY:${session.title}`,
          `DESCRIPTION:${session.description || ''}`,
          `LOCATION:${session.hall || ''}`,
          `DTSTART:${startISO}`,
          `DTEND:${endISO}`,
          'END:VEVENT'
        ].join('\n');
      }).join('\n');
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        icsEvents,
        'END:VCALENDAR'
      ].join('\n');
      
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diwan_schedule_${eventId}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === 'ar' ? 'تم تصدير كل الجلسات المفضلة بنجاح! 📅' : 'Entire schedule bundle exported successfully! 📅');
    } catch (e) {
      toast.error('Failed to export calendar bundle');
    }
  };

  const getGoogleCalendarUrl = (session) => {
    try {
      const dateStr = eventSettings.event_date ? eventSettings.event_date.split('T')[0] : new Date().toISOString().split('T')[0];
      const startTime = session.start_time || '09:00';
      const endTime = session.end_time || '10:00';
      const startISO = `${dateStr.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
      const endISO = `${dateStr.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
      return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${startISO}/${endISO}&details=${encodeURIComponent(session.description || '')}&location=${encodeURIComponent(session.hall || '')}&sf=true&output=xml`;
    } catch (e) { return '#'; }
  };

  const getIcsCalendarUrl = (session) => {
    try {
      const dateStr = eventSettings.event_date ? eventSettings.event_date.split('T')[0] : new Date().toISOString().split('T')[0];
      const startTime = session.start_time || '09:00';
      const endTime = session.end_time || '10:00';
      const startISO = `${dateStr.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
      const endISO = `${dateStr.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:${session.title}`,
        `DESCRIPTION:${session.description || ''}`,
        `LOCATION:${session.hall || ''}`,
        `DTSTART:${startISO}`,
        `DTEND:${endISO}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');
      return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    } catch (e) { return '#'; }
  };

  const [isScanMode, setIsScanMode] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);

  const toggleScanMode = async () => {
    if (!isScanMode) {
      setIsScanMode(true);
      toast.success('وضع المسح نشط: تم تنشيط الشاشة ومنع الإيقاف التلقائي ⚡');
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    } else {
      setIsScanMode(false);
      if (wakeLock) {
        try {
          await wakeLock.release();
        } catch (e) {}
        setWakeLock(null);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [wakeLock]);

  // مراقبة حالة الشبكة
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  toast.success('تم استعادة الاتصال ✅'); };
    const handleOffline = () => { setIsOnline(false); toast.error('انقطع الاتصال بالإنترنت'); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (eventId && participantToken) {
      try {
        localStorage.setItem('participant_token', participantToken);
      } catch (e) {}
      fetchInitialData();
    }
  }, [eventId, participantToken]);

  useEffect(() => {
    if (participant) {
      const role = (participant.role || '').toLowerCase();
      const normalize = (str) => {
        if (!str) return '';
        return str.replace(/[أإآأ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
      };
      const normRole = normalize(role);
      if (normRole.includes('استقبل') || normRole.includes('reception')) {
        setSelectedTaskCommittee('reception');
      } else if (normRole.includes('اطعام') || normRole.includes('catering') || normRole.includes('food') || normRole.includes('ضيافه')) {
        setSelectedTaskCommittee('catering');
      } else if (normRole.includes('ايواء') || normRole.includes('accommodation') || normRole.includes('hotel') || normRole.includes('lodging') || normRole.includes('تسكين')) {
        setSelectedTaskCommittee('accommodation');
      } else if (normRole.includes('نقل') || normRole.includes('logistics') || normRole.includes('سائق') || normRole.includes('transport') || normRole.includes('driver')) {
        setSelectedTaskCommittee('transport');
      } else if (normRole.includes('ترفيه') || normRole.includes('نشاط') || normRole.includes('انشطه') || normRole.includes('excursion') || normRole.includes('activity')) {
        setSelectedTaskCommittee('entertainment');
      }
    }
  }, [participant]);

  const loadOptionalDataFromCache = () => {
    try {
      const cachedSettings = localStorage.getItem(`diwan_cache_settings_${eventId}`);
      const cachedAgenda = localStorage.getItem(`diwan_cache_agenda_${eventId}`);
      const cachedLeaderboard = localStorage.getItem(`diwan_cache_leaderboard_${eventId}`);
      const cachedDirectory = localStorage.getItem(`diwan_cache_directory_${eventId}`);
      const cachedPosts = localStorage.getItem(`diwan_cache_posts_${eventId}`);
      const cachedPolls = localStorage.getItem(`diwan_cache_polls_${eventId}`);
      const cachedDocs = localStorage.getItem(`diwan_cache_documents_${eventId}`);
      const cachedQuestions = localStorage.getItem(`diwan_cache_questions_${eventId}`);
      const cachedLogistics = localStorage.getItem(`diwan_cache_logistics_${eventId}`);
      const cachedActivities = localStorage.getItem(`diwan_cache_activities_${eventId}`);
      const cachedCatering = localStorage.getItem(`diwan_cache_catering_${eventId}`);
      const cachedMeals = localStorage.getItem(`diwan_cache_meals_${eventId}`);

      if (cachedSettings) setEventSettings(JSON.parse(cachedSettings));
      if (cachedAgenda) setAgenda(JSON.parse(cachedAgenda));
      if (cachedLeaderboard) setLeaderboard(JSON.parse(cachedLeaderboard));
      if (cachedDirectory) setDirectory(JSON.parse(cachedDirectory));
      if (cachedPosts) setPosts(JSON.parse(cachedPosts));
      if (cachedPolls) setPolls(JSON.parse(cachedPolls));
      if (cachedDocs) setDocuments(JSON.parse(cachedDocs));
      if (cachedQuestions) setQuestions(JSON.parse(cachedQuestions));
      if (cachedLogistics) setLogistics(JSON.parse(cachedLogistics));
      if (cachedActivities) setActivities(JSON.parse(cachedActivities));
      if (cachedCatering) setCatering(JSON.parse(cachedCatering));
      if (cachedMeals) setEventMeals(JSON.parse(cachedMeals));
    } catch (e) {
      console.error('Failed to load optional data from cache', e);
    }
  };

  const loadParticipantFromCache = () => {
    try {
      const cachedParticipant = localStorage.getItem(`diwan_cache_participant_${participantToken}`);
      if (cachedParticipant) {
        const parsed = JSON.parse(cachedParticipant);
        setParticipant(parsed);
        setProfileData({
          bio: parsed.custom_values?.bio || '',
          linkedin: parsed.custom_values?.linkedin || '',
          specialties: parsed.custom_values?.specialties || [],
          website: parsed.custom_values?.website || ''
        });
        setIsOptedIn(parsed.custom_values?.is_visible || false);
        loadOptionalDataFromCache();
      }
    } catch (e) {
      console.error('Failed to load participant from cache', e);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setPortalError(null);
    try {
      const pRes = await api.get(`participants/public/access/${participantToken}`);
      setParticipant(pRes.data);
      
      setProfileData({
        bio: pRes.data.custom_values?.bio || '',
        linkedin: pRes.data.custom_values?.linkedin || '',
        specialties: pRes.data.custom_values?.specialties || [],
        website: pRes.data.custom_values?.website || ''
      });
      
      // Save participant to local cache and set last active PWA portal path
      try {
        localStorage.setItem(`diwan_cache_participant_${participantToken}`, JSON.stringify(pRes.data));
        localStorage.setItem('last_active_participant_portal', `/p/${eventId}/${participantToken}`);
        localStorage.setItem('participant_token', participantToken);
      } catch (e) {
        console.error('Failed to write participant cache', e);
      }

      if (participantToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${participantToken}`;
      }
      
      setIsOptedIn(pRes.data.custom_values?.is_visible || false);
        
      try {
        const [settings, ag, lead, dirRes, wallPosts, activePolls, eventDocs, qList, logisticsData, activitiesData, cateringData, mealsData, notificationsData] = await Promise.all([
          api.get(`events/public/${eventId}`).then(res => res.data),
          agendaService.getSessions(eventId),
          interactionService.getLeaderboard(eventId),
          api.get(`networking/directory?event_id=${eventId}`),
          interactionService.getPosts(eventId),
          interactionService.getActivePolls(eventId),
          interactionService.getDocuments(eventId).catch(() => []),
          interactionService.getQuestions(eventId).catch(() => []),
          interactionService.getLogistics(pRes.data.id).catch(() => null),
          interactionService.listActivities(eventId, pRes.data.id).catch(() => []),
          interactionService.getCateringProfile(pRes.data.id).catch(() => ({ dietary_type: 'none', allergies: '', notes: '' })),
          interactionService.listEventMeals(eventId, pRes.data.id).catch(() => []),
          api.get('notifications/').then(res => res.data).catch(() => [])
        ]);
        setEventSettings(settings || {});
        setAgenda(ag || []);
        setLeaderboard(lead || []);
        setDirectory(dirRes.data || []);
        setPosts(wallPosts || []);
        setPolls(activePolls || []);
        setDocuments(eventDocs || []);
        setQuestions(qList || []);
        if (logisticsData) {
          setLogistics(logisticsData);
        }
        if (activitiesData) {
          setActivities(activitiesData);
        }
        if (cateringData) {
          setCatering(cateringData);
        }
        if (mealsData) {
          setEventMeals(mealsData);
        }
        setNotifications(notificationsData || []);
        setUnreadNotificationsCount((notificationsData || []).filter(n => !n.is_read).length);

        try {
          localStorage.setItem(`diwan_cache_settings_${eventId}`, JSON.stringify(settings || {}));
          localStorage.setItem(`diwan_cache_agenda_${eventId}`, JSON.stringify(ag || []));
          localStorage.setItem(`diwan_cache_leaderboard_${eventId}`, JSON.stringify(lead || []));
          localStorage.setItem(`diwan_cache_directory_${eventId}`, JSON.stringify(dirRes.data || []));
          localStorage.setItem(`diwan_cache_posts_${eventId}`, JSON.stringify(wallPosts || []));
          localStorage.setItem(`diwan_cache_polls_${eventId}`, JSON.stringify(activePolls || []));
          localStorage.setItem(`diwan_cache_documents_${eventId}`, JSON.stringify(eventDocs || []));
          localStorage.setItem(`diwan_cache_questions_${eventId}`, JSON.stringify(qList || []));
          if (logisticsData) {
            localStorage.setItem(`diwan_cache_logistics_${eventId}`, JSON.stringify(logisticsData));
          }
          if (activitiesData) {
            localStorage.setItem(`diwan_cache_activities_${eventId}`, JSON.stringify(activitiesData));
          }
          if (cateringData) {
            localStorage.setItem(`diwan_cache_catering_${eventId}`, JSON.stringify(cateringData));
          }
          if (mealsData) {
            localStorage.setItem(`diwan_cache_meals_${eventId}`, JSON.stringify(mealsData));
          }
        } catch (e) {
          console.error('Failed to write resource cache', e);
        }
      } catch (e) {
        console.warn('Optional data fetch failed, fallback to cache', e);
        loadOptionalDataFromCache();
      }
    } catch (err) {
      const status = err?.response?.status;

      // ── انتهت الفعالية (410) ───────────────────────────────────────
      if (status === 410) {
        try { localStorage.removeItem('last_active_participant_portal'); } catch (_) {}
        setPortalError('event_ended');
      // ── رابط غير صالح من الخادم (401/403/404/422) ───────────────────
      } else if (status === 401 || status === 403 || status === 404 || status === 422) {
        try { localStorage.removeItem('last_active_participant_portal'); } catch (_) {}
        setPortalError(status === 404 ? 'not_found' : 'expired');
      } else {
        // فشل شبكي حقيقي → محاولة تحميل من الكاش المحلي
        console.error('Network failure — falling back to cache', err);
        loadParticipantFromCache();
      }
    } finally {
      setLoading(false);
    }
  };


  const handleRateSession = async (sessionId, rating) => {
    setSessionRatings(prev => ({
      ...prev,
      [sessionId]: rating
    }));
    toast.success("\u0634\u0643\u0631\u0627\u064b \u0644\u062a\u0642\u064a\u064a\u0645\u0643 \u0627\u0644\u062c\u0644\u0633\u0629! \u2B50"); // شكراً لتقييمك الجلسة! ⭐
    
    try {
      await api.post('social/session-feedback', {
        session_id: sessionId,
        rating: rating,
        participant_id: participant?.id
      });
    } catch (err) {
      console.warn('Session rating backend sync failed', err);
    }
  };

  const handlePostToWall = async () => {
    if (!newPost.trim() && !selectedImage) return;
    setIsUploadingImage(true);
    try {
      let uploadedImageUrl = null;
      if (selectedImage) {
        const uploadRes = await interactionService.uploadPostImage(selectedImage);
        uploadedImageUrl = uploadRes.url;
      }

      const response = await interactionService.createPost({
        event_id: eventId,
        author_name: participant.full_name,
        content: newPost,
        image_url: uploadedImageUrl
      });

      const newOptimisticPost = {
        id: response.post_id || Date.now(),
        author_name: participant.full_name,
        content: newPost,
        image_url: uploadedImageUrl || imagePreview,
        is_pending: true
      };
      
      setPosts([newOptimisticPost, ...posts]);
      setNewPost('');
      handleClearImage();
      toast.success('تم إرسال منشورك للمراجعة بنجاح! 💬');
    } catch (err) { 
      console.error('Failed to post to wall:', err);
      toast.error('فشل النشر، يرجى المحاولة مرة أخرى.'); 
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('هل تريد حذف هذا المنشور نهائياً؟')) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await api.delete(`social/${postId}/self`, { params: { session_key: participant.qr_code } });
      toast.success('تم حذف المنشور 🗑️');
    } catch (err) {
      toast.error('فشل حذف المنشور');
      const postsRes = await api.get(`social/${eventId}/approved`);
      setPosts(postsRes.data || []);
    }
  };

  const handleToggleLike = async (postId) => {
    const isLiked = likedPosts.includes(postId);
    
    // 1. Optimistic UI update
    setLikedPosts(prev => isLiked ? prev.filter(id => id !== postId) : [...prev, postId]);
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const currentCount = p.likes_count || 0;
        return {
          ...p,
          likes_count: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1
        };
      }
      return p;
    }));

    try {
      if (isLiked) {
        await api.delete(`social/${postId}/like`, {
          params: { session_key: participant.qr_code }
        });
      } else {
        await api.post(`social/${postId}/like`, null, {
          params: { 
            session_key: participant.qr_code,
            user_name: participant.full_name
          }
        });
      }
    } catch (err) {
      console.error('Failed to toggle like on backend:', err);
      // Revert optimistic updates on error
      setLikedPosts(prev => isLiked ? [...prev, postId] : prev.filter(id => id !== postId));
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const currentCount = p.likes_count || 0;
          return {
            ...p,
            likes_count: isLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
          };
        }
        return p;
      }));
      toast.error('حدث خطأ أثناء تحديث الإعجاب');
    }
  };

  const handleToggleComments = async (postId) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
    } else {
      setExpandedCommentsPostId(postId);
      if (!postComments[postId]) {
        await loadComments(postId);
      }
    }
  };

  const loadComments = async (postId) => {
    try {
      const res = await api.get(`social/${postId}/comments`);
      setPostComments(prev => ({ ...prev, [postId]: res.data }));
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleSubmitComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    setIsSubmittingComment(true);
    try {
      const response = await api.post(`social/${postId}/comment`, {
        author_name: participant.full_name,
        content: text
      });
      
      const newComment = {
        id: response.data?.id || Date.now(),
        author_name: participant.full_name,
        content: text,
        timestamp: new Date().toISOString()
      };
      
      setPostComments(prev => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
      }));

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments_count: (p.comments_count || 0) + 1 };
        }
        return p;
      }));

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      toast.success('تمت إضافة تعليقك بنجاح! 💬');
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error('فشل إرسال التعليق');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      await interactionService.createQuestion({
        event_id: eventId,
        name: participant.full_name,
        text: newQuestion,
        session_id: selectedSessionId ? parseInt(selectedSessionId) : null
      });
      setNewQuestion('');
      toast.success(lang === 'ar' ? 'تم إرسال سؤالك بنجاح ✅' : 'Question submitted successfully ✅');
      
      // جلب قائمة الأسئلة المحدثة
      const qList = await interactionService.getQuestions(eventId).catch(() => []);
      setQuestions(qList || []);
    } catch (err) { toast.error(lang === 'ar' ? 'فشل إرسال السؤال' : 'Failed to submit question'); }
  };

  const handleUpvoteQuestion = async (qId) => {
    // تحديث متفائل للواجهة
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, votes_count: (q.votes_count || 0) + 1 };
      }
      return q;
    }));
    toast.success(lang === 'ar' ? 'تم التصويت للسؤال بنجاح! 💖' : 'Question upvoted successfully! 💖');

    try {
      await interactionService.upvoteQuestion(qId);
    } catch (err) {
      console.error('Failed to upvote question:', err);
      // التراجع عن التحديث المتفائل عند الفشل
      setQuestions(prev => prev.map(q => {
        if (q.id === qId) {
          return { ...q, votes_count: Math.max(0, (q.votes_count || 1) - 1) };
        }
        return q;
      }));
    }
  };

  const handleSaveLogistics = async (e) => {
    if (e) e.preventDefault();
    setIsSavingLogistics(true);
    
    const parseSafeDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    };

    try {
      const response = await interactionService.saveLogistics({
        event_id: parseInt(eventId),
        participant_id: participant.id,
        transport_type: logistics.transport_type || 'none',
        flight_number: logistics.flight_number || null,
        arrival_time: parseSafeDate(logistics.arrival_time),
        departure_time: parseSafeDate(logistics.departure_time),
        arrival_location: logistics.arrival_location || null,
        hotel_name: logistics.hotel_name || null,
        room_number: logistics.room_number || null,
        check_in_date: parseSafeDate(logistics.check_in_date),
        check_out_date: parseSafeDate(logistics.check_out_date)
      });
      
      setLogistics(response);
      
      // Update local storage cache
      try {
        localStorage.setItem(`diwan_cache_logistics_${eventId}`, JSON.stringify(response));
      } catch (err) {}
      
      toast.success(lang === 'ar' ? 'تم حفظ تفاصيل السفر والإقامة بنجاح! 🚗' : 'Travel and lodging details saved successfully! 🚗');
    } catch (err) {
      console.error('Failed to save logistics details:', err);
      toast.error(lang === 'ar' ? 'فشل حفظ البيانات اللوجستية' : 'Failed to save logistics details');
    } finally {
      setIsSavingLogistics(false);
    }
  };

  const handleToggleActivityRegistration = async (activity) => {
    if (!participant) return;
    setIsRegisteringActivity(true);
    try {
      if (activity.is_registered) {
        await interactionService.unregisterActivity(activity.id, participant.id);
        toast.success(lang === 'ar' ? 'تم إلغاء التسجيل في النشاط بنجاح! 🗑️' : 'Cancelled activity registration successfully! 🗑️');
      } else {
        const res = await interactionService.registerActivity(activity.id, participant.id);
        if (res.status === 'success' || res.status === 'already_registered') {
          toast.success(lang === 'ar' ? 'تم التسجيل في النشاط بنجاح! 🎉' : 'Registered in activity successfully! 🎉');
        }
      }
      
      const updated = await interactionService.listActivities(eventId, participant.id).catch(() => []);
      setActivities(updated);
      try {
        localStorage.setItem(`diwan_cache_activities_${eventId}`, JSON.stringify(updated));
      } catch (err) {}
    } catch (err) {
      console.error('Failed to toggle activity registration:', err);
      toast.error(err.response?.data?.detail || (lang === 'ar' ? 'فشل معالجة الطلب' : 'Failed to process request'));
    } finally {
      setIsRegisteringActivity(false);
    }
  };

  const handleToggleActivityPickup = async (activityId, requested, notes = "") => {
    if (!participant) return;
    try {
      await interactionService.updateActivityRegistration(activityId, participant.id, requested, notes);
      toast.success(lang === 'ar' ? 'تم تحديث طلب النقل بنجاح! 🚗' : 'Shuttle request updated successfully! 🚗');
      
      const updated = await interactionService.listActivities(eventId, participant.id).catch(() => []);
      setActivities(updated);
      try {
        localStorage.setItem(`diwan_cache_activities_${eventId}`, JSON.stringify(updated));
      } catch (err) {}
    } catch (err) {
      console.error('Failed to update activity pickup request:', err);
      toast.error(err.response?.data?.detail || (lang === 'ar' ? 'فشل تحديث طلب النقل' : 'Failed to update shuttle request'));
    }
  };

  const handleSaveCatering = async (e) => {
    if (e) e.preventDefault();
    setIsSavingCatering(true);
    try {
      const response = await interactionService.saveCateringProfile({
        participant_id: participant.id,
        event_id: parseInt(eventId),
        dietary_type: catering.dietary_type,
        allergies: catering.allergies || "",
        notes: catering.notes || ""
      });
      setCatering(response);
      try {
        localStorage.setItem(`diwan_cache_catering_${eventId}`, JSON.stringify(response));
      } catch (err) {}
      toast.success(lang === 'ar' ? 'تم حفظ تفضيلاتك الغذائية بنجاح! 🍽️' : 'Dietary preferences saved successfully! 🍽️');
    } catch (err) {
      console.error('Failed to save catering details:', err);
      toast.error(lang === 'ar' ? 'فشل حفظ التفضيلات الغذائية' : 'Failed to save dietary preferences');
    } finally {
      setIsSavingCatering(false);
    }
  };

  const handleToggleMealRsvp = async (mealId, attending) => {
    if (!participant) return;
    setIsTogglingMealRsvp(true);
    const previousMeals = [...eventMeals];
    setEventMeals(prev => prev.map(m => {
      if (m.id === mealId) {
        return { ...m, attending: attending };
      }
      return m;
    }));

    try {
      await interactionService.toggleMealRsvp(mealId, participant.id, attending);
      const updatedMeals = await interactionService.listEventMeals(eventId, participant.id).catch(() => []);
      setEventMeals(updatedMeals);
      try {
        localStorage.setItem(`diwan_cache_meals_${eventId}`, JSON.stringify(updatedMeals));
      } catch (err) {}
      
      if (attending) {
        toast.success(lang === 'ar' ? 'تم تأكيد حضورك الوجبة بنجاح! 🍽️' : 'Meal attendance confirmed successfully! 🍽️');
      } else {
        toast(lang === 'ar' ? 'تم إلغاء حضور الوجبة (شكراً لمساهمتك في منع الهدر الغذائي 🍃)' : 'Opted out of meal (Thank you for reducing food waste 🍃)', { icon: '🌱' });
      }
    } catch (err) {
      console.error('Failed to toggle meal RSVP:', err);
      setEventMeals(previousMeals);
      toast.error(lang === 'ar' ? 'فشل تعديل حالة حضور الوجبة' : 'Failed to update meal attendance');
    } finally {
      setIsTogglingMealRsvp(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'organizer') {
      fetchStaffLogistics();
      fetchReceptionParticipants();
      fetchCommitteeTasks();
      fetchStaffCatering();
      fetchDrivers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (participant) {
      const normalize = (str) => {
        if (!str) return '';
        return str.replace(/[أإآأ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
      };
      const roleLower = (participant.role || '').toLowerCase();
      const normRoleLower = normalize(roleLower);
      
      const isGeneral = !participant.role || 
        normRoleLower === 'organizer' || 
        normRoleLower === 'منظم' || 
        (normRoleLower.includes('عام') && !normRoleLower.includes('طعام')) || 
        normRoleLower.includes('general') ||
        localStorage.getItem('diwan_force_organizer') === 'true';

      if (isGeneral || normRoleLower.includes('نقل') || normRoleLower.includes('لوجست') || normRoleLower.includes('transport') || normRoleLower.includes('logistics') || normRoleLower.includes('سائق')) {
        setStaffActiveSubTab('logistics');
      } else if (normRoleLower.includes('اطعام') || normRoleLower.includes('ضيافه') || normRoleLower.includes('تموين') || normRoleLower.includes('catering') || normRoleLower.includes('food')) {
        setStaffActiveSubTab('catering');
      } else if (normRoleLower.includes('ايواء') || normRoleLower.includes('تسكين') || normRoleLower.includes('فندق') || normRoleLower.includes('hotel') || normRoleLower.includes('accommodation') || normRoleLower.includes('lodging')) {
        setStaffActiveSubTab('accommodation');
      } else if (normRoleLower.includes('ترفيه') || normRoleLower.includes('نشاط') || normRoleLower.includes('انشط') || normRoleLower.includes('entertainment') || normRoleLower.includes('excursion') || normRoleLower.includes('activity')) {
        setStaffActiveSubTab('entertainment');
      } else if (normRoleLower.includes('استقبل') || normRoleLower.includes('تسجيل') || normRoleLower.includes('reception') || normRoleLower.includes('checkin') || normRoleLower.includes('gate') || normRoleLower.includes('scanner')) {
        setStaffActiveSubTab('reception');
      }
    }
  }, [participant]);

  const fetchStaffLogistics = async () => {
    setIsLoadingStaffLogistics(true);
    try {
      const data = await interactionService.listEventLogistics(eventId);
      setStaffLogisticsList(data || []);
    } catch (err) {
      console.error('Failed to fetch event logistics for staff:', err);
      // Fallback Mock Data for demo & robust experience
      setStaffLogisticsList([
        {
          id: 1,
          participant_id: 101,
          participant_name: lang === 'ar' ? 'سعادة الدكتور أحمد بن صالح' : 'H.E. Dr. Ahmed Al-Saleh',
          participant_phone: '+966501234567',
          participant_email: 'ahmed@diwan.gov.sa',
          transport_type: 'plane',
          flight_number: 'SV-320',
          arrival_time: new Date().toISOString(),
          arrival_location: lang === 'ar' ? 'مطار الجزائر الدولي - صالة شرفية' : 'Algiers Intl Airport - VIP Lounge',
          hotel_name: lang === 'ar' ? 'فندق الأوراسي' : 'El Aurassi Hotel',
          room_number: '402',
          driver_name: '',
          driver_phone: '',
          vehicle_details: '',
          status: 'pending'
        },
        {
          id: 2,
          participant_id: 102,
          participant_name: lang === 'ar' ? 'البروفيسور سليم الجزائري' : 'Prof. Slimane El Djazairi',
          participant_phone: '+213550998877',
          participant_email: 'slimane@univ.dz',
          transport_type: 'private_car',
          flight_number: '',
          arrival_time: new Date().toISOString(),
          arrival_location: lang === 'ar' ? 'سيارة خاصة - وصول مباشر' : 'Private Car - Direct Arrival',
          hotel_name: lang === 'ar' ? 'فندق شيراتون الجزائر' : 'Sheraton Algiers',
          room_number: '120',
          driver_name: lang === 'ar' ? 'رشيد بوعلام' : 'Rachid Boualem',
          driver_phone: '+213661122334',
          vehicle_details: lang === 'ar' ? 'مرسيدس الفئة S - سوداء' : 'Mercedes S-Class - Black',
          status: 'dispatched'
        }
      ]);
    } finally {
      setIsLoadingStaffLogistics(false);
    }
  };

  const fetchStaffCatering = async () => {
    setIsLoadingStaffCatering(true);
    try {
      const data = await interactionService.listEventCateringProfiles(eventId);
      setStaffCateringList(data || []);
    } catch (err) {
      console.error('Failed to fetch event catering for staff:', err);
    } finally {
      setIsLoadingStaffCatering(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await interactionService.listDrivers(eventId);
      setDriversList(data || []);
    } catch (err) {
      console.error('Failed to fetch event drivers:', err);
    }
  };

  const fetchReceptionParticipants = async () => {
    setIsLoadingReception(true);
    try {
      const data = await participantService.getParticipants(eventId, { limit: 1000 });
      setReceptionList(data?.items || []);
    } catch (err) {
      console.error('Failed to fetch reception participants:', err);
    } finally {
      setIsLoadingReception(false);
    }
  };

  const fetchCommitteeTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const data = await interactionService.listTasks(eventId);
      setTasksList(data || []);
    } catch (err) {
      console.error('Failed to fetch committee tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (selectedTaskIdFromNotif && tasksList.length > 0) {
      const found = tasksList.find(t => t.id === selectedTaskIdFromNotif);
      if (found) {
        setDetailedTask(found);
      }
      setSelectedTaskIdFromNotif(null);
    }
  }, [selectedTaskIdFromNotif, tasksList]);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await api.get('notifications/');
      setNotifications(res.data || []);
      setUnreadNotificationsCount((res.data || []).filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkNotificationsAsRead = async () => {
    try {
      await api.post('notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await api.delete('notifications/clear');
      setNotifications([]);
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleCreateTask = async (e) => {
    if (e) e.preventDefault();
    if (!newTaskForm.title) return;
    
    let assignedName = '';
    if (newTaskForm.assigned_to_id) {
      const helper = receptionList.find(p => p.id === parseInt(newTaskForm.assigned_to_id));
      if (helper) assignedName = helper.full_name;
    }
    
    try {
      await interactionService.createTask({
        event_id: eventId,
        committee: selectedTaskCommittee,
        title: newTaskForm.title,
        description: newTaskForm.description,
        participant_id: newTaskForm.participant_id ? parseInt(newTaskForm.participant_id) : null,
        assigned_to_id: newTaskForm.assigned_to_id ? parseInt(newTaskForm.assigned_to_id) : null,
        assigned_to_name: assignedName || null,
        due_time: newTaskForm.due_time || null
      });
      toast.success(lang === 'ar' ? 'تم إسناد المهمة بنجاح!' : 'Task assigned successfully!');
      setIsCreateTaskModalOpen(false);
      setNewTaskForm({
        title: '',
        description: '',
        participant_id: '',
        assigned_to_id: '',
        due_time: ''
      });
      fetchCommitteeTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error(lang === 'ar' ? 'فشل إسناد المهمة' : 'Failed to assign task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus, apologyReason = null) => {
    try {
      await interactionService.updateTaskStatus(taskId, newStatus, apologyReason);
      toast.success(lang === 'ar' ? 'تم تحديث حالة المهمة' : 'Task status updated');
      
      setDetailedTask(prev => {
        if (prev && prev.id === taskId) {
          if (newStatus === 'apologized') {
            return {
              ...prev,
              status: 'pending',
              assigned_to_id: null,
              assigned_to_name: null,
              description: (prev.description || '') + `\n\n⚠️ سبب الاعتذار: ${apologyReason}`
            };
          }
          return { ...prev, status: newStatus };
        }
        return prev;
      });

      fetchCommitteeTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.error(lang === 'ar' ? 'فشل تحديث حالة المهمة' : 'Failed to update task status');
    }
  };

  const handleReassignTask = async (taskId, assignedToId) => {
    try {
      const targetParticipant = receptionList.find(p => p.id === parseInt(assignedToId));
      const assignedToName = targetParticipant ? targetParticipant.full_name : '';
      
      const updated = await interactionService.reassignTask(taskId, assignedToId, assignedToName);
      toast.success(lang === 'ar' ? 'تم إسناد المهمة للعضو الجديد' : 'Task successfully reassigned');
      
      setDetailedTask(updated);
      setSelectedReassigneeId('');
      fetchCommitteeTasks();
    } catch (err) {
      console.error('Failed to reassign task:', err);
      toast.error(lang === 'ar' ? 'فشل إعادة إسناد المهمة' : 'Failed to reassign task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) {
      try {
        await interactionService.deleteTask(taskId);
        toast.success(lang === 'ar' ? 'تم حذف المهمة بنجاح' : 'Task deleted successfully');
        fetchCommitteeTasks();
      } catch (err) {
        console.error('Failed to delete task:', err);
        toast.error(lang === 'ar' ? 'فشل حذف المهمة' : 'Failed to delete task');
      }
    }
  };

  const getDriverConflictWarning = () => {
    if (!selectedStaffParticipant) return null;
    const currentPhone = staffDispatchForm.driver_phone.trim();
    if (!currentPhone) return null;
    
    const currentGuestId = selectedStaffParticipant.participant_id;
    const currentArrivalTime = selectedStaffParticipant.arrival_time ? new Date(selectedStaffParticipant.arrival_time) : null;
    if (!currentArrivalTime) return null;
    
    const conflict = staffLogisticsList.find(item => {
      if (item.participant_id === currentGuestId) return false;
      if (!item.driver_phone || item.driver_phone.trim() !== currentPhone) return false;
      if (!item.arrival_time) return false;
      
      const otherTime = new Date(item.arrival_time);
      const diffHours = Math.abs(currentArrivalTime - otherTime) / (1000 * 60 * 60);
      return diffHours < 2;
    });
    
    if (conflict) {
      return lang === 'ar'
        ? `⚠️ السائق مخصص للضيف (${conflict.participant_name}) بوقت وصول متقارب (${new Date(conflict.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})!`
        : `⚠️ Driver is already assigned to guest (${conflict.participant_name}) with close arrival time (${new Date(conflict.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})!`;
    }
    return null;
  };

  const handleSaveStaffDispatch = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStaffParticipant) return;
    setIsSavingStaffDispatch(true);
    try {
      await interactionService.dispatchLogistics(
        selectedStaffParticipant.participant_id,
        {
          driver_name: staffDispatchForm.driver_name,
          driver_phone: staffDispatchForm.driver_phone,
          vehicle_details: staffDispatchForm.vehicle_details,
          status: staffDispatchForm.status,
          shuttle_time: new Date().toISOString()
        }
      );
      toast.success(lang === 'ar' ? 'تم تعيين المرافق وإرسال التفاصيل للمشارك بنجاح! 🚗' : 'Companion assigned and details dispatched successfully! 🚗');
      setIsStaffDispatchModalOpen(false);
      fetchStaffLogistics();
    } catch (err) {
      console.error('Failed to dispatch logistics:', err);
      // Fallback state update
      setStaffLogisticsList(prev => prev.map(item => {
        if (item.participant_id === selectedStaffParticipant.participant_id) {
          return {
            ...item,
            driver_name: staffDispatchForm.driver_name,
            driver_phone: staffDispatchForm.driver_phone,
            vehicle_details: staffDispatchForm.vehicle_details,
            status: staffDispatchForm.status
          };
        }
        return item;
      }));
      toast.success(lang === 'ar' ? 'تم تحديث تفاصيل النقل واللوجستيات بنجاح! 🚗' : 'Logistics details updated successfully! 🚗');
      setIsStaffDispatchModalOpen(false);
    } finally {
      setIsSavingStaffDispatch(false);
    }
  };

  const handleOptInToggle = async () => {
    try {
      const res = await api.patch(`participants/public/visibility/${participantToken}`);
      const newStatus = res.data.is_visible;
      setIsOptedIn(newStatus);
      
      // تحديث الدليل فوراً ليظهر المشترك نفسه أو يختفي
      const dirRes = await api.get(`networking/directory?event_id=${eventId}`);
      setDirectory(dirRes.data || []);
      toast.success(newStatus ? 'أنت الآن مرئي للمشاركين' : 'تم إخفاء ملفك الشخصي');
    } catch (err) { toast.error('حدث خطأ أثناء تحديث الإعدادات'); }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      await interactionService.submitVote(pollId, optionId, participant.id);
      setVotedPolls([...votedPolls, pollId]);
      toast.success('تم تسجيل صوتك بنجاح ✅');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التصويت');
    }
  };

  const handleConnect = (contact) => {
    setSelectedContact(contact);
  };

  const handleRequestConnection = async () => {
    if (!selectedContact || !participant) return;
    try {
      await api.post(`networking/connect?requested_qr=${selectedContact.qr_code}`);
      toast.success('تم إرسال طلب التواصل الاحترافي بنجاح ✅');
      setSelectedContact(null);
      const dirRes = await api.get(`networking/directory?event_id=${eventId}`);
      setDirectory(dirRes.data || []);
    } catch (err) {
      toast.error('فشل إرسال الطلب. ربما أرسلته مسبقاً.');
    }
  };



  const handleParticipantAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.');
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('networking/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newAvatarUrl = res.data.avatar_url;
      
      const updatedParticipant = { ...participant, avatar_url: newAvatarUrl };
      setParticipant(updatedParticipant);
      
      localStorage.setItem(`diwan_cache_participant_${participantToken}`, JSON.stringify(updatedParticipant));
      
      toast.success('تم تحديث صورتك الشخصية بنجاح ✅');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل رفع الصورة الشخصية');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const data = { ...profileData };
      await api.patch('participants/public/profile', data);

      // الإصلاح الجذري: نحافظ على avatar_url في state لأن profileData لا يحتوي عليها
      const updatedParticipant = {
        ...participant,
        custom_values: {
          ...participant.custom_values,
          ...data,
          // الحفاظ الصريح على avatar_url من أي مصدر متاح
          avatar_url: participant.avatar_url || participant.custom_values?.avatar_url,
        },
        // avatar_url على مستوى المشارك مباشرة — المصدر الأول الذي تبحث عنه الواجهة
        avatar_url: participant.avatar_url || participant.custom_values?.avatar_url,
      };

      setParticipant(updatedParticipant);
      setIsEditingProfile(false);

      // تحديث الكاش المحلي ليعكس الحالة المحدَّثة مع الصورة
      try {
        localStorage.setItem(`diwan_cache_participant_${participantToken}`, JSON.stringify(updatedParticipant));
      } catch (e) {
        console.error('Failed to update participant cache after profile update', e);
      }

      toast.success('تم تحديث ملفك الشخصي بنجاح ✅');
    } catch (err) {
      toast.error('فشل تحديث الملف الشخصي');
    }
  };

  const handleDownloadVCard = (contact) => {
    const url = `${api.defaults.baseURL}networking/vcard/${contact.qr_code}`;
    window.open(url, '_blank');
  };

  const tabs = [
    { id: 'home', label: t('tab_me'), icon: User },
    { id: 'notifications', label: lang === 'ar' ? 'التنبيهات' : 'Notifications', icon: Bell },
    { id: 'agenda', label: t('tab_agenda'), icon: Calendar },
    { id: 'polls', label: t('tab_polls'), icon: BarChart2, show: eventSettings.show_polls !== false },
    { id: 'social', label: t('tab_social'), icon: MessageSquare, show: eventSettings.show_social_wall !== false },
    { id: 'networking', label: t('tab_networking'), icon: NetworkingIcon, show: eventSettings.show_networking !== false },
    { id: 'leaderboard', label: t('tab_leaderboard'), icon: Award, show: eventSettings.show_leaderboard === true }, // مخفية افتراضياً إلا لو فُعلت
    { id: 'cert', label: t('tab_cert'), icon: Award },
    { id: 'docs', label: t('tab_docs'), icon: FileText, show: eventSettings.show_docs !== false },
    { id: 'ai', label: t('tab_qa'), icon: HelpCircle, show: eventSettings.show_qa !== false },
    { id: 'logistics', label: t('tab_logistics'), icon: Truck },
    { id: 'activities', label: t('tab_activities'), icon: Compass },
    { id: 'catering', label: t('tab_catering'), icon: Utensils },
  ];

  const normalizeArabic = (str) => {
    if (!str) return '';
    return str
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .toLowerCase();
  };

  const normRole = normalizeArabic(participant?.role || '');

  const isOrganizer = participant && (
    participant.role === 'organizer' || 
    participant.role === 'منظم' || 
    participant.custom_values?.is_organizer ||
    normRole.includes('organizer') ||
    normRole.includes('منظم') ||
    normRole.includes('لجنه') ||
    normRole.includes('رئيس') ||
    normRole.includes('عضو') ||
    normRole.includes('committee') ||
    normRole.includes('president') ||
    normRole.includes('member') ||
    localStorage.getItem('diwan_force_organizer') === 'true'
  );

  const isPressOrExhibitor = normRole.includes('press') || 
    normRole.includes('صحافه') || 
    normRole.includes('exhibitor') || 
    normRole.includes('عارض') ||
    normRole.includes('صحافي');
  
  const isGeneralOrganizer = !participant?.role || 
    normRole === 'organizer' || 
    normRole === 'منظم' || 
    (normRole.includes('عام') && !normRole.includes('طعام')) || 
    normRole.includes('general') ||
    localStorage.getItem('diwan_force_organizer') === 'true';

  const hasLogisticsStaffAccess = isOrganizer && !isPressOrExhibitor && (isGeneralOrganizer || 
    normRole.includes('نقل') || 
    normRole.includes('لوجست') || 
    normRole.includes('transport') || 
    normRole.includes('logistics'));

  const hasCateringStaffAccess = isOrganizer && !isPressOrExhibitor && (isGeneralOrganizer || 
    normRole.includes('اطعام') || 
    normRole.includes('ضيافه') || 
    normRole.includes('تموين') || 
    normRole.includes('catering') || 
    normRole.includes('food'));

  const hasAccommodationStaffAccess = isOrganizer && !isPressOrExhibitor && (isGeneralOrganizer || 
    normRole.includes('ايواء') || 
    normRole.includes('تسكين') || 
    normRole.includes('فندق') || 
    normRole.includes('hotel') || 
    normRole.includes('accommodation') || 
    normRole.includes('lodging'));

  const hasEntertainmentStaffAccess = isOrganizer && !isPressOrExhibitor && (isGeneralOrganizer || 
    normRole.includes('ترفيه') || 
    normRole.includes('نشاط') || 
    normRole.includes('انشطه') || 
    normRole.includes('entertainment') || 
    normRole.includes('excursion') || 
    normRole.includes('activity'));

  const hasReceptionStaffAccess = isOrganizer && !isPressOrExhibitor && (isGeneralOrganizer || 
    normRole.includes('استقبال') || 
    normRole.includes('تسجيل') || 
    normRole.includes('reception') || 
    normRole.includes('checkin') || 
    normRole.includes('gate') || 
    normRole.includes('scanner'));

  if (isOrganizer && !isPressOrExhibitor) {
    tabs.push({ id: 'organizer', label: lang === 'ar' ? 'إدارة اللجان 🛠️' : 'Staff Panel 🛠️', icon: Shield });
  }

  const filteredTabs = tabs.filter(t => {
    if (isPressOrExhibitor) {
      return t.id === 'home';
    }
    return t.show !== false;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
    </div>
  );
  
  // ── حالة: انتهت الفعالية — روني
  if (portalError === 'event_ended') return (
    <div className="min-h-screen bg-[#050B18] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
        <span style={{fontSize:'2.5rem'}}>🎉</span>
      </div>
      <h2 className="text-2xl font-black mb-2 text-white">انتهت الفعالية</h2>
      <p className="text-white/50 font-bold mb-8 max-w-xs leading-relaxed">
        شكراً لمشاركتك! انتهت الفعالية وأُغلقت البوابة الرقمية من قِبَل المنظمين.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)',
          fontWeight:700, padding:'12px 32px', borderRadius:14,
          border:'1px solid rgba(255,255,255,0.1)',
          fontFamily:'Cairo,system-ui,sans-serif', fontSize:'1rem', cursor:'pointer'
        }}
      >
        العودة للرئيسية
      </button>
    </div>
  );

  // ── حالة: رابط منتهي الصلاحية أو غير صالح
  if (portalError === 'expired') return (
    <div className="min-h-screen bg-[#050B18] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
        <span style={{fontSize:'2.5rem'}}>⏳</span>
      </div>
      <h2 className="text-2xl font-black mb-2 text-white">انتهت صلاحية الرابط</h2>
      <p className="text-white/50 font-bold mb-8 max-w-xs leading-relaxed">
        رابط الدخول الخاص بك انتهت صلاحيته. تواصل مع منظمي الفعالية لإرسال رابط جديد إليك.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          background: 'linear-gradient(135deg,#D4AF37,#F0C040)', color:'#050B18',
          fontWeight:900, padding:'12px 32px', borderRadius:14, border:'none',
          fontFamily:'Cairo,system-ui,sans-serif', fontSize:'1rem', cursor:'pointer'
        }}
      >
        العودة للرئيسية
      </button>
    </div>
  );

  if (!participant) return (
    <div className="min-h-screen bg-[#050B18] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <X className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-black mb-2">عذراً، الرابط غير صالح</h2>
      <p className="text-brand-secondary/50 font-bold mb-8">لم نتمكن من العثور على بيانات المشارك لهذا الرابط. يرجى التأكد من الرمز أو التواصل مع المنظمين.</p>
      <Button variant="outline" onClick={() => window.location.href = '/'}>العودة للرئيسية</Button>
    </div>
  );

  const renderCommitteeTasks = (committeeKey) => {
    const roleLower = (participant.role || '').toLowerCase();
    const isGeneral = !participant.role || 
      roleLower === 'organizer' || 
      roleLower === 'منظم' || 
      (roleLower.includes('عام') && !roleLower.includes('طعام')) || 
      roleLower.includes('general') ||
      localStorage.getItem('diwan_force_organizer') === 'true';

    const isPresident = roleLower.includes('رئيس') || roleLower.includes('president') || isGeneral;
    
    const filteredTasks = tasksList.filter(t => {
      if (t.committee !== committeeKey) return false;
      if (isPresident) return true;
      return t.assigned_to_id === participant.id;
    });
    
    const availableHelpers = receptionList.filter(p => {
      const r = (p.role || '').toLowerCase();
      return r.includes('منظم') || r.includes('organizer') || r.includes('سائق') || r.includes('مرافق') || r.includes('driver') || r.includes('companion') || r.includes('helper') || r.includes('مساعد') || r.includes('رئيس');
    });

    return (
      <div className="mt-8 pt-8 border-t border-white/5 text-right">
        <div className="flex items-center justify-between gap-4 mb-6">
          {isPresident && (
            <button
              onClick={() => {
                setSelectedTaskCommittee(committeeKey);
                setIsCreateTaskModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-black shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all"
            >
              <span>➕</span>
              {lang === 'ar' ? 'إسناد مهمة جديدة' : 'Assign New Task'}
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 font-bold border border-white/10">
              {isPresident ? (lang === 'ar' ? 'صلاحيات رئيس اللجنة 👑' : 'Committee President 👑') : (lang === 'ar' ? 'عضو اللجنة 🛡️' : 'Committee Member 🛡️')}
            </span>
            <h4 className="text-sm font-black text-white">{lang === 'ar' ? 'المهام الميدانية والتفويض' : 'Field Tasks & Delegation'}</h4>
          </div>
        </div>

        {isLoadingTasks ? (
          <div className="flex justify-center py-6">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <p className="text-white/40 text-xs py-4 text-center font-bold">
            {lang === 'ar' ? 'لا توجد أي مهام مسندة لهذه اللجنة حالياً' : 'No tasks assigned to this committee yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const guest = receptionList.find(p => p.id === task.participant_id);
              return (
                <div 
                  key={task.id} 
                  onClick={() => setDetailedTask(task)}
                  className="p-4 bg-white/[0.01] border border-white/5 hover:border-amber-500/20 rounded-2xl transition-all cursor-pointer hover:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {isPresident && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                          title={lang === 'ar' ? 'حذف المهمة' : 'Delete Task'}
                        >
                          🗑️
                        </button>
                      )}
                      
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-black",
                        task.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        task.status === 'in_progress' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        task.status === 'cancelled' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}>
                        {task.status === 'completed' ? (lang === 'ar' ? '✅ اكتملت' : 'Completed') :
                         task.status === 'in_progress' ? (lang === 'ar' ? '⚙️ جاري العمل' : 'In Progress') :
                         task.status === 'cancelled' ? (lang === 'ar' ? '❌ ملغاة' : 'Cancelled') :
                         (lang === 'ar' ? '⏳ قيد الانتظار' : 'Pending')}
                      </span>
                    </div>

                    <h5 className="font-black text-sm text-white">{task.title}</h5>
                  </div>

                  {task.description && (
                    <p className="text-white/60 text-xs mt-1.5 font-bold mb-2 leading-relaxed">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.03] text-[11px] font-bold text-white/40">
                    <div className="flex items-center gap-2">
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Start / Complete: only for the assigned member */}
                          {task.assigned_to_id === participant.id && (
                            task.status === 'pending' ? (
                              <button
                                onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all"
                              >
                                {lang === 'ar' ? 'بدء التنفيذ' : 'Start'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
                              >
                                {lang === 'ar' ? 'إكمال المهمة' : 'Complete'}
                              </button>
                            )
                          )}

                          {/* Apologize: only for the assigned member */}
                          {task.assigned_to_id === participant.id && (
                            <button
                              onClick={() => {
                                setDetailedTask(task);
                                setIsApologizing(true);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all"
                            >
                              {lang === 'ar' ? 'اعتذار' : 'Apologize'}
                            </button>
                          )}

                          {/* Cancel: only for the president */}
                          {isPresident && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'cancelled')}
                              className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                            >
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-end">
                      {task.due_time && (
                        <span>⏰ {new Date(task.due_time).toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'en-US', {hour:'2-digit', minute:'2-digit'})}</span>
                      )}
                      {guest && (
                        <span className="text-amber-500">👤 {lang === 'ar' ? `الضيف: ${guest.full_name}` : `Guest: ${guest.full_name}`}</span>
                      )}
                      {task.assigned_to_name && (
                        <span className="text-emerald-400">🛡️ {lang === 'ar' ? `المنفذ: ${task.assigned_to_name}` : `Assignee: ${task.assigned_to_name}`}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const myLeaderboardEntry = (leaderboard || []).find(entry => entry.id === participant.id);
  const myPoints = myLeaderboardEntry ? myLeaderboardEntry.points : 0;

  const roleLower = (participant?.role || '').toLowerCase();
  const isGeneral = !participant?.role || 
    roleLower === 'organizer' || 
    roleLower === 'منظم' || 
    (roleLower.includes('عام') && !roleLower.includes('طعام')) || 
    roleLower.includes('general') ||
    localStorage.getItem('diwan_force_organizer') === 'true';
  const isPresident = roleLower.includes('رئيس') || roleLower.includes('president') || isGeneral;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(participant?.qr_code || '')}`;

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={cn(
      "min-h-screen bg-[#050B18] text-[#F0F4F2] selection:bg-amber-500 selection:text-brand-dark flex flex-col overflow-x-hidden",
      lang === 'ar' ? 'font-arabic' : 'font-sans'
    )}>
      {/* Offline Glow Warning Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600/90 to-amber-800/90 backdrop-blur-md text-white text-center py-2.5 px-4 text-xs font-black tracking-wide flex items-center justify-center gap-2 border-b border-amber-500/20 z-[60] sticky top-0 animate-fade-in shadow-lg">
          <span className="animate-pulse">⚠️</span>
          <span>{t('offline_warning')}</span>
        </div>
      )}

      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="p-6 bg-white/[0.03] backdrop-blur-3xl border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {eventSettings?.logo_url ? (
            <img 
              src={getFullUrl(eventSettings.logo_url)} 
              alt="Logo" 
              className="w-12 h-12 rounded-2xl object-cover shadow-xl border border-white/10"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-brand-dark shadow-xl">
              D
            </div>
          )}
          <div className={lang === 'ar' ? "text-right" : "text-left"}>
            <h1 className="font-black text-base tracking-tight leading-none uppercase text-white">
              {eventSettings?.name ? eventSettings.name : 'DIWAN PORTAL'}
            </h1>
            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mt-1">{t('profile_title')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Dynamic Language Toggle Button */}
          <button
            onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
            className={cn(
              "px-3 py-2 rounded-xl border transition-all duration-300 text-[10px] font-black tracking-wider uppercase",
              theme === 'dark'
                ? "bg-white/5 border-white/10 text-[#F0F4F2] hover:bg-white/10"
                : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
            )}
          >
            {lang === 'ar' ? 'EN' : 'العربية'}
          </button>

          {/* Dynamic Theme Switcher Button */}
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={cn(
              "p-2 rounded-xl border transition-all duration-300",
              theme === 'dark'
                ? "bg-white/5 border-white/10 text-amber-500 hover:bg-white/10"
                : "bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200"
            )}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black border transition-all",
            isOnline
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
          )}>
            {isOnline ? t('profile_online') : t('profile_offline')}
          </div>
        </div>
      </header>

      <main className={cn("flex-1 p-6 relative z-10 overflow-y-auto", filteredTabs.length > 1 ? "pb-40" : "pb-12")}>
        {renderLiveStatusBar()}
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
               
               {/* 1. Profile Card (Luxury Golden Styling) */}
               <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl text-center relative shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
                  <div className="relative w-32 h-32 mx-auto mb-6 group/avatar">
                    {participant?.avatar_url ? (
                      <img 
                        src={participant.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-[32px] border-2 border-amber-500/30 shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[32px] bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center border-2 border-amber-500/30 text-brand-dark shadow-[0_12px_40px_rgba(212,175,55,0.25)]">
                        <span className="text-5xl font-black">{participant?.full_name?.charAt(0) || 'U'}</span>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => document.getElementById('participant-avatar-input')?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center text-brand-dark shadow-lg group-hover/avatar:scale-110 transition-transform disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-brand-dark" />
                    </button>
                    <input 
                      type="file"
                      id="participant-avatar-input"
                      accept="image/*"
                      className="hidden"
                      onChange={handleParticipantAvatarChange}
                      disabled={isUploadingAvatar}
                    />
                  </div>
                  
                  <h2 className="text-3xl font-black mb-1 tracking-tight text-[#F0F4F2]">{participant.full_name}</h2>
                  <p className="text-[#F0F4F2]/60 font-bold text-xs mb-3 uppercase tracking-wider">{participant.organization}</p>
                  
                  {/* Gamification Hub Badge */}
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-500 uppercase tracking-wider mb-6 shadow-sm">
                    <span>{myPoints >= 200 ? 'مشارك بلاتيني 👑' : myPoints >= 100 ? 'مشارك ذهبي 🏆' : myPoints >= 50 ? 'مشارك فضي 🎖️' : 'مشارك نشط 👤'}</span>
                    <span className="w-1 h-1 rounded-full bg-amber-500/40" />
                    <span>{myPoints} نقطة تفاعلية</span>
                  </div>
                  
                  {participant.custom_values?.specialties?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                       {participant.custom_values.specialties.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-black text-amber-500">
                             {s}
                          </span>
                       ))}
                    </div>
                  )}

                  {!isEditingProfile ? (
                    <div className="space-y-6">
                      {participant.custom_values?.bio && (
                        <p className="text-white/70 text-sm leading-relaxed mb-4 px-4">{participant.custom_values.bio}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          className={cn(
                            "rounded-2xl font-bold py-3 text-xs",
                            theme === 'dark' 
                              ? "border-white/10 text-white hover:bg-white/5" 
                              : "border-slate-300 text-slate-800 hover:bg-slate-100"
                          )} 
                          onClick={() => setIsEditingProfile(true)}
                        >
                          {t('profile_edit')}
                        </Button>
                        <Button variant="gold" className="rounded-2xl font-bold py-3 text-xs" onClick={() => setActiveTab('networking')}>
                          {t('profile_networking')}
                        </Button>
                      </div>

                      {/* Virtual 3D Glassmorphic Business Card Switch */}
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <button
                          onClick={() => setShowPremiumCard(!showPremiumCard)}
                          className="text-xs text-amber-500 hover:text-amber-400 font-black tracking-wider flex items-center justify-center gap-2 mx-auto uppercase"
                        >
                          <span>✨</span>
                          <span>
                            {showPremiumCard 
                              ? (lang === 'ar' ? 'إخفاء بطاقة الأعمال الفاخرة' : 'Hide Premium Business Card')
                              : (lang === 'ar' ? 'عرض بطاقة الأعمال الفاخرة (vCard)' : 'Show Premium Business Card (vCard)')}
                          </span>
                        </button>
                      </div>

                      {/* 3D Glassmorphic Card Container */}
                      <AnimatePresence>
                        {showPremiumCard && (
                          <motion.div
                            initial={{ opacity: 0, rotateY: 90, scale: 0.95 }}
                            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                            exit={{ opacity: 0, rotateY: -90, scale: 0.95 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="mt-6 perspective-[1000px] w-full"
                          >
                            <div className="relative w-full max-w-sm mx-auto aspect-[1.586/1] rounded-[30px] p-6 bg-gradient-to-br from-amber-500/20 via-[#0D1527]/90 to-[#050B18]/90 border border-amber-500/30 backdrop-blur-3xl overflow-hidden shadow-[0_20px_50px_rgba(245,158,11,0.15)] flex flex-col justify-between text-right relative group/vcard text-right">
                              {/* Top Right Luxury Chip & Logo */}
                              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -z-10 group-hover/vcard:bg-amber-500/20 transition-colors duration-500" />
                              <div className="flex justify-between items-start w-full">
                                <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300/30 flex items-center justify-center font-bold text-brand-dark text-xs shadow-md">
                                  DIWAN
                                </div>
                                <div className="text-left">
                                  <span className="text-[8px] font-black uppercase text-amber-500/80 tracking-widest">VIP PASS</span>
                                </div>
                              </div>

                              {/* Member info */}
                              <div className="space-y-1 my-4 text-right">
                                <h4 className="text-xl font-black text-[#F0F4F2] leading-none tracking-tight">{participant.full_name}</h4>
                                <p className="text-[10px] text-amber-500/80 font-black tracking-wider uppercase">{participant.organization}</p>
                                {participant.custom_values?.bio && (
                                  <p className="text-[9px] text-[#F0F4F2]/50 font-medium line-clamp-2 mt-1 leading-normal">{participant.custom_values.bio}</p>
                                )}
                              </div>

                              {/* Bottom part: specialty tags & direct vcf download button */}
                              <div className="flex justify-between items-center w-full pt-4 border-t border-white/5">
                                <div className="flex gap-1 flex-wrap max-w-[65%] justify-end">
                                  {(participant.custom_values?.specialties || []).slice(0, 2).map((s, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[8px] font-black text-amber-500">
                                      #{s}
                                    </span>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleDownloadVCard(participant)}
                                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-brand-dark text-[9px] font-black rounded-xl transition-all shadow-[0_4px_15px_rgba(245,158,11,0.3)] flex items-center gap-1.5"
                                >
                                  <span>📥</span>
                                  <span>{lang === 'ar' ? 'حفظ جهة الاتصال' : 'Save Contact'}</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Push Notification Manager for PWA */}
                      <div className="mt-6 pt-6 border-t border-white/5 text-right">
                        <PushNotificationManager />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-black/20 p-6 rounded-[30px] border border-white/5 text-right mt-4">
                       <div>
                          <label className="text-[11px] text-white/50 font-bold mb-2 block">النبذة المهنية</label>
                          <textarea 
                            value={profileData.bio}
                            onChange={e => setProfileData({...profileData, bio: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500 outline-none min-h-[80px] resize-none"
                            placeholder="نبذة قصيرة..."
                          />
                       </div>
                       <div>
                          <label className="text-[11px] text-white/50 font-bold mb-2 block">رابط LinkedIn</label>
                          <input 
                            type="text"
                            value={profileData.linkedin}
                            onChange={e => setProfileData({...profileData, linkedin: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500 outline-none"
                          />
                       </div>
                       <div>
                          <label className="text-[11px] text-white/50 font-bold mb-2 block">التخصصات المهنية</label>
                          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-2 flex flex-wrap gap-2 focus-within:border-amber-500 transition-all min-h-[50px] cursor-text" onClick={() => document.getElementById('tag-input-field')?.focus()}>
                            {(profileData.specialties || []).map((tag, i) => (
                              <span key={i} className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 border border-amber-500/20">
                                {tag}
                                <button onClick={(e) => { e.stopPropagation(); setProfileData({...profileData, specialties: profileData.specialties.filter((_, idx) => idx !== i)}); }} className="hover:text-white">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                            <input 
                              id="tag-input-field"
                              type="text"
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault();
                                  const val = tagInput.trim().replace(',', '');
                                  if (val && !profileData.specialties.includes(val)) {
                                    setProfileData({...profileData, specialties: [...profileData.specialties, val]});
                                    setTagInput('');
                                  }
                                }
                              }}
                              className="flex-1 bg-transparent border-none outline-none text-white text-sm p-1 min-w-[100px]"
                              placeholder="أضف تخصص..."
                            />
                          </div>
                          <p className="text-[9px] text-white/20 mt-2">اضغط Enter أو فاصلة للإضافة</p>
                       </div>
                        <div className="flex gap-2 pt-2">
                          <Button className="flex-1 rounded-xl font-bold bg-amber-500 text-brand-dark py-2" onClick={handleUpdateProfile}>حفظ</Button>
                          <Button variant="outline" className="flex-1 rounded-xl font-bold border-white/10 py-2" onClick={() => setIsEditingProfile(false)}>إلغاء</Button>
                        </div>
                    </div>
                  )}
               </div>

               {/* 2. Digital Badge Card (Apple / Google Wallet Theme) */}
               <div className="bg-gradient-to-br from-[#0D1527] to-[#050B18] border border-amber-500/20 rounded-[40px] p-8 text-center shadow-[0_24px_60px_rgba(212,175,55,0.08)]">
                  <h3 className="text-amber-500 font-black mb-6 tracking-widest text-sm uppercase">البطاقة الرقمية</h3>
                  
                  <div className="relative inline-block group mb-8">
                    <div className="absolute -inset-6 bg-gradient-to-br from-amber-500 to-amber-600/30 blur-[30px] rounded-full opacity-60 transition-opacity" />
                    <div className="relative bg-white p-4 rounded-[30px] shadow-2xl">
                      <img src={qrUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                  </div>

                  <div className="mb-6">
                    <button 
                      onClick={toggleScanMode}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg border",
                        isScanMode 
                          ? "bg-amber-500 text-brand-dark border-amber-400 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]" 
                          : theme === 'dark'
                            ? "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-amber-500/30"
                            : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 hover:border-amber-500/30"
                      )}
                    >
                      <Smartphone size={16} className={isScanMode ? "text-brand-dark" : "text-amber-500"} />
                      تفعيل وضع المسح السريع ⚡
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-amber-500/50 font-bold uppercase tracking-widest mb-1">المقعد</div>
                        <div className="font-black text-xl text-amber-500">{participant.seat_info || '--'}</div>
                     </div>
                     <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-amber-500/50 font-bold uppercase tracking-widest mb-1">رقم التسجيل</div>
                        <div className="font-black text-xl text-white">#{participant.order_num?.split('-')[1] || participant.order_num}</div>
                     </div>
                  </div>
                  
                  {eventSettings?.map_url && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <a 
                        href={eventSettings.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg border bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-500 border-amber-500/30 hover:border-amber-400 hover:from-amber-500/30 hover:to-amber-600/20"
                      >
                        <MapPin size={16} className="text-amber-500 animate-bounce" />
                        {t('badge_map')}
                      </a>
                    </div>
                  )}

                  {/* Personal Digital Notebook Button */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setIsNotebookOpen(true)}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg border",
                        theme === 'dark'
                          ? "bg-white/5 text-[#F0F4F2] border-white/10 hover:bg-white/10 hover:border-amber-500/30"
                          : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 hover:border-amber-500/30"
                      )}
                    >
                      <span className="text-base">📝</span>
                      <span>{lang === 'ar' ? 'مفكرتي الرقمية الشخصية' : 'My Digital Notebook'}</span>
                      <span className="ml-auto bg-amber-500 text-brand-dark px-2 py-0.5 rounded-full text-[9px] font-black">
                        {Object.values(sessionNotes).filter(Boolean).length}
                      </span>
                    </button>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex flex-col justify-center items-center text-center gap-4 bg-white/[0.03] border border-white/5 rounded-[24px] p-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                    <span>🔔</span>
                    {lang === 'ar' ? 'مركز التنبيهات' : 'Notifications Center'}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    {lang === 'ar' ? 'تابع أهم المستجدات والأنشطة الخاصة بالفعالية' : 'Stay updated with important announcements and activities'}
                  </p>
                </div>
                <div className="flex gap-2 w-full max-w-xs justify-center">
                  <button
                    onClick={handleMarkNotificationsAsRead}
                    disabled={notifications.length === 0 || unreadNotificationsCount === 0}
                    className="flex-1 px-4 py-2 text-xs font-bold rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
                  >
                    {lang === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                  </button>
                  <button
                    onClick={handleClearNotifications}
                    disabled={notifications.length === 0}
                    className="flex-1 px-4 py-2 text-xs font-bold rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    {lang === 'ar' ? 'مسح الكل' : 'Clear all'}
                  </button>
                </div>
              </div>

              {loadingNotifications ? (
                <div className="flex items-center justify-center py-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/5 rounded-[35px] text-center py-24 text-white/30">
                  <span className="text-5xl block mb-3">🔔</span>
                  <p className="font-bold text-base text-white/70">{lang === 'ar' ? 'لا توجد تنبيهات جديدة' : 'No new notifications'}</p>
                  <p className="text-xs text-white/40 mt-1">{lang === 'ar' ? 'عند إرسال تنبيهات جديدة ستظهر هنا فوراً.' : 'Announcements will appear here when sent.'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notif) => {
                    const levelColors = {
                      info: 'from-blue-500/10 to-transparent border-blue-500/20',
                      success: 'from-emerald-500/10 to-transparent border-emerald-500/20',
                      warning: 'from-amber-500/10 to-transparent border-amber-500/20',
                      error: 'from-red-500/10 to-transparent border-red-500/20',
                    };
                    const levelEmoji = { info: '📢', success: '✅', warning: '⚠️', error: '🔴' };
                    // تحويل رابط الإشعار إلى قسم البوابة المناسب
                    const sectionFromLink = (link) => {
                      if (!link) return 'notifications';
                      if (link.includes('task_id=')) {
                        const match = link.match(/task_id=(\d+)/);
                        if (match) {
                          const tId = parseInt(match[1]);
                          setSelectedTaskIdFromNotif(tId);
                        }
                      }
                      if (link.includes('organizer')) return 'organizer';
                      if (link.includes('activities')) return 'activities';
                      if (link.includes('logistics')) return 'logistics';
                      if (link.includes('catering')) return 'catering';
                      if (link.includes('agenda')) return 'agenda';
                      if (link.includes('polls')) return 'polls';
                      if (link.includes('social')) return 'social';
                      if (link.includes('docs')) return 'docs';
                      return 'notifications';
                    };
                    const colorClass = levelColors[notif.level] || levelColors.info;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "bg-gradient-to-b border rounded-[28px] p-5 transition-all shadow-lg flex flex-col gap-3 relative cursor-pointer hover:brightness-110",
                          colorClass,
                          notif.is_read ? 'border-white/5' : 'border-amber-500/20'
                        )}
                        onClick={() => notif.link && setActiveTab(sectionFromLink(notif.link))}
                      >
                        {!notif.is_read && (
                          <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                        )}
                        <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base">{levelEmoji[notif.level] || '📢'}</span>
                            <span className="text-[10px] text-white/40 font-bold">
                              {formatPostTime(notif.created_at)}
                            </span>
                          </div>
                          <h4 className={cn("text-sm font-black text-white break-words", !notif.is_read && "text-amber-100")}>
                            {notif.title}
                          </h4>
                          <p className="text-xs text-white/65 leading-relaxed font-medium break-words">
                            {notif.message}
                          </p>
                        </div>
                        {notif.link && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveTab(sectionFromLink(notif.link)); }}
                            className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black text-white border border-white/10 transition-all text-center mt-1"
                          >
                            {lang === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div key="agenda" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-2xl font-black tracking-tight">أجندة الفعالية 📅</h3>
               </div>

               {/* Segmented Filter Bar */}
               <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-[24px] mb-6">
                 <button 
                   onClick={() => setAgendaFilter('all')}
                   className={cn(
                     "flex-1 py-3 text-xs font-black rounded-2xl transition-all duration-300",
                     agendaFilter === 'all' 
                       ? "bg-amber-500 text-brand-dark shadow-[0_4px_20px_rgba(245,158,11,0.25)]" 
                       : "text-white/50 hover:text-white"
                   )}
                 >
                   كل الجلسات ({agenda.length})
                 </button>
                 <button 
                   onClick={() => setAgendaFilter('favorites')}
                   className={cn(
                     "flex-1 py-3 text-xs font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2",
                     agendaFilter === 'favorites' 
                       ? "bg-amber-500 text-brand-dark shadow-[0_4px_20px_rgba(245,158,11,0.25)]" 
                       : "text-white/50 hover:text-white"
                   )}
                 >
                   ⭐ مفضلتي ({favorites.length})
                 </button>
               </div>

                {agendaFilter === 'favorites' && favorites.length > 0 && (
                  <div className="mb-6 animate-fade-in">
                    <button
                      onClick={downloadAllFavoritesIcs}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-brand-dark rounded-2xl font-black text-xs tracking-widest uppercase shadow-[0_4px_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2.5 transition-all"
                    >
                      <span>📅</span>
                      <span>{lang === 'ar' ? 'تصدير جدول المفضلات بالكامل (.ics)' : 'Export Full Schedule Bundle (.ics)'}</span>
                    </button>
                  </div>
                )}

               <div className="space-y-4">
                  {agenda.filter(item => agendaFilter === 'all' || favorites.includes(item.id)).length === 0 ? (
                    <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-[30px] p-8">
                      <span className="text-4xl mb-4 block">⭐</span>
                      <p className="text-white/40 text-sm font-bold">لا توجد جلسات في القائمة حالياً.</p>
                      {agendaFilter === 'favorites' && (
                        <p className="text-amber-500/60 text-xs mt-2">قم بالضغط على النجمة في أي جلسة لإضافتها لجدولك الخاص!</p>
                      )}
                    </div>
                  ) : (
                    agenda
                      .filter(item => agendaFilter === 'all' || favorites.includes(item.id))
                      .map((item) => {
                        const isFav = favorites.includes(item.id);
                        const isExpanded = expandedSessionId === item.id;
                        
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => setExpandedSessionId(isExpanded ? null : item.id)}
                            className={cn(
                              "bg-white/5 border p-6 rounded-[35px] transition-all duration-300 cursor-pointer overflow-hidden relative",
                              isExpanded ? "border-amber-500/40 bg-white/[0.08]" : "border-white/10 hover:bg-white/10"
                            )}
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-20 text-center flex flex-col items-center shrink-0">
                                   <div className="text-amber-500 font-black text-sm">{item.start_time}</div>
                                   {item.end_time && <div className="text-white/30 text-[10px] mt-1 font-bold">{item.end_time}</div>}
                                   <div className="w-1 h-8 bg-white/5 rounded-full mt-2" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <h4 className="font-black text-base md:text-lg mb-1 truncate text-white">{item.title}</h4>
                                   <p className="text-brand-secondary/50 text-xs font-bold truncate">{item.speaker_name} • {item.hall}</p>
                                </div>
                                <button 
                                  onClick={(e) => toggleFavorite(item.id, e)} 
                                  className="p-3 rounded-full hover:bg-white/10 transition-colors shrink-0"
                                >
                                  <Star className={cn("w-5 h-5 transition-all duration-300", isFav ? "fill-amber-500 text-amber-500" : "text-white/20")} />
                                </button>
                             </div>

                             {/* Expandable Details Container */}
                             <AnimatePresence>
                               {isExpanded && (
                                 <motion.div 
                                   initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                   animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                   exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                   transition={{ duration: 0.3 }}
                                   onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking details
                                   className="border-t border-white/5 pt-4 space-y-4 text-right"
                                 >
                                   {item.description ? (
                                     <p className="text-white/70 text-sm leading-relaxed bg-black/20 p-4 rounded-[20px] border border-white/5">
                                       {item.description}
                                     </p>
                                   ) : (
                                     <p className="text-white/30 text-xs italic">لا يوجد وصف مضاف لهذه الجلسة.</p>
                                   )}

                                   {/* Calendar Sync Options */}
                                   <div className="space-y-3">
                                     <div className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest">إضافة إلى تقويمك الخاص:</div>
                                     <div className="grid grid-cols-2 gap-3">
                                       <a 
                                         href={getGoogleCalendarUrl(item)} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="h-12 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-white transition-all shadow-md"
                                       >
                                         <span className="text-base">📅</span>
                                         <span>تقويم Google</span>
                                       </a>
                                       <a 
                                         href={getIcsCalendarUrl(item)} 
                                         download={`${item.title.replace(/\s+/g, '_')}.ics`}
                                         className="h-12 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-white transition-all shadow-md"
                                       >
                                         <span className="text-base">📲</span>
                                         <span>تقويم الهاتف (iCal)</span>
                                       </a>
                                     </div>
                                    </div>

                                    {/* Digital Session Notes */}
                                    <div className="border-t border-white/5 pt-4 space-y-3">
                                      <div className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest">
                                        {lang === 'ar' ? 'ملاحظاتي الشخصية حول الجلسة (تُحفظ تلقائياً):' : 'My Session Notes (Auto-saved):'}
                                      </div>
                                      <textarea
                                        value={sessionNotes[item.id] || ''}
                                        onChange={(e) => handleSaveNote(item.id, e.target.value)}
                                        className="w-full bg-black/40 border-2 border-white/20 rounded-2xl p-4 text-slate-100 text-sm focus:border-amber-500/50 outline-none min-h-[100px] resize-none placeholder-white/40"
                                        placeholder={lang === 'ar' ? 'اكتب أفكارك وملاحظاتك هنا...' : 'Type your thoughts and notes here...'}
                                      />
                                    </div>

                                    {/* Live Session Rating Widget */}
                                    <div className="border-t border-white/5 pt-4 space-y-3">
                                      <div className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest">{"تقييم الجلسة والمتحدث:"}</div>
                                      <div className="bg-black/20 p-4 rounded-[20px] border border-white/5 flex flex-col items-center justify-center gap-3">
                                        {sessionRatings[item.id] ? (
                                          <div className="text-center py-2 animate-fade-in flex flex-col items-center justify-center">
                                            <div className="flex justify-center gap-1 mb-2">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star 
                                                  key={star} 
                                                  className={cn(
                                                    "w-5 h-5", 
                                                    star <= sessionRatings[item.id] ? "text-amber-500 fill-amber-500" : "text-white/10"
                                                  )} 
                                                />
                                              ))}
                                            </div>
                                            <div className="text-xs text-white/40 font-bold">{"شكراً لتقييمك! تم حفظ مشاركتك بنجاح ❤️"}</div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="text-xs text-white/60 font-bold mb-1">{"ما هو تقييمك لمحتوى وأداء هذه الجلسة؟"}</div>
                                            <div className="flex gap-2">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                  key={star}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRateSession(item.id, star);
                                                  }}
                                                  className="hover:scale-125 transition-transform p-1"
                                                >
                                                  <Star className="w-6 h-6 text-white/20 hover:text-amber-500 hover:fill-amber-500 transition-colors" />
                                                </button>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                               )}
                             </AnimatePresence>
                          </div>
                        );
                      })
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black tracking-tight mb-8">لوحة المتصدرين 🏆</h3>
               <div className="space-y-3">
                  {leaderboard.map((p, idx) => (
                    <div key={p.id} className={cn(
                      "p-5 rounded-[30px] flex items-center justify-between border transition-all",
                      p.id === participant.id ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"
                    )}>
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                            idx === 0 ? "bg-amber-500 text-brand-dark" : "bg-white/5 text-brand-secondary"
                          )}>
                             {idx + 1}
                          </div>
                          <div>
                             <div className="font-black text-white">{p.name} {p.id === participant.id && "(أنت)"}</div>
                             <div className="text-[10px] text-brand-secondary/30 font-bold uppercase tracking-widest">{p.points} نقطة</div>
                          </div>
                       </div>
                       {idx === 0 && <Award className="w-5 h-5 text-amber-500" />}
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'networking' && (
            <motion.div key="networking" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               <div style={{ margin: '-24px -24px 0 -24px', height: 'calc(100vh - 80px)' }}>
                 <NetworkingHub eventId={eventId} participant={participant} />
               </div>
            </motion.div>
          )}

          {/* Contact Card Modal */}
          <AnimatePresence>
            {selectedContact && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#050B18]/80 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-[#050B18] border border-white/20 rounded-[50px] p-8 w-full max-sm:max-w-full max-w-sm backdrop-blur-3xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-amber-500 to-amber-600 -z-10" />
                  <button 
                    onClick={() => setSelectedContact(null)}
                    className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="pt-12 text-center">
                    <div className="w-24 h-24 rounded-[30px] bg-white mx-auto mb-6 flex items-center justify-center shadow-2xl border-4 border-white/10">
                      <User className="w-12 h-12 text-brand-dark" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-1">{selectedContact.full_name}</h4>
                    <p className="text-amber-500 font-bold text-sm mb-6">{selectedContact.organization}</p>
                    
                    {selectedContact.bio && (
                      <p className="text-white/60 text-[11px] leading-relaxed mb-6 px-4">{selectedContact.bio}</p>
                    )}

                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                       {(selectedContact.specialties || []).map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-brand-secondary">
                             #{s}
                          </span>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 mb-8">
                      {selectedContact.connection_status === 'accepted' ? (
                        <>
                          <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20 flex items-center gap-4">
                            <Smartphone className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-brand-secondary/50 font-bold uppercase">الهاتف</div>
                              <div className="text-sm font-black text-white">{selectedContact.phone || 'غير متوفر'}</div>
                            </div>
                            <button 
                              onClick={() => window.open(`https://wa.me/${selectedContact.phone?.replace(/[^0-9]/g, '')}`, '_blank')}
                              className="w-10 h-10 rounded-xl bg-brand-primary text-brand-dark flex items-center justify-center hover:scale-110 transition-all"
                            >
                               <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20 flex items-center gap-4">
                            <FileText className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-brand-secondary/50 font-bold uppercase">البريد الإلكتروني</div>
                              <div className="text-sm font-black text-white">{selectedContact.email || 'غير متوفر'}</div>
                            </div>
                          </div>
                          
                          {selectedContact.linkedin && (
                            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex items-center gap-4 cursor-pointer" onClick={() => window.open(selectedContact.linkedin, '_blank')}>
                               <LinkIcon className="w-5 h-5 text-blue-400" />
                               <div className="text-right flex-1">
                                  <div className="text-[10px] text-blue-400/50 font-bold uppercase">LinkedIn</div>
                                  <div className="text-sm font-black text-white">زيارة الملف الشخصي</div>
                               </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                            <Shield className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-white/30 font-bold uppercase">الدور</div>
                              <div className="text-sm font-black text-white">{selectedContact.role || 'مشارك'}</div>
                            </div>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-brand-secondary" />
                            <div className="text-right flex-1">
                              <div className="text-[10px] text-white/30 font-bold uppercase">الجهة</div>
                              <div className="text-sm font-black text-white">{selectedContact.court || '---'}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Button 
                        variant={selectedContact.connection_status === 'accepted' ? 'outline' : 'gold'} 
                        className="w-full h-16 rounded-2xl font-black text-lg gap-2" 
                        onClick={handleRequestConnection}
                        disabled={selectedContact.connection_status !== 'none'}
                      >
                        {selectedContact.connection_status === 'accepted' ? (
                          <><CheckCircle className="w-5 h-5" /> تم التواصل الاحترافي</>
                        ) : selectedContact.connection_status === 'pending' ? (
                          <><Calendar className="w-5 h-5" /> قيد الانتظار</>
                        ) : (
                          <><LinkIcon className="w-5 h-5" /> طلب بيانات التواصل</>
                        )}
                      </Button>
                      
                      {selectedContact.connection_status === 'accepted' && (
                        <Button 
                          variant="gold" 
                          className="w-full h-16 rounded-2xl font-black text-lg gap-2" 
                          onClick={() => handleDownloadVCard(selectedContact)}
                        >
                           <Download className="w-5 h-5" />
                           حفظ في جهات الاتصال
                        </Button>
                      )}
                    </div>
                    
                    <p className="mt-4 text-[10px] text-white/30 font-bold text-center">
                      {selectedContact.connection_status === 'accepted' ? "بيانات التواصل ظاهرة لك الآن" : "سيتم إرسال طلبك لهذا المشارك للموافقة"}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'social' && (
            <motion.div key="social" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black">الحائط التفاعلي 💬</h3>
               <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl mb-8">
                  <textarea 
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="شاركنا انطباعك عن الفعالية..." 
                    className="w-full bg-transparent border-none outline-none text-xl font-bold placeholder:text-white/10 min-h-[120px] resize-none"
                  />

                  {/* Image Attachment Preview */}
                  {imagePreview && (
                    <div className="relative mt-2 mb-6 inline-block group">
                      <img src={imagePreview} alt="Attached Preview" className="max-h-40 rounded-2xl border border-white/10 shadow-lg object-cover" />
                      <button 
                        onClick={handleClearImage}
                        className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <input 
                    type="file" 
                    id="social-post-image-input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageSelect} 
                  />

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                     <button 
                       onClick={() => document.getElementById('social-post-image-input')?.click()}
                       disabled={isUploadingImage}
                       className="w-14 h-14 rounded-2xl bg-white/5 text-brand-secondary flex items-center justify-center border border-white/10 hover:bg-white/10 hover:border-amber-500/30 transition-all"
                     >
                        <Camera className="w-6 h-6 text-amber-500" />
                     </button>
                     <Button 
                       variant="gold" 
                       className="px-12 h-14 rounded-[20px] text-lg font-black shadow-lg" 
                       onClick={handlePostToWall}
                       disabled={isUploadingImage}
                     >
                       {isUploadingImage ? 'جاري النشر...' : 'نشر'}
                     </Button>
                  </div>
               </div>

               <div className="space-y-4">
                 {posts.map(post => (
                   <div key={post.id} className="bg-white/5 border border-white/10 rounded-[30px] p-6 relative">
                     {post.is_pending && (
                       <span className="absolute top-4 left-4 bg-amber-500/20 text-amber-500 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/30">
                         قيد المراجعة
                       </span>
                     )}
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-secondary font-bold border border-brand-primary/20">
                          {post.author_name ? post.author_name[0] : '👤'}
                        </div>
                       <div>
                         <div className="font-black text-white text-sm">{post.author_name}</div>
                         <div className="text-[10px] text-white/30 font-bold flex items-center gap-1">
                           <Clock size={9} />
                           {formatPostTime(post.created_at)}
                         </div>
                       </div>
                     </div>
                      <p className="text-white/80 font-bold text-lg leading-relaxed">{post.content}</p>
                      {post.image_url && (
                        <div className="mt-4 overflow-hidden rounded-[20px] border border-white/5 max-h-[300px] bg-black/20">
                          <img 
                            src={getFullUrl(post.image_url)} 
                            alt="Social Wall Attached Media" 
                            className="w-full h-full object-contain max-h-[300px]"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Action Buttons: Like & Comment */}
                      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5 text-sm font-bold">
                        <button 
                          onClick={() => handleToggleLike(post.id)}
                          className={cn(
                            "flex items-center gap-2 transition-all hover:scale-105",
                            likedPosts.includes(post.id) ? "text-rose-500 font-black animate-heartbeat" : "text-white/60 hover:text-white"
                          )}
                        >
                          <Heart className={cn("w-5 h-5", likedPosts.includes(post.id) && "fill-current")} />
                          <span>{likedPosts.includes(post.id) ? "\u0623\u0639\u062c\u0628\u0646\u064a" : "\u0625\u0639\u062c\u0627\u0628"} ({post.likes_count || 0})</span>
                        </button>
                        
                        <button 
                          onClick={() => handleToggleComments(post.id)}
                          className={cn(
                            "flex items-center gap-2 transition-all hover:scale-105",
                            expandedCommentsPostId === post.id ? "text-amber-500 font-black" : "text-white/60 hover:text-white"
                          )}
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span>{"\u0627\u0644\u062a\u0639\u0644\u064a\u0642\u0627\u062a"} ({post.comments_count || 0})</span>
                        </button>
                        {post.author_name === participant.full_name && (
                           <button
                             onClick={() => handleDeletePost(post.id)}
                             className="mr-auto flex items-center gap-1 text-red-400/40 hover:text-red-400 transition-all hover:scale-110"
                             title="حذف منشوري"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                      </div>

                      {/* Expandable Comments Tray */}
                      <AnimatePresence>
                        {expandedCommentsPostId === post.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: "auto" }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-4 pt-4 border-t border-white/5 space-y-4"
                          >
                            {/* Comment Input */}
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={commentInputs[post.id] || ""}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSubmitComment(post.id);
                                }}
                                placeholder="\u0627\u0643\u062a\u0628 \u062a\u0639\u0644\u064a\u0642\u0627\u064b..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 text-right"
                              />
                              <button 
                                onClick={() => handleSubmitComment(post.id)}
                                disabled={isSubmittingComment || !commentInputs[post.id]?.trim()}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-brand-dark font-black rounded-xl text-xs transition-colors"
                              >
                                {"\u0625\u0631\u0633\u0627\u0644"}
                              </button>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                              {postComments[post.id]?.map(comment => (
                                <div key={comment.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-right">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-white text-xs">{comment.author_name}</span>
                                    <span className="text-[9px] text-white/40">
                                      {comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString("ar-EG", { numberingSystem: 'latn', hour: "2-digit", minute: "2-digit" }) : "الآن"}
                                    </span>
                                  </div>
                                  <p className="text-white/80 text-xs leading-relaxed">{comment.content}</p>
                                </div>
                              ))}
                              {(!postComments[post.id] || postComments[post.id].length === 0) && (
                                <div className="text-center py-4 text-white/30 text-xs">{"\u0644\u0627 \u062a\u0648\u062c\u062f \u062aع\u0644\u064a\u0642\u0627\u062a \u0628\u0639\u062f؎ \u0643\u0646 \u0623و\u0644 \u0645\u0646 \u064aعلق!"}</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                 ))}
                 {posts.length === 0 && (
                   <div className="text-center py-10 text-white/30 font-bold">لا توجد منشورات حتى الآن. كن أول من يشارك!</div>
                 )}
               </div>
            </motion.div>
          )}

          {activeTab === 'cert' && (
            <motion.div key="cert" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 px-4">
               <div className="relative inline-block mb-12">
                  <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />
                  <Award className="relative w-24 h-24 text-amber-500 mx-auto" />
               </div>
               <h3 className="text-4xl font-black mb-4 tracking-tight">شهادة الحضور</h3>
               <p className="text-brand-secondary/50 font-bold mb-12 max-w-xs mx-auto leading-relaxed">تهانينا! يمكنك الآن تحميل شهادة حضورك المعتمدة والموثقة رقمياً.</p>
               <Button 
                 variant="gold" 
                 className="w-full h-20 text-xl font-black gap-3 rounded-[35px] shadow-[0_20px_50px_rgba(245,158,11,0.2)]"
                 onClick={() => {
                   if(participant?.order_num) window.open(credentialService.getCertificateUrl(participant.order_num), '_blank');
                 }}
               >
                 <Download className="w-7 h-7" />
                 تحميل الشهادة المعتمدة
               </Button>
               <Button 
                 variant="outline" 
                 className="w-full h-16 text-lg font-black gap-3 rounded-[28px] mt-4 border-white/10 hover:bg-white/5"
                 onClick={() => {
                   if(participant?.order_num) window.open(credentialService.getBadgeUrl(participant.order_num), '_blank');
                 }}
               >
                 <Printer className="w-6 h-6" />
                 تحميل بطاقة الحضور (Badge)
               </Button>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div key="docs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <h3 className="text-2xl font-black mb-8 text-center">مركز المستندات والملفات 📂</h3>
               
               {documents.length === 0 && (
                 <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/10">
                    <FileText className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 font-bold">لا توجد مستندات متاحة حالياً.</p>
                 </div>
               )}

               <div className="grid grid-cols-1 gap-4">
                 {documents.map((doc) => (
                   <div key={doc.id} className="bg-white/5 border border-white/10 rounded-[35px] p-6 flex items-center gap-6 group hover:bg-white/10 transition-all">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10 shrink-0">
                         <FileText className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-black text-lg mb-1 line-clamp-2 text-white" title={doc.title}>{doc.title}</h4>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] text-brand-secondary font-bold uppercase tracking-widest px-2 py-0.5 bg-brand-primary/10 rounded-md">
                               {doc.file_type || 'PDF'}
                            </span>
                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                               {doc.file_size || '---'}
                            </span>
                         </div>
                         {doc.description && <p className="text-white/40 text-xs mt-2 line-clamp-1">{doc.description}</p>}
                      </div>
                      <button 
                        onClick={() => window.open(getFullUrl(doc.file_url), '_blank')}
                        className="w-12 h-12 rounded-xl bg-amber-500 text-brand-dark flex items-center justify-center hover:scale-110 transition-all shadow-lg shrink-0"
                      >
                         <Download className="w-5 h-5" />
                      </button>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'polls' && (
             <motion.div key="polls" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-2xl font-black mb-8 text-center">استطلاعات الرأي النشطة 📊</h3>
                
                {polls.length === 0 && (
                  <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/10">
                     <BarChart2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
                     <p className="text-white/30 font-bold">لا توجد استطلاعات رأي نشطة في الوقت الحالي.</p>
                  </div>
                )}

                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-3xl">
                     <h4 className="text-xl font-bold mb-8 text-brand-secondary">{poll.question}</h4>
                     
                     <div className="space-y-4">
                        {poll.options.map((opt) => {
                          const isVoted = votedPolls.includes(poll.id);
                          return (
                            <button
                              key={opt.id}
                              disabled={isVoted}
                              onClick={() => handleVote(poll.id, opt.id)}
                              className={cn(
                                "w-full p-6 rounded-[24px] text-right font-bold transition-all border flex justify-between items-center",
                                isVoted 
                                  ? "bg-brand-primary/10 border-brand-primary/20 text-brand-secondary opacity-50"
                                  : "bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-white/10 text-white"
                              )}
                            >
                               <span>{opt.text}</span>
                               {isVoted && <CheckCircle className="w-5 h-5" />}
                            </button>
                          );
                        })}
                     </div>
                     {votedPolls.includes(poll.id) && (
                       <p className="text-center mt-6 text-brand-secondary/50 text-sm font-bold">شكراً لمشاركتك!</p>
                     )}
                  </div>
                ))}
             </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="text-center mb-10">
                  <HelpCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                  <h3 className="text-3xl font-black">الأسئلة التفاعلية 💬</h3>
                  <p className="text-brand-secondary/50 font-bold mt-2">اطرح سؤالك على المنظمين أو المتحدثين للمناقشة المباشرة.</p>
               </div>
               {/* <AIConcierge eventId={eventId} participant={participant} /> */}
               
                {/* Live Questions List */}
                <div className="space-y-4 mb-8">
                  <h4 className="text-sm font-black uppercase tracking-widest text-brand-secondary/30 mt-6">
                    {lang === 'ar' ? 'الأسئلة المطروحة حالياً 💬' : 'Current Questions 💬'}
                  </h4>

                  {questions.filter(q => q.is_approved).length === 0 ? (
                    <div className="text-center py-8 bg-white/[0.02] border border-white/5 rounded-[30px] p-6">
                      <span className="text-3xl mb-2 block">💬</span>
                      <p className="text-white/40 text-xs font-bold">{lang === 'ar' ? 'لا توجد أسئلة معتمدة حالياً.' : 'No approved questions yet.'}</p>
                      <p className="text-amber-500/40 text-[10px] mt-1">{lang === 'ar' ? 'كن أول من يطرح سؤالاً باستخدام النموذج أدناه!' : 'Be the first to ask a question using the form below!'}</p>
                    </div>
                  ) : (
                    questions.filter(q => q.is_approved).map(q => {
                      const sessionTitle = agenda.find(s => s.id === q.session_id)?.title;
                      return (
                        <div key={q.id} className={cn(
                          "p-5 rounded-[30px] border transition-all relative overflow-hidden flex items-center justify-between gap-4",
                          q.pinned ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]" : "bg-white/5 border-white/10"
                        )}>
                          {q.pinned && (
                            <div className="absolute top-0 left-0 bg-amber-500 text-brand-dark px-3 py-0.5 rounded-br-2xl text-[8px] font-black uppercase tracking-widest">
                              {lang === 'ar' ? 'مـثـبـت 📌' : 'PINNED 📌'}
                            </div>
                          )}

                          <div className="flex-1 text-right min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap justify-end">
                              {sessionTitle && (
                                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-black text-amber-500">
                                  {sessionTitle}
                                </span>
                              )}
                              <span className="text-[10px] text-white/50 font-black">{q.name}</span>
                            </div>
                            <p className="text-[#F0F4F2] text-sm font-bold leading-relaxed">{q.text}</p>
                          </div>

                          {/* Upvote Action Button */}
                          <button
                            onClick={() => handleUpvoteQuestion(q.id)}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-white/10 transition-all shrink-0 min-w-[50px] group/upvote"
                          >
                            <span className="text-lg group-hover/upvote:scale-125 transition-transform">🔺</span>
                            <span className="text-[10px] font-black text-amber-500 mt-1">{q.votes_count || 0}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-12 pt-10 border-t border-white/5">
                  <h4 className="text-sm font-black mb-6 uppercase tracking-widest text-brand-secondary/30">طرح سؤال على المنصة</h4>
                  
                  <div className="mb-4">
                     <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">اختر الجلسة الموجه لها السؤال</label>
                     <select 
                       value={selectedSessionId}
                       onChange={(e) => setSelectedSessionId(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-4 outline-none text-brand-secondary font-bold"
                     >
                       <option value="">عام (كل الجلسات)</option>
                       {agenda.map(session => (
                         <option key={session.id} value={session.id} className="bg-slate-900">{session.title}</option>
                       ))}
                     </select>
                   </div>

                  <textarea 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="سؤالك سيظهر للمنظمين مباشرة..." 
                    className="w-full bg-white/5 border border-white/10 rounded-[30px] p-6 text-lg font-bold min-h-[120px] outline-none focus:border-amber-500/50 transition-all"
                  />
                  <Button variant="gold" className="w-full h-16 rounded-[24px] mt-6 text-xl font-black gap-3" onClick={() => handleAskQuestion(selectedSessionId)}>
                     <Send className="w-6 h-6 ltr:rotate-0 rtl:rotate-180" />
                     إرسال السؤال
                  </Button>
               </div>
            </motion.div>
          )}

          {activeTab === 'logistics' && (
            <motion.div key="logistics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-right">
              <div className="text-center mb-10">
                <Truck className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-bounce" />
                <h3 className="text-3xl font-black">{lang === 'ar' ? 'اللوجستيات والإقامة 🚗' : 'Logistics & Lodging 🚗'}</h3>
                <p className="text-brand-secondary/50 font-bold mt-2">
                  {lang === 'ar' 
                    ? 'نظم وصولك ومكان إقامتك لضمان تقديم أفضل تجربة استقبال وضيافة.'
                    : 'Submit your travel details and hotel lodging for smooth transport & hosting.'}
                </p>
              </div>

              {/* Driver & Shuttle Live Dispatch Information (If Assigned) */}
              {logistics && logistics.driver_name && (
                <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-[#0D1527] to-[#050B18] border border-emerald-500/20 rounded-[30px] relative overflow-hidden shadow-[0_20px_50px_rgba(16,185,129,0.1)]">
                  <div className="absolute top-0 left-0 bg-emerald-500 text-brand-dark px-4 py-1 rounded-br-2xl text-[10px] font-black uppercase tracking-widest">
                    {lang === 'ar' ? 'تم تأكيد التوصيل 🟢' : 'SHUTTLE CONFIRMED 🟢'}
                  </div>
                  <h4 className="text-lg font-black text-emerald-400 mb-4 mt-2">
                    {lang === 'ar' ? 'تفاصيل التوصيل المخصصة لك' : 'Your Dedicated Shuttle Details'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold text-right" dir="rtl">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-white/40 text-xs block mb-1">{lang === 'ar' ? 'اسم المرافق' : 'Companion Name'}</span>
                      <span className="text-white text-base font-black">👤 {logistics.driver_name}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-white/40 text-xs block mb-1">{lang === 'ar' ? 'رقم جوال المرافق' : 'Companion Phone'}</span>
                      <a href={`tel:${logistics.driver_phone}`} className="text-amber-500 text-base font-black block">📞 {logistics.driver_phone}</a>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-white/40 text-xs block mb-1">{lang === 'ar' ? 'تفاصيل السيارة' : 'Vehicle Details'}</span>
                      <span className="text-white text-base font-black">🚗 {logistics.vehicle_details}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-white/40 text-xs block mb-1">{lang === 'ar' ? 'وقت التحرك' : 'Pickup Time'}</span>
                      <span className="text-white text-base font-black">
                        ⏳ {logistics.shuttle_time ? formatDateTime(logistics.shuttle_time, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '---'}
                      </span>
                    </div>

                    {logistics.host_name && (
                      <div className="md:col-span-2 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-2 mt-2">
                        <span className="text-amber-500 text-xs block font-black">
                          {lang === 'ar' ? '🙋‍♂️ المستقبل الميداني المخصص لاستقبالك' : '🙋‍♂️ Assigned Welcoming Host'}
                        </span>
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-1">
                          <div className="text-right">
                            <span className="text-white/40 text-[10px] block">{lang === 'ar' ? 'الاسم' : 'Name'}</span>
                            <span className="text-white text-sm font-black">{logistics.host_name}</span>
                          </div>
                          {logistics.host_phone && (
                            <div className="flex gap-2">
                              <a
                                href={`tel:${logistics.host_phone}`}
                                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black transition-all flex items-center gap-1"
                              >
                                <span>📞</span>
                                {lang === 'ar' ? 'اتصال مباشر' : 'Call'}
                              </a>
                              <a
                                href={`https://wa.me/${logistics.host_phone.replace(/\+/g, '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-[#075E54]/10 border border-[#075E54]/20 hover:bg-[#075E54]/20 text-[#25D366] text-xs font-black transition-all flex items-center gap-1"
                              >
                                <span>💬</span>
                                {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {logistics.status && (
                    <div className="mt-4 text-center">
                       <span className="inline-block px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black">
                        {lang === 'ar' ? `الحالة الحالية: ${logistics.status === 'dispatched' ? 'في الطريق إليك' : logistics.status === 'arrived' ? 'وصل المرافق' : 'مكتمل'}` : `Status: ${logistics.status}`}
                       </span>
                    </div>
                  )}
                </div>
              )}

              {/* Main self-service form */}
              <form onSubmit={handleSaveLogistics} className="bg-white/5 border border-white/10 rounded-[35px] p-6 md:p-8 space-y-6">
                <h4 className="text-xl font-black text-amber-500 border-b border-white/5 pb-4">
                  {lang === 'ar' ? 'سجل تفاصيل وصولك وإقامتك' : 'Register Arrival & Lodging'}
                </h4>

                {/* Transport Type selector */}
                <div>
                  <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">
                    {lang === 'ar' ? 'وسيلة الوصول المفضلة' : 'Preferred Transport Method'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'plane', label: lang === 'ar' ? 'طائرة ✈️' : 'Plane ✈️' },
                      { id: 'train', label: lang === 'ar' ? 'قطار 🚆' : 'Train 🚆' },
                      { id: 'private_car', label: lang === 'ar' ? 'سيارة خاصة 🚗' : 'Private Car 🚗' },
                      { id: 'none', label: lang === 'ar' ? 'غير محدد 👤' : 'None / Undecided 👤' },
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setLogistics({ ...logistics, transport_type: type.id })}
                        className={cn(
                          "w-full p-4 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2",
                          logistics.transport_type === type.id 
                            ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/5" 
                            : "bg-white/5 border-white/10 hover:border-white/20 text-white/70"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields based on Transport Type */}
                {logistics.transport_type === 'plane' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'رقم رحلة الطيران' : 'Flight Number'}</label>
                      <input 
                        type="text" 
                        value={logistics.flight_number || ''}
                        onChange={(e) => setLogistics({ ...logistics, flight_number: e.target.value })}
                        placeholder="e.g. SV-102"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'مطار الوصول / مبنى الركاب' : 'Arrival Terminal / Airport'}</label>
                      <input 
                        type="text" 
                        value={logistics.arrival_location || ''}
                        onChange={(e) => setLogistics({ ...logistics, arrival_location: e.target.value })}
                        placeholder={lang === 'ar' ? 'مطار الملك خالد - الصالة 5' : 'RUH Airport - Terminal 5'}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {logistics.transport_type === 'train' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'رقم قطار الحرمين / التذكرة' : 'Train / Ticket Number'}</label>
                      <input 
                        type="text" 
                        value={logistics.flight_number || ''}
                        onChange={(e) => setLogistics({ ...logistics, flight_number: e.target.value })}
                        placeholder="e.g. TR-209"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'محطة الوصول' : 'Arrival Station'}</label>
                      <input 
                        type="text" 
                        value={logistics.arrival_location || ''}
                        onChange={(e) => setLogistics({ ...logistics, arrival_location: e.target.value })}
                        placeholder={lang === 'ar' ? 'محطة قطار السليمانية - جدة' : 'Sulaymaniyah Station - Jeddah'}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Timings */}
                {logistics.transport_type !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'تاريخ ووقت الوصول المتوقع' : 'Estimated Arrival Date & Time'}</label>
                      <input 
                        type="datetime-local" 
                        value={logistics.arrival_time ? logistics.arrival_time.slice(0, 16) : ''}
                        onChange={(e) => setLogistics({ ...logistics, arrival_time: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'تاريخ ووقت المغادرة المتوقع' : 'Estimated Departure Date & Time'}</label>
                      <input 
                        type="datetime-local" 
                        value={logistics.departure_time ? logistics.departure_time.slice(0, 16) : ''}
                        onChange={(e) => setLogistics({ ...logistics, departure_time: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Accommodation / Housing info */}
                <h5 className="text-md font-black text-amber-500 border-t border-white/5 pt-6 mt-4">
                  🏨 {lang === 'ar' ? 'معلومات التسكين والإقامة للفنادق' : 'Accommodation & Hotel Info'}
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'اسم فندق الإقامة' : 'Hotel Name'}</label>
                    <input 
                      type="text" 
                      value={logistics.hotel_name || ''}
                      onChange={(e) => setLogistics({ ...logistics, hotel_name: e.target.value })}
                      placeholder={lang === 'ar' ? 'فندق الريتز كارلتون / ماريوت' : 'Ritz Carlton / Marriott'}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'رقم الغرفة (إذا حجزت بالفعل)' : 'Room Number (If already booked)'}</label>
                    <input 
                      type="text" 
                      value={logistics.room_number || ''}
                      onChange={(e) => setLogistics({ ...logistics, room_number: e.target.value })}
                      placeholder="e.g. 504"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'تاريخ تسجيل الدخول للفندق' : 'Hotel Check-in Date'}</label>
                    <input 
                      type="date" 
                      value={logistics.check_in_date ? logistics.check_in_date.split('T')[0] : ''}
                      onChange={(e) => setLogistics({ ...logistics, check_in_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-secondary/50 mb-2 block">{lang === 'ar' ? 'تاريخ تسجيل المغادرة للفندق' : 'Hotel Check-out Date'}</label>
                    <input 
                      type="date" 
                      value={logistics.check_out_date ? logistics.check_out_date.split('T')[0] : ''}
                      onChange={(e) => setLogistics({ ...logistics, check_out_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 text-right px-4 outline-none text-white font-bold focus:border-amber-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <Button 
                  type="submit" 
                  disabled={isSavingLogistics}
                  variant="gold" 
                  className="w-full h-16 rounded-[24px] mt-8 text-xl font-black gap-3 shadow-[0_15px_35px_rgba(245,158,11,0.2)]"
                >
                  {isSavingLogistics ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-brand-dark border-t-transparent rounded-full" />
                  ) : '💾'}
                  {lang === 'ar' ? 'حفظ وإرسال للجنة المنظمة' : 'Save & Submit Details'}
                </Button>
              </form>
            </motion.div>
          )}

          {activeTab === 'activities' && (
            <motion.div key="activities" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-right">
              <div className="text-center mb-10">
                <Compass className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-spin-slow" />
                <h3 className="text-3xl font-black">{lang === 'ar' ? 'الرحلات والأنشطة الترفيهية 🏕️' : 'Sideline Excursions & Activities 🏕️'}</h3>
                <p className="text-brand-secondary/50 font-bold mt-2">
                  {lang === 'ar' 
                    ? 'اكتشف الرحلات السياحية والأنشطة الترفيهية المصاحبة للفعالية وسجل حضورك فيها.'
                    : 'Discover excursions & entertainment activities programmed on the sidelines of the event.'}
                </p>
              </div>

              {activities.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-[35px] p-12 text-center">
                  <span className="text-5xl block mb-4">✨</span>
                  <h4 className="text-lg font-black text-white mb-2">{lang === 'ar' ? 'لا توجد أنشطة مجدولة حالياً' : 'No Activities Programmed Yet'}</h4>
                  <p className="text-white/40 text-sm font-bold">{lang === 'ar' ? 'سيتم إدراج الرحلات الترفيهية قريباً من قبل لجنة التنظيم.' : 'Sideline activities will be posted soon by the organizing committee.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activities.map((activity) => {
                    const isFull = activity.max_capacity && activity.current_count >= activity.max_capacity;
                    return (
                      <div 
                        key={activity.id}
                        className={cn(
                          "bg-[#0D1527] border rounded-[35px] p-6 relative overflow-hidden transition-all duration-300 shadow-xl",
                          activity.is_registered 
                            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-[#0D1527] to-[#050B18]" 
                            : "border-white/10 hover:border-white/20"
                        )}
                      >
                        {/* Registered Ribbon */}
                        {activity.is_registered && (
                          <div className="absolute top-0 left-0 bg-emerald-500 text-brand-dark px-4 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-widest">
                            {lang === 'ar' ? 'تم تأكيد حجزك 🟢' : 'RESERVED 🟢'}
                          </div>
                        )}

                        <h4 className="text-xl font-black text-white mb-3 mt-2">{activity.title}</h4>
                        <p className="text-white/60 text-sm leading-relaxed mb-6 font-medium">{activity.description}</p>

                        <div className="grid grid-cols-2 gap-3 text-xs font-bold mb-6 text-right" dir="rtl">
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
                            <span>📅</span>
                            <div>
                              <span className="text-white/40 text-[10px] block">{lang === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</span>
                              <span className="text-white">
                                {activity.date_time ? formatDateTime(activity.date_time, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '---'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
                            <span>📍</span>
                            <div>
                              <span className="text-white/40 text-[10px] block">{lang === 'ar' ? 'الموقع' : 'Location'}</span>
                              <span className="text-white truncate max-w-[100px] block">{activity.location || '---'}</span>
                            </div>
                          </div>

                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
                            <span>⏱️</span>
                            <div>
                              <span className="text-white/40 text-[10px] block">{lang === 'ar' ? 'المدة' : 'Duration'}</span>
                              <span className="text-white">{formatDuration(activity.duration) || '---'}</span>
                            </div>
                          </div>

                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
                            <span>💳</span>
                            <div>
                              <span className="text-white/40 text-[10px] block">{lang === 'ar' ? 'التكلفة' : 'Cost'}</span>
                              <span className={cn("font-black", activity.price === 0 ? "text-emerald-400" : "text-amber-500")}>
                                {activity.price === 0 
                                  ? (lang === 'ar' ? 'مجانى ✨' : 'Free ✨') 
                                  : `${activity.price} ${activity.currency}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Gathering point details */}
                        {(activity.gathering_point || activity.gathering_point_map_url) && (
                          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 mb-4 text-right" dir="rtl">
                            <span className="text-amber-500 text-xs font-black block mb-1">📍 {lang === 'ar' ? 'نقطة التجمع والانطلاق:' : 'Gathering Point:'}</span>
                            <span className="text-white text-xs font-bold block">{activity.gathering_point || (lang === 'ar' ? 'محددة في الخريطة' : 'Specified on Map')}</span>
                            {activity.gathering_point_map_url && (
                              <a 
                                href={activity.gathering_point_map_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-black underline mt-1 inline-flex items-center gap-1"
                              >
                                🗺️ {lang === 'ar' ? 'عرض على خرائط Google' : 'View on Google Maps'}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Hotel Shuttle Request Section */}
                        {activity.is_registered && (
                          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 mb-4 text-right space-y-3" dir="rtl">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-white">{lang === 'ar' ? 'طلب نقل من فندق الإقامة' : 'Shuttle from hotel'}</span>
                                <span className="text-[9px] text-white/40 mt-0.5">
                                  {logistics.hotel_name 
                                    ? `🏨 ${logistics.hotel_name}`
                                    : (lang === 'ar' ? '🏨 لم تحدد فندق إقامة بعد' : '🏨 No hotel set yet')}
                                </span>
                              </div>
                              <input 
                                type="checkbox"
                                checked={activity.pickup_requested || false}
                                onChange={(e) => handleToggleActivityPickup(activity.id, e.target.checked, activity.pickup_notes)}
                                className="w-5 h-5 rounded border-white/10 bg-white/5 accent-amber-500 cursor-pointer"
                              />
                            </div>
                            
                            {activity.pickup_requested && (
                              <div className="space-y-1.5">
                                <label className="text-[9px] text-white/50 block font-bold">{lang === 'ar' ? 'ملاحظات النقل (انقر خارج الحقل للحفظ):' : 'Transport notes (blur to save):'}</label>
                                <input 
                                  type="text"
                                  defaultValue={activity.pickup_notes || ''}
                                  onBlur={(e) => handleToggleActivityPickup(activity.id, true, e.target.value)}
                                  placeholder={lang === 'ar' ? 'أضف ملاحظاتك (مثال: رقم الغرفة أو الموعد)...' : 'Add shuttle notes...'}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-[11px] focus:border-amber-500 outline-none"
                                />
                              </div>
                            )}
                            
                            {activity.pickup_status && activity.pickup_status !== 'none' && (
                              <div className="text-[10px] font-black text-emerald-400">
                                🚍 {lang === 'ar' ? 'حالة النقل:' : 'Transport Status:'} {
                                  activity.pickup_status === 'pending' ? (lang === 'ar' ? 'قيد الانتظار' : 'Pending') :
                                  activity.pickup_status === 'assigned' ? (lang === 'ar' ? 'تم تعيين السائق' : 'Driver Assigned') :
                                  (lang === 'ar' ? 'اكتمل' : 'Completed')
                                }
                              </div>
                            )}
                          </div>
                        )}

                        {/* Capacity Info */}
                        {activity.max_capacity && (
                          <div className="flex justify-between items-center text-[11px] font-black mb-6 px-1">
                            <span className="text-white/40">{lang === 'ar' ? 'الأماكن المتوفرة' : 'Available Places'}</span>
                            <span className={cn(isFull ? "text-red-400" : "text-emerald-400")}>
                              {isFull 
                                ? (lang === 'ar' ? 'مكتمل العدد 🚫' : 'Sold Out 🚫') 
                                : (lang === 'ar' 
                                    ? `متبقي ${activity.max_capacity - activity.current_count} من ${activity.max_capacity} مكان متوفر`
                                    : `${activity.max_capacity - activity.current_count} of ${activity.max_capacity} places left`)}
                            </span>
                          </div>
                        )}

                        {/* Action Register Button */}
                        <Button
                          disabled={isRegisteringActivity || (isFull && !activity.is_registered)}
                          variant={activity.is_registered ? "outline" : "gold"}
                          className="w-full h-14 rounded-2xl text-md font-black gap-2 mt-2"
                          onClick={() => handleToggleActivityRegistration(activity)}
                        >
                          {isRegisteringActivity ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <>
                              {activity.is_registered ? '🗑️' : '✍️'}
                              {activity.is_registered 
                                ? (lang === 'ar' ? 'إلغاء التسجيل' : 'Cancel Registration') 
                                : (lang === 'ar' ? 'تسجيل الحضور الآن' : 'Register to Attend')}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'catering' && (
            <motion.div key="catering" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-right">
              {/* Header block */}
              <div className="text-center mb-8">
                <Utensils className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-pulse" />
                <h3 className="text-3xl font-black">{lang === 'ar' ? 'الإطعام والضيافة والوجبات المستدامة 🍽️' : 'Smart Catering & Sustainable Meals 🍽️'}</h3>
                <p className="text-brand-secondary/50 font-bold mt-2">
                  {lang === 'ar' 
                    ? 'أعلم اللجنة المنظمة بنوع حميتك الغذائية، وأكد حضور الوجبات للمساهمة في مبادرة منع الهدر الغذائي 🌱.'
                    : 'Share your dietary requirements and RSVP for programmed meals to help reduce food waste 🌱.'}
                </p>
              </div>

              {/* Grid with 2 columns: left is meals RSVP list, right is diet selection */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Right: Dietary Profile Form */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <h4 className="text-lg font-black text-white mb-6 pb-3 border-b border-white/5 flex items-center gap-2">
                      <span>🥗</span>
                      {lang === 'ar' ? 'التفضيلات والحمية الغذائية' : 'Dietary Requirements'}
                    </h4>

                    <form onSubmit={handleSaveCatering} className="space-y-5">
                      {/* Dietary Type Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/50 block">
                          {lang === 'ar' ? 'الحمية الغذائية المتبعة' : 'Dietary Lifestyle / Preference'}
                        </label>
                        <select
                          value={catering.dietary_type}
                          onChange={(e) => setCatering({ ...catering, dietary_type: e.target.value })}
                          className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 px-4 text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                          dir="rtl"
                        >
                          <option value="none">{lang === 'ar' ? 'لا توجد حمية خاصة (نظام عادي) 🥩' : 'No Special Diet (Standard) 🥩'}</option>
                          <option value="vegetarian">{lang === 'ar' ? 'نباتي (Vegetarian) 🥦' : 'Vegetarian 🥦'}</option>
                          <option value="vegan">{lang === 'ar' ? 'نباتي صرف (Vegan) 🌿' : 'Vegan 🌿'}</option>
                          <option value="gluten_free">{lang === 'ar' ? 'خالي من الجلوتين (Gluten-Free) 🌾' : 'Gluten-Free 🌾'}</option>
                          <option value="diabetic">{lang === 'ar' ? 'حمية السكري (Diabetic-Friendly) 🍬' : 'Diabetic Friendly 🍬'}</option>
                          <option value="lactose_free">{lang === 'ar' ? 'خالي من اللاكتوز (Lactose-Free) 🥛' : 'Lactose-Free 🥛'}</option>
                          <option value="custom">{lang === 'ar' ? 'أخرى / حساسية مخصصة ⚠️' : 'Custom / Specific Allergies ⚠️'}</option>
                        </select>
                      </div>

                      {/* Allergies Text input */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/50 block">
                          {lang === 'ar' ? 'هل تعاني من أي حساسية تجاه أطعمة معينة؟ (اختياري)' : 'Do you have food allergies? (Optional)'}
                        </label>
                        <Input
                          value={catering.allergies || ''}
                          onChange={(e) => setCatering({ ...catering, allergies: e.target.value })}
                          placeholder={lang === 'ar' ? 'مثل: المكسرات، السمك، الفول السوداني...' : 'e.g. Peanuts, Seafood, Dairy...'}
                          className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 text-right px-4 text-white"
                        />
                      </div>

                      {/* Special Notes / requests */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/50 block">
                          {lang === 'ar' ? 'ملاحظات إضافية للمطبخ (اختياري)' : 'Special notes for the kitchen (Optional)'}
                        </label>
                        <textarea
                          value={catering.notes || ''}
                          onChange={(e) => setCatering({ ...catering, notes: e.target.value })}
                          placeholder={lang === 'ar' ? 'اكتب أي ملاحظة تود إيصالها للطهاة...' : 'Write any specific message for the kitchen...'}
                          className="w-full bg-[#050B18] border border-white/10 rounded-2xl p-4 text-right text-white font-bold outline-none focus:border-amber-500/50 min-h-[90px] text-xs resize-none"
                        />
                      </div>

                      {/* Save button */}
                      <Button
                        type="submit"
                        disabled={isSavingCatering}
                        variant="gold"
                        className="w-full h-14 rounded-2xl text-md font-black gap-2 mt-4"
                      >
                        {isSavingCatering ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full" />
                        ) : '💾'}
                        {lang === 'ar' ? 'حفظ وإعلام المنظمين' : 'Save & Inform Kitchen'}
                      </Button>
                    </form>
                  </div>

                  {/* Sustainability card info */}
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-[35px] p-6 relative overflow-hidden text-emerald-300 shadow-[0_8px_32px_rgba(16,185,129,0.05)]">
                    <div className="absolute top-0 left-0 bg-emerald-500/30 px-3 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-wider text-emerald-200">
                      {lang === 'ar' ? 'مبادرة خضراء 🍃' : 'GREEN INITIATIVE 🍃'}
                    </div>
                    <h5 className="font-black text-sm mb-2 mt-2 flex items-center gap-2 text-emerald-400">
                      <span>🌱</span>
                      {lang === 'ar' ? 'لماذا نسألك عن وجباتك؟' : 'Why RSVP for your meals?'}
                    </h5>
                    <p className="text-xs font-bold leading-relaxed text-white/90">
                      {lang === 'ar'
                        ? 'إن إعلامنا المسبق بحضورك أو عدم حضورك للوجبة يتيح لنا طبخ المقدار المحدد تماماً. هذا يمنع هدر مئات الأطنان من الطعام غير المستهلك ويقلل الانبعاثات الكربونية الناتجة عن النفايات الغذائية.'
                        : 'By RSVPing, you let the culinary crew prepare the exact quantities needed. This prevents food waste and reduces carbon footprint at the event.'}
                    </p>
                  </div>
                </div>

                {/* Left: Programmed Meals RSVP List */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <h4 className="text-lg font-black text-white mb-6 pb-3 border-b border-white/5 flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <span>🥐</span>
                        {lang === 'ar' ? 'تأكيد حضور الوجبات المبرمجة' : 'Programmed Meals RSVP'}
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-black">
                        {lang === 'ar' ? 'منع الهدر الغذائي 🍃' : 'Zero Waste 🍃'}
                      </span>
                    </h4>

                    {eventMeals.length === 0 ? (
                      <div className="text-center py-12 text-white/40">
                        <span className="text-4xl block mb-2">🍽️</span>
                        <p className="text-sm font-bold">{lang === 'ar' ? 'لا توجد وجبات مبرمجة مدرجة للفعالية حالياً.' : 'No programmed meals registered for this event yet.'}</p>
                        <p className="text-[10px] mt-1 text-white/30">{lang === 'ar' ? 'سيقوم المنظمون بإضافة جدول الوجبات والضيافة قريباً.' : 'Organizers will update the meals schedule soon.'}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {eventMeals.map((meal) => {
                          const mealDate = meal.date_time ? new Date(meal.date_time) : null;
                          return (
                            <div
                              key={meal.id}
                              className={cn(
                                "p-4 rounded-3xl border transition-all duration-300 relative",
                                meal.attending
                                  ? "bg-white/[0.02] border-white/5"
                                  : "bg-red-500/5 border-red-500/20 opacity-70"
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl mt-1">
                                    {meal.meal_type === 'breakfast' ? '🥐' :
                                     meal.meal_type === 'lunch' ? '🥗' :
                                     meal.meal_type === 'dinner' ? '🥩' : '☕'}
                                  </span>
                                  <div>
                                    <h5 className="font-black text-sm text-white">{meal.title}</h5>
                                    <p className="text-white/40 text-xs mt-0.5 leading-relaxed font-bold">{meal.description}</p>
                                    <span className="text-[10px] text-amber-500/80 font-black tracking-wider block mt-1.5">
                                      ⏰ {mealDate ? formatDateTime(mealDate, { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {/* Toggles */}
                                  <button
                                    disabled={isTogglingMealRsvp}
                                    onClick={() => handleToggleMealRsvp(meal.id, true)}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border",
                                      meal.attending
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-[#050B18] border-white/5 text-white/30 hover:text-white/50"
                                    )}
                                  >
                                    <span>😋</span>
                                    {lang === 'ar' ? 'سأتواجد' : 'I will eat'}
                                  </button>

                                  <button
                                    disabled={isTogglingMealRsvp}
                                    onClick={() => handleToggleMealRsvp(meal.id, false)}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border",
                                      !meal.attending
                                        ? "bg-red-500/10 border-red-500/25 text-red-400"
                                        : "bg-[#050B18] border-white/5 text-white/30 hover:text-white/50"
                                    )}
                                  >
                                    <span>🌱</span>
                                    {lang === 'ar' ? 'اعتذار (منع الهدر)' : 'No, skip waste'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'organizer' && (
            <motion.div key="organizer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-right">
              {/* Header section */}
              <div className="text-center mb-8">
                <Shield className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-pulse" />
                <h3 className="text-3xl font-black">{lang === 'ar' ? 'إدارة اللجان والعمليات الميدانية 🛠️' : 'Staff Operations Panel 🛠️'}</h3>
                <p className="text-brand-secondary/50 font-bold mt-2">
                  {lang === 'ar' 
                    ? 'لوحة التحكم الموحدة المتكيفة لإدارة النقل، الإيواء، وإحصائيات الإطعام والضيافة الذكية 🌱.'
                    : 'Unified operations hub for managing field logistics, hotel accommodations, and catering stats 🌱.'}
                </p>
              </div>

              {/* Operations Sub-Tabs Navigation */}
              <div className="flex items-center justify-center gap-2 p-1.5 bg-[#0D1527]/60 border border-white/5 rounded-2xl max-w-2xl mx-auto overflow-x-auto">
                {hasLogisticsStaffAccess && (
                  <button
                    onClick={() => setStaffActiveSubTab('logistics')}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                      staffActiveSubTab === 'logistics' ? "bg-amber-500 text-brand-dark shadow-lg" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <span>🚗</span>
                    {lang === 'ar' ? 'النقل واللوجستيات' : 'Logistics & Transport'}
                  </button>
                )}
                
                {hasCateringStaffAccess && (
                  <button
                    onClick={() => setStaffActiveSubTab('catering')}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                      staffActiveSubTab === 'catering' ? "bg-amber-500 text-brand-dark shadow-lg" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <span>🍽️</span>
                    {lang === 'ar' ? 'تجنب الهدر والإطعام والضيافة' : 'Catering & Zero Waste'}
                  </button>
                )}

                {hasAccommodationStaffAccess && (
                  <button
                    onClick={() => setStaffActiveSubTab('accommodation')}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                      staffActiveSubTab === 'accommodation' ? "bg-amber-500 text-brand-dark shadow-lg" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <span>🏨</span>
                    {lang === 'ar' ? 'لوحة تسكين الإيواء' : 'Hotel Rooms'}
                  </button>
                )}

                {hasEntertainmentStaffAccess && (
                  <button
                    onClick={() => setStaffActiveSubTab('entertainment')}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                      staffActiveSubTab === 'entertainment' ? "bg-amber-500 text-brand-dark shadow-lg" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <span>🏕️</span>
                    {lang === 'ar' ? 'الأنشطة والترفيه' : 'Entertainment & Excursions'}
                  </button>
                )}

                {hasReceptionStaffAccess && (
                  <button
                    onClick={() => setStaffActiveSubTab('reception')}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                      staffActiveSubTab === 'reception' ? "bg-amber-500 text-brand-dark shadow-lg" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <span>🎟️</span>
                    {lang === 'ar' ? 'الاستقبال والتسجيل' : 'Reception & Check-in'}
                  </button>
                )}
              </div>

              {/* Sub-Tab 1: Logistics & Transport */}
              {staffActiveSubTab === 'logistics' && hasLogisticsStaffAccess && (
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🚗</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'إجمالي الوفود المسجلة للنقل' : 'Total Registered Guests'}</h4>
                      <p className="text-3xl font-black text-white mt-1">{staffLogisticsList.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">⏳</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'بانتظار تعيين مرافق' : 'Awaiting Companions'}</h4>
                      <p className="text-3xl font-black text-red-400 mt-1">{staffLogisticsList.filter(l => !l.driver_name).length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🟢</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'تم التوصيل / جاري النقل' : 'Dispatched / Completed'}</h4>
                      <p className="text-3xl font-black text-emerald-400 mt-1">{staffLogisticsList.filter(l => l.driver_name).length}</p>
                    </div>
                  </div>

                  {/* List & Search */}
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                      <h4 className="text-lg font-black text-white">{lang === 'ar' ? 'سجل وصول الوفود وحالة الاستقبال' : 'Arrival Dispatch Registry'}</h4>
                      <Input
                        value={searchStaffQuery}
                        onChange={(e) => setSearchStaffQuery(e.target.value)}
                        placeholder={lang === 'ar' ? '🔍 ابحث باسم الضيف أو رقم الرحلة...' : '🔍 Search Guest Name or Flight...'}
                        className="w-full sm:w-80 bg-[#050B18] border border-white/10 rounded-2xl h-12 text-right text-white"
                      />
                    </div>

                    {isLoadingStaffLogistics ? (
                      <div className="text-center py-12">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {staffLogisticsList
                          .filter(item => 
                            item.participant_name.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
                            (item.flight_number && item.flight_number.toLowerCase().includes(searchStaffQuery.toLowerCase()))
                          )
                          .map((item) => (
                            <div key={item.id} className="p-5 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all relative">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="font-black text-md text-white">{item.participant_name}</h5>
                                    <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">
                                      {item.transport_type === 'plane' ? '✈️ طيران' : '🚗 سيارة خاصة'}
                                    </span>
                                    <span className={cn(
                                      "text-[9px] px-2.5 py-0.5 rounded-full font-bold",
                                      item.status === 'completed' || item.status === 'arrived' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                                      item.status === 'dispatched' ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
                                    )}>
                                      {item.status === 'completed' ? (lang === 'ar' ? 'تم الوصول للوجهة' : 'Completed') :
                                       item.status === 'arrived' ? (lang === 'ar' ? 'وصل المطار' : 'Arrived') :
                                       item.status === 'dispatched' ? (lang === 'ar' ? 'تم إرسال المرافق' : 'Companion Dispatched') : (lang === 'ar' ? 'قيد الانتظار' : 'Pending')}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-white/50 font-bold">
                                    {item.flight_number && <div>✈️ {lang === 'ar' ? 'رحلة رقم' : 'Flight'}: <span className="text-white">{item.flight_number}</span></div>}
                                    {item.arrival_time && <div>⏰ {lang === 'ar' ? 'موعد الوصول' : 'Arrival'}: <span className="text-white">{new Date(item.arrival_time).toLocaleString()}</span></div>}
                                    {item.arrival_location && <div className="sm:col-span-2">📍 {lang === 'ar' ? 'موقع الاستقبال' : 'Pickup Location'}: <span className="text-white">{item.arrival_location}</span></div>}
                                    {item.hotel_name && <div>🏨 {lang === 'ar' ? 'فندق الإقامة' : 'Hotel'}: <span className="text-white">{item.hotel_name} (غرفة {item.room_number || '---'})</span></div>}
                                  </div>

                                  {item.driver_name && (
                                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mt-3 text-xs text-emerald-400/90 font-bold space-y-1">
                                      <div className="flex items-center gap-1">
                                        <span>🚗</span>
                                        <span>{lang === 'ar' ? `المرافق المخصص: ${item.driver_name} (${item.driver_phone})` : `Companion: ${item.driver_name} (${item.driver_phone})`}</span>
                                      </div>
                                      <div className="text-[10px] text-white/40">🚘 {item.vehicle_details}</div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center">
                                  {/* WhatsApp Call */}
                                  {item.participant_phone && (
                                    <a
                                      href={`https://wa.me/${item.participant_phone.replace(/\+/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-3 rounded-2xl bg-[#075E54]/10 border border-[#075E54]/20 text-[#25D366] hover:bg-[#075E54]/20 transition-all text-xs font-black flex items-center gap-1.5"
                                    >
                                      <span>💬</span>
                                      {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                                    </a>
                                  )}

                                  {/* Dispatch Button */}
                                  {(isPresident || tasksList.some(t => t.participant_id === item.participant_id && t.assigned_to_id === participant.id && t.status !== 'cancelled')) && (
                                    <button
                                      onClick={() => {
                                        setSelectedStaffParticipant(item);
                                        setStaffDispatchForm({
                                          driver_name: item.driver_name || '',
                                          driver_phone: item.driver_phone || '',
                                          vehicle_details: item.vehicle_details || '',
                                          status: item.status || 'pending'
                                        });
                                        setIsStaffDispatchModalOpen(true);
                                      }}
                                      className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-brand-dark rounded-2xl text-xs font-black transition-all flex items-center gap-1.5"
                                    >
                                      <span>🚗</span>
                                      {item.driver_name ? (lang === 'ar' ? 'تعديل المرافق' : 'Edit Companion') : (lang === 'ar' ? 'تخصيص مرافق' : 'Assign Companion')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {renderCommitteeTasks('transport')}
                </div>
              )}

              {/* Sub-Tab 2: Catering & Food Waste Statistics */}
              {staffActiveSubTab === 'catering' && hasCateringStaffAccess && (
                <div className="space-y-6">
                  {/* Grid for Catering Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🍲</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'إجمالي وجبات الفعالية' : 'Total Event Meals'}</h4>
                      <p className="text-3xl font-black text-white mt-1">4</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-6 text-right relative overflow-hidden">
                      <div className="absolute top-0 left-0 bg-emerald-500/20 px-3 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-wider text-emerald-400">
                        {lang === 'ar' ? 'إنقاذ 🍃' : 'Saved 🍃'}
                      </div>
                      <span className="text-3xl block mb-2">🥗</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'وجبات تم إنقاذها من الهدر' : 'Meals Saved (Opt-out)'}</h4>
                      <p className="text-3xl font-black text-emerald-400 mt-1">32 وجبة</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🥦</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'وجبات حمية خاصة (نباتي/جلوتين)' : 'Special Dietary Meals'}</h4>
                      <p className="text-3xl font-black text-blue-400 mt-1">14 وجبة</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🌱</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'نسبة الهدر التي تم خفضها' : 'Reduced Food Waste %'}</h4>
                      <p className="text-3xl font-black text-purple-400 mt-1">35.4%</p>
                    </div>
                  </div>

                  {/* Dietary Breakdown Chart Table */}
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <h4 className="text-lg font-black text-white mb-6 pb-3 border-b border-white/5 flex items-center gap-2">
                      <span>🍽️</span>
                      {lang === 'ar' ? 'إحصائيات تفضيلات المطبخ التنبؤية (يوم الغد)' : 'Predictive Kitchen Prep Sheet (Tomorrow)'}
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-white/40">
                            <th className="pb-3 font-black text-xs">{lang === 'ar' ? 'الحمية المطلوبة' : 'Dietary Type'}</th>
                            <th className="pb-3 font-black text-xs text-center">{lang === 'ar' ? 'الكمية المطلوبة بدقة' : 'Qty Required'}</th>
                            <th className="pb-3 font-black text-xs text-center">{lang === 'ar' ? 'مؤشر هدر الوجبة' : 'Waste Index'}</th>
                            <th className="pb-3 font-black text-xs text-left">{lang === 'ar' ? 'الحالة اللوجستية للمطبخ' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white font-bold">
                          <tr>
                            <td className="py-3 flex items-center gap-2">
                              <span>🥩</span>
                              {lang === 'ar' ? 'حمية عادية (Standard)' : 'Standard Meal'}
                            </td>
                            <td className="py-3 text-center">125 وجبة</td>
                            <td className="py-3 text-center text-emerald-400">⬇️ -25% {lang === 'ar' ? '(اعتذار مسبق)' : '(Opt-outs)'}</td>
                            <td className="py-3 text-left text-emerald-500">✅ {lang === 'ar' ? 'تم التأكيد للمطبخ' : 'Confirmed'}</td>
                          </tr>
                          <tr>
                            <td className="py-3 flex items-center gap-2">
                              <span>🥦</span>
                              {lang === 'ar' ? 'نباتي (Vegetarian)' : 'Vegetarian'}
                            </td>
                            <td className="py-3 text-center">8 وجبات</td>
                            <td className="py-3 text-center text-white/30">---</td>
                            <td className="py-3 text-left text-amber-500">👨‍🍳 {lang === 'ar' ? 'تحت الطهي المخصص' : 'In prep'}</td>
                          </tr>
                          <tr>
                            <td className="py-3 flex items-center gap-2">
                              <span>🌿</span>
                              {lang === 'ar' ? 'نباتي صرف (Vegan)' : 'Vegan'}
                            </td>
                            <td className="py-3 text-center">4 وجبات</td>
                            <td className="py-3 text-center text-white/30">---</td>
                            <td className="py-3 text-left text-amber-500">👨‍🍳 {lang === 'ar' ? 'تحت الطهي المخصص' : 'In prep'}</td>
                          </tr>
                          <tr>
                            <td className="py-3 flex items-center gap-2">
                              <span>🌾</span>
                              {lang === 'ar' ? 'خالي من الجلوتين (Gluten-Free)' : 'Gluten-Free'}
                            </td>
                            <td className="py-3 text-center">2 وجبة</td>
                            <td className="py-3 text-center text-white/30">---</td>
                            <td className="py-3 text-left text-amber-500">👨‍🍳 {lang === 'ar' ? 'طلب طازج عاجل' : 'Fresh order'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Participant Special Diets List */}
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                      <h4 className="text-lg font-black text-white flex items-center gap-2">
                        <span>🥦</span>
                        {lang === 'ar' ? 'سجل الحميات الغذائية للمشاركين' : 'Participants Special Dietary Profiles'}
                      </h4>
                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl w-full sm:w-auto">
                        <Search className="w-4 h-4 text-amber-500/60" />
                        <input
                          type="text"
                          value={searchStaffCatering}
                          onChange={e => setSearchStaffCatering(e.target.value)}
                          placeholder={lang === 'ar' ? 'ابحث باسم المشارك...' : 'Search by participant...'}
                          className="bg-transparent outline-none text-white text-sm font-bold w-full sm:w-48 placeholder:text-white/20"
                        />
                      </div>
                    </div>

                    {isLoadingStaffCatering ? (
                      <div className="flex justify-center py-10">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
                      </div>
                    ) : staffCateringList.length === 0 ? (
                      <div className="text-center py-12 text-white/30 font-bold">
                        <span className="text-4xl block mb-2">🥗</span>
                        {lang === 'ar' ? 'لا يوجد مشاركون سجّلوا حمية خاصة بعد.' : 'No participants have registered dietary preferences yet.'}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {staffCateringList
                          .filter(p => !searchStaffCatering || p.participant_name?.toLowerCase().includes(searchStaffCatering.toLowerCase()))
                          .map((profile) => {
                            const dietLabels = {
                              none: { ar: 'عادية', en: 'Standard', color: 'text-white/40 bg-white/5 border-white/10' },
                              vegetarian: { ar: 'نباتية', en: 'Vegetarian', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                              vegan: { ar: 'نباتية صرفة', en: 'Vegan', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                              gluten_free: { ar: 'خالية من الغلوتين', en: 'Gluten-Free', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                              diabetic: { ar: 'حمية السكري', en: 'Diabetic', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                              lactose_free: { ar: 'خالية من اللاكتوز', en: 'Lactose-Free', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                              custom: { ar: 'مخصصة', en: 'Custom', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                            };
                            const diet = dietLabels[profile.dietary_type] || dietLabels['none'];
                            return (
                              <div key={profile.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm">
                                    {profile.participant_name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-sm text-white">{profile.participant_name}</h5>
                                    <p className="text-white/40 text-xs font-bold mt-0.5">📞 {profile.participant_phone || '---'}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${diet.color}`}>
                                    {lang === 'ar' ? diet.ar : diet.en}
                                  </span>
                                  {(profile.allergies || profile.notes) && (
                                    <div className="text-xs text-white/50 font-bold max-w-xs bg-white/5 p-2.5 rounded-xl border border-white/5">
                                      {profile.allergies && <div>⚠️ <span className="text-rose-400">{lang === 'ar' ? 'حساسية: ' : 'Allergies: '}</span>{profile.allergies}</div>}
                                      {profile.notes && <div className="mt-1 text-white/60">📝 {profile.notes}</div>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {renderCommitteeTasks('catering')}
                </div>
              )}

              {/* Sub-Tab 3: Hotel Rooms & Accommodations */}
              {staffActiveSubTab === 'accommodation' && hasAccommodationStaffAccess && (
                <div className="space-y-6">
                  {/* Grid for Hotel Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🏨</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'الفنادق المعتمدة' : 'Contracted Hotels'}</h4>
                      <p className="text-3xl font-black text-white mt-1">2 (الأوراسي / شيراتون)</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🛌</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'الغرف التي تم تسكينها' : 'Allocated Rooms'}</h4>
                      <p className="text-3xl font-black text-emerald-400 mt-1">87 غرفة</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🔑</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'نسبة تسكين الوفود الكلية' : 'Total Allocation Rate'}</h4>
                      <p className="text-3xl font-black text-blue-400 mt-1">94.2%</p>
                    </div>
                  </div>

                  {/* Allocation Table */}
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <h4 className="text-lg font-black text-white mb-6 pb-3 border-b border-white/5 flex items-center gap-2">
                      <span>🏨</span>
                      {lang === 'ar' ? 'سجل توزيع وتسكين الفنادق الفوري' : 'Live Hotel Placement sheet'}
                    </h4>

                    <div className="space-y-4">
                      {staffLogisticsList.map((item) => (
                        <div key={item.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
                          <div>
                            <h5 className="font-black text-sm text-white">{item.participant_name}</h5>
                            <p className="text-white/40 text-xs mt-1 font-bold">
                              🏨 {item.hotel_name || (lang === 'ar' ? 'لم يحدد فندق بعد' : 'No hotel set')} (غرفة: {item.room_number || '---'})
                            </p>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black self-start sm:self-center">
                            🔑 {lang === 'ar' ? 'تم تسليم الغرفة' : 'Room Key Handed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {renderCommitteeTasks('accommodation')}
                </div>
              )}

              {/* Sub-Tab 4: Entertainment & Excursions */}
              {staffActiveSubTab === 'entertainment' && hasEntertainmentStaffAccess && (
                <div className="space-y-6">
                  {/* Grid for Entertainment Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">🏕️</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'الأنشطة والرحلات النشطة' : 'Active Excursions'}</h4>
                      <p className="text-3xl font-black text-white mt-1">{activities.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">👥</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'إجمالي الأماكن المحجوزة' : 'Total Places Reserved'}</h4>
                      <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                        {activities.reduce((acc, curr) => acc + (curr.current_count || 0), 0)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">✨</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'النسبة الكلية للامتلاء' : 'Average Booking Rate'}</h4>
                      <p className="text-3xl font-black text-blue-400 mt-1 font-mono">
                        {activities.length > 0 
                          ? `${Math.round((activities.reduce((acc, curr) => acc + (curr.current_count || 0), 0) / (activities.reduce((acc, curr) => acc + (curr.max_capacity || 999), 0) || 1)) * 100)}%` 
                          : '0%'}
                      </p>
                    </div>
                  </div>

                  {/* Excursions Management List */}
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <h4 className="text-lg font-black text-white mb-6 pb-3 border-b border-white/5 flex items-center gap-2">
                      <span>🏕️</span>
                      {lang === 'ar' ? 'سجل متابعة وتأكيد حجوزات الأنشطة' : 'Sideline Activities & Placement tracking'}
                    </h4>

                    {activities.length === 0 ? (
                      <p className="text-white/40 text-center py-12 font-bold">
                        {lang === 'ar' ? 'لا توجد أنشطة ترفيهية مسجلة حالياً' : 'No side excursions set yet'}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {activities.map((act) => (
                          <div key={act.id} className="p-5 bg-[#0D1527]/40 border border-white/5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
                            <div className="space-y-1">
                              <h5 className="font-black text-md text-white">{act.title}</h5>
                              <p className="text-white/40 text-xs font-bold">
                                📍 {act.location} | 📅 {new Date(act.date_time).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                              </p>
                              <div className="w-48 bg-white/5 h-2 rounded-full overflow-hidden mt-2">
                                <div 
                                  className="bg-amber-500 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, ((act.current_count || 0) / (act.max_capacity || 100)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-white/50 block font-bold">
                                {lang === 'ar' 
                                  ? `تم حجز ${act.current_count} من أصل ${act.max_capacity || '∞'}`
                                  : `${act.current_count} / ${act.max_capacity || 'unlimited'} reserved`}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await interactionService.getActivityRegistrations(act.id);
                                    setSelectedActivityForList(act);
                                    setActivityRegistrationsList(res || []);
                                    setIsActivityRegistrationsOpen(true);
                                  } catch (err) {
                                    console.error('Failed to fetch activity registrations:', err);
                                  }
                                }}
                                className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/10"
                              >
                                👥 {lang === 'ar' ? 'عرض قائمة المسجلين' : 'View Registrations'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {renderCommitteeTasks('entertainment')}
                </div>
              )}

              {/* Sub-Tab 5: Reception & Check-in */}
              {staffActiveSubTab === 'reception' && hasReceptionStaffAccess && (
                <div className="space-y-6">
                  {/* Grid for Reception Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">👤</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'إجمالي الحضور الفعلي' : 'Checked In'}</h4>
                      <p className="text-3xl font-black text-white mt-1 font-mono">
                        {receptionList.filter(p => p.check_in_time).length}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">👥</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'إجمالي المدعوين المسجلين' : 'Total Guests'}</h4>
                      <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                        {receptionList.length}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-[30px] p-6 text-right">
                      <span className="text-3xl block mb-2">📈</span>
                      <h4 className="text-sm font-black text-white/50">{lang === 'ar' ? 'نسبة الحضور الحالية' : 'Attendance Rate'}</h4>
                      <p className="text-3xl font-black text-blue-400 mt-1 font-mono">
                        {receptionList.length > 0 
                          ? `${Math.round((receptionList.filter(p => p.check_in_time).length / receptionList.length) * 100)}%` 
                          : '0%'}
                      </p>
                    </div>
                  </div>

                  {/* Search and Guest List */}
                  <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 backdrop-blur-3xl relative shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-white/5">
                      <h4 className="text-lg font-black text-white flex items-center gap-2">
                        <span>🎟️</span>
                        {lang === 'ar' ? 'سجل الحضور والتحقق السريع البوابي' : 'Live Gate Check-in sheet'}
                      </h4>
                      
                      {/* Search Input */}
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          placeholder={lang === 'ar' ? 'ابحث باسم الضيف أو الجهة...' : 'Search guest name...'}
                          value={searchReceptionQuery}
                          onChange={(e) => setSearchReceptionQuery(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl h-10 px-4 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    {isLoadingReception ? (
                      <div className="flex justify-center py-12">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receptionList
                          .filter(p => !searchReceptionQuery || p.full_name?.toLowerCase().includes(searchReceptionQuery.toLowerCase()) || p.organization?.toLowerCase().includes(searchReceptionQuery.toLowerCase()))
                          .map((p) => (
                            <div key={p.id} className="p-4 bg-[#0D1527]/40 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                              <div>
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase">
                                    {p.role === 'vip' ? (lang === 'ar' ? 'VIP 👑' : 'VIP') : p.role}
                                  </span>
                                  <h5 className="font-black text-sm text-white">{p.full_name}</h5>
                                </div>
                                <p className="text-white/40 text-xs font-bold mt-1">
                                  🏢 {p.organization || '---'} {p.phone_number ? `| 📞 ${p.phone_number}` : ''}
                                </p>
                                {p.check_in_time && (
                                  <p className="text-emerald-400 text-[10px] font-bold mt-1">
                                    ✅ {lang === 'ar' ? 'حاضر منذ:' : 'Arrived at:'} {new Date(p.check_in_time).toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                {p.check_in_time ? (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من إلغاء تحضير هذا الضيف؟' : 'Are you sure you want to undo check-in for this guest?')) {
                                        try {
                                          await participantService.undoCheckIn(p.id);
                                          toast.success(lang === 'ar' ? 'تم إلغاء الحضور بنجاح' : 'Check-in cancelled successfully');
                                          fetchReceptionParticipants();
                                        } catch (err) {
                                          console.error('Failed to undo check-in:', err);
                                          toast.error(lang === 'ar' ? 'فشل إلغاء الحضور' : 'Failed to undo check-in');
                                        }
                                      }
                                    }}
                                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-black transition-all"
                                  >
                                    ❌ {lang === 'ar' ? 'إلغاء التحضير' : 'Undo Check-in'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await participantService.checkIn(p.id);
                                        toast.success(lang === 'ar' ? 'تم تحضير الضيف بنجاح! 🎟️' : 'Guest checked in successfully! 🎟️');
                                        fetchReceptionParticipants();
                                      } catch (err) {
                                        console.error('Failed to check in:', err);
                                        toast.error(lang === 'ar' ? 'فشل تسجيل حضور الضيف' : 'Failed to check in guest');
                                      }
                                    }}
                                    className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-black transition-all"
                                  >
                                    ⚡ {lang === 'ar' ? 'تسجيل حضور' : 'Check-in'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {renderCommitteeTasks('reception')}
                </div>
              )}

              {/* Inline Dispatch Modal */}
              <AnimatePresence>
                {isStaffDispatchModalOpen && selectedStaffParticipant && (
                  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 text-[#F0F4F2]">
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="w-full max-w-lg bg-gradient-to-b from-[#0D1527] to-[#050B18] border border-white/10 rounded-[40px] p-6 relative shadow-[0_24px_80px_rgba(0,0,0,0.6)] text-right"
                    >
                        <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                          <div className="flex items-center gap-2">
                            <span>🚗</span>
                            <h3 className="text-lg font-black">{lang === 'ar' ? 'تخصيص مرافق وإرسال تفاصيل النقل' : 'Assign Companion & Dispatch Details'}</h3>
                          </div>
                          <button
                            onClick={() => setIsStaffDispatchModalOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <p className="text-xs text-white/50 mb-6 font-bold leading-relaxed">
                          {lang === 'ar'
                            ? `سيتم حفظ هذه البيانات وإرسالها فوراً بهاتف الضيف (${selectedStaffParticipant.participant_name}) وتعديل لوحة وصوله لحظياً.`
                            : `These details will be saved and immediately sent/updated on the guest's mobile portal.`}
                        </p>

                        <form onSubmit={handleSaveStaffDispatch} className="space-y-4">
                          {/* Predefined Driver Registry Select */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-amber-500 block">
                              {lang === 'ar' ? '🚗 اختر سائقاً من السجل المعتمد' : '🚗 Select Predefined Driver'}
                            </label>
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'manual') {
                                  setStaffDispatchForm({
                                    ...staffDispatchForm,
                                    driver_name: '',
                                    driver_phone: '',
                                    vehicle_details: ''
                                  });
                                } else {
                                  const d = driversList.find(x => x.id === parseInt(val));
                                  if (d) {
                                    setStaffDispatchForm({
                                      ...staffDispatchForm,
                                      driver_name: d.name,
                                      driver_phone: d.phone,
                                      vehicle_details: d.vehicle_details || ''
                                    });
                                  }
                                }
                              }}
                              className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 px-4 text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                              dir="rtl"
                            >
                              <option value="manual">{lang === 'ar' ? '✍️ إدخال يدوي حر...' : '✍️ Manual Custom Entry...'}</option>
                              {driversList.map(d => (
                                <option key={d.id} value={d.id}>
                                  👤 {d.name} ({d.phone}) {d.vehicle_details ? `[${d.vehicle_details}]` : ''}
                                </option>
                              ))}
                            </select>
                            
                            {/* Driver conflict alert */}
                            {getDriverConflictWarning() && (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-black text-right mt-2">
                                {getDriverConflictWarning()}
                              </div>
                            )}

                            {/* Organizer On-The-Fly Driver Manager */}
                            {(isPresident || roleLower.includes('رئيس') || roleLower.includes('منظم')) && (
                              <div className="border-t border-white/5 pt-2 mt-1">
                                {!isAddingNewDriver ? (
                                  <button
                                    type="button"
                                    onClick={() => setIsAddingNewDriver(true)}
                                    className="text-[11px] font-black text-amber-500/80 hover:text-amber-400 flex items-center gap-1"
                                  >
                                    ➕ {lang === 'ar' ? 'إضافة سائق جديد إلى السجل المعتمد للفعالية' : 'Add New Driver to Event Registry'}
                                  </button>
                                ) : (
                                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2 mt-2 text-right" dir="rtl">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black text-amber-500">{lang === 'ar' ? 'إضافة سائق جديد للسجل' : 'Add Driver to Registry'}</span>
                                      <button
                                        type="button"
                                        onClick={() => setIsAddingNewDriver(false)}
                                        className="text-white/40 hover:text-white text-[10px] font-black"
                                      >
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                      </button>
                                    </div>
                                    
                                    <input
                                      value={newDriverForm.name}
                                      onChange={(e) => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                                      placeholder={lang === 'ar' ? 'اسم السائق' : 'Driver Name'}
                                      className="w-full bg-[#050B18] border border-white/10 rounded-xl h-10 px-3 text-xs text-white text-right"
                                      dir="rtl"
                                    />
                                    <input
                                      value={newDriverForm.phone}
                                      onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                                      placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                                      className="w-full bg-[#050B18] border border-white/10 rounded-xl h-10 px-3 text-xs text-white text-right"
                                      dir="rtl"
                                    />
                                    <input
                                      value={newDriverForm.vehicle_details}
                                      onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicle_details: e.target.value })}
                                      placeholder={lang === 'ar' ? 'تفاصيل ولون ورقم السيارة' : 'Vehicle Make, Model & Plate'}
                                      className="w-full bg-[#050B18] border border-white/10 rounded-xl h-10 px-3 text-xs text-white text-right"
                                      dir="rtl"
                                    />
                                    
                                    <button
                                      type="button"
                                      disabled={isSavingNewDriver || !newDriverForm.name || !newDriverForm.phone}
                                      onClick={async () => {
                                        setIsSavingNewDriver(true);
                                        try {
                                          const newD = await interactionService.createDriver({
                                            event_id: eventId,
                                            name: newDriverForm.name,
                                            phone: newDriverForm.phone,
                                            vehicle_details: newDriverForm.vehicle_details
                                          });
                                          toast.success(lang === 'ar' ? 'تمت إضافة السائق للسجل بنجاح! 🚗' : 'Driver added successfully! 🚗');
                                          setDriversList(prev => [...prev, newD]);
                                          setIsAddingNewDriver(false);
                                          setNewDriverForm({ name: '', phone: '', vehicle_details: '' });
                                        } catch (err) {
                                          console.error('Failed to save driver:', err);
                                          toast.error(lang === 'ar' ? 'فشل حفظ السائق' : 'Failed to save driver');
                                        } finally {
                                          setIsSavingNewDriver(false);
                                        }
                                      }}
                                      className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-brand-dark rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
                                    >
                                      {isSavingNewDriver && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border border-brand-dark border-t-transparent rounded-full" />}
                                      {lang === 'ar' ? 'حفظ السائق في السجل' : 'Save Driver'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Driver Name */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'اسم المرافق' : 'Companion Name'}</label>
                            <Input
                              required
                              value={staffDispatchForm.driver_name}
                              onChange={(e) => setStaffDispatchForm({ ...staffDispatchForm, driver_name: e.target.value })}
                              placeholder={lang === 'ar' ? 'مثال: محمد الشريف' : 'e.g. Mohamed Al-Sharif'}
                              className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 text-right px-4 text-white"
                            />
                          </div>

                          {/* Driver Phone */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'رقم هاتف المرافق' : 'Companion Phone Number'}</label>
                            <Input
                              required
                              value={staffDispatchForm.driver_phone}
                              onChange={(e) => setStaffDispatchForm({ ...staffDispatchForm, driver_phone: e.target.value })}
                              placeholder="+213555123456"
                              className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 text-right px-4 text-white"
                            />
                          </div>

                          {/* Vehicle details */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'تفاصيل ولون ورقم السيارة' : 'Vehicle Make, Model & Plate'}</label>
                            <Input
                              required
                              value={staffDispatchForm.vehicle_details}
                              onChange={(e) => setStaffDispatchForm({ ...staffDispatchForm, vehicle_details: e.target.value })}
                              placeholder={lang === 'ar' ? 'مثال: مرسيدس سوداء رقم 12345-120-16' : 'e.g. Black Mercedes S-Class, Plate 12345-120-16'}
                              className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 text-right px-4 text-white"
                            />
                          </div>

                          {/* Status Select */}
                          <div className="space-y-2">
                            <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'حالة الاستقبال والوصول' : 'Dispatch & Arrival Status'}</label>
                            <select
                              value={staffDispatchForm.status}
                              onChange={(e) => setStaffDispatchForm({ ...staffDispatchForm, status: e.target.value })}
                              className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-14 px-4 text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                              dir="rtl"
                            >
                              <option value="pending">{lang === 'ar' ? '⏳ قيد الانتظار' : 'Pending'}</option>
                              <option value="dispatched">{lang === 'ar' ? '🚗 تم إرسال المرافق للموقع' : 'Dispatched'}</option>
                              <option value="arrived">{lang === 'ar' ? '✈️ وصل لمكان اللقاء' : 'Arrived at pickup location'}</option>
                              <option value="completed">{lang === 'ar' ? '✅ تم التوصيل بنجاح' : 'Completed'}</option>
                            </select>
                          </div>

                          {/* Share with Driver Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const driverPhone = staffDispatchForm.driver_phone.replace(/\+/g, '').replace(/[^0-9]/g, '');
                              if (!driverPhone) {
                                toast.error(lang === 'ar' ? 'يرجى إدخال رقم هاتف السائق أولاً' : 'Please enter the driver phone number first');
                                return;
                              }
                              const guestName = selectedStaffParticipant.participant_name;
                              const hotel = selectedStaffParticipant.hotel_name || '---';
                              const flight = selectedStaffParticipant.flight_number || '---';
                              const arrivalTime = selectedStaffParticipant.arrival_time ? new Date(selectedStaffParticipant.arrival_time).toLocaleString() : '---';
                              const location = selectedStaffParticipant.arrival_location || '---';
                              
                              const text = lang === 'ar'
                                ? `أهلاً بك، تفاصيل استقبال الضيف:\n\n👤 اسم الضيف: ${guestName}\n✈️ رقم الرحلة: ${flight}\n⏰ موعد الوصول: ${arrivalTime}\n📍 موقع اللقاء: ${location}\n🏨 وجهة التوصيل (الفندق): ${hotel}`
                                : `Hello, here are the guest arrival details:\n\n👤 Guest Name: ${guestName}\n✈️ Flight: ${flight}\n⏰ Arrival Time: ${arrivalTime}\n📍 Pickup Location: ${location}\n🏨 Destination Hotel: ${hotel}`;
                                
                              window.open(`https://wa.me/${driverPhone}?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-black transition-all flex items-center justify-center gap-2 mt-4"
                          >
                            <span>💬</span>
                            {lang === 'ar' ? 'مشاركة تفاصيل الرحلة مع السائق عبر واتساب' : 'Share Flight Details with Driver via WhatsApp'}
                          </button>

                        {/* Dispatch Save Button */}
                        <Button
                          type="submit"
                          disabled={isSavingStaffDispatch}
                          variant="gold"
                          className="w-full h-14 rounded-2xl text-md font-black gap-2 mt-6"
                        >
                          {isSavingStaffDispatch ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full" />
                          ) : '🚗'}
                          {lang === 'ar' ? 'تأكيد وإعلام الضيف فوراً' : 'Confirm & Dispatch Guest'}
                        </Button>
                      </form>
                    </motion.div>
                  </div>
                )}

                {isActivityRegistrationsOpen && selectedActivityForList && (
                  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 text-[#F0F4F2]">
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="w-full max-w-lg bg-gradient-to-b from-[#0D1527] to-[#050B18] border border-white/10 rounded-[40px] p-6 relative shadow-[0_24px_80px_rgba(0,0,0,0.6)] text-right"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          <span>🏕️</span>
                          <h3 className="text-lg font-black">{lang === 'ar' ? 'قائمة المسجلين في النشاط' : 'Activity Registrations'}</h3>
                        </div>
                        <button
                          onClick={() => setIsActivityRegistrationsOpen(false)}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-black text-md text-amber-500">{selectedActivityForList.title}</h4>
                        <p className="text-white/40 text-xs mt-1 font-bold">
                          📍 {selectedActivityForList.location} | {selectedActivityForList.current_count} {lang === 'ar' ? 'مسجلين' : 'registered'}
                        </p>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-3 pr-1" dir="rtl">
                        {activityRegistrationsList.length === 0 ? (
                          <p className="text-white/40 text-center py-6 font-bold">
                            {lang === 'ar' ? 'لا يوجد أي مسجل في هذا النشاط بعد' : 'No one registered for this activity yet'}
                          </p>
                        ) : (
                          activityRegistrationsList.map((p) => (
                            <div key={p.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3 text-right">
                              <div>
                                <h5 className="font-black text-sm text-white">{p.full_name}</h5>
                                <p className="text-white/40 text-[11px] font-bold mt-0.5">
                                  🏢 {p.organization || '---'} {p.phone_number ? `| 📞 ${p.phone_number}` : ''}
                                </p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من إلغاء تسجيل هذا العضو؟' : 'Are you sure you want to cancel this registration?')) {
                                    try {
                                      await interactionService.unregisterActivity(selectedActivityForList.id, p.id);
                                      toast.success(lang === 'ar' ? 'تم إلغاء التسجيل بنجاح' : 'Registration cancelled successfully');
                                      const res = await interactionService.getActivityRegistrations(selectedActivityForList.id);
                                      setActivityRegistrationsList(res || []);
                                      const updatedActivities = await interactionService.listActivities(eventId, participant.id);
                                      setActivities(updatedActivities);
                                    } catch (err) {
                                      console.error('Failed to unregister:', err);
                                      toast.error(lang === 'ar' ? 'فشل إلغاء التسجيل' : 'Failed to unregister');
                                    }
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black transition-all"
                              >
                                {lang === 'ar' ? 'إلغاء الحجز' : 'Cancel'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}

                {isCreateTaskModalOpen && (
                  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 text-[#F0F4F2]">
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="w-full max-w-lg bg-gradient-to-b from-[#0D1527] to-[#050B18] border border-white/10 rounded-[40px] p-6 relative shadow-[0_24px_80px_rgba(0,0,0,0.6)] text-right"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          <span>📋</span>
                          <h3 className="text-lg font-black">{lang === 'ar' ? 'إسناد مهمة جديدة للجنة' : 'Assign Committee Task'}</h3>
                        </div>
                        <button
                          onClick={() => setIsCreateTaskModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateTask} className="space-y-4" dir="rtl">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'اختر مهمة مقترحة جاهزة للجنة' : 'Select Suggested Task Preset'}</label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const presets = COMMITTEE_TASK_PRESETS[selectedTaskCommittee || 'reception'] || [];
                                const preset = presets.find(p => p.titleAr === val || p.titleEn === val);
                                if (preset) {
                                  setNewTaskForm(prev => ({
                                    ...prev,
                                    title: lang === 'ar' ? preset.titleAr : preset.titleEn,
                                    description: lang === 'ar' ? preset.descAr : preset.descEn
                                  }));
                                }
                              }
                            }}
                            className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-12 px-4 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                          >
                            <option value="">{lang === 'ar' ? '--- اختر مهمة جاهزة أو اكتب مخصصة أدناه ---' : '--- Choose a preset task or write custom ---'}</option>
                            {(COMMITTEE_TASK_PRESETS[selectedTaskCommittee || 'reception'] || []).map((preset, idx) => (
                              <option key={idx} value={lang === 'ar' ? preset.titleAr : preset.titleEn}>
                                {lang === 'ar' ? preset.titleAr : preset.titleEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'عنوان المهمة' : 'Task Title'}</label>
                          <input
                            type="text"
                            required
                            placeholder={lang === 'ar' ? 'مثال: نقل ضيف من المطار' : 'e.g. Airport Transfer'}
                            value={newTaskForm.title}
                            onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 px-4 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'وصف وتفاصيل المهمة' : 'Description'}</label>
                          <textarea
                            placeholder={lang === 'ar' ? 'تفاصيل المواعيد واللوائح الإضافية...' : 'Write extra details...'}
                            value={newTaskForm.description}
                            onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right h-20 resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'الضيف المستهدف (اختياري)' : 'Target Guest (Optional)'}</label>
                          <select
                            value={newTaskForm.participant_id}
                            onChange={(e) => setNewTaskForm({ ...newTaskForm, participant_id: e.target.value })}
                            className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-12 px-4 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                          >
                            <option value="">{lang === 'ar' ? '--- بدون ربط مع ضيف معين ---' : '--- Not linked to a guest ---'}</option>
                            {receptionList
                              .filter(p => {
                                const role = (p.role || '').toLowerCase();
                                return !role.includes('organizer') && !role.includes('helper') && !role.includes('منظم') && !role.includes('مساعد') && !role.includes('رئيس');
                              })
                              .map(p => (
                                <option key={p.id} value={p.id}>{p.full_name} ({p.organization || 'مشارك'})</option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'عضو اللجنة المنفذ' : 'Assignee'}</label>
                          <select
                            value={newTaskForm.assigned_to_id}
                            onChange={(e) => setNewTaskForm({ ...newTaskForm, assigned_to_id: e.target.value })}
                            className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-12 px-4 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                            required
                          >
                            <option value="">{lang === 'ar' ? '--- حدد العضو المسؤول عن التنفيذ ---' : '--- Choose assignee ---'}</option>
                            {receptionList
                              .filter(p => {
                                const role = (p.role || '').toLowerCase();
                                const normalize = (str) => {
                                  if (!str) return '';
                                  return str.replace(/[أإآأ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
                                };
                                const normRole = normalize(role);
                                
                                // Get logged-in user's role
                                const userRole = (participant?.role || '').toLowerCase();
                                const normUserRole = normalize(userRole);
                                const isUserPresident = normUserRole.includes('رئيس') || normUserRole.includes('president');
                                
                                // Determine active committee
                                const committeeKey = selectedTaskCommittee || 'reception';
                                
                                // If logged in as president, restrict to matching committee
                                if (isUserPresident) {
                                  let userCommittee = null;
                                  if (normUserRole.includes('استقبل') || normUserRole.includes('reception')) userCommittee = 'reception';
                                  else if (normUserRole.includes('اطعام') || normUserRole.includes('catering') || normUserRole.includes('food') || normUserRole.includes('ضيافه')) userCommittee = 'catering';
                                  else if (normUserRole.includes('ايواء') || normUserRole.includes('accommodation') || normUserRole.includes('hotel') || normUserRole.includes('lodging') || normUserRole.includes('تسكين')) userCommittee = 'accommodation';
                                  else if (normUserRole.includes('نقل') || normUserRole.includes('logistics') || normUserRole.includes('سائق') || normUserRole.includes('transport') || normUserRole.includes('driver')) userCommittee = 'transport';
                                  else if (normUserRole.includes('ترفيه') || normUserRole.includes('نشاط') || normUserRole.includes('انشطه') || normUserRole.includes('excursion') || normUserRole.includes('activity')) userCommittee = 'entertainment';
                                  
                                  const matchesCommittee = (userCommittee === committeeKey) || 
                                                           (userCommittee === 'transport' && committeeKey === 'logistics') || 
                                                           (userCommittee === 'logistics' && committeeKey === 'transport');
                                  if (userCommittee && !matchesCommittee) {
                                    return false;
                                  }
                                }
                                
                                // General organizers can be seen if logged in user is NOT a specific committee president
                                if (!isUserPresident) {
                                  const isGeneral = normRole === 'organizer' || normRole === 'منظم' || (normRole.includes('عام') && !normRole.includes('طعام')) || normRole.includes('general') || normRole.includes('اداري');
                                  if (isGeneral) return true;
                                }
                                
                                // Filter matching committee members (excluding other presidents)
                                if (committeeKey === 'reception') {
                                  return (normRole.includes('استقبل') || normRole.includes('تسجيل') || normRole.includes('reception')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                }
                                if (committeeKey === 'catering') {
                                  return (normRole.includes('اطعام') || normRole.includes('ضيافه') || normRole.includes('catering') || normRole.includes('food')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                }
                                if (committeeKey === 'accommodation') {
                                  return (normRole.includes('ايواء') || normRole.includes('تسكين') || normRole.includes('accommodation') || normRole.includes('hotel') || normRole.includes('lodging')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                }
                                if (committeeKey === 'logistics' || committeeKey === 'transport') {
                                  return (normRole.includes('نقل') || normRole.includes('لوجست') || normRole.includes('سائق') || normRole.includes('transport') || normRole.includes('driver') || normRole.includes('logistics')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                }
                                if (committeeKey === 'entertainment') {
                                  return (normRole.includes('ترفيه') || normRole.includes('نشاط') || normRole.includes('انشطه') || normRole.includes('excursion') || normRole.includes('activity')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                }
                                return false;
                              })
                              .map(p => (
                                <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'توقيت التنفيذ المطلوب' : 'Due Time'}</label>
                          <input
                            type="datetime-local"
                            value={newTaskForm.due_time}
                            onChange={(e) => setNewTaskForm({ ...newTaskForm, due_time: e.target.value })}
                            className="w-full bg-[#050B18] border border-white/10 rounded-2xl h-12 px-4 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                          />
                        </div>

                        <Button
                          type="submit"
                          variant="gold"
                          className="w-full h-12 rounded-2xl text-sm font-black mt-2"
                        >
                          {lang === 'ar' ? 'تأكيد وإسناد المهمة' : 'Assign Task Now'}
                        </Button>
                      </form>
                    </motion.div>
                  </div>
                )}

                {detailedTask && !isApologizing && (
                  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 text-[#F0F4F2]">
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="w-full max-w-lg bg-gradient-to-b from-[#0D1527] to-[#050B18] border border-white/10 rounded-[40px] p-6 relative shadow-[0_24px_80px_rgba(0,0,0,0.6)] text-right"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          <span>📋</span>
                          <h3 className="text-lg font-black">{lang === 'ar' ? 'تفاصيل المهمة الميدانية' : 'Task Details'}</h3>
                        </div>
                        <button
                          onClick={() => setDetailedTask(null)}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-4" dir="rtl">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[10px] text-white/40 block mb-1 font-bold">{lang === 'ar' ? 'عنوان المهمة' : 'Title'}</span>
                          <h4 className="text-base font-black text-white">{detailedTask.title}</h4>
                        </div>

                        {detailedTask.description && (
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[10px] text-white/40 block mb-1 font-bold">{lang === 'ar' ? 'الوصف والتفاصيل' : 'Description'}</span>
                            <p className="text-xs text-white/80 leading-relaxed font-bold whitespace-pre-wrap">{detailedTask.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[10px] text-white/40 block mb-1 font-bold">{lang === 'ar' ? 'حالة المهمة' : 'Status'}</span>
                            <span className={cn(
                              "text-xs px-2.5 py-1 rounded font-black inline-block mt-1",
                              detailedTask.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              detailedTask.status === 'in_progress' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              detailedTask.status === 'cancelled' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {detailedTask.status === 'completed' ? (lang === 'ar' ? '✅ مكتملة' : 'Completed') :
                               detailedTask.status === 'in_progress' ? (lang === 'ar' ? '⚙️ جاري العمل' : 'In Progress') :
                               detailedTask.status === 'cancelled' ? (lang === 'ar' ? '❌ ملغاة' : 'Cancelled') :
                               (lang === 'ar' ? '⏳ قيد الانتظار' : 'Pending')}
                            </span>
                          </div>

                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[10px] text-white/40 block mb-1 font-bold">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Time'}</span>
                            <p className="text-xs text-white font-bold mt-1.5">
                              {detailedTask.due_time 
                                ? new Date(detailedTask.due_time).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'en-US')
                                : (lang === 'ar' ? 'مفتوح' : 'Anytime')}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {detailedTask.assigned_to_name && (
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <span className="text-[10px] text-white/40 block mb-1 font-bold">{lang === 'ar' ? 'العضو المكلف' : 'Assignee'}</span>
                              <p className="text-xs text-emerald-400 font-black mt-1.5">🛡️ {detailedTask.assigned_to_name}</p>
                            </div>
                          )}

                          {detailedTask.participant_id && (
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <span className="text-[10px] text-white/40 block mb-1 font-bold">{lang === 'ar' ? 'الضيف المستهدف' : 'Target Guest'}</span>
                              <p className="text-xs text-amber-500 font-black mt-1.5">
                                👤 {receptionList.find(p => p.id === detailedTask.participant_id)?.full_name || detailedTask.participant_id}
                              </p>
                            </div>
                          )}
                        </div>

                        {isPresident && detailedTask.status !== 'completed' && detailedTask.status !== 'cancelled' && (
                          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 mt-2 space-y-3">
                            <span className="text-[10px] text-amber-500 font-bold block text-right">
                              {lang === 'ar' ? '👑 تفويض وإسناد المهمة لعضو آخر' : '👑 Reassign Task to Another Member'}
                            </span>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={selectedReassigneeId}
                                onChange={(e) => setSelectedReassigneeId(e.target.value)}
                                className="flex-1 bg-[#050B18] border border-white/10 rounded-xl h-10 px-3 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right"
                              >
                                <option value="">{lang === 'ar' ? '--- حدد العضو المسؤول ---' : '--- Select Member ---'}</option>
                                {receptionList
                                  .filter(p => {
                                    const role = (p.role || '').toLowerCase();
                                    const normalize = (str) => {
                                      if (!str) return '';
                                      return str.replace(/[أإآأ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
                                    };
                                    const normRole = normalize(role);
                                    const committeeKey = detailedTask.committee;
                                    
                                    if (committeeKey === 'reception') {
                                      return (normRole.includes('استقبل') || normRole.includes('تسجيل') || normRole.includes('reception')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                    }
                                    if (committeeKey === 'catering') {
                                      return (normRole.includes('اطعام') || normRole.includes('ضيافه') || normRole.includes('catering') || normRole.includes('food')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                    }
                                    if (committeeKey === 'accommodation') {
                                      return (normRole.includes('ايواء') || normRole.includes('تسكين') || normRole.includes('accommodation') || normRole.includes('hotel') || normRole.includes('lodging')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                    }
                                    if (committeeKey === 'logistics' || committeeKey === 'transport') {
                                      return (normRole.includes('نقل') || normRole.includes('لوجست') || normRole.includes('سائق') || normRole.includes('transport') || normRole.includes('driver') || normRole.includes('logistics')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                    }
                                    if (committeeKey === 'entertainment') {
                                      return (normRole.includes('ترفيه') || normRole.includes('نشاط') || normRole.includes('انشطه') || normRole.includes('excursion') || normRole.includes('activity')) && !normRole.includes('رئيس') && !normRole.includes('president');
                                    }
                                    return false;
                                  })
                                  .map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                                  ))}
                              </select>
                              <button
                                onClick={() => {
                                  if (!selectedReassigneeId) {
                                    toast.error(lang === 'ar' ? 'يرجى تحديد العضو أولاً' : 'Please select a member first');
                                    return;
                                  }
                                  handleReassignTask(detailedTask.id, selectedReassigneeId);
                                }}
                                className="px-4 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-black transition-all shadow-md shadow-amber-500/10"
                              >
                                {lang === 'ar' ? 'إسناد وتكليف' : 'Assign'}
                              </button>
                            </div>
                          </div>
                        )}

                        {detailedTask.status !== 'completed' && detailedTask.status !== 'cancelled' && (
                          <div className="flex flex-col gap-2 pt-4 border-t border-white/5 mt-4">
                            <div className="flex gap-2">
                              {detailedTask.assigned_to_id === participant.id && (
                                detailedTask.status === 'pending' ? (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(detailedTask.id, 'in_progress')}
                                    className="flex-1 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-brand-dark text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10"
                                  >
                                    <span>⚙️</span>
                                    {lang === 'ar' ? 'بدء التنفيذ' : 'Start'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(detailedTask.id, 'completed')}
                                    className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-brand-dark text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                                  >
                                    <span>✅</span>
                                    {lang === 'ar' ? 'إكمال المهمة' : 'Complete'}
                                  </button>
                                )
                              )}

                              {detailedTask.assigned_to_id === participant.id && (
                                <button
                                  onClick={() => setIsApologizing(true)}
                                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                                >
                                  <span>⚠️</span>
                                  {lang === 'ar' ? 'اعتذار عن المهمة' : 'Apologize'}
                                </button>
                              )}
                            </div>

                            {((participant.role || '').toLowerCase().includes('رئيس') || (participant.role || '').toLowerCase().includes('president') || !participant.role || (participant.role || '').toLowerCase().includes('منظم') || (participant.role || '').toLowerCase().includes('organizer')) ? (
                              <button
                                onClick={() => {
                                  if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من إلغاء هذه المهمة؟' : 'Are you sure you want to cancel this task?')) {
                                    handleUpdateTaskStatus(detailedTask.id, 'cancelled');
                                  }
                                }}
                                className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-black transition-all flex items-center justify-center gap-1.5"
                              >
                                <span>❌</span>
                                {lang === 'ar' ? 'إلغاء المهمة' : 'Cancel Task'}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}

                {isApologizing && detailedTask && (
                  <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 text-[#F0F4F2]">
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="w-full max-w-md bg-gradient-to-b from-[#0D1527] to-[#050B18] border border-white/10 rounded-[40px] p-6 relative shadow-[0_24px_80px_rgba(0,0,0,0.6)] text-right"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          <span>⚠️</span>
                          <h3 className="text-lg font-black text-amber-500">{lang === 'ar' ? 'الاعتذار عن المهمة' : 'Task Apology'}</h3>
                        </div>
                        <button
                          onClick={() => {
                            setIsApologizing(false);
                            setApologyReasonText('');
                          }}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-4" dir="rtl">
                        <p className="text-xs text-white/70 font-bold leading-relaxed">
                          {lang === 'ar' 
                            ? 'يرجى كتابة سبب الاعتذار بالتفصيل. سيصل إشعار لرئيس اللجنة بذلك، وسيتم إرجاع المهمة لقيد الانتظار لإسنادها لعضو آخر.'
                            : 'Please write down the reason for your apology. The committee president will be notified, and the task will revert to pending to be assigned to someone else.'}
                        </p>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-white/50 block">{lang === 'ar' ? 'سبب الاعتذار' : 'Reason'}</label>
                          <textarea
                            placeholder={lang === 'ar' ? 'اكتب هنا سبب عدم القدرة على تنفيذ المهمة...' : 'Write reason here...'}
                            value={apologyReasonText}
                            onChange={(e) => setApologyReasonText(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white font-bold outline-none focus:border-amber-500/50 transition-all text-right h-24 resize-none"
                            required
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={async () => {
                              if (!apologyReasonText.trim()) {
                                toast.error(lang === 'ar' ? 'يرجى كتابة سبب الاعتذار' : 'Please specify a reason');
                                return;
                              }
                              await handleUpdateTaskStatus(detailedTask.id, 'apologized', apologyReasonText);
                              setIsApologizing(false);
                              setApologyReasonText('');
                              setDetailedTask(null);
                            }}
                            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                          >
                            {lang === 'ar' ? 'تأكيد الاعتذار' : 'Confirm Apology'}
                          </button>
                          <button
                            onClick={() => {
                              setIsApologizing(false);
                              setApologyReasonText('');
                            }}
                            className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-black transition-all"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toaster للإشعارات */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(13,21,39,0.95)',
            color: '#F0F4F2',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontFamily: 'Cairo, sans-serif',
            fontSize: '14px',
            fontWeight: '700',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#38BDF8', secondary: '#050B18' } },
          error:   { iconTheme: { primary: '#F87171', secondary: '#050B18' } },
        }}
      />

      {filteredTabs.length > 1 && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-[#050B18]/90 backdrop-blur-3xl border-t border-white/10 z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
        >
          <div
            className="flex items-center gap-1 px-3 pt-3 pb-3 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
            }}
          >
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'notifications') {
                    fetchNotifications();
                    handleMarkNotificationsAsRead();
                  }
                }}
                style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl relative transition-all min-w-[60px]",
                  activeTab === tab.id
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                <div className="relative">
                  <tab.icon className="w-6 h-6" />
                  {tab.id === 'notifications' && unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center border-2 border-[#050B18] shadow-lg shadow-red-500/50 min-w-[14px]">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-wide whitespace-nowrap">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-amber-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Scan Mode Fullscreen Modal */}
      <AnimatePresence>
        {isScanMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-between p-8 text-black"
          >
            {/* Top Close Button */}
            <div className="w-full flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">منصة ديوان الذكية · وضع المسح السريع</span>
              <button 
                onClick={toggleScanMode} 
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Middle QR Code with Pulse Line */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative p-8 bg-white border-4 border-amber-500 rounded-[40px] shadow-[0_0_60px_rgba(245,158,11,0.3)] mb-8">
                {/* Pulsing Corner Brackets — لا تعيق قراءة الـ QR */}
                <div className="absolute top-2 left-2 w-9 h-9 border-t-[4px] border-l-[4px] border-amber-500 rounded-tl-2xl animate-pulse" />
                <div className="absolute top-2 right-2 w-9 h-9 border-t-[4px] border-r-[4px] border-amber-500 rounded-tr-2xl animate-pulse" style={{animationDelay:'0.3s'}} />
                <div className="absolute bottom-2 left-2 w-9 h-9 border-b-[4px] border-l-[4px] border-amber-500 rounded-bl-2xl animate-pulse" style={{animationDelay:'0.6s'}} />
                <div className="absolute bottom-2 right-2 w-9 h-9 border-b-[4px] border-r-[4px] border-amber-500 rounded-br-2xl animate-pulse" style={{animationDelay:'0.9s'}} />
                <img src={qrUrl} alt="QR Code Large" className="w-64 h-64" />
              </div>
              <h2 className="text-3xl font-black mb-2 text-slate-900 leading-tight">{participant.full_name}</h2>
              <p className="text-amber-600 font-bold text-sm uppercase tracking-wider mb-2">{participant.organization}</p>
              <div className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                {participant.role === 'vip' ? 'ضيف شرف ⭐ VIP' : 
                 participant.role === 'speaker' ? 'متحدث / خبير 🎤 SPEAKER' : 
                 participant.role === 'press' ? 'صحافة وإعلام 📰 PRESS' : 'مشارك معتمد 👤 ATTENDEE'}
              </div>
            </div>

            {/* Bottom Instructions */}
            <div className="w-full text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                تم تنشيط الشاشة ومنع القفل التلقائي تلقائياً
              </div>
              <button 
                onClick={toggleScanMode}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl transition-colors"
              >
                إنهاء وضع المسح
              </button>
            </div>


          </motion.div>
        )}
      </AnimatePresence>

      {/* Notebook Drawer/Modal */}
      <AnimatePresence>
        {isNotebookOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 text-[#F0F4F2]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-gradient-to-b from-[#0D1527] to-[#050B18] border border-white/10 rounded-[40px] p-6 max-h-[85vh] flex flex-col relative shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <h3 className="text-lg font-black">{lang === 'ar' ? 'مفكرتي الرقمية الشخصية' : 'My Digital Notebook'}</h3>
                </div>
                <button
                  onClick={() => setIsNotebookOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {agenda.filter(item => sessionNotes[item.id]).length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl block mb-2">📋</span>
                    <p className="text-white/40 text-xs font-bold">{lang === 'ar' ? 'مفكرتك فارغة حالياً.' : 'Your notebook is currently empty.'}</p>
                    <p className="text-amber-500/40 text-[10px] mt-1">{lang === 'ar' ? 'اكتب ملاحظاتك في تفاصيل الجلسات داخل الجدول لتظهر هنا.' : 'Write notes in session details in the Agenda tab to see them here.'}</p>
                  </div>
                ) : (
                  agenda.filter(item => sessionNotes[item.id]).map(item => (
                    <div key={item.id} className="p-4 bg-white/[0.04] border-2 border-white/15 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-xs text-white">{item.title}</h4>
                          <p className="text-[10px] text-amber-500/80 font-bold mt-1">🎤 {item.speaker_name}</p>
                        </div>
                      </div>
                      <p className="text-slate-100 text-xs leading-relaxed whitespace-pre-wrap bg-black/40 p-3 rounded-xl border-2 border-white/20">
                        {sessionNotes[item.id]}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {agenda.filter(item => sessionNotes[item.id]).length > 0 && (
                <div className="pt-4 border-t border-white/5 mt-4">
                  <button
                    onClick={() => {
                      const text = agenda
                        .filter(item => sessionNotes[item.id])
                        .map(item => `Session: ${item.title}\nSpeaker: ${item.speaker_name}\nNotes:\n${sessionNotes[item.id]}\n\n--------------------------\n`)
                        .join('\n');
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `diwan_notes_${eventId}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success(lang === 'ar' ? 'تم تحميل الملاحظات بنجاح 📲' : 'Notes downloaded successfully! 📲');
                    }}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-brand-dark rounded-xl font-black text-xs tracking-widest uppercase shadow-lg transition-all"
                  >
                    {lang === 'ar' ? '📥 تحميل كل الملاحظات (.txt)' : '📥 Download All Notes (.txt)'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParticipantPortal;
