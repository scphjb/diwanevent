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
  Monitor,
  Printer,
  CheckCircle,
  FileText,
  Star,
  Sun,
  Moon,
  Trash2,
  Clock
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
  const date = new Date(timestamp);
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
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) + ' · ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};

const ParticipantPortal = () => {
  const { eid, token } = useParams();
  const eventId = eid;
  const participantToken = token;
  
  const [activeTab, setActiveTab] = useState('home');
  const [eventSettings, setEventSettings] = useState({});
  const [participant, setParticipant] = useState(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [agenda, setAgenda] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [posts, setPosts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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
      toast('تمت الإزالة من مفضلتك ⭐', { icon: '🗑️' });
    } else {
      setFavorites([...favorites, sessionId]);
      toast('تمت الإضافة إلى مفضلتك ⭐', { icon: '💖' });
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
      fetchInitialData();
    }
  }, [eventId, participantToken]);

  const loadOptionalDataFromCache = () => {
    try {
      const cachedSettings = localStorage.getItem(`diwan_cache_settings_${eventId}`);
      const cachedAgenda = localStorage.getItem(`diwan_cache_agenda_${eventId}`);
      const cachedLeaderboard = localStorage.getItem(`diwan_cache_leaderboard_${eventId}`);
      const cachedDirectory = localStorage.getItem(`diwan_cache_directory_${eventId}`);
      const cachedPosts = localStorage.getItem(`diwan_cache_posts_${eventId}`);
      const cachedPolls = localStorage.getItem(`diwan_cache_polls_${eventId}`);
      const cachedDocs = localStorage.getItem(`diwan_cache_documents_${eventId}`);

      if (cachedSettings) setEventSettings(JSON.parse(cachedSettings));
      if (cachedAgenda) setAgenda(JSON.parse(cachedAgenda));
      if (cachedLeaderboard) setLeaderboard(JSON.parse(cachedLeaderboard));
      if (cachedDirectory) setDirectory(JSON.parse(cachedDirectory));
      if (cachedPosts) setPosts(JSON.parse(cachedPosts));
      if (cachedPolls) setPolls(JSON.parse(cachedPolls));
      if (cachedDocs) setDocuments(JSON.parse(cachedDocs));
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
      } catch (e) {
        console.error('Failed to write participant cache', e);
      }

      if (participantToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${participantToken}`;
      }
      
      setIsOptedIn(pRes.data.custom_values?.is_visible || false);
        
      try {
        const [settings, ag, lead, dirRes, wallPosts, activePolls, eventDocs] = await Promise.all([
          api.get(`events/public/${eventId}`).then(res => res.data),
          agendaService.getSessions(eventId),
          interactionService.getLeaderboard(eventId),
          api.get(`networking/directory?event_id=${eventId}`),
          interactionService.getPosts(eventId),
          interactionService.getActivePolls(eventId),
          interactionService.getDocuments(eventId).catch(() => [])
        ]);
        setEventSettings(settings || {});
        setAgenda(ag || []);
        setLeaderboard(lead || []);
        setDirectory(dirRes.data || []);
        setPosts(wallPosts || []);
        setPolls(activePolls || []);
        setDocuments(eventDocs || []);

        // Cache all successfully loaded event resources
        try {
          localStorage.setItem(`diwan_cache_settings_${eventId}`, JSON.stringify(settings || {}));
          localStorage.setItem(`diwan_cache_agenda_${eventId}`, JSON.stringify(ag || []));
          localStorage.setItem(`diwan_cache_leaderboard_${eventId}`, JSON.stringify(lead || []));
          localStorage.setItem(`diwan_cache_directory_${eventId}`, JSON.stringify(dirRes.data || []));
          localStorage.setItem(`diwan_cache_posts_${eventId}`, JSON.stringify(wallPosts || []));
          localStorage.setItem(`diwan_cache_polls_${eventId}`, JSON.stringify(activePolls || []));
          localStorage.setItem(`diwan_cache_documents_${eventId}`, JSON.stringify(eventDocs || []));
        } catch (e) {
          console.error('Failed to write resource cache', e);
        }
      } catch (e) {
        console.warn('Optional data fetch failed, fallback to cache', e);
        loadOptionalDataFromCache();
      }
    } catch (err) {
      console.error('Failed to fetch participant data, fallback to cache', err);
      loadParticipantFromCache();
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
      toast.success('تم إرسال سؤالك بنجاح ✅');
    } catch (err) { toast.error('فشل إرسال السؤال'); }
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
      const data = {
        ...profileData
      };
      await api.patch('participants/public/profile', data);
      setParticipant({ ...participant, custom_values: { ...participant.custom_values, ...data } });
      setIsEditingProfile(false);
      toast.success('تم تحديث ملفك الشخصي بنجاح ✅');
    } catch (err) {
      toast.error('فشل تحديث الملف الشخصي');
    }
  };

  const handleDownloadVCard = (contact) => {
    const url = `${api.defaults.baseURL}networking/vcard/${contact.qr_code}`;
    window.open(url, '_blank');
  };

  const handleWalletClick = (walletType) => {
    toast('ميزة الإضافة إلى ' + walletType + ' ستُفعَّل قريباً 💳', { icon: '⏳' });
  };

  const tabs = [
    { id: 'home', label: 'أنا', icon: User },
    { id: 'agenda', label: 'الجدول', icon: Calendar },
    { id: 'polls', label: 'الاستطلاعات', icon: BarChart2, show: eventSettings.show_polls !== false },
    { id: 'social', label: 'الحائط', icon: MessageSquare, show: eventSettings.show_social_wall !== false },
    { id: 'networking', label: 'التواصل', icon: NetworkingIcon, show: eventSettings.show_networking !== false },
    { id: 'leaderboard', label: 'المتصدرون', icon: Award, show: eventSettings.show_leaderboard === true }, // مخفية افتراضياً إلا لو فُعلت
    { id: 'cert', label: 'الشهادة', icon: Award },
    { id: 'docs', label: 'المستندات', icon: FileText, show: eventSettings.show_docs !== false },
    { id: 'ai', label: 'الأسئلة', icon: HelpCircle, show: eventSettings.show_qa !== false },
  ].filter(t => t.show !== false);

  if (loading) return (
    <div className="min-h-screen bg-[#050B18] flex items-center justify-center">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
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

  const myLeaderboardEntry = (leaderboard || []).find(entry => entry.id === participant.id);
  const myPoints = myLeaderboardEntry ? myLeaderboardEntry.points : 0;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(participant?.qr_code || '')}`;

  return (
    <div className="min-h-screen bg-[#050B18] text-white selection:bg-amber-500 selection:text-brand-dark flex flex-col font-arabic overflow-x-hidden">
      {/* Offline Glow Warning Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600/90 to-amber-800/90 backdrop-blur-md text-white text-center py-2.5 px-4 text-xs font-black tracking-wide flex items-center justify-center gap-2 border-b border-amber-500/20 z-[60] sticky top-0 animate-fade-in shadow-lg">
          <span className="animate-pulse">⚠️</span>
          <span>{"\u0623\u0646\u062a \u062a\u062a\u0635\u0641\u062d \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u062d\u0627\u0644\u064a\u0627\u064b \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a. \u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062d\u0641\u0638 \u0627\u0644\u0645\u062d\u0644\u064a \u0644\u0644\u0623\u062c\u0646\u062f\u0629 \u0648\u0627\u0644\u0634\u0627\u0631\u0629."}</span>
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
          <div className="text-right">
            <h1 className="font-black text-base tracking-tight leading-none uppercase text-white">
              {eventSettings?.name ? eventSettings.name : 'DIWAN PORTAL'}
            </h1>
            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mt-1">البوابة الرقمية للمشارك</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            {isOnline ? '🟢 متصل' : '🔴 غير متصل'}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-40 relative z-10 overflow-y-auto">
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
                          تعديل الملف
                        </Button>
                        <Button variant="gold" className="rounded-2xl font-bold py-3 text-xs" onClick={() => setActiveTab('networking')}>
                          التواصل المهني
                        </Button>
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

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                     <button onClick={() => handleWalletClick('Apple Wallet')} className="flex-1 h-12 bg-black border border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
                        <Smartphone className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Apple Wallet</span>
                     </button>
                     <button onClick={() => handleWalletClick('Google Wallet')} className="flex-1 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600/40 transition-all">
                        <Monitor className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Google Wallet</span>
                     </button>
                  </div>
               </div>
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
                                      {comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "\u0627\u0644\u0622\u0646"}
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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl relative transition-all min-w-[60px]",
                activeTab === tab.id
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-white/30 hover:text-white/60"
              )}
            >
              <tab.icon className="w-6 h-6" />
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
    </div>
  );
};

export default ParticipantPortal;
