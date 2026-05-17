import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Search, 
  UserCheck, 
  QrCode, 
  Printer, 
  AlertCircle,
  Clock,
  UserPlus,
  X,
  Check,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import participantService from '../services/participantService';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { cn } from '../utils/cn';
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEvent } from '../context/EventContext';
import { useTranslation } from 'react-i18next';

const CheckInPage = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [walkinData, setWalkinData] = useState({ name: '', organization: '', department: 'حضور ميداني', email: '', role: 'attendee', phone: '', sendQR: false });
  const [scannerStatus, setScannerStatus] = useState('OFFLINE');
  const [halls, setHalls] = useState([]);
  const [selectedGate, setSelectedGate] = useState('Main Hall');
  const { selectedEventId: eventId } = useEvent();

  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const res = await api.get(`events/${eventId}/halls`);
        setHalls(res.data);
        if (res.data.length > 0) setSelectedGate(res.data[0].name);
      } catch (err) { console.error(err); }
    };
    fetchHalls();
  }, [eventId]);

  // Scanner Logic
  useEffect(() => {
    let scanner = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // 0 = QR
      });

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [showScanner]);

  async function onScanSuccess(decodedText) {
    try {
      setShowScanner(false);
      setLoading(true);
      // Try to find participant by QR
      const data = await participantService.getParticipantByQR(decodedText, eventId);
      if (data) {
        setResults([data]);
        setQuery(data.full_name);
        // Auto check-in if found
        handleCheckIn(data);
      }
    } catch (err) {
      alert(t('checkin.invalid_qr', "رمز غير صالح أو مشارك غير موجود"));
    } finally {
      setLoading(false);
    }
  }

  function onScanFailure(error) {
    // Silent failure for continuous scanning
  }

  // Real-time Hardware Sync
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'checkin') {
      const p = message.participant;
      setResults(prev => {
        const exists = prev.find(item => item.id === p.id);
        if (exists) {
           return prev.map(item => item.id === p.id ? { ...item, payment_status: 'paid' } : item);
        }
        return [{ ...p, payment_status: 'paid' }, ...prev];
      });

      if (autoPrint) {
        participantService.printBadge(p.id);
      }
    } else if (message.type === 'hardware_update') {
      // Check if any scanner is online for this event
      const isOnline = message.devices.some(d => d.status === 'ONLINE');
      setScannerStatus(isOnline ? 'ONLINE' : 'OFFLINE');
    }
  });

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await participantService.getParticipants(eventId, { query: val });
      setResults(data.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (participant) => {
    try {
      await participantService.checkIn(participant.id, selectedGate);
      setResults(prev => prev.map(p => p.id === participant.id ? { ...p, payment_status: 'paid' } : p));
    } catch (err) {
      alert(t('checkin.checkin_failed', "فشل تسجيل الحضور"));
    }
  };

  const [successMsg, setSuccessMsg] = useState('');

  const handleWalkInRegister = async () => {
    if (!walkinData.name || !walkinData.organization) return;
    try {
      const data = await participantService.registerParticipant({
        full_name: walkinData.name,
        organization: walkinData.organization,
        department: walkinData.department || 'حضور ميداني',
        email: walkinData.email || undefined,
        phone: walkinData.phone || undefined,
        event_id: eventId,
        role: walkinData.role || 'attendee',
      });
      setShowWalkinModal(false);
      setWalkinData({ name: '', organization: '', department: 'حضور ميداني', email: '', role: 'attendee', phone: '', sendQR: false });

      setResults([data]);
      setQuery(data.full_name);

      setSuccessMsg(t('checkin.walkin_success', '✅ تم تسجيل {{name}} وتأكيد حضوره', { name: data.full_name }));
      setTimeout(() => setSuccessMsg(''), 4000);

      if (autoPrint) participantService.printBadge(data.id);
    } catch (err) {
      alert(t('checkin.walkin_failed', 'فشل التسجيل الميداني: ') + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/check-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('checkin.title', 'تسجيل الحضور الميداني')}</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            {t('checkin.subtitle', 'البحث عبر الاسم، رقم التسجيل، أو المسح الضوئي')}
            <span className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ml-2",
              scannerStatus === 'ONLINE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", scannerStatus === 'ONLINE' ? "bg-emerald-400" : "bg-red-400")} />
              Scanner: {scannerStatus}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
            {(halls.length > 0 ? halls.map(h => h.name) : ['Gate 1', 'Gate 2']).map(gate => (
              <button
                key={gate}
                onClick={() => setSelectedGate(gate)}
                className={cn(
                  "px-4 h-12 rounded-xl text-sm font-black transition-all",
                  selectedGate === gate ? "bg-emerald-500 text-emerald-950" : "text-emerald-400/40 hover:text-emerald-400"
                )}
              >
                {gate}
              </button>
            ))}
          </div>

          <Button 
            variant="outline" 
            className="h-14 px-6 gap-2 bg-white/5 border-white/10 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowScanner(true)}
          >
            <Camera className="w-5 h-5" />
            {t('checkin.camera_scanner', 'ماسح الكاميرا')}
          </Button>

          <button 
            onClick={() => setAutoPrint(!autoPrint)}
            className={cn(
              "flex items-center gap-3 px-6 h-14 rounded-2xl border transition-all font-bold",
              autoPrint ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-white/5 border-white/10 text-white/20"
            )}
          >
            <Printer className="w-5 h-5" />
            {autoPrint ? t('checkin.auto_print.enabled', 'طباعة تلقائية: مفعل') : t('checkin.auto_print.disabled', 'طباعة تلقائية: معطل')}
          </button>
          
          <Button 
            variant="gold" 
            className="h-14 px-8 gap-2"
            onClick={() => setShowWalkinModal(true)}
          >
            <UserPlus className="w-5 h-5" />
            {t('checkin.new_walkin', 'تسجيل مشارك جديد (Walk-in)')}
          </Button>
        </div>
      </div>

      {/* ✅ رسالة نجاح التسجيل */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold"
          >
            <UserCheck className="w-5 h-5 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-12">
        <Search className="absolute ltr:left-6 rtl:right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400/30" />
        <Input 
          autoFocus
          placeholder={t('checkin.search_placeholder', 'ابحث عن مشارك...')} 
          className="h-20 ltr:pl-16 rtl:pr-16 text-2xl font-bold bg-white/5 border-white/10 rounded-[32px] focus:border-emerald-500 transition-all shadow-2xl"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {loading && (
          <div className="absolute ltr:right-6 rtl:left-6 top-1/2 -translate-y-1/2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {results.map((p, idx) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-[28px] p-6 hover:bg-white/10 transition-all flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl",
                  p.payment_status === 'paid' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/20"
                )}>
                  {p.payment_status === 'paid' ? <Check className="w-8 h-8" /> : p.full_name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{p.full_name}</h3>
                  <p className="text-emerald-400/40 text-sm font-medium">{p.organization} • {p.order_num}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                {p.payment_status === 'paid' ? (
                  <>
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t('checkin.status.checked_in', 'تم تسجيل الحضور')}
                    </div>
                    <Button variant="outline" className="p-4" onClick={() => participantService.printBadge(p.id)}>
                      <Printer className="w-5 h-5" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="gold" 
                    className="h-14 px-10 gap-2 flex-1 md:flex-none"
                    onClick={() => handleCheckIn(p)}
                  >
                    <UserCheck className="w-5 h-5" />
                    {t('checkin.btn.checkin_now', 'تسجيل الحضور الآن')}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} />

      {/* Walk-in Modal — متعدد الأدوار */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-emerald-950/40">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#022C22] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">{t('checkin.walkin_modal.title', 'تسجيل ميداني جديد')}</h2>
                <p className="text-emerald-400/40 text-sm mt-1">تسجيل فوري عند الوصول — بدون حجز مسبق</p>
              </div>
              <button onClick={() => setShowWalkinModal(false)} className="text-emerald-400/20 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* نوع المشارك */}
            <div className="mb-6">
              <label className="text-xs font-bold text-emerald-400/50 uppercase tracking-widest mb-3 block">نوع الحضور</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'attendee', label: '👤 مشارك عادي', color: 'emerald' },
                  { value: 'vip', label: '⭐ ضيف VIP', color: 'amber' },
                  { value: 'press', label: '📰 صحافة وإعلام', color: 'blue' },
                  { value: 'speaker', label: '🎤 متحدث', color: 'purple' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWalkinData(prev => ({ ...prev, role: opt.value }))}
                    className={`px-4 py-3 rounded-2xl border text-sm font-bold transition-all text-right ${
                      walkinData.role === opt.value
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">{t('checkin.walkin_modal.full_name', 'الاسم الكامل')} *</label>
                <Input value={walkinData.name} onChange={(e) => setWalkinData(prev => ({ ...prev, name: e.target.value }))} placeholder="اسم المشارك..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">{t('checkin.walkin_modal.organization', 'الجهة / المؤسسة')} *</label>
                  <Input value={walkinData.organization} onChange={(e) => setWalkinData(prev => ({ ...prev, organization: e.target.value }))} placeholder="اسم الجهة أو المؤسسة..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">{t('checkin.walkin_modal.department', 'القسم / التخصص')} *</label>
                  <Input value={walkinData.department} onChange={(e) => setWalkinData(prev => ({ ...prev, department: e.target.value }))} placeholder="القسم أو التخصص..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">البريد الإلكتروني</label>
                  <Input type="email" value={walkinData.email} onChange={(e) => setWalkinData(prev => ({ ...prev, email: e.target.value }))} placeholder="اختياري..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">رقم الهاتف</label>
                  <Input type="tel" value={walkinData.phone || ''} onChange={(e) => setWalkinData(prev => ({ ...prev, phone: e.target.value }))} placeholder="اختياري..." />
                </div>
              </div>

              {/* خيار إرسال QR بالبريد إذا أُدخل */}
              {walkinData.email && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <input
                    type="checkbox"
                    id="sendQR"
                    checked={walkinData.sendQR || false}
                    onChange={e => setWalkinData(prev => ({ ...prev, sendQR: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <label htmlFor="sendQR" className="text-sm text-emerald-400 font-bold cursor-pointer">
                    📧 إرسال رمز QR للبريد الإلكتروني
                  </label>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Button
                  className="flex-1 h-14"
                  variant="gold"
                  onClick={handleWalkInRegister}
                  disabled={!walkinData.name || !walkinData.organization}
                >
                  <UserCheck className="w-5 h-5 ml-2" />
                  {t('checkin.walkin_modal.submit', 'تسجيل + طباعة فورية')}
                </Button>
                <Button
                  variant="outline"
                  className="h-14 px-6 bg-white/5 border-white/10 text-white/40"
                  onClick={() => { setShowWalkinModal(false); setWalkinData({ name: '', organization: '', department: 'حضور ميداني', email: '', role: 'attendee', phone: '', sendQR: false }); }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </DashboardLayout>
  );
};

const ScannerModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#022C22] border border-white/10 rounded-[40px] p-8 w-full max-w-lg shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white z-10">
          <X className="w-8 h-8" />
        </button>
        <h2 className="text-2xl font-black text-white mb-8 text-center">{t('checkin.scanner_modal.title', 'ماسح الـ QR الذكي')}</h2>
        <div id="reader" className="overflow-hidden rounded-[30px] border-4 border-white/5" />
        <p className="text-emerald-400/40 text-center mt-6 text-xs font-bold uppercase tracking-widest">{t('checkin.scanner_modal.hint', 'ضع الرمز داخل المربع للمسح')}</p>
      </motion.div>
    </div>
  );
};

export default CheckInPage;
