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
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { Html5QrcodeScanner } from "html5-qrcode";

const CheckInPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [walkinData, setWalkinData] = useState({ name: '', council: '', email: '' });
  const [scannerStatus, setScannerStatus] = useState('OFFLINE');
  const { currentEventId: eventId } = useAuth();

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
      const data = await participantService.getParticipantByQR(decodedText);
      if (data) {
        setResults([data]);
        setQuery(data.full_name);
        // Auto check-in if found
        handleCheckIn(data);
      }
    } catch (err) {
      alert("رمز غير صالح أو مشارك غير موجود");
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
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (participant) => {
    try {
      await participantService.checkIn(participant.id);
      setResults(prev => prev.map(p => p.id === participant.id ? { ...p, payment_status: 'paid' } : p));
    } catch (err) {
      alert("فشل تسجيل الحضور");
    }
  };

  const handleWalkInRegister = async () => {
    if (!walkinData.name || !walkinData.council) return;
    try {
      const data = await participantService.registerParticipant({
        full_name: walkinData.name,
        council: walkinData.council,
        email: walkinData.email,
        event_id: eventId
      });
      setShowWalkinModal(false);
      setQuery(data.full_name);
      setResults([data]);
      setWalkinData({ name: '', council: '', email: '' });
      if (autoPrint) participantService.printBadge(data.id);
    } catch (err) {
      alert("فشل التسجيل الميداني");
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/check-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">تسجيل الحضور الميداني</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            البحث عبر الاسم، رقم التسجيل، أو المسح الضوئي
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
          <Button 
            variant="outline" 
            className="h-14 px-6 gap-2 bg-white/5 border-white/10 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowScanner(true)}
          >
            <Camera className="w-5 h-5" />
            ماسح الكاميرا
          </Button>

          <button 
            onClick={() => setAutoPrint(!autoPrint)}
            className={cn(
              "flex items-center gap-3 px-6 h-14 rounded-2xl border transition-all font-bold",
              autoPrint ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-white/5 border-white/10 text-white/20"
            )}
          >
            <Printer className="w-5 h-5" />
            طباعة تلقائية: {autoPrint ? 'مفعل' : 'معطل'}
          </button>
          
          <Button 
            variant="gold" 
            className="h-14 px-8 gap-2"
            onClick={() => setShowWalkinModal(true)}
          >
            <UserPlus className="w-5 h-5" />
            تسجيل مشارك جديد (Walk-in)
          </Button>
        </div>
      </div>

      <div className="relative mb-12">
        <Search className="absolute ltr:left-6 rtl:right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400/30" />
        <Input 
          autoFocus
          placeholder="ابحث عن مشارك..." 
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
                  <p className="text-emerald-400/40 text-sm font-medium">{p.council} • {p.order_num}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                {p.payment_status === 'paid' ? (
                  <>
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      تم تسجيل الحضور
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
                    تسجيل الحضور الآن
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} />

      {/* Walk-in Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-emerald-950/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#022C22] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">تسجيل ميداني جديد</h2>
              <button onClick={() => setShowWalkinModal(false)} className="text-emerald-400/20 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">الاسم الكامل</label>
                <Input value={walkinData.name} onChange={(e) => setWalkinData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">الجهة / المؤسسة</label>
                <Input value={walkinData.council} onChange={(e) => setWalkinData(prev => ({ ...prev, council: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">البريد الإلكتروني (اختياري)</label>
                <Input value={walkinData.email} onChange={(e) => setWalkinData(prev => ({ ...prev, email: e.target.value }))} />
              </div>

              <Button className="w-full h-14 mt-6" variant="gold" onClick={handleWalkInRegister}>
                إتمام التسجيل والطباعة
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

const ScannerModal = ({ isOpen, onClose }) => {
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
        <h2 className="text-2xl font-black text-white mb-8 text-center">ماسح الـ QR الذكي</h2>
        <div id="reader" className="overflow-hidden rounded-[30px] border-4 border-white/5" />
        <p className="text-emerald-400/40 text-center mt-6 text-xs font-bold uppercase tracking-widest">ضع الرمز داخل المربع للمسح</p>
      </motion.div>
    </div>
  );
};

export default CheckInPage;
