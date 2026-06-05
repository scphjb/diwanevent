import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Truck, 
  Utensils, 
  Compass, 
  Shield, 
  Users, 
  Search, 
  MapPin, 
  Clock, 
  Edit3, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Calendar, 
  Award,
  ChevronRight,
  Filter,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';
import interactionService from '../services/interactionService';
import participantService from '../services/participantService';
import useAttendanceSocket from '../hooks/useAttendanceSocket';

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

const OperationsPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ar';

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

  const [activeTab, setActiveTab] = useState('logistics'); // logistics, catering, activities, committees
  const [loading, setLoading] = useState(true);

  // --- Logistics States ---
  const [logisticsList, setLogisticsList] = useState([]);
  const [searchLogistics, setSearchLogistics] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, dispatched, arrived
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    driver_name: '',
    driver_phone: '',
    vehicle_details: '',
    status: 'pending'
  });
  const [isSavingDispatch, setIsSavingDispatch] = useState(false);

  // --- Catering States ---
  const [eventMeals, setEventMeals] = useState([]);
  const [cateringProfiles, setCateringProfiles] = useState([]);
  const [cateringSearch, setCateringSearch] = useState('');
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealForm, setMealForm] = useState({
    title: '',
    description: '',
    date_time: '',
    meal_type: 'breakfast'
  });
  const [isSavingMeal, setIsSavingMeal] = useState(false);

  // --- Activities States ---
  const [activitiesList, setActivitiesList] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    date_time: '',
    duration: '2 hours',
    price: 0,
    currency: 'DZD',
    max_capacity: 50,
    location: '',
    gathering_point: '',
    gathering_point_map_url: ''
  });
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedActivityRegistrations, setSelectedActivityRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedActivityTitle, setSelectedActivityTitle] = useState('');

  // --- Committees States ---
  // --- Committees States ---
  const COMMITTEES = [
    { key: 'reception',      icon: '🎫', nameAr: 'لجنة الاستقبال والتوجيه',  nameEn: 'Reception & Guidance' },
    { key: 'catering_com',  icon: '🍽️', nameAr: 'لجنة الإطعام والضيافة',  nameEn: 'Catering Committee' },
    { key: 'accommodation', icon: '🏨', nameAr: 'لجنة الإيواء والتسكين',  nameEn: 'Accommodation' },
    { key: 'transport',     icon: '🚗', nameAr: 'لجنة النقل والخدمات',  nameEn: 'Transport' },
    { key: 'entertainment', icon: '🎭', nameAr: 'لجنة الأنشطة والترفيه',  nameEn: 'Entertainment' },
  ];

  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [tasksList, setTasksList] = useState([]);
  const [receptionList, setReceptionList] = useState([]);

  // Accommodation specific states
  const [hotelBlocks, setHotelBlocks] = useState([
    { id: 1, hotel_name: 'فندق الأوراسي', room_type: 'VIP Suite', room_number: '101', capacity: 2, occupied: 0, price_per_night: 22000 },
    { id: 2, hotel_name: 'فندق شيراتون الجزائر', room_type: 'Double Standard', room_number: '302', capacity: 2, occupied: 0, price_per_night: 18000 },
    { id: 3, hotel_name: 'فندق صوفيتل الجزائر', room_type: 'Single Standard', room_number: '504', capacity: 1, occupied: 0, price_per_night: 15000 }
  ]);
  const [selectedHotelBlock, setSelectedHotelBlock] = useState(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelForm, setHotelForm] = useState({ hotel_name: '', room_type: '', room_number: '', capacity: 2, price_per_night: 0 });
  const [isSavingHotel, setIsSavingHotel] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [accommodationForm, setAccommodationForm] = useState({ participant_id: '', hotel_name: '', room_number: '', check_in_date: '', check_out_date: '' });
  const [isSavingAccommodation, setIsSavingAccommodation] = useState(false);

  // Transport and activity companion states
  const [showActivityShuttleModal, setShowActivityShuttleModal] = useState(false);
  const [selectedActivityShuttle, setSelectedActivityShuttle] = useState(null);
  const [activityShuttleForm, setActivityShuttleForm] = useState({ driver_name: '', driver_phone: '', vehicle_details: '', status: 'pending' });
  const [isSavingActivityShuttle, setIsSavingActivityShuttle] = useState(false);
  const [allActivityRegistrations, setAllActivityRegistrations] = useState([]);
  const [loadingExtraCommitteeData, setLoadingExtraCommitteeData] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  // Tasks states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', committee: '', assigned_to_id: '', participant_id: '', due_time: '' });
  const [isSavingTask, setIsSavingTask] = useState(false);

  // --- Real-time Updates via WebSocket ---
  useAttendanceSocket(eventId, (data) => {
    console.log("Operations Page WebSocket received:", data);
    if (
      data.type === 'logistics_updated' ||
      data.type === 'logistics_dispatched' ||
      data.type === 'activity_registered' ||
      data.type === 'activity_unregistered' ||
      data.type === 'activity_registration_updated'
    ) {
      fetchData();
      if (data.type === 'logistics_updated') {
        showToast(lang === 'ar' ? 'تم تحديث تفاصيل النقل لمشارك 🚗' : 'Participant logistics updated 🚗');
      } else if (data.type === 'activity_registration_updated' || data.type === 'activity_registered') {
        showToast(lang === 'ar' ? 'تم تحديث طلبات نقل النشاط الترفيهي 🏕️' : 'Excursion shuttle request updated 🏕️');
      }
    }
  });

  // --- Effect Hooks ---
  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'logistics') {
        const data = await interactionService.listEventLogistics(eventId);
        setLogisticsList(data || []);
      } else if (activeTab === 'catering') {
        const [meals, profiles] = await Promise.all([
          interactionService.listEventMeals(eventId),
          interactionService.listEventCateringProfiles(eventId).catch(() => [])
        ]);
        setEventMeals(meals || []);
        setCateringProfiles(profiles || []);
      } else if (activeTab === 'activities') {
        const activities = await interactionService.listActivities(eventId);
        setActivitiesList(activities || []);
      } else if (activeTab === 'committees') {
        setLoadingExtraCommitteeData(true);
        try {
          const [logistics, tasks, parts, activities] = await Promise.all([
            interactionService.listEventLogistics(eventId).catch(() => []),
            interactionService.listTasks(eventId).catch(() => []),
            participantService.getParticipants(eventId, { limit: 1000 }).catch(() => ({ items: [] })),
            interactionService.listActivities(eventId).catch(() => [])
          ]);
          setLogisticsList(logistics || []);
          setTasksList(tasks || []);
          setReceptionList(parts?.items || []);
          setActivitiesList(activities || []);
        } catch (err) {
          console.error("Failed to load committees tab data:", err);
        } finally {
          setLoadingExtraCommitteeData(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch operations data:', err);
      showError(
        lang === 'ar' 
          ? 'عذراً، فشل الاتصال بالسيرفر لجلب البيانات الحقيقية. تم تشغيل الوضع الاحتياطي والبيانات المعروضة حالياً تجريبية فقط.' 
          : 'Server connection failed. Switched to fallback mode (displaying mock data).'
      );
      injectMockData();
    } finally {
      setLoading(false);
    }
  };

  const injectMockData = () => {
    if (activeTab === 'logistics') {
      setLogisticsList([
        {
          id: 1,
          participant_id: 201,
          participant_name: lang === 'ar' ? 'سعادة الدكتور أحمد بن صالح' : 'H.E. Dr. Ahmed Al-Saleh',
          participant_phone: '+966501234567',
          participant_email: 'ahmed@diwan.gov.sa',
          transport_type: 'plane',
          flight_number: 'SV-320',
          arrival_time: new Date(Date.now() + 3600000).toISOString(),
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
          participant_id: 202,
          participant_name: lang === 'ar' ? 'البروفيسور سليم الجزائري' : 'Prof. Slimane El Djazairi',
          participant_phone: '+213550998877',
          participant_email: 'slimane@univ.dz',
          transport_type: 'private_car',
          flight_number: '',
          arrival_time: new Date().toISOString(),
          arrival_location: lang === 'ar' ? 'وصول مباشر - بوابة كبار الشخصيات' : 'Direct Arrival - VIP Gate',
          hotel_name: lang === 'ar' ? 'فندق شيراتون الجزائر' : 'Sheraton Algiers',
          room_number: '120',
          driver_name: lang === 'ar' ? 'رشيد بوعلام' : 'Rachid Boualem',
          driver_phone: '+213661122334',
          vehicle_details: lang === 'ar' ? 'مرسيدس الفئة S - سوداء' : 'Mercedes S-Class - Black',
          status: 'dispatched'
        },
        {
          id: 3,
          participant_id: 203,
          participant_name: lang === 'ar' ? 'المهندسة مريم الإبراهيمي' : 'Eng. Maryam Al-Ibrahimi',
          participant_phone: '+213667889900',
          participant_email: 'maryam@tech.dz',
          transport_type: 'train',
          flight_number: 'TR-45',
          arrival_time: new Date(Date.now() - 7200000).toISOString(),
          arrival_location: lang === 'ar' ? 'محطة قطار الجزائر الوسطى' : 'Algiers Central Train Station',
          hotel_name: lang === 'ar' ? 'فندق صوفيتل الجزائر' : 'Sofitel Algiers',
          room_number: '509',
          driver_name: lang === 'ar' ? 'مراد حمدي' : 'Mourad Hamdi',
          driver_phone: '+213552334455',
          vehicle_details: lang === 'ar' ? 'تويوتا كامري - رمادي' : 'Toyota Camry - Grey',
          status: 'arrived'
        }
      ]);
    } else if (activeTab === 'catering') {
      setEventMeals([
        {
          id: 1,
          title: lang === 'ar' ? 'فطور الصباح الافتتاحي 🥐' : 'Opening Morning Breakfast 🥐',
          description: lang === 'ar' ? 'تشكيلة معجنات فرنسية، قهوة عربية، وعصائر طبيعية' : 'French pastries, Arabic coffee, and organic juices',
          date_time: new Date(Date.now() + 86400000).toISOString(),
          meal_type: 'breakfast',
          attending: true
        },
        {
          id: 2,
          title: lang === 'ar' ? 'غداء العمل الدبلوماسي 🥗' : 'Diplomatic Business Lunch 🥗',
          description: lang === 'ar' ? 'بوفيه مفتوح مع خيارات لحم، دجاج، وحمية نباتية كاملة' : 'Open buffet with meat, chicken, and complete vegan plans',
          date_time: new Date(Date.now() + 108000000).toISOString(),
          meal_type: 'lunch',
          attending: true
        },
        {
          id: 3,
          title: lang === 'ar' ? 'استراحة قهوة وتواصل ☕' : 'Networking Coffee Break ☕',
          description: lang === 'ar' ? 'مشروبات ساخنة وحلويات تقليدية جزائرية' : 'Hot drinks and traditional Algerian sweets',
          date_time: new Date(Date.now() + 120000000).toISOString(),
          meal_type: 'coffee_break',
          attending: true
        }
      ]);
    } else if (activeTab === 'activities') {
      setActivitiesList([
        {
          id: 1,
          title: lang === 'ar' ? 'جولة تاريخية في قصبة الجزائر العتيقة 🕌' : 'Historical Tour in Ancient Casbah 🕌',
          description: lang === 'ar' ? 'رحلة إرشادية في دروب القصبة المصنفة تراثاً عالمياً لليونسكو' : 'Guided walking tour through UNESCO Heritage Casbah alleys',
          date_time: new Date(Date.now() + 172800000).toISOString(),
          location: lang === 'ar' ? 'القصبة العليا والوسطى' : 'Upper and Middle Casbah',
          duration: '3 hours',
          price: 0,
          currency: 'DZD',
          max_capacity: 40,
          registered_count: 28
        },
        {
          id: 2,
          title: lang === 'ar' ? 'عشاء فاخر وإبحار غروب الشمس ⛵' : 'Sunset Cruise & Premium Gala Dinner ⛵',
          description: lang === 'ar' ? 'جولة بحرية في خليج الجزائر تليها مأدبة عشاء تقليدية فاخرة' : 'Bay of Algiers sea cruise followed by a magnificent traditional dinner',
          date_time: new Date(Date.now() + 259200000).toISOString(),
          location: lang === 'ar' ? 'ميناء سيدي فرج السياحي' : 'Sidi Fredj Tourist Port',
          duration: '4 hours',
          price: 3500,
          currency: 'DZD',
          max_capacity: 60,
          registered_count: 42
        }
      ]);
    }
  };

  // --- Dispatch Logistics (Assign Driver) ---
  const handleOpenDispatch = (participant) => {
    setSelectedParticipant(participant);
    setDispatchForm({
      driver_name: participant.driver_name || '',
      driver_phone: participant.driver_phone || '',
      vehicle_details: participant.vehicle_details || '',
      status: participant.status || 'pending'
    });
    setShowDispatchModal(true);
  };

  const handleSaveDispatch = async (e) => {
    e.preventDefault();
    if (!selectedParticipant) return;
    setIsSavingDispatch(true);
    try {
      await interactionService.dispatchLogistics(
        selectedParticipant.participant_id,
        {
          driver_name: dispatchForm.driver_name,
          driver_phone: dispatchForm.driver_phone,
          vehicle_details: dispatchForm.vehicle_details,
          status: dispatchForm.status,
          shuttle_time: new Date().toISOString()
        }
      );
      showSuccess(lang === 'ar' ? 'تم تعيين السائق وتحديث اللوجستيات بنجاح! 🚗' : 'Driver assigned and logistics updated!');
      setShowDispatchModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      // Direct state fallback if offline / mock
      setLogisticsList(prev => prev.map(item => {
        if (item.participant_id === selectedParticipant.participant_id) {
          return {
            ...item,
            driver_name: dispatchForm.driver_name,
            driver_phone: dispatchForm.driver_phone,
            vehicle_details: dispatchForm.vehicle_details,
            status: dispatchForm.status
          };
        }
        return item;
      }));
      showSuccess(lang === 'ar' ? 'تم تحديث بيانات السائق والسيارة بنجاح 🚗' : 'Driver updated successfully 🚗');
      setShowDispatchModal(false);
    } finally {
      setIsSavingDispatch(false);
    }
  };

  // --- Create/Edit Meal ---
  const handleCreateMeal = async (e) => {
    e.preventDefault();
    if (!mealForm.title.trim()) return;
    if (!mealForm.date_time) {
      showError(lang === 'ar' ? 'يجب اختيار تاريخ ووقت الوجبة' : 'Please select a meal date and time');
      return;
    }
    const parsedDate = new Date(mealForm.date_time);
    if (isNaN(parsedDate.getTime())) {
      showError(lang === 'ar' ? 'تاريخ الوجبة غير صالح' : 'Invalid meal date');
      return;
    }
    setIsSavingMeal(true);
    try {
      if (editingMealId) {
        await interactionService.updateMeal(editingMealId, {
          title: mealForm.title,
          description: mealForm.description,
          date_time: parsedDate.toISOString(),
          meal_type: mealForm.meal_type
        });
        showSuccess(lang === 'ar' ? 'تم تحديث الوجبة بنجاح! 🍽️' : 'Meal updated successfully! 🍽️');
      } else {
        await interactionService.createMeal({
          event_id: eventId,
          title: mealForm.title,
          description: mealForm.description,
          date_time: parsedDate.toISOString(),
          meal_type: mealForm.meal_type
        });
        showSuccess(lang === 'ar' ? 'تمت إضافة الوجبة المبرمجة بنجاح! 🍽️' : 'Programmed meal added successfully! 🍽️');
      }
      setShowMealModal(false);
      setEditingMealId(null);
      setMealForm({ title: '', description: '', date_time: '', meal_type: 'breakfast' });
      fetchData();
    } catch (err) {
      console.error('Save meal failed:', err);
      showError(lang === 'ar'
        ? `فشل حفظ الوجبة: ${err?.response?.data?.detail || err.message || 'خطأ غير معروف'}`
        : `Failed to save meal: ${err?.response?.data?.detail || err.message || 'Unknown error'}`);
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId) => {
    const confirmResult = await showConfirm(
      lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?',
      lang === 'ar' ? 'سيتم حذف هذه الوجبة نهائياً!' : 'This meal will be permanently deleted!',
      lang === 'ar' ? 'نعم، احذف' : 'Yes, delete'
    );
    if (confirmResult.isConfirmed) {
      try {
        await interactionService.deleteMeal(mealId);
        showSuccess(lang === 'ar' ? 'تم حذف الوجبة بنجاح!' : 'Meal deleted successfully!');
        fetchData();
      } catch (err) {
        console.error('Delete meal failed:', err);
        showError(lang === 'ar' ? 'حدث خطأ أثناء حذف الوجبة' : 'An error occurred while deleting the meal');
      }
    }
  };

  // --- Create/Edit Activity ---
  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;
    if (!activityForm.date_time) {
      showError(lang === 'ar' ? 'يجب اختيار تاريخ ووقت النشاط' : 'Please select an activity date and time');
      return;
    }
    const parsedDate = new Date(activityForm.date_time);
    if (isNaN(parsedDate.getTime())) {
      showError(lang === 'ar' ? 'تاريخ النشاط غير صالح' : 'Invalid activity date');
      return;
    }
    setIsSavingActivity(true);
    try {
      const payload = {
        title: activityForm.title,
        description: activityForm.description,
        date_time: parsedDate.toISOString(),
        duration: activityForm.duration,
        price: parseFloat(activityForm.price) || 0.0,
        currency: activityForm.currency,
        max_capacity: parseInt(activityForm.max_capacity) || 50,
        location: activityForm.location,
        gathering_point: activityForm.gathering_point || '',
        gathering_point_map_url: activityForm.gathering_point_map_url || ''
      };

      if (editingActivityId) {
        await interactionService.updateActivity(editingActivityId, payload);
        showSuccess(lang === 'ar' ? 'تم تحديث النشاط الترفيهي بنجاح! 🏕️' : 'Activity updated successfully! 🏕️');
      } else {
        await interactionService.createActivity({
          event_id: eventId,
          ...payload
        });
        showSuccess(lang === 'ar' ? 'تمت برمجة النشاط الترفيهي بنجاح! 🏕️' : 'Excursion activity programmed successfully! 🏕️');
      }
      setShowActivityModal(false);
      setEditingActivityId(null);
      setActivityForm({
        title: '', description: '', date_time: '', duration: '2 hours',
        price: 0, currency: 'DZD', max_capacity: 50, location: '',
        gathering_point: '', gathering_point_map_url: ''
      });
      fetchData();
    } catch (err) {
      console.error('Save activity failed:', err);
      showError(lang === 'ar'
        ? `فشل حفظ النشاط: ${err?.response?.data?.detail || err.message || 'خطأ غير معروف'}`
        : `Failed to save activity: ${err?.response?.data?.detail || err.message || 'Unknown error'}`);
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    const confirmResult = await showConfirm(
      lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?',
      lang === 'ar' ? 'سيتم حذف هذا النشاط نهائياً!' : 'This activity will be permanently deleted!',
      lang === 'ar' ? 'نعم، احذف' : 'Yes, delete'
    );
    if (confirmResult.isConfirmed) {
      try {
        await interactionService.deleteActivity(activityId);
        showSuccess(lang === 'ar' ? 'تم حذف النشاط بنجاح!' : 'Activity deleted successfully!');
        fetchData();
      } catch (err) {
        console.error('Delete activity failed:', err);
        showError(lang === 'ar' ? 'حدث خطأ أثناء حذف النشاط' : 'An error occurred while deleting the activity');
      }
    }
  };

  const handleViewRegistrations = async (activity) => {
    setSelectedActivityTitle(activity.title);
    setShowRegistrationsModal(true);
    setLoadingRegistrations(true);
    try {
      const data = await interactionService.getActivityRegistrations(activity.id);
      setSelectedActivityRegistrations(data || []);
    } catch (err) {
      console.error('Failed to load activity registrations:', err);
      showError(lang === 'ar' ? 'فشل تحميل قائمة المسجلين' : 'Failed to load registrations');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // --- Committee Tasks Actions ---
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;
    
    let assignedName = '';
    if (newTaskForm.assigned_to_id) {
      const helper = receptionList.find(p => p.id === parseInt(newTaskForm.assigned_to_id));
      if (helper) assignedName = helper.full_name;
    }
    
    setIsSavingTask(true);
    try {
      await interactionService.createTask({
        event_id: eventId,
        committee: selectedCommittee?.key || newTaskForm.committee,
        title: newTaskForm.title,
        description: newTaskForm.description,
        participant_id: newTaskForm.participant_id ? parseInt(newTaskForm.participant_id) : null,
        assigned_to_id: newTaskForm.assigned_to_id ? parseInt(newTaskForm.assigned_to_id) : null,
        assigned_to_name: assignedName || null,
        due_time: newTaskForm.due_time || null
      });
      showSuccess(lang === 'ar' ? 'تم إسناد المهمة بنجاح! 📋' : 'Task delegated successfully! 📋');
      setShowTaskModal(false);
      setNewTaskForm({
        title: '',
        description: '',
        committee: '',
        assigned_to_id: '',
        participant_id: '',
        due_time: ''
      });
      // reload tasks list
      const tasks = await interactionService.listTasks(eventId).catch(() => []);
      setTasksList(tasks || []);
    } catch (err) {
      console.error('Failed to delegate task:', err);
      showError(lang === 'ar' ? 'فشل إسناد المهمة' : 'Failed to delegate task');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = await showConfirm(
      lang === 'ar' ? 'حذف المهمة' : 'Delete Task',
      lang === 'ar' ? 'هل أنت متأكد من حذف هذه المهمة نهائياً؟' : 'Are you sure you want to delete this task?'
    );
    if (!confirmed) return;
    
    try {
      await interactionService.deleteTask(taskId);
      showSuccess(lang === 'ar' ? 'تم حذف المهمة بنجاح' : 'Task deleted successfully');
      const tasks = await interactionService.listTasks(eventId).catch(() => []);
      setTasksList(tasks || []);
    } catch (err) {
      console.error('Failed to delete task:', err);
      showError(lang === 'ar' ? 'فشل حذف المهمة' : 'Failed to delete task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await interactionService.updateTaskStatus(taskId, newStatus);
      showToast(lang === 'ar' ? 'تم تحديث حالة المهمة بنجاح' : 'Task status updated successfully', 'success');
      const tasks = await interactionService.listTasks(eventId).catch(() => []);
      setTasksList(tasks || []);
    } catch (err) {
      console.error('Failed to update task status:', err);
      showError(lang === 'ar' ? 'فشل تحديث حالة المهمة' : 'Failed to update task status');
    }
  };

  // --- Accommodation Booking Actions ---
  const handleSaveAccommodation = async (e) => {
    e.preventDefault();
    if (!accommodationForm.participant_id) return;
    setIsSavingAccommodation(true);
    try {
      await interactionService.dispatchLogistics(
        parseInt(accommodationForm.participant_id),
        {
          hotel_name: accommodationForm.hotel_name,
          room_number: accommodationForm.room_number,
          check_in_date: accommodationForm.check_in_date,
          check_out_date: accommodationForm.check_out_date
        }
      );
      showSuccess(lang === 'ar' ? 'تم حفظ وتسكين الضيف بنجاح! 🏨' : 'Guest lodging assigned successfully! 🏨');
      setShowAccommodationModal(false);
      setAccommodationForm({ participant_id: '', hotel_name: '', room_number: '', check_in_date: '', check_out_date: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to assign accommodation:', err);
      // Fallback
      setLogisticsList(prev => prev.map(item => {
        if (item.participant_id === parseInt(accommodationForm.participant_id)) {
          return {
            ...item,
            hotel_name: accommodationForm.hotel_name,
            room_number: accommodationForm.room_number,
            check_in_date: accommodationForm.check_in_date,
            check_out_date: accommodationForm.check_out_date
          };
        }
        return item;
      }));
      showSuccess(lang === 'ar' ? 'تم حفظ التسكين بنجاح 🏨' : 'Lodging saved successfully 🏨');
      setShowAccommodationModal(false);
    } finally {
      setIsSavingAccommodation(false);
    }
  };

  // --- Filter Logistics ---
  const filteredLogistics = logisticsList.filter(item => {
    const matchesSearch = item.participant_name.toLowerCase().includes(searchLogistics.toLowerCase()) ||
                          item.participant_phone.includes(searchLogistics) ||
                          (item.hotel_name && item.hotel_name.toLowerCase().includes(searchLogistics.toLowerCase()));
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && item.status === filterStatus;
  });

  if (!eventId) {
    return (
      <DashboardLayout activePath="/dashboard/operations">
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[32px] p-10 max-w-3xl mx-auto backdrop-blur-md">
          <Truck className="w-16 h-16 text-brand-secondary/20 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">{lang === 'ar' ? 'لم يتم اختيار فعالية' : 'No Event Selected'}</h3>
          <p className="text-brand-secondary/30 text-sm max-w-md mx-auto">{lang === 'ar' ? 'يرجى اختيار فعالية نشطة لإدارة اللجان واللوجستيات.' : 'Please select an active event to manage operations.'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/dashboard/operations">
      {/* Header Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-amber-500 animate-pulse" />
            {lang === 'ar' ? 'مركز العمليات الميدانية وإدارة اللجان' : 'Field Operations & Staff Hub'}
          </h1>
          <p className="text-brand-secondary/50 font-bold">
            {lang === 'ar' 
              ? 'اللوحة التشغيلية المركزية لإيواء الوفود، الإطعام والضيافة، النقل، وإحصائيات الهدر الغذائي 🌿.' 
              : 'Central operations hub for coordinator dispatches, VIP hotels, transport logistics, and sustainable catering 🌿.'}
          </p>
        </div>

        {/* Action Controls based on Tab */}
        <div className="flex items-center gap-4">
          {activeTab === 'catering' && (
            <Button variant="gold" className="flex items-center gap-2 h-12 px-6 rounded-2xl" onClick={() => {
              setEditingMealId(null);
              setMealForm({ title: '', description: '', date_time: '', meal_type: 'breakfast' });
              setShowMealModal(true);
            }}>
              <Plus className="w-5 h-5" />
              {lang === 'ar' ? 'إضافة وجبة مبرمجة' : 'Add Program Meal'}
            </Button>
          )}
          {activeTab === 'activities' && (
            <Button variant="gold" className="flex items-center gap-2 h-12 px-6 rounded-2xl" onClick={() => {
              setEditingActivityId(null);
              setActivityForm({
                title: '', description: '', date_time: '', duration: '2 hours',
                price: 0, currency: 'DZD', max_capacity: 50, location: '',
                gathering_point: '', gathering_point_map_url: ''
              });
              setShowActivityModal(true);
            }}>
              <Plus className="w-5 h-5" />
              {lang === 'ar' ? 'إضافة نشاط/رحلة ترفيهية' : 'Add Excursion Trip'}
            </Button>
          )}
          <Button variant="outline" className="flex items-center gap-2 h-12 px-4 rounded-2xl border-white/10 text-white/50 hover:text-white hover:border-white/20" onClick={fetchData}>
            <span>🔄</span>
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl mb-10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('logistics')}
          className={cn(
            "px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'logistics' ? "bg-amber-500 text-brand-dark shadow-lg font-black" : "text-white/40 hover:text-white/60"
          )}
        >
          <span>🚗</span>
          {lang === 'ar' ? 'النقل والإيواء' : 'Logistics & Lodging'}
        </button>

        <button
          onClick={() => setActiveTab('catering')}
          className={cn(
            "px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'catering' ? "bg-amber-500 text-brand-dark shadow-lg font-black" : "text-white/40 hover:text-white/60"
          )}
        >
          <span>🍽️</span>
          {lang === 'ar' ? 'الإطعام والضيافة والحد من الهدر' : 'Catering & Zero Waste'}
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={cn(
            "px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'activities' ? "bg-amber-500 text-brand-dark shadow-lg font-black" : "text-white/40 hover:text-white/60"
          )}
        >
          <span>🏕️</span>
          {lang === 'ar' ? 'الأنشطة والرحلات' : 'Activities & Trips'}
        </button>

        <button
          onClick={() => setActiveTab('committees')}
          className={cn(
            "px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'committees' ? "bg-amber-500 text-brand-dark shadow-lg font-black" : "text-white/40 hover:text-white/60"
          )}
        >
          <span>🏛️</span>
          {lang === 'ar' ? 'إدارة اللجان' : 'Committees'}
        </button>
      </div>

      {/* Loader */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
          <div className="text-white/40 text-sm font-bold animate-pulse">{lang === 'ar' ? 'جاري مزامنة بيانات العمليات...' : 'Syncing operations data...'}</div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* 🚗 SUB-TAB 1: LOGISTICS & LODGING */}
          {activeTab === 'logistics' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-4 justify-between bg-white/[0.03] border border-white/5 p-6 rounded-[28px] backdrop-blur-3xl">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl w-full md:w-96">
                  <Search className="w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'ابحث باسم المشارك أو الفندق...' : 'Search participant name or hotel...'}
                    value={searchLogistics}
                    onChange={(e) => setSearchLogistics(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-white/20 text-white font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-white/30" />
                  <span className="text-xs font-bold text-white/40">{lang === 'ar' ? 'تصفية الحالة:' : 'Filter Status:'}</span>
                  <div className="flex gap-2">
                    {['all', 'pending', 'dispatched', 'arrived'].map(st => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black transition-all border",
                          filterStatus === st 
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white/60"
                        )}
                      >
                        {st === 'all' ? (lang === 'ar' ? 'الكل' : 'All') :
                         st === 'pending' ? (lang === 'ar' ? 'معلق ⏳' : 'Pending ⏳') :
                         st === 'dispatched' ? (lang === 'ar' ? 'تم الإرسال 🚗' : 'Dispatched 🚗') :
                         (lang === 'ar' ? 'وصل 🟢' : 'Arrived 🟢')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid or Table of logistics */}
              <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">{lang === 'ar' ? 'المشارك والوفد' : 'Participant Details'}</th>
                        <th className="px-6 py-4">{lang === 'ar' ? 'تفاصيل السفر والوصول' : 'Arrival / Flight details'}</th>
                        <th className="px-6 py-4">{lang === 'ar' ? 'مكان الإيواء وتوزيع الفندق' : 'Lodging / Hotel'}</th>
                        <th className="px-6 py-4">{lang === 'ar' ? 'تنسيق النقل والمرافق' : 'Assigned Coordinator'}</th>
                        <th className="px-6 py-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-bold text-white">
                      {filteredLogistics.map(item => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-5">
                            <div className="text-sm font-black">{item.participant_name}</div>
                            <div className="text-[10px] text-white/40 mt-1">{item.participant_email} · {item.participant_phone}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span>
                                {item.transport_type === 'plane' ? '✈️' :
                                 item.transport_type === 'train' ? '🚄' : '🚗'}
                              </span>
                              <span className="text-xs uppercase font-black">{item.flight_number || (lang === 'ar' ? 'سيارة خاصة' : 'Private')}</span>
                            </div>
                            <div className="text-[10px] text-[#D4AF37] mt-1">
                              ⏰ {item.arrival_time ? formatDateTime(item.arrival_time) : '---'}
                            </div>
                            <div className="text-[10px] text-white/40 mt-0.5">{item.arrival_location}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-xs font-black">{item.hotel_name || (lang === 'ar' ? 'لم يعين' : 'Not assigned')}</div>
                            {item.room_number && (
                              <div className="text-[10px] text-emerald-400 mt-1">🔑 {lang === 'ar' ? 'غرفة رقم' : 'Room'} {item.room_number}</div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {item.driver_name ? (
                              <div>
                                <div className="text-xs text-amber-500 font-black">🚗 {item.driver_name}</div>
                                <div className="text-[10px] text-white/30 mt-0.5">{item.driver_phone}</div>
                                <div className="text-[9px] text-white/20 mt-0.5">{item.vehicle_details}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-red-500/60 font-black">{lang === 'ar' ? '⏳ لم يعين سائق' : '⏳ No driver'}</span>
                            )}
                            <div className="mt-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black border",
                                item.status === 'arrived' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                item.status === 'dispatched' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              )}>
                                {item.status === 'arrived' ? (lang === 'ar' ? 'وصل 🟢' : 'Arrived 🟢') :
                                 item.status === 'dispatched' ? (lang === 'ar' ? 'تم الإرسال 🚗' : 'Dispatched 🚗') :
                                 (lang === 'ar' ? 'بانتظار السائق ⏳' : 'Waiting Dispatch ⏳')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button
                              onClick={() => handleOpenDispatch(item)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-brand-dark rounded-xl text-xs font-black transition-all flex items-center gap-1.5 mx-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              {item.driver_name ? (lang === 'ar' ? 'تعديل السائق' : 'Edit Driver') : (lang === 'ar' ? 'تخصيص سائق' : 'Assign Driver')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredLogistics.length === 0 && (
                  <div className="text-center py-20 text-white/30">
                    <span className="text-4xl block mb-2">🚗</span>
                    <p className="font-bold text-sm">{lang === 'ar' ? 'لا توجد سجلات مطابقة لخيارات البحث.' : 'No matching dispatches found.'}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 🍽️ SUB-TAB 2: CATERING & HOSPITALITY */}
          {activeTab === 'catering' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-[30px] p-6 text-right">
                  <span className="text-3xl block mb-2">🍲</span>
                  <h4 className="text-xs font-black text-white/50">{lang === 'ar' ? 'إجمالي وجبات الفعالية' : 'Total Planned Meals'}</h4>
                  <p className="text-3xl font-black text-white mt-1">{eventMeals.length} {lang === 'ar' ? 'وجبات' : 'Meals'}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-[30px] p-6 text-right relative overflow-hidden">
                  <div className="absolute top-0 left-0 bg-emerald-500/20 px-3 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-wider text-emerald-400">
                    {lang === 'ar' ? 'إنقاذ 🍃' : 'Saved 🍃'}
                  </div>
                  <span className="text-3xl block mb-2">🥗</span>
                  <h4 className="text-xs font-black text-white/50">{lang === 'ar' ? 'تقديرات الوجبات الموفرة' : 'Est. Saved Meals (Opt-out)'}</h4>
                  <p className="text-3xl font-black text-emerald-400 mt-1">32 {lang === 'ar' ? 'وجبة' : 'Meals'}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-[30px] p-6 text-right">
                  <span className="text-3xl block mb-2">🥦</span>
                  <h4 className="text-xs font-black text-white/50">{lang === 'ar' ? 'طلبات الحميات الخاصة' : 'Special Dietary Requests'}</h4>
                  <p className="text-3xl font-black text-blue-400 mt-1">14 {lang === 'ar' ? 'وجبات' : 'Meals'}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-[30px] p-6 text-right">
                  <span className="text-3xl block mb-2">🌱</span>
                  <h4 className="text-xs font-black text-white/50">{lang === 'ar' ? 'معدل الحد من الهدر' : 'Reduced Food Waste %'}</h4>
                  <p className="text-3xl font-black text-purple-400 mt-1">35.4%</p>
                </div>
              </div>

              {/* Predictive Kitchen Sheet */}
              <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-8 shadow-xl">
                <h3 className="text-lg font-black text-white mb-6 pb-3 border-b border-white/5 flex items-center gap-2">
                  <span>🍽️</span>
                  {lang === 'ar' ? 'جدول الوجبات المبرمجة والضيافة' : 'Programmed Meals & Culinary Schedule'}
                </h3>

                <div className="space-y-4">
                  {eventMeals.map(meal => {
                    const mealDate = meal.date_time ? new Date(meal.date_time) : null;
                    return (
                      <div key={meal.id} className="p-5 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-start gap-4">
                            <span className="text-3xl">
                              {meal.meal_type === 'breakfast' ? '🥐' :
                               meal.meal_type === 'lunch' ? '🥗' :
                               meal.meal_type === 'dinner' ? '🥩' : '☕'}
                            </span>
                            <div>
                              <h4 className="font-black text-base text-white">{meal.title}</h4>
                              <p className="text-xs text-white/50 mt-1 leading-relaxed">{meal.description}</p>
                              <span className="inline-block text-[10px] text-amber-500 mt-2 font-black">
                                ⏰ {mealDate ? formatDateTime(mealDate) : '---'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black">
                              {lang === 'ar' ? 'تحت الإعداد 🍃' : 'In Prep 🍃'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingMealId(meal.id);
                                const d = new Date(meal.date_time);
                                const tzOffset = d.getTimezoneOffset() * 60000;
                                const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
                                setMealForm({
                                  title: meal.title,
                                  description: meal.description || '',
                                  date_time: localISOTime,
                                  meal_type: meal.meal_type
                                });
                                setShowMealModal(true);
                              }}
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black transition-all"
                              title={lang === 'ar' ? 'تعديل الوجبة' : 'Edit Meal'}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-black transition-all"
                              title={lang === 'ar' ? 'حذف الوجبة' : 'Delete Meal'}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {eventMeals.length === 0 && (
                    <div className="text-center py-20 text-white/30">
                      <span className="text-4xl block mb-2">🍽️</span>
                      <p className="font-bold text-sm">{lang === 'ar' ? 'لم تقم ببرمجة وجبات لهذه الفعالية بعد.' : 'No meals programmed yet.'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* --- Dietary / Catering Profiles Section --- */}
              <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>🥦</span>
                    {lang === 'ar' ? 'سجل الحميات الغذائية الخاصة بالمشاركين' : 'Participants Special Dietary Profiles'}
                  </h3>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                    <Search className="w-4 h-4 text-amber-500/60" />
                    <input
                      type="text"
                      value={cateringSearch}
                      onChange={e => setCateringSearch(e.target.value)}
                      placeholder={lang === 'ar' ? 'ابحث باسم المشارك...' : 'Search by participant...'}
                      className="bg-transparent outline-none text-white text-sm font-bold w-48 placeholder:text-white/20"
                    />
                  </div>
                </div>

                {cateringProfiles.length === 0 ? (
                  <div className="text-center py-16 text-white/30">
                    <span className="text-4xl block mb-2">🥗</span>
                    <p className="font-bold text-sm">{lang === 'ar' ? 'لا يوجد مشاركون سجّلوا حمية خاصة بعد.' : 'No participants have registered dietary preferences yet.'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/30 text-xs font-black border-b border-white/5">
                          <th className="pb-3 text-right">{lang === 'ar' ? 'المشارك' : 'Participant'}</th>
                          <th className="pb-3 text-right">{lang === 'ar' ? 'نوع الحمية' : 'Diet Type'}</th>
                          <th className="pb-3 text-right">{lang === 'ar' ? 'حساسيات' : 'Allergies'}</th>
                          <th className="pb-3 text-right">{lang === 'ar' ? 'ملاحظات إضافية' : 'Notes'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {cateringProfiles
                          .filter(p => !cateringSearch || p.participant_name?.toLowerCase().includes(cateringSearch.toLowerCase()))
                          .map(profile => {
                            const dietLabels = {
                              none: { ar: 'عادية', en: 'Standard', color: 'text-white/40' },
                              vegetarian: { ar: 'نباتية', en: 'Vegetarian', color: 'text-emerald-400' },
                              vegan: { ar: 'نباتية صرفة', en: 'Vegan', color: 'text-emerald-400' },
                              gluten_free: { ar: 'خالية من الغلوتين', en: 'Gluten-Free', color: 'text-amber-400' },
                              diabetic: { ar: 'حمية السكري', en: 'Diabetic', color: 'text-blue-400' },
                              lactose_free: { ar: 'خالية من اللاكتوز', en: 'Lactose-Free', color: 'text-purple-400' },
                              custom: { ar: 'مخصصة', en: 'Custom', color: 'text-rose-400' },
                            };
                            const diet = dietLabels[profile.dietary_type] || dietLabels['none'];
                            return (
                              <tr key={profile.id} className="hover:bg-white/[0.02] transition-all">
                                <td className="py-3 pr-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-xs">
                                      {profile.participant_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                      <p className="font-black text-white text-xs">{profile.participant_name}</p>
                                      <p className="text-white/30 text-[10px]">{profile.participant_phone}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-2">
                                  <span className={`font-black text-xs ${diet.color}`}>
                                    {lang === 'ar' ? diet.ar : diet.en}
                                  </span>
                                </td>
                                <td className="py-3 pr-2 text-white/50 text-xs max-w-[150px] truncate">{profile.allergies || '—'}</td>
                                <td className="py-3 pr-2 text-white/50 text-xs max-w-[200px] truncate">{profile.notes || '—'}</td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 🏕️ SUB-TAB 3: ACTIVITIES & EXCURSIONS */}
          {activeTab === 'activities' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activitiesList.map(activity => {
                  const actDate = activity.date_time ? new Date(activity.date_time) : null;
                  return (
                    <div key={activity.id} className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-6 hover:bg-white/10 transition-all flex flex-col h-full relative overflow-hidden shadow-xl">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-secondary">
                          <Compass className="w-6 h-6 text-amber-500" />
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black border",
                          activity.price === 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        )}>
                          {activity.price === 0 ? (lang === 'ar' ? 'مجاني' : 'Free') : `${activity.price} ${activity.currency}`}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white mb-2 flex-1">{activity.title}</h3>
                      <p className="text-xs text-white/40 mb-6 leading-relaxed line-clamp-2">{activity.description}</p>

                      <div className="space-y-3 mb-6 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                          <MapPin className="w-4 h-4 text-amber-500/60" />
                          <span>{activity.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                          <Clock className="w-4 h-4 text-amber-500/60" />
                          <span>⏰ {actDate ? formatDateTime(actDate) : '---'} ({formatDuration(activity.duration)})</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/40 text-xs font-bold">
                          <Users className="w-4 h-4" />
                          <span>
                            {activity.current_count || 0} / {activity.max_capacity} {lang === 'ar' ? 'مسجل' : 'Registered'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewRegistrations(activity)}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black transition-all"
                            title={lang === 'ar' ? 'عرض المسجلين' : 'View Registrations'}
                          >
                            👥
                          </button>
                          <button
                            onClick={() => {
                              setEditingActivityId(activity.id);
                              const d = new Date(activity.date_time);
                              const tzOffset = d.getTimezoneOffset() * 60000;
                              const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
                              setActivityForm({
                                title: activity.title,
                                description: activity.description || '',
                                date_time: localISOTime,
                                duration: activity.duration || '2 hours',
                                price: activity.price || 0,
                                currency: activity.currency || 'DZD',
                                max_capacity: activity.max_capacity || 50,
                                location: activity.location || '',
                                gathering_point: activity.gathering_point || '',
                                gathering_point_map_url: activity.gathering_point_map_url || ''
                              });
                              setShowActivityModal(true);
                            }}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black transition-all"
                            title={lang === 'ar' ? 'تعديل النشاط' : 'Edit Activity'}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-black transition-all"
                            title={lang === 'ar' ? 'حذف النشاط' : 'Delete Activity'}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activitiesList.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white/5 rounded-[32px] border border-white/10 text-white/30">
                    <span className="text-4xl block mb-2">🏕️</span>
                    <p className="font-bold text-sm">{lang === 'ar' ? 'لا توجد أنشطة ترفيهية مبرمجة حالياً.' : 'No active excursion activities.'}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 🏗️ SUB-TAB 4: COMMITTEES MANAGEMENT */}
          {activeTab === 'committees' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {!selectedCommittee ? (
                <>
                  <p className="text-white/40 text-sm font-bold text-right">
                    {lang === 'ar'
                      ? '💡 اختر لجنة لاستعراض مهامها وإسناد مهام جديدة للمنظمين الميدانيين ومتابعة العمليات.'
                      : '💡 Choose a committee to view its tasks, delegate new tasks to field staff, and monitor operations.'}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {COMMITTEES.map(com => {
                      const comTasks = tasksList.filter(t => t.committee === com.key);
                      const pendingCount = comTasks.filter(t => t.status !== 'completed').length;
                      return (
                        <div 
                          key={com.key} 
                          onClick={() => setSelectedCommittee(com)}
                          className="bg-[#0D1527]/60 border border-white/10 rounded-[35px] p-8 shadow-xl flex flex-col gap-4 hover:border-amber-500/40 hover:bg-[#0D1527]/80 transition-all cursor-pointer group relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-4xl group-hover:scale-110 transition-transform">{com.icon}</span>
                            <div>
                              <h3 className="font-black text-white text-base group-hover:text-amber-500 transition-colors">{lang === 'ar' ? com.nameAr : com.nameEn}</h3>
                              <p className="text-white/30 text-xs font-bold mt-0.5">
                                {lang === 'ar' ? 'لجنة تنظيمية مفعّلة' : 'Active Organizing Committee'}
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-4 space-y-2">
                            {com.key === 'reception' && (
                              <p className="text-white/40 text-xs font-bold leading-relaxed">
                                {lang === 'ar'
                                  ? '• استقبال وتسجيل المشاركين • مسح شارات الدخول • إدارة بوابة الدخول'
                                  : '• Register participants • Badge scanning • Gate entry management'}
                              </p>
                            )}
                            {com.key === 'catering_com' && (
                              <p className="text-white/40 text-xs font-bold leading-relaxed">
                                {lang === 'ar'
                                  ? '• متابعة تسجيل الوجبات • إدارة الحميات الخاصة • التنسيق مع المطبخ'
                                  : '• Meal RSVP tracking • Dietary management • Kitchen coordination'}
                              </p>
                            )}
                            {com.key === 'accommodation' && (
                              <p className="text-white/40 text-xs font-bold leading-relaxed">
                                {lang === 'ar'
                                  ? '• إدارة حجوزات الفنادق • توزيع الغرف • متابعة أماكن إقامة المشاركين'
                                  : '• Hotel booking management • Room allocation • Accommodation tracking'}
                              </p>
                            )}
                            {com.key === 'transport' && (
                              <p className="text-white/40 text-xs font-bold leading-relaxed">
                                {lang === 'ar'
                                  ? '• نقل المشاركين من المطارات • التوصيل عند المغادرة • تنظيم المركبات'
                                  : '• Airport pickups • Departure drop-offs • Vehicle coordination'}
                              </p>
                            )}
                            {com.key === 'entertainment' && (
                              <p className="text-white/40 text-xs font-bold leading-relaxed">
                                {lang === 'ar'
                                  ? '• تسيير البرامج الترفيهية • متابعة المسجلين في الأنشطة • تنظيم الرحلات'
                                  : '• Manage excursion programs • Activity registrations • Trip organization'}
                              </p>
                            )}
                          </div>

                          <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                            <span className="text-xs text-amber-500 font-black flex items-center gap-2 group-hover:text-amber-400">
                              <span>📂</span>
                              {lang === 'ar' ? `استعراض المهام (${comTasks.length})` : `View Tasks (${comTasks.length})`}
                            </span>
                            {pendingCount > 0 && (
                              <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-500/30">
                                {lang === 'ar' ? `${pendingCount} معلقة` : `${pendingCount} pending`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  {/* Committee Detail Header */}
                  <div className="bg-[#0D1527]/60 border border-white/10 rounded-[35px] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{selectedCommittee.icon}</span>
                      <div>
                        <h2 className="text-2xl font-black text-white">{lang === 'ar' ? selectedCommittee.nameAr : selectedCommittee.nameEn}</h2>
                        <button 
                          onClick={() => setSelectedCommittee(null)}
                          className="text-amber-500/70 hover:text-amber-500 font-bold text-xs flex items-center gap-1 mt-1 transition-all"
                        >
                          <span>{lang === 'ar' ? '← العودة لجميع اللجان' : '← Back to Committees'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button 
                        variant="gold" 
                        className="flex items-center gap-2 h-12 px-6 rounded-2xl"
                        onClick={() => {
                          setNewTaskForm({
                            title: '',
                            description: '',
                            committee: selectedCommittee.key,
                            assigned_to_id: '',
                            participant_id: '',
                            due_time: ''
                          });
                          setShowTaskModal(true);
                        }}
                      >
                        <Plus className="w-5 h-5" />
                        {lang === 'ar' ? 'إسناد مهمة جديدة للجنة' : 'Assign Committee Task'}
                      </Button>

                      {selectedCommittee.key === 'accommodation' && (
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 h-12 px-5 rounded-2xl border-white/10 text-white/70 hover:text-white"
                          onClick={() => {
                            setAccommodationForm({ participant_id: '', hotel_name: '', room_number: '', check_in_date: '', check_out_date: '' });
                            setShowAccommodationModal(true);
                          }}
                        >
                          <span>🏨</span>
                          {lang === 'ar' ? 'تسكين ضيف' : 'Assign Lodging'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                      <h3 className="font-black text-white text-base">{lang === 'ar' ? 'سجل مهام اللجنة الميدانية' : 'Field Tasks Log'}</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full ltr:text-left rtl:text-right">
                        <thead>
                          <tr className="bg-white/5 text-brand-secondary/50 text-xs uppercase tracking-widest border-b border-white/5">
                            <th className="px-8 py-4 font-bold">{lang === 'ar' ? 'المهمة' : 'Task'}</th>
                            <th className="px-8 py-4 font-bold">{lang === 'ar' ? 'المنظم المسؤول' : 'Assigned Staff'}</th>
                            <th className="px-8 py-4 font-bold">{lang === 'ar' ? 'المشارك المرتبط' : 'Guest'}</th>
                            <th className="px-8 py-4 font-bold">{lang === 'ar' ? 'الموعد' : 'Due Time'}</th>
                            <th className="px-8 py-4 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                            <th className="px-8 py-4 font-bold text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {tasksList.filter(t => t.committee === selectedCommittee.key).length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-20 text-white/30 font-bold">
                                📋 {lang === 'ar' ? 'لا توجد مهام مسندة لهذه اللجنة حالياً. اضغط على "إسناد مهمة جديدة" لبدء التشغيل.' : 'No tasks delegated to this committee yet.'}
                              </td>
                            </tr>
                          ) : (
                            tasksList
                              .filter(t => t.committee === selectedCommittee.key)
                              .map(task => (
                                <tr key={task.id} className="hover:bg-white/5 transition-colors">
                                  <td className="px-8 py-5">
                                    <div className="text-white font-bold text-sm">{task.title}</div>
                                    {task.description && <div className="text-brand-secondary/40 text-xs mt-0.5">{task.description}</div>}
                                  </td>
                                  <td className="px-8 py-5">
                                    <div className="text-brand-secondary/80 text-sm flex items-center gap-2">
                                      <span>👤</span>
                                      {task.assigned_to_name || (lang === 'ar' ? 'غير معين' : 'Unassigned')}
                                    </div>
                                  </td>
                                  <td className="px-8 py-5">
                                    {task.participant_id ? (
                                      <span className="bg-brand-primary/10 text-brand-secondary px-2.5 py-1 rounded-lg text-xs font-bold border border-brand-primary/20">
                                        {receptionList.find(p => p.id === task.participant_id)?.full_name || `#${task.participant_id}`}
                                      </span>
                                    ) : (
                                      <span className="text-white/20 text-xs">---</span>
                                    )}
                                  </td>
                                  <td className="px-8 py-5 text-xs text-brand-secondary/50 font-bold">
                                    {task.due_time ? formatDateTime(task.due_time, { dateStyle: 'short', timeStyle: 'short' }) : '---'}
                                  </td>
                                  <td className="px-8 py-5">
                                    <select
                                      value={task.status || 'pending'}
                                      onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                      className={cn(
                                        "bg-[#050B18] border rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer",
                                        task.status === 'completed' 
                                          ? "border-emerald-500/20 text-emerald-400" 
                                          : "border-amber-500/20 text-amber-400"
                                      )}
                                    >
                                      <option value="pending">{lang === 'ar' ? '⏳ قيد الانتظار' : 'Pending'}</option>
                                      <option value="completed">{lang === 'ar' ? '✅ مكتملة' : 'Completed'}</option>
                                    </select>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                    <button 
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="text-red-400 hover:text-red-500 transition-colors p-1"
                                      title={lang === 'ar' ? 'حذف المهمة' : 'Delete Task'}
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {!selectedCommittee && (
                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 rounded-[35px] p-8">
                  <h3 className="text-base font-black text-white mb-6 flex items-center gap-2">
                    <span>📊</span>
                    {lang === 'ar' ? 'كيفية إسناد المهام للجان' : 'How to Delegate Tasks to Committees'}
                  </h3>
                  <ol className="space-y-3 text-sm text-white/50 font-bold list-none">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
                      <span>{lang === 'ar' ? 'اضغط على أي لجنة لاستعراض سجل المهام الخاص بها حالياً.' : 'Click on any committee card to view its current task log.'}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
                      <span>{lang === 'ar' ? 'يمكنك إسناد مهام فورية للمنظمين المسؤولين وربطها بضيف محدد وتحديد موعد إنجاز.' : 'You can assign immediate tasks to responsible staff, link them to a specific guest, and set a due date.'}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
                      <span>{lang === 'ar' ? 'يستطيع المنظمون الميدانيون الاطلاع على مهامهم عبر تطبيق الهاتف وتحديث حالتها فور إنجازها.' : 'Field staff can view their tasks via the mobile app and update their status upon completion.'}</span>
                    </li>
                  </ol>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* --- MODALS SECTION --- */}

      {/* Excursion Activity Shuttle Assignment Modal */}
      {showActivityShuttleModal && selectedActivityShuttle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#050B18] border border-white/10 rounded-[35px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-bold text-right text-white"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <h3 className="text-base font-black text-white">
                {lang === 'ar' ? 'تخصيص مرافق وتحديث نقل النشاط الترفيهي' : 'Assign Excursion Companion & Shuttle'}
              </h3>
              <button 
                onClick={() => setShowActivityShuttleModal(false)}
                className="text-white/40 hover:text-white transition-all text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActivityShuttle} className="p-6 space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs space-y-2">
                <div>
                  <span className="text-white/40">{lang === 'ar' ? 'الضيف:' : 'Guest:'}</span>{' '}
                  <span className="text-white font-black">{selectedActivityShuttle.full_name}</span>
                </div>
                <div>
                  <span className="text-white/40">{lang === 'ar' ? 'النشاط الترفيهي:' : 'Excursion Activity:'}</span>{' '}
                  <span className="text-amber-500 font-black">{selectedActivityShuttle.activity_title}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'اسم المرافق / المنسق' : 'Companion / Coordinator Name'}</label>
                <select
                  value={activityShuttleForm.driver_name}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const cleanName = selectedName.split(' (')[0];
                    const selectedOrg = receptionList.find(p => p.full_name === cleanName);
                    setActivityShuttleForm(prev => ({
                      ...prev,
                      driver_name: cleanName,
                      driver_phone: selectedOrg ? (selectedOrg.phone || selectedOrg.phone_number || '') : prev.driver_phone
                    }));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                >
                  <option className="bg-[#050B18]" value="">{lang === 'ar' ? '-- اختر مرافقاً من المنظمين --' : '-- Choose companion from staff --'}</option>
                  {receptionList
                    .filter(p => {
                      const role = (p.role || '').toLowerCase();
                      return role.includes('organizer') || role.includes('helper') || role.includes('منظم') || role.includes('مساعد') || role.includes('رئيس');
                    })
                    .map(org => (
                      <option key={org.id} className="bg-[#050B18]" value={org.full_name}>
                        {org.full_name} {org.role ? `(${org.role})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'رقم هاتف المرافق' : 'Companion Phone Number'}</label>
                <Input
                  className="h-12 rounded-2xl font-bold"
                  type="text"
                  placeholder="+213..."
                  value={activityShuttleForm.driver_phone}
                  onChange={(e) => setActivityShuttleForm(prev => ({ ...prev, driver_phone: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'تفاصيل المركبة / التوصيل' : 'Vehicle details / Route details'}</label>
                <Input
                  className="h-12 rounded-2xl font-bold"
                  type="text"
                  placeholder={lang === 'ar' ? 'نوع السيارة ولوحتها أو تفاصيل الحافلة' : 'Vehicle type, plate number or bus details'}
                  value={activityShuttleForm.vehicle_details}
                  onChange={(e) => setActivityShuttleForm(prev => ({ ...prev, vehicle_details: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'حالة النقل' : 'Shuttle Status'}</label>
                <select
                  value={activityShuttleForm.status}
                  onChange={(e) => setActivityShuttleForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                >
                  <option className="bg-[#050B18]" value="pending">{lang === 'ar' ? 'قيد الانتظار (Pending)' : 'Pending'}</option>
                  <option className="bg-[#050B18]" value="assigned">{lang === 'ar' ? 'تم تعيين المرافق (Assigned)' : 'Assigned'}</option>
                  <option className="bg-[#050B18]" value="dispatched">{lang === 'ar' ? 'في الطريق (Dispatched)' : 'Dispatched'}</option>
                  <option className="bg-[#050B18]" value="completed">{lang === 'ar' ? 'تم التوصيل بنجاح (Completed)' : 'Completed'}</option>
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 rounded-2xl h-12" variant="gold" type="submit" disabled={isSavingActivityShuttle}>
                  {isSavingActivityShuttle ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ وتحديث النقل' : 'Save & Update Shuttle')}
                </Button>
                <Button className="flex-1 rounded-2xl h-12" variant="outline" type="button" onClick={() => setShowActivityShuttleModal(false)}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Guest Accommodation Assignment Modal */}
      {showAccommodationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#050B18] border border-white/10 rounded-[35px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-bold text-right text-white"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <h3 className="text-base font-black text-white">
                {lang === 'ar' ? '🏨 إيواء وتسكين ضيف' : '🏨 Guest Accommodation Assignment'}
              </h3>
              <button 
                onClick={() => setShowAccommodationModal(false)}
                className="text-white/40 hover:text-white transition-all text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccommodation} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'الضيف المراد تسكينه' : 'Guest to Lodging'}</label>
                <select
                  value={accommodationForm.participant_id}
                  onChange={(e) => setAccommodationForm(prev => ({ ...prev, participant_id: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                  required
                >
                  <option className="bg-[#050B18]" value="">{lang === 'ar' ? '-- اختر الضيف --' : '-- Choose Guest --'}</option>
                  {receptionList
                    .filter(p => {
                      const role = (p.role || '').toLowerCase();
                      return !role.includes('organizer') && !role.includes('helper') && !role.includes('منظم') && !role.includes('مساعد') && !role.includes('رئيس');
                    })
                    .map(guest => (
                      <option key={guest.id} className="bg-[#050B18]" value={guest.id}>
                        {guest.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'فندق الإقامة' : 'Hotel Name'}</label>
                <select
                  value={accommodationForm.hotel_name}
                  onChange={(e) => setAccommodationForm(prev => ({ ...prev, hotel_name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                  required
                >
                  <option className="bg-[#050B18]" value="فندق الأوراسي">فندق الأوراسي (El Aurassi Hotel)</option>
                  <option className="bg-[#050B18]" value="فندق شيراتون الجزائر">فندق شيراتون الجزائر (Sheraton Algiers)</option>
                  <option className="bg-[#050B18]" value="فندق صوفيتل الجزائر">فندق صوفيتل الجزائر (Sofitel Algiers)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'رقم الغرفة المعينة' : 'Assigned Room Number'}</label>
                <Input
                  className="h-12 rounded-2xl font-bold"
                  type="text"
                  placeholder="Example: 104"
                  value={accommodationForm.room_number}
                  onChange={(e) => setAccommodationForm(prev => ({ ...prev, room_number: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'تاريخ الدخول' : 'Check-in Date'}</label>
                  <input
                    type="date"
                    value={accommodationForm.check_in_date}
                    onChange={(e) => setAccommodationForm(prev => ({ ...prev, check_in_date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'تاريخ المغادرة' : 'Check-out Date'}</label>
                  <input
                    type="date"
                    value={accommodationForm.check_out_date}
                    onChange={(e) => setAccommodationForm(prev => ({ ...prev, check_out_date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 rounded-2xl h-12" variant="gold" type="submit" disabled={isSavingAccommodation}>
                  {isSavingAccommodation ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تحديث وحفظ الإقامة' : 'Assign Lodging Room')}
                </Button>
                <Button className="flex-1 rounded-2xl h-12" variant="outline" type="button" onClick={() => setShowAccommodationModal(false)}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Committee Task Delegation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#050B18] border border-white/10 rounded-[35px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-bold text-right text-white"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <h3 className="text-base font-black text-white">
                {lang === 'ar' ? '📋 إسناد مهمة جديدة للجنة' : '📋 Delegate Committee Task'}
              </h3>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="text-white/40 hover:text-white transition-all text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'اختر مهمة مقترحة جاهزة للجنة' : 'Select Suggested Task Preset'}</label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const committeeKey = selectedCommittee?.key || newTaskForm.committee || 'reception';
                      const presets = COMMITTEE_TASK_PRESETS[committeeKey] || [];
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none text-right"
                >
                  <option className="bg-[#050B18]" value="">{lang === 'ar' ? '--- اختر مهمة جاهزة أو اكتب مخصصة أدناه ---' : '--- Choose a preset task or write custom ---'}</option>
                  {((COMMITTEE_TASK_PRESETS[selectedCommittee?.key || newTaskForm.committee || 'reception']) || []).map((preset, idx) => (
                    <option key={idx} className="bg-[#050B18]" value={lang === 'ar' ? preset.titleAr : preset.titleEn}>
                      {lang === 'ar' ? preset.titleAr : preset.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'عنوان المهمة' : 'Task Title'}</label>
                <Input
                  required
                  placeholder={lang === 'ar' ? 'مثال: تفقد وصول الوفد بمطار الجزائر' : 'Example: Check VIP transport arrival'}
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'وصف تفصيلي للمهمة' : 'Task Description'}</label>
                <Input
                  placeholder={lang === 'ar' ? 'التعليمات والتفاصيل...' : 'Instructions...'}
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'إسناد للمنظم / المساعد الميداني' : 'Assign to Staff/Helper'}</label>
                <select
                  value={newTaskForm.assigned_to_id}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, assigned_to_id: parseInt(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                  required
                >
                  <option className="bg-[#050B18]" value="">{lang === 'ar' ? '-- اختر المنظم المسؤول --' : '-- Choose Staff --'}</option>
                  {receptionList
                    .filter(p => {
                      const role = (p.role || '').toLowerCase();
                      const normalize = (str) => {
                        if (!str) return '';
                        return str.replace(/[أإآأ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
                      };
                      const normRole = normalize(role);
                      
                      // General organizers
                      const isGeneral = normRole === 'organizer' || normRole === 'منظم' || normRole.includes('عام') || normRole.includes('general') || normRole.includes('اداري');
                      if (isGeneral) return true;
                      
                      const committeeKey = selectedCommittee?.key || newTaskForm.committee || 'reception';
                      if (committeeKey === 'reception') {
                        return normRole.includes('استقبل') || normRole.includes('تسجيل') || normRole.includes('reception');
                      }
                      if (committeeKey === 'catering') {
                        return normRole.includes('اطعام') || normRole.includes('ضيافه') || normRole.includes('catering') || normRole.includes('food');
                      }
                      if (committeeKey === 'accommodation') {
                        return normRole.includes('ايواء') || normRole.includes('تسكين') || normRole.includes('accommodation') || normRole.includes('hotel') || normRole.includes('lodging');
                      }
                      if (committeeKey === 'logistics') {
                        return normRole.includes('نقل') || normRole.includes('لوجست') || normRole.includes('سائق') || normRole.includes('transport') || normRole.includes('driver') || normRole.includes('logistics');
                      }
                      if (committeeKey === 'entertainment') {
                        return normRole.includes('ترفيه') || normRole.includes('نشاط') || normRole.includes('انشطه') || normRole.includes('excursion') || normRole.includes('activity');
                      }
                      return false;
                    })
                    .map(helper => (
                      <option key={helper.id} className="bg-[#050B18]" value={helper.id}>
                        {helper.full_name} ({helper.role || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'الضيف المرتبط بالخدمة' : 'Related Guest'}</label>
                  <select
                    value={newTaskForm.participant_id}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, participant_id: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                  >
                    <option className="bg-[#050B18]" value="">{lang === 'ar' ? '-- لا يوجد مشارك مرتبط --' : '-- None --'}</option>
                    {receptionList
                      .filter(p => {
                        const role = (p.role || '').toLowerCase();
                        return !role.includes('organizer') && !role.includes('helper') && !role.includes('منظم') && !role.includes('مساعد') && !role.includes('رئيس');
                      })
                      .map(p => (
                        <option key={p.id} className="bg-[#050B18]" value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'الموعد النهائي' : 'Due Time'}</label>
                  <input
                    type="datetime-local"
                    value={newTaskForm.due_time}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, due_time: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 rounded-2xl h-12" variant="gold" type="submit" disabled={isSavingTask}>
                  {isSavingTask ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'إسناد المهمة فوراً' : 'Delegate Task')}
                </Button>
                <Button className="flex-1 rounded-2xl h-12" variant="outline" type="button" onClick={() => setShowTaskModal(false)}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dispatch (Assign Driver) Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40" dir="rtl">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#050B18] border border-white/10 rounded-[40px] p-10 w-full max-w-lg shadow-2xl text-right text-white">
            <h2 className="text-2xl font-black text-white mb-6 pb-2 border-b border-white/5">🚗 {lang === 'ar' ? 'تخصيص مرافق وتفاصيل استقبال الضيف' : 'Dispatch Coordinator & Driver'}</h2>
            <form onSubmit={handleSaveDispatch} className="space-y-5 font-bold text-white">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'اسم المرافق / المنسق الميداني' : 'Assigned Companion Name'}</label>
                <select
                  value={dispatchForm.driver_name}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const cleanName = selectedName.split(' (')[0];
                    const selectedOrg = receptionList.find(p => p.full_name === cleanName);
                    setDispatchForm(prev => ({
                      ...prev,
                      driver_name: cleanName,
                      driver_phone: selectedOrg ? (selectedOrg.phone || selectedOrg.phone_number || '') : prev.driver_phone
                    }));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                  required
                >
                  <option className="bg-[#050B18]" value="">{lang === 'ar' ? '-- اختر مرافقاً من المنظمين --' : '-- Choose companion from staff --'}</option>
                  {receptionList
                    .filter(p => {
                      const role = (p.role || '').toLowerCase();
                      return role.includes('organizer') || role.includes('helper') || role.includes('منظم') || role.includes('مساعد') || role.includes('رئيس');
                    })
                    .map(org => (
                      <option key={org.id} className="bg-[#050B18]" value={org.full_name}>
                        {org.full_name} {org.role ? `(${org.role})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'رقم هاتف المرافق' : 'Companion Phone Number'}</label>
                <Input
                  required
                  placeholder="+213..."
                  value={dispatchForm.driver_phone}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, driver_phone: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'تفاصيل المركبة' : 'Vehicle details'}</label>
                <Input
                  placeholder={lang === 'ar' ? 'مثال: مرسيدس سوداء صنف E' : 'Example: Mercedes black E-Class'}
                  value={dispatchForm.vehicle_details}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, vehicle_details: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'حالة التوصيل والنقل' : 'Logistics Dispatch status'}</label>
                <select
                  value={dispatchForm.status}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                >
                  <option className="bg-[#050B18]" value="pending">{lang === 'ar' ? 'قيد الانتظار (Pending)' : 'Pending'}</option>
                  <option className="bg-[#050B18]" value="dispatched">{lang === 'ar' ? 'تم الانطلاق (Dispatched)' : 'Dispatched'}</option>
                  <option className="bg-[#050B18]" value="arrived">{lang === 'ar' ? 'وصل للوجهة (Arrived)' : 'Arrived'}</option>
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 rounded-2xl h-12" variant="gold" type="submit" disabled={isSavingDispatch}>
                  {isSavingDispatch ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ وتحديث النقل' : 'Dispatch Driver')}
                </Button>
                <Button className="flex-1 rounded-2xl h-12" variant="outline" type="button" onClick={() => setShowDispatchModal(false)}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Programmed Meal Modal */}
      {showMealModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#050B18] border border-white/10 rounded-[40px] p-10 w-full max-w-lg shadow-2xl text-right">
            <h2 className="text-2xl font-black text-white mb-6 pb-2 border-b border-white/5">
              🍽️ {editingMealId ? (lang === 'ar' ? 'تعديل وجبة مبرمجة' : 'Edit Programmed Meal') : (lang === 'ar' ? 'إضافة وجبة مبرمجة للفعالية' : 'Add Programmed Meal')}
            </h2>
            <form onSubmit={handleCreateMeal} className="space-y-5 font-bold text-white">
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'عنوان الوجبة' : 'Meal Title'}</label>
                <Input
                  required
                  placeholder={lang === 'ar' ? 'مثال: وجبة عشاء اليوم الثاني' : 'Example: Dinner Buffet - Day 2'}
                  value={mealForm.title}
                  onChange={(e) => setMealForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'وصف الوجبة وقائمة المأكولات' : 'Meal Description & Menu'}</label>
                <Input
                  placeholder={lang === 'ar' ? 'قائمة الطعام المتاحة للضيوف...' : 'Menu list available...'}
                  value={mealForm.description}
                  onChange={(e) => setMealForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'تاريخ ووقت تقديم الوجبة' : 'Date & Time'}</label>
                <input
                  required
                  type="datetime-local"
                  value={mealForm.date_time}
                  onChange={(e) => setMealForm(prev => ({ ...prev, date_time: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'نوع الوجبة' : 'Meal Type'}</label>
                <select
                  value={mealForm.meal_type}
                  onChange={(e) => setMealForm(prev => ({ ...prev, meal_type: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all appearance-none"
                >
                  <option className="bg-[#050B18]" value="breakfast">{lang === 'ar' ? '🥐 فطور (Breakfast)' : 'Breakfast'}</option>
                  <option className="bg-[#050B18]" value="lunch">{lang === 'ar' ? '🥗 غداء (Lunch)' : 'Lunch'}</option>
                  <option className="bg-[#050B18]" value="dinner">{lang === 'ar' ? '🥩 عشاء (Dinner)' : 'Dinner'}</option>
                  <option className="bg-[#050B18]" value="coffee_break">{lang === 'ar' ? '☕ استراحة قهوة (Coffee Break)' : 'Coffee Break'}</option>
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 rounded-2xl h-12" variant="gold" type="submit" disabled={isSavingMeal}>
                  {isSavingMeal ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (editingMealId ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إضافة الوجبة وجدولتها' : 'Program Meal'))}
                </Button>
                <Button className="flex-1 rounded-2xl h-12" variant="outline" type="button" onClick={() => setShowMealModal(false)}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Excursion Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#050B18] border border-white/10 rounded-[40px] p-10 w-full max-w-lg shadow-2xl text-right">
            <h2 className="text-2xl font-black text-white mb-6 pb-2 border-b border-white/5">
              🏕️ {editingActivityId ? (lang === 'ar' ? 'تعديل رحلة/نشاط ترفيهي' : 'Edit Side Activity') : (lang === 'ar' ? 'جدولة وبرمجة رحلة/نشاط ترفيهي' : 'Program Side Activity')}
            </h2>
            <form onSubmit={handleCreateActivity} className="space-y-4 font-bold text-white">
              <div className="space-y-1">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'عنوان النشاط/الرحلة' : 'Activity Title'}</label>
                <Input
                  required
                  placeholder={lang === 'ar' ? 'مثال: زيارة متحف باردو الوطني' : 'Example: Visit Bardo National Museum'}
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                <Input
                  placeholder={lang === 'ar' ? 'اكتب تفاصيل الرحلة والمعالم...' : 'Details about the tour...'}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'الموقع الجغرافي' : 'Location'}</label>
                  <Input
                    required
                    placeholder={lang === 'ar' ? 'الجزائر العاصمة' : 'Algiers'}
                    value={activityForm.location}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'المدة الزمنية المتوقعة' : 'Duration'}</label>
                  <Input
                    placeholder="3 hours"
                    value={activityForm.duration}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'نقطة التجمع والانطلاق' : 'Gathering Point'}</label>
                  <Input
                    placeholder={lang === 'ar' ? 'مثال: بهو الفندق الرئيسي' : 'e.g. Main Hotel Lobby'}
                    value={activityForm.gathering_point || ''}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, gathering_point: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'رابط خريطة نقطة التجمع' : 'Gathering Point Map Link'}</label>
                  <Input
                    placeholder={lang === 'ar' ? 'رابط خرائط جوجل' : 'Google Maps URL'}
                    value={activityForm.gathering_point_map_url || ''}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, gathering_point_map_url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'السعر (0 للمجاني)' : 'Price (0 if free)'}</label>
                  <Input
                    type="number"
                    value={activityForm.price}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">{lang === 'ar' ? 'الطاقة الاستيعابية للوفد' : 'Max Capacity'}</label>
                  <Input
                    type="number"
                    value={activityForm.max_capacity}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, max_capacity: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/50">{lang === 'ar' ? 'تاريخ ووقت انطلاق الرحلة' : 'Date & Time'}</label>
                <input
                  required
                  type="datetime-local"
                  value={activityForm.date_time}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, date_time: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 rounded-2xl h-12" variant="gold" type="submit" disabled={isSavingActivity}>
                  {isSavingActivity ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (editingActivityId ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'برمجة وإدراج الرحلة' : 'Program Activity'))}
                </Button>
                <Button className="flex-1 rounded-2xl h-12" variant="outline" type="button" onClick={() => setShowActivityModal(false)}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Excursion Registrations Modal */}
      {showRegistrationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0D1527] border border-white/10 rounded-[35px] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>👥</span>
                {lang === 'ar' ? `المسجلون في: ${selectedActivityTitle}` : `Registered in: ${selectedActivityTitle}`}
              </h3>
              <button 
                onClick={() => setShowRegistrationsModal(false)}
                className="text-white/40 hover:text-white transition-all text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingRegistrations ? (
                <div className="flex items-center justify-center py-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : selectedActivityRegistrations.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                  <span className="text-4xl block mb-2">🤷‍♂️</span>
                  <p className="font-bold text-sm">{lang === 'ar' ? 'لا يوجد مسجلون في هذا النشاط حالياً.' : 'No participants registered yet.'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm border-collapse" dir="rtl">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 font-black">
                        <th className="pb-3 text-right">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</th>
                        <th className="pb-3 text-right">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</th>
                        <th className="pb-3 text-right">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                        <th className="pb-3 text-right">{lang === 'ar' ? 'طلب النقل' : 'Shuttle'}</th>
                        <th className="pb-3 text-right">{lang === 'ar' ? 'ملاحظات النقل' : 'Shuttle Notes'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedActivityRegistrations.map((reg) => (
                        <tr key={reg.id} className="text-white hover:bg-white/[0.02] transition-all">
                          <td className="py-3 font-bold">{reg.full_name}</td>
                          <td className="py-3 text-white/60">{reg.organization}</td>
                          <td className="py-3 text-white/60" dir="ltr">{reg.phone_number || '---'}</td>
                          <td className="py-3">
                            {reg.pickup_requested ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                {lang === 'ar' ? 'طلب نقل 🚍' : 'Requested 🚍'}
                              </span>
                            ) : (
                              <span className="text-white/30 text-xs">{lang === 'ar' ? 'لا' : 'No'}</span>
                            )}
                          </td>
                          <td className="py-3 text-white/50 text-xs italic max-w-[200px] truncate" title={reg.pickup_notes}>
                            {reg.pickup_notes || '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.01]">
              <Button className="rounded-2xl h-12 px-6" variant="outline" onClick={() => setShowRegistrationsModal(false)}>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default OperationsPage;
