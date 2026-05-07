import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Users, 
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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import participantService from '../services/participantService';
import api from '../services/api';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

const ParticipantsPage = () => {
  const { t, i18n } = useTranslation();
  const { currentEventId: eventId } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Real-time Updates via WebSocket
  useAttendanceSocket(eventId, (data) => {
    if (data.type === 'check_in') {
      setParticipants(prev => prev.map(p => 
        p.id === data.participant.id ? { ...p, payment_status: 'paid', check_in_time: new Date() } : p
      ));
    }
  });

  const handleExport = async () => {
    try {
      const response = await api.get(`/analytics/${eventId}/export-data`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `participants_event_${eventId}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("فشل تصدير البيانات");
    }
  };

  const handleBulkPrint = async () => {
    try {
      const response = await api.get(`/participants/badges/all?event_id=${eventId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      alert("فشل إنشاء ملف الشارات المجمع");
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [eventId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const data = await participantService.getParticipants(eventId);
      setParticipants(data);
    } catch (err) {
      console.error('Failed to fetch participants', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          p.council.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'paid' && p.payment_status === 'paid') ||
                         (statusFilter === 'pending' && p.payment_status !== 'paid');
    return matchesSearch && matchesStatus;
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await participantService.importExcel(eventId, file);
      fetchParticipants(); // Refresh list
      alert(t('participants.import_success', 'تم استيراد المشاركين بنجاح'));
    } catch (err) {
      alert(t('participants.import_failed', 'فشل استيراد الملف'));
    }
  };

  const handlePrint = async (participantId) => {
    try {
      const blob = await participantService.printBadge(participantId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.click();
    } catch (err) {
      console.error('Failed to print badge', err);
    }
  };

  const handleSendCertificates = async () => {
    if (!window.confirm(t('participants.confirm_send_all', 'هل أنت متأكد من إرسال الشهادات لجميع الحاضرين؟'))) return;
    try {
      await api.post(`/certificates/${eventId}/send-all`);
      alert(t('participants.process_started', 'بدأت عملية إرسال الشهادات في الخلفية'));
    } catch (err) {
      alert(t('participants.process_failed', 'فشل بدء العملية'));
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/participants">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('participants.title')}</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('participants.total_registered')}: {participants.length}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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
            className="flex items-center gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={handleBulkPrint}
          >
            <Printer className="w-4 h-4" />
            {t('common.bulk_print', 'طباعة مجمعة')}
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
            <FileDown className="w-4 h-4" />
            {t('common.export')}
          </Button>
          <div className="relative">
            <input 
              type="file" 
              id="excel-upload" 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
            />
            <label htmlFor="excel-upload">
              <Button variant="gold" className="flex items-center gap-2 cursor-pointer">
                <FileUp className="w-4 h-4" />
                {t('common.import')}
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 mb-8 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 relative">
          <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/30" />
          <Input 
            placeholder={t('participants.search_placeholder')} 
            className="ltr:pl-12 rtl:pr-12 bg-white/5 border-white/5 h-14"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-emerald-950/50 p-1.5 rounded-2xl border border-white/5">
            {[
              { id: 'all', label: t('common.all') },
              { id: 'paid', label: t('common.confirmed') },
              { id: 'pending', label: t('common.pending') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-medium transition-all",
                  statusFilter === tab.id 
                    ? "bg-emerald-600 text-white shadow-lg" 
                    : "text-emerald-400/50 hover:text-emerald-400"
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
              <tr className="bg-white/5 text-emerald-400/50 text-xs uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-6 font-bold">{t('common.participants')}</th>
                <th className="px-8 py-6 font-bold">{t('participants.council')}</th>
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
                      <td colSpan="5" className="px-8 py-6 bg-white/5 mb-2 rounded-lg" />
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
                          <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                            {p.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <div className="text-white font-bold flex items-center gap-2">
                              {p.full_name}
                              {p.is_flagged && (
                                <AlertTriangle className="w-4 h-4 text-amber-500" title="بيانات تحتاج مراجعة" />
                              )}
                            </div>
                            <div className="text-emerald-400/30 text-xs">{p.order_num}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-emerald-100/70">{p.council}</div>
                        <div className="text-emerald-400/20 text-xs">{p.court}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold",
                          p.payment_status === 'paid' 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {p.payment_status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {p.payment_status === 'paid' ? t('common.confirmed') : t('common.pending')}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-mono text-sm text-emerald-400/50">
                        {p.check_in_time ? new Date(p.check_in_time).toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US') : '--:--'}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handlePrint(p.id)}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                            title={t('common.print')}
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => window.open(`/api/v1/certificates/download/${p.id}`, '_blank')}
                            className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                            title={t('common.download_cert', 'تحميل الشهادة')}
                          >
                            <Award className="w-5 h-5" />
                          </button>
                          <button className="p-2 rounded-xl hover:bg-white/10 text-emerald-400/50 hover:text-white transition-all">
                            <MoreVertical className="w-5 h-5" />
                          </button>
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
                <Search className="w-8 h-8 text-emerald-400/20" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{t('participants.no_results')}</h3>
              <p className="text-emerald-400/30">{t('participants.check_filters')}</p>
            </div>
          )}
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between text-sm text-emerald-400/30 font-medium">
          <div>{t('participants.viewing', { count: filteredParticipants.length, total: participants.length })}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>{t('common.previous', 'السابق')}</Button>
            <Button variant="outline" size="sm" className="border-emerald-500/50 text-emerald-400">1</Button>
            <Button variant="outline" size="sm">{t('common.next', 'التالي')}</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ParticipantsPage;
