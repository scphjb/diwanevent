import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Users, 
  Trash2,
  User,
  Search, 
  Filter, 
  FileDown, 
  FileUp, 
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Award,
  Send,
  Printer,
  AlertTriangle,
  LayoutDashboard,
  Zap,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import participantService from '../services/participantService';
import api from '../services/api';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../utils/time';
import { useAuth } from '../hooks/useAuth';

import { useEvent } from '../context/EventContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';
import templateService from '../services/templateService';

const PRESET_ROLES = [
  { value: 'VIP', labelAr: 'ضيف شرف / VIP', labelEn: 'VIP Guest' },
  { value: 'organizer', labelAr: 'منظم عام', labelEn: 'General Organizer' },
  { value: 'رئيس لجنة الاستقبال', labelAr: 'رئيس لجنة الاستقبال والتوجيه', labelEn: 'President of Reception & Orientation Committee' },
  { value: 'عضو لجنة الاستقبال', labelAr: 'عضو لجنة الاستقبال والتوجيه', labelEn: 'Member of Reception & Orientation Committee' },
  { value: 'رئيس لجنة الاطعام', labelAr: 'رئيس لجنة الاطعام', labelEn: 'President of Catering Committee' },
  { value: 'عضو لجنة الاطعام', labelAr: 'عضو لجنة الاطعام', labelEn: 'Member of Catering Committee' },
  { value: 'رئيس لجنة الايواء', labelAr: 'رئيس لجنة الايواء', labelEn: 'President of Accommodation Committee' },
  { value: 'عضو لجنة الايواء', labelAr: 'عضو لجنة الايواء', labelEn: 'Member of Accommodation Committee' },
  { value: 'رئيس لجنة النقل', labelAr: 'رئيس لجنة النقل', labelEn: 'President of Transport Committee' },
  { value: 'عضو لجنة النقل', labelAr: 'عضو لجنة النقل', labelEn: 'Member of Transport Committee' },
  { value: 'رئيس لجنة الانشطة', labelAr: 'رئيس لجنة الانشطة والترفيه', labelEn: 'President of Entertainment Committee' },
  { value: 'عضو لجنة الانشطة', labelAr: 'عضو لجنة الانشطة والترفيه', labelEn: 'Member of Entertainment Committee' },
];

const getNormalizedRole = (role) => {
  if (!role || role === 'attendee' || role === 'مشارك') return 'attendee';
  return role;
};

const ParticipantsPage = () => {
  const fileInputRef = useRef(null);
  const { selectedEventId: eventId, searchQuery: search, setSearchQuery: setSearch } = useEvent();
  const { t, i18n } = useTranslation();
  const [participants, setParticipants] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTemplate, setActiveTemplate] = useState(null);

  // Real-time Updates via WebSocket
  useAttendanceSocket(eventId, (data) => {
    if (data.type === 'check_in') {
      setParticipants(prev => prev.map(p => 
        p.id === data.participant.id ? { ...p, payment_status: 'paid', check_in_time: new Date().toISOString() } : p
      ));
    }
  });

  const handleExport = async () => {
    try {
      const response = await api.get(`analytics/${eventId}/export-data`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `participants_event_${eventId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      showToast(t('participants.export_success', 'تم تصدير البيانات بنجاح'));
    } catch (err) {
      showError(t('participants.export_error', 'فشل تصدير البيانات'));
    }
  };

  const handleBulkPrint = async () => {
    if (!activeTemplate) {
      showError(t('participants.no_template', 'لم يتم العثور على قالب شارة لهذه الفعالية'), t('participants.create_template_first', 'يرجى إنشاء وحفظ قالب في المصمم أولاً.'));
      return;
    }
    try {
      showToast(t('participants.printing_started', 'جاري تجهيز الملف...'), 'info');
      const url = await templateService.printAll(activeTemplate.id, eventId);
      window.open(url, '_blank');
    } catch (err) {
      showError(t('participants.print_error', 'فشل إنشاء ملف الشارات المجمع'));
    }
  };

  const handlePrint = async (participantId) => {
    if (!activeTemplate) {
      showError(t('participants.no_template', 'لم يتم العثور على قالب شارة'));
      return;
    }
    try {
      const url = await templateService.printAll(activeTemplate.id, eventId, participantId);
      window.open(url, '_blank');
    } catch (err) {
      showError(t('participants.print_error', 'فشل طباعة الشارة'));
    }
  };

  const handleSendCertificates = async () => {
    const result = await showConfirm(
      t('participants.confirm_send_all', 'هل أنت متأكد من إرسال الشهادات لجميع الحاضرين؟'),
      t('participants.confirm_send_desc', 'سيتم إرسال الشهادات في الخلفية لجميع الأشخاص الذين سجلوا حضورهم.')
    );
    if (!result.isConfirmed) return;
    try {
      await api.post(`certificates/${eventId}/send-all`);
      showSuccess(t('participants.process_started', 'بدأت العملية'), t('participants.process_desc', 'جاري إرسال الشهادات في الخلفية.'));
    } catch (err) {
      showError(t('common.error'));
    }
  };

  const handleBulkActivate = async () => {
    const pendingParticipants = participants.filter(p => p.payment_status !== 'paid');
    if (pendingParticipants.length === 0) {
      showToast(t('participants.no_pending', 'لا يوجد مشاركون معلقون لتفعيلهم.'), 'info');
      return;
    }

    const result = await showConfirm(
      t('participants.confirm_bulk_activate', `تفعيل ${pendingParticipants.length} مشارك`),
      t('participants.bulk_activate_desc', `هل أنت متأكد؟ سيتم خصم ${pendingParticipants.length} اعتماد من رصيدك.`)
    );
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await api.post('participants/bulk-activate', pendingParticipants.map(p => p.id));
      showSuccess(t('participants.bulk_activate_success', 'تم التفعيل بنجاح'), t('participants.bulk_activate_detail', `تم تفعيل ${response.data.activated_count} مشارك. الرصيد المتبقي: ${response.data.remaining_credits}`));
      fetchParticipants();
    } catch (err) {
      showError(t('participants.bulk_activate_error', 'فشل التفعيل الجماعي'), err.response?.data?.detail || t('common.check_credits', 'يرجى التحقق من الرصيد.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSingleActivate = async (id) => {
    const result = await showConfirm(
      t('participants.confirm_activate', 'تفعيل المشارك'),
      t('participants.activate_desc', 'هل أنت متأكد من تفعيل هذا المشارك؟ سيتم خصم اعتماد واحد (1 credit) من رصيدك.')
    );
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await api.post('participants/bulk-activate', [id]);
      showSuccess(t('participants.activate_success', 'تم التفعيل بنجاح'), t('participants.activate_detail', `تم تفعيل المشارك بنجاح. الرصيد المتبقي: ${response.data.remaining_credits}`));
      fetchParticipants();
    } catch (err) {
      showError(t('participants.activate_error', 'فشل التفعيل'), err.response?.data?.detail || t('common.check_credits', 'يرجى التحقق من الرصيد.'));
    } finally {
      setLoading(false);
    }
    setActiveMenu(null);
  };


  const fetchParticipants = async () => {
    if (!eventId) {
      setParticipants([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await participantService.getParticipants(eventId);
      if (data && data.items) {
        setParticipants(data.items);
        setTotalCount(data.total);
      } else {
        setParticipants(Array.isArray(data) ? data : []);
        setTotalCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error('Failed to fetch participants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    
    // جلب القالب النشط للفعالية
    if (eventId) {
      templateService.listTemplates({ event_id: eventId, type: 'badge' })
        .then(list => {
          if (list.length > 0) {
            setActiveTemplate(list[0]);
          } else {
            setActiveTemplate(null);
          }
        });
    }
  }, [eventId]);

  const filteredParticipants = participants.filter(p => {
    const name = (p.full_name || '').toLowerCase();
    const organization = (p.organization || '').toLowerCase();
    const ref = (p.order_num || '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = name.includes(q) || organization.includes(q) || ref.includes(q);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'checked_in' && p.check_in_time) ||
                         (statusFilter === 'paid' && p.payment_status === 'paid' && !p.check_in_time) ||
                         (statusFilter === 'pending' && p.payment_status !== 'paid');
    return matchesSearch && matchesStatus;
  });

  const [activeMenu, setActiveMenu] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mapping, setMapping] = useState({
    full_name: '',
    organization: '',
    department: '',
    role: '',
    email: '',
    phone: '',
    seat_number: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    organization: '',
    department: '',
    role: '',
    email: '',
    phone_number: '',
    seat_info: '',
    seat_number: '',
  });
  const [isCustomRole, setIsCustomRole] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMenuClick = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await participantService.analyzeImport(file);
      setAvailableColumns(result.columns);
      setSelectedFile(file);
      
      // Auto-mapping attempt
      const newMapping = { 
        full_name: '',
        organization: '',
        department: '',
        role: '',
        email: '',
        phone: '',
        seat_number: ''
      };
      const column_map = {
        full_name: ['الاسم الكامل', 'full_name', 'الاسم', 'name', 'nom'],
        organization:   ['الجهة', 'organization', 'المؤسسة', 'organization', 'company', 'organisme'],
        department:['القسم', 'department', 'التخصص', 'الوحدة', 'service', 'unite'],
        role:      ['الصفة', 'role', 'المنصب', 'الدور', 'poste', 'fonction'],
        email:     ['البريد الإلكتروني', 'email', 'البريد', 'e-mail', 'courriel'],
        phone:     ['الهاتف', 'phone', 'رقم الهاتف', 'phone_number', 'tel'],
        seat_number: ['رقم المقعد', 'seat_number', 'المقعد', 'seat', 'chaise', 'place']
      };

      Object.keys(column_map).forEach(key => {
        const found = result.columns.find(col => 
          column_map[key].some(alias => col.toString().toLowerCase().trim() === alias.toLowerCase())
        );
        if (found) newMapping[key] = found;
      });

      setMapping(newMapping);
      setShowMappingModal(true);
    } catch (err) {
      showError(t('participants.import_modal.analyze_error', 'فشل تحليل الملف'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!mapping.full_name || !mapping.organization || !mapping.email || !mapping.phone) {
      showError(
        t('participants.import_modal.fields_required', 'تنبيه'),
        t('participants.import_modal.fields_required_desc', "يجب ربط حقول 'الاسم واللقب'، 'الصفة المهنية'، 'البريد الإلكتروني' و 'رقم الهاتف' للتمكن من الاستيراد.")
      );
      return;
    }

    setIsImporting(true);
    try {
      const result = await participantService.importExcel(eventId, selectedFile, mapping);
      setShowMappingModal(false);
      fetchParticipants();
      
      const errorMsg = result.errors && result.errors.length > 0 
        ? `\n\n⚠️ تم تخطي بعض الأسطر لمشاكل في البيانات:\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? '\n...' : ''}`
        : '';
      
      showSuccess(
        t('participants.import_modal.success', 'تم الاستيراد بنجاح'), 
        `✅ تمت إضافة: ${result.added}\n❌ تخطي/أخطاء: ${result.skipped}${errorMsg}`
      );
    } catch (err) {
      showError(t('participants.import_modal.error', "فشل الاستيراد"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualCheckIn = async (id) => {
    try {
      await participantService.checkIn(id);
      showToast(t('participants.check_in_success', 'تم تسجيل الحضور بنجاح'));
      fetchParticipants();
    } catch (err) {
      showError(t('participants.check_in_error', 'فشل تسجيل الحضور'), (err.response?.data?.detail || err.message));
    }
    setActiveMenu(null);
  };

  const handleUndoCheckIn = async (id) => {
    const result = await showConfirm(
      t('participants.undo_check_in_confirm', 'إلغاء تسجيل الحضور'),
      t('participants.undo_check_in_desc', 'هل أنت متأكد من إلغاء تسجيل الحضور لهذا المشارك؟')
    );
    if (!result.isConfirmed) return;
    try {
      await participantService.undoCheckIn(id);
      showToast(t('participants.undo_check_in_success', 'تم إلغاء تسجيل الحضور'));
      fetchParticipants();
    } catch (err) {
      showError(t('participants.undo_check_in_error', 'فشل إلغاء الحضور'), (err.response?.data?.detail || err.message));
    }
    setActiveMenu(null);
  };

  const handleEditClick = async (p) => {
    setActiveMenu(null);
    try {
      setLoading(true);
      const details = await participantService.getParticipant(p.id);
      setEditingParticipant(p);
      setEditForm({
        full_name: details.full_name || '',
        organization: details.organization || '',
        department: details.department || '',
        role: details.role || '',
        email: details.email || '',
        phone_number: details.phone_number || details.custom_values?.phone_number || '',
        seat_info: details.seat_info || '',
        seat_number: details.seat_number || '',
      });
      // Check if it's custom
      const roleVal = details.role || '';
      const foundPreset = roleVal === '' || roleVal === 'attendee' || roleVal === 'مشارك' || PRESET_ROLES.some(r => r.value === roleVal);
      setIsCustomRole(!foundPreset);
    } catch (err) {
      showError('فشل جلب بيانات المشارك للتعديل');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await participantService.updateParticipant(editingParticipant.id, editForm);
      showToast(t('participants.edit_success', 'تم تعديل بيانات المشارك بنجاح'));
      setEditingParticipant(null);
      fetchParticipants();
    } catch (err) {
      showError(err.response?.data?.detail || 'فشل تعديل بيانات المشارك');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await showConfirm(
      t('participants.delete_confirm', 'حذف المشارك'),
      t('participants.delete_desc', 'هل أنت متأكد من حذف بيانات هذا المشارك نهائياً؟')
    );
    if (!result.isConfirmed) return;
    try {
      await api.delete(`participants/${eventId}/participants/${id}`);
      showToast(t('participants.delete_success', 'تم حذف المشارك بنجاح'));
      fetchParticipants();
    } catch (err) {
      showError(t('participants.delete_error', 'فشل حذف المشارك'));
    }
    setActiveMenu(null);
  };

  const handleDeleteImported = async () => {
    const result = await showConfirm(
      t('participants.delete_imported_confirm', 'حذف القائمة المستوردة'),
      t('participants.delete_imported_desc', 'هل أنت متأكد من حذف كافة المشاركين الذين تم استيرادهم بالإكسيل لهذه الفعالية نهائياً؟ سيتم مسح بياناتهم بالكامل ولا يمكن التراجع عن هذا الإجراء.')
    );
    if (!result.isConfirmed) return;
    try {
      setLoading(true);
      await api.delete(`participants/${eventId}/imported`);
      showToast(t('participants.delete_imported_success', 'تم حذف القائمة المستوردة بنجاح'));
      fetchParticipants();
    } catch (err) {
      showError(err.response?.data?.detail || t('participants.delete_imported_error', 'فشل حذف القائمة المستوردة'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendTicket = async (id) => {
    setActiveMenu(null);
    try {
      showToast(t('participants.resending_email', 'جاري إعادة إرسال التذكرة...'), 'info');
      await api.post(`participants/${id}/resend-email`);
      showSuccess(t('participants.resend_success', 'تم الإرسال بنجاح'), t('participants.resend_success_desc', 'تم إعادة إرسال تذكرة الدخول والرمز السري للمشارك بنجاح.'));
    } catch (err) {
      showError(err.response?.data?.detail || t('participants.resend_error', 'فشل إعادة إرسال البريد الإلكتروني'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout activePath="/dashboard/participants">
        <div className="p-20 text-center text-brand-secondary animate-pulse">
          {t('common.loading', 'جاري تحميل قائمة المشاركين...')}
        </div>
      </DashboardLayout>
    );
  }

  if (!eventId) {
    return (
      <DashboardLayout activePath="/dashboard/participants">
        <div className="p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">{t('participants.no_event_selected', 'لم يتم اختيار فعالية')}</h3>
          <p className="text-brand-secondary/30">{t('participants.select_event_desc', 'يرجى اختيار فعالية من القائمة العلوية للبدء.')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/dashboard/participants">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('participants.title')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('participants.total_registered')}: {totalCount}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-brand-primary/50 text-white bg-brand-primary/20 hover:bg-brand-primary hover:text-white"
            onClick={handleBulkActivate}
          >
            <Zap className="w-4 h-4 text-brand-secondary" />
            {t('common.bulk_activate', 'تفعيل الكل')}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            onClick={handleSendCertificates}
          >
            <Send className="w-4 h-4" />
            {t('common.send_certs')}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-brand-primary/30 text-brand-secondary hover:bg-brand-primary/10"
            onClick={handleBulkPrint}
          >
            <Printer className="w-4 h-4" />
            {t('common.bulk_print', 'طباعة مجمعة')}
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
            <FileDown className="w-4 h-4" />
            {t('common.export')}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleDeleteImported}
          >
            <Trash2 className="w-4 h-4" />
            {t('participants.delete_imported_btn', 'حذف المستوردين')}
          </Button>
          <div className="relative">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
            />
            <Button 
              variant="gold" 
              className="flex items-center gap-2 h-14 px-8"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="w-5 h-5" />
              {t('common.import')}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 mb-8 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 relative">
          <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-secondary/30" />
          <Input 
            placeholder={t('participants.search_placeholder')} 
            className="ltr:pl-12 rtl:pr-12 bg-white/5 border-white/5 h-14"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-brand-dark/50 p-1.5 rounded-2xl border border-white/5">
            {[
              { id: 'all', label: t('common.all', 'الكل') },
              { id: 'checked_in', label: 'حاضر الآن (بالداخل)' },
              { id: 'paid', label: 'مفعل (في انتظار الحضور)' },
              { id: 'pending', label: 'غير مفعل' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-medium transition-all",
                  statusFilter === tab.id 
                    ? "bg-brand-primary text-white shadow-lg" 
                    : "text-brand-secondary/50 hover:text-brand-secondary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <Button variant="outline" className="h-14 w-14 p-0 rounded-2xl">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full ltr:text-left rtl:text-right">
            <thead>
              <tr className="bg-white/5 text-brand-secondary/50 text-xs uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-6 font-bold">{t('common.participants')}</th>
                <th className="px-8 py-6 font-bold">{t('participants.organization', 'الجهة / المؤسسة')}</th>
                <th className="px-8 py-6 font-bold">{t('participants.role', 'الصفة / الدور')}</th>
                <th className="px-8 py-6 font-bold">{t('participants.status')}</th>
                <th className="px-8 py-6 font-bold">{t('participants.time')}</th>
                <th className="px-8 py-6 font-bold text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="6" className="px-8 py-6 bg-white/5 mb-2 rounded-lg" />
                    </tr>
                  ))
                ) : (
                  filteredParticipants.map((p, idx) => (
                    <motion.tr 
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-secondary border border-brand-primary/20 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-all">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-white font-bold flex items-center gap-2">
                              {p.full_name || '—'}
                              {p.is_flagged === true && (
                                <AlertTriangle className="w-4 h-4 text-amber-500" title={t('participants.needs_review', 'بيانات تحتاج مراجعة')} />
                              )}
                            </div>
                            <div className="text-brand-secondary/30 text-xs">{p.order_num}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-brand-secondary/70">{p.organization || '—'}</div>
                        <div className="text-brand-secondary/20 text-xs">
                          {p.department || ''}
                          {p.seat_number && ` | مقعد: ${p.seat_number}`}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <select
                          value={getNormalizedRole(p.role)}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            try {
                              await participantService.updateParticipant(p.id, { role: newRole });
                              setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, role: newRole } : item));
                              showToast(i18n.language.startsWith('ar') ? 'تم تحديث الدور بنجاح' : 'Role updated successfully', 'success');
                            } catch (err) {
                              showError(i18n.language.startsWith('ar') ? 'فشل تحديث الدور' : 'Failed to update role');
                            }
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-brand-secondary outline-none focus:border-brand-primary transition-all cursor-pointer font-bold"
                        >
                          <option value="attendee" className="bg-[#050B18]">{i18n.language.startsWith('ar') ? 'مشارك' : 'Attendee'}</option>
                          <option value="press" className="bg-[#050B18]">{i18n.language.startsWith('ar') ? 'صحافة وإعلام' : 'Press'}</option>
                          <option value="exhibitor" className="bg-[#050B18]">{i18n.language.startsWith('ar') ? 'عارض / جناح' : 'Exhibitor'}</option>
                          {PRESET_ROLES.map(r => (
                            <option key={r.value} value={r.value} className="bg-[#050B18]">
                              {i18n.language.startsWith('ar') ? r.labelAr : r.labelEn}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold",
                          p.check_in_time 
                            ? "bg-brand-primary/10 text-brand-secondary border border-brand-primary/20" 
                            : p.payment_status === 'paid'
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {p.check_in_time ? <Award className="w-3 h-3" /> : p.payment_status === 'paid' ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {p.check_in_time 
                            ? "حاضر الآن (داخل القاعة)" 
                            : p.payment_status === 'paid' 
                              ? "مفعل (في انتظار الحضور)" 
                              : "غير مفعل (لم يخصم رصيد)"
                          }
                        </span>
                      </td>
                      <td className="px-8 py-6 font-mono text-sm text-brand-secondary/50">
                        {formatTime(p.check_in_time)}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handlePrint(p.id)}
                            className="p-2 rounded-xl bg-brand-primary/10 text-brand-secondary hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                            title={t('common.print')}
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => participantService.downloadCertificate(p.id)}
                            className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                            title={t('common.download_cert', 'تحميل الشهادة')}
                          >
                            <Award className="w-5 h-5" />
                          </button>
                          <div className="relative">
                            <button 
                              onClick={(e) => handleMenuClick(e, p.id)}
                              className="p-2 rounded-xl hover:bg-white/10 text-brand-secondary/50 hover:text-white transition-all"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                              {activeMenu === p.id && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.1 }}
                                  onClick={e => e.stopPropagation()}
                                  className="absolute left-0 mt-2 w-48 bg-[#050B18] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                                >
                                  {p.payment_status !== 'paid' ? (
                                    <button 
                                      onClick={() => handleSingleActivate(p.id)}
                                      className="w-full text-right px-4 py-3 text-sm text-emerald-400 font-bold hover:bg-emerald-500/10 flex items-center gap-3 transition-colors"
                                    >
                                      <Zap className="w-4 h-4 text-emerald-400" />
                                      {t('participants.activate', 'تفعيل المشارك')}
                                    </button>
                                  ) : !p.check_in_time ? (
                                    <button 
                                      onClick={() => handleManualCheckIn(p.id)}
                                      className="w-full text-right px-4 py-3 text-sm text-brand-secondary font-bold hover:bg-brand-primary/10 flex items-center gap-3 transition-colors"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      {t('participants.check_in', 'تسجيل الحضور')}
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => handleUndoCheckIn(p.id)}
                                      className="w-full text-right px-4 py-3 text-sm text-amber-400 font-bold hover:bg-amber-500/10 flex items-center gap-3 transition-colors"
                                    >
                                      <Clock className="w-4 h-4" />
                                      {t('participants.undo_check_in', 'إلغاء الحضور')}
                                    </button>
                                  )}
                                  {p.email && (
                                    <button 
                                      onClick={() => handleResendTicket(p.id)}
                                      className="w-full text-right px-4 py-3 text-sm text-amber-500 font-bold hover:bg-amber-500/10 flex items-center gap-3 transition-colors"
                                    >
                                      <Send className="w-4 h-4" />
                                      {t('participants.resend_ticket', 'إعادة إرسال التذكرة')}
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleEditClick(p)}
                                    className="w-full text-right px-4 py-3 text-sm text-brand-secondary font-bold hover:bg-brand-primary/10 flex items-center gap-3 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    {t('participants.edit_participant', 'تعديل البيانات')}
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(p.id)}
                                    className="w-full text-right px-4 py-3 text-sm text-red-400 font-bold hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    {t('participants.delete_participant', 'حذف المشارك')}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
          
          {!loading && filteredParticipants.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-brand-secondary/20" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{t('participants.no_results')}</h3>
              <p className="text-brand-secondary/30">{t('participants.check_filters')}</p>
            </div>
          )}
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between text-sm text-brand-secondary/30 font-medium">
          <div>{t('participants.viewing', { count: filteredParticipants.length, total: totalCount })}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>{t('common.previous', 'السابق')}</Button>
            <Button variant="outline" size="sm" className="border-brand-primary/50 text-brand-secondary">1</Button>
            <Button variant="outline" size="sm">{t('common.next', 'التالي')}</Button>
          </div>
        </div>
      </div>
      {/* Mapping Modal */}
      <AnimatePresence>
        {showMappingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-dark/90 backdrop-blur-xl"
              onClick={() => setShowMappingModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#050B18] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 shrink-0">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <FileUp className="text-amber-500" />
                  {t('participants.import_modal.title', 'ربط حقول الإكسيل')}
                </h2>
                <p className="text-brand-secondary/40 text-sm mt-2">{t('participants.import_modal.subtitle', 'يرجى تحديد العمود المناسب لكل حقل في النظام لضمان دقة الاستيراد.')}</p>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {[
                  { id: 'full_name',  label: 'الاسم واللقب *',         icon: Users },
                  { id: 'organization',    label: 'الصفة المهنية *',         icon: LayoutDashboard },
                  { id: 'email',      label: 'البريد الإلكتروني *',        icon: Send },
                  { id: 'phone',      label: 'رقم الهاتف *',              icon: FileUp },
                  { id: 'department', label: 'الاختصاص (القسم/التخصص)',          icon: MoreVertical },
                  { id: 'role',       label: 'العنوان المهني (الصفة/الدور)',          icon: Award },
                  { id: 'seat_number', label: 'رقم المقعد',             icon: Award }
                ].map(field => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                        <field.icon className="w-5 h-5 text-brand-secondary" />
                      </div>
                      <span className="font-bold text-white">{field.label}</span>
                    </div>
                    <select 
                      className="bg-brand-dark border border-white/10 rounded-xl h-12 px-4 outline-none text-brand-secondary font-medium focus:border-brand-primary transition-all"
                      value={mapping[field.id]}
                      onChange={(e) => setMapping({ ...mapping, [field.id]: e.target.value })}
                    >
                      <option value="">{t('participants.import_modal.select_col', '-- اختر العمود --')}</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="p-8 border-t border-white/5 bg-black/20 flex gap-4 shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl"
                  onClick={() => setShowMappingModal(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="gold" 
                  className="flex-[2] h-14 rounded-2xl text-lg"
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                >
                  {isImporting ? t('participants.import_modal.executing', 'جاري الاستيراد...') : t('participants.import_modal.execute', 'تأكيد الاستيراد المجمع')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Participant Modal */}
      <AnimatePresence>
        {editingParticipant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-dark/90 backdrop-blur-xl"
              onClick={() => setEditingParticipant(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#050B18] border border-white/10 w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 shrink-0">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <Edit className="text-brand-secondary w-6 h-6" />
                  {t('participants.edit_modal_title', 'تعديل بيانات المشارك')}
                </h2>
                <p className="text-brand-secondary/40 text-sm mt-2">{t('participants.edit_modal_desc', 'قم بتحديث بيانات المشارك وتعديل معلوماته المسجلة في النظام.')}</p>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-secondary">{t('participants.name', 'الاسم الكامل *')}</label>
                    <Input 
                      required
                      placeholder="الاسم الكامل للمشارك"
                      className="bg-white/5 border-white/10 h-12"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.organization_label', 'الجهة / المؤسسة')}</label>
                      <Input 
                        placeholder="الجهة أو الكيان التابع له"
                        className="bg-white/5 border-white/10 h-12"
                        value={editForm.organization}
                        onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.department_label', 'القسم / التخصص')}</label>
                      <Input 
                        placeholder="القسم أو التخصص الوظيفي"
                        className="bg-white/5 border-white/10 h-12"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.role_label', 'الصفة / الدور')}</label>
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 outline-none text-brand-secondary font-medium focus:border-brand-primary transition-all"
                        value={isCustomRole ? 'custom' : getNormalizedRole(editForm.role)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setIsCustomRole(true);
                            setEditForm({ ...editForm, role: '' });
                          } else {
                            setIsCustomRole(false);
                            setEditForm({ ...editForm, role: val });
                          }
                        }}
                      >
                        <option value="attendee" className="bg-[#050B18]">{i18n.language.startsWith('ar') ? 'مشارك' : 'Attendee'}</option>
                        {PRESET_ROLES.map(r => (
                          <option key={r.value} value={r.value} className="bg-[#050B18]">
                            {i18n.language.startsWith('ar') ? r.labelAr : r.labelEn}
                          </option>
                        ))}
                        <option value="custom" className="bg-[#050B18]">{i18n.language.startsWith('ar') ? 'دور مخصص...' : 'Custom Role...'}</option>
                      </select>
                      
                      {isCustomRole && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2"
                        >
                          <Input 
                            placeholder={i18n.language.startsWith('ar') ? "أدخل الصفة المخصصة هنا..." : "Enter custom role here..."}
                            className="bg-white/5 border-white/10 h-12"
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          />
                        </motion.div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.seat_info_label', 'معلومات الجلوس')}</label>
                      <Input 
                        placeholder="رقم القاعة أو الكرسي"
                        className="bg-white/5 border-white/10 h-12"
                        value={editForm.seat_info}
                        onChange={(e) => setEditForm({ ...editForm, seat_info: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.seat_number_label', 'رقم المقعد')}</label>
                      <Input 
                        placeholder="مثال: A-12"
                        className="bg-white/5 border-white/10 h-12"
                        value={editForm.seat_number}
                        onChange={(e) => setEditForm({ ...editForm, seat_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.email', 'البريد الإلكتروني')}</label>
                      <Input 
                        type="email"
                        placeholder="البريد الإلكتروني للمشارك"
                        className="bg-white/5 border-white/10 h-12"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-brand-secondary">{t('participants.phone', 'رقم الهاتف')}</label>
                      <Input 
                        placeholder="رقم الهاتف للتواصل"
                        className="bg-white/5 border-white/10 h-12"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/20 flex gap-4 shrink-0">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl"
                    onClick={() => setEditingParticipant(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    type="submit"
                    variant="gold" 
                    className="flex-[2] h-14 rounded-2xl text-lg"
                  >
                    {t('common.save', 'حفظ التعديلات')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default ParticipantsPage;
