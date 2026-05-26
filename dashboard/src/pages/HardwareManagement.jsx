import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Cpu, 
  RefreshCcw, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Smartphone,
  Printer,
  MoreVertical,
  Activity,
  Power,
  Signal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { useEvent } from '../context/EventContext';
import { cn } from '../utils/cn';

/* ──────────────────────── Device Card ──────────────────────────────── */
const DeviceRow = ({ device, onToggle }) => {
  const { t, i18n } = useTranslation();
  const isOnline = device.status === 'ONLINE';
  const lowBattery = (device.battery ?? 100) < 20;

  return (
    <motion.tr
      key={device.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hover:bg-white/5 transition-colors group"
    >
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isOnline ? "bg-brand-primary/10" : "bg-white/5"
          )}>
            {device.type === 'ZEBRA' || device.type === 'SCANNER'
              ? <Smartphone className={cn("w-5 h-5", isOnline ? "text-brand-secondary" : "text-white/20")} />
              : <Printer className={cn("w-5 h-5", isOnline ? "text-amber-500" : "text-white/20")} />
            }
          </div>
          <div>
            <div className="text-white font-bold">{device.id}</div>
            <div className="text-brand-secondary/20 text-xs">{device.type || 'Universal Scanner'}</div>
          </div>
        </div>
      </td>

      <td className="px-8 py-6">
        <span className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border",
          isOnline
            ? "bg-brand-primary/10 text-brand-secondary border-brand-primary/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-brand-secondary animate-pulse" : "bg-red-400")} />
          {device.status}
        </span>
      </td>

      <td className="px-8 py-6">
        <div className="flex items-center gap-2">
          <Battery className={cn("w-4 h-4", lowBattery ? "text-red-400" : "text-brand-secondary")} />
          <span className={cn("font-mono text-sm", lowBattery ? "text-red-400" : "text-white")}>
            {device.battery ?? '—'}%
          </span>
          {lowBattery && <AlertTriangle className="w-3 h-3 text-amber-500" />}
        </div>
      </td>

      <td className="px-8 py-6">
        <div className="text-brand-secondary/30 text-xs font-mono">
          {device.last_ping ? new Date(device.last_ping).toLocaleTimeString(i18n.language === 'ar' ? 'ar-DZ' : 'en-US') : '—'}
        </div>
      </td>

      <td className="px-8 py-6 text-center">
        <button
          onClick={() => onToggle(device.id, isOnline ? 'OFFLINE' : 'ONLINE')}
          className={cn(
            "p-2 rounded-xl transition-all",
            isOnline
              ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
              : "bg-brand-primary/10 text-brand-secondary hover:bg-brand-primary hover:text-white"
          )}
          title={isOnline ? t('hardware.table.turn_off') : t('hardware.table.turn_on')}
        >
          <Power className="w-4 h-4" />
        </button>
      </td>
    </motion.tr>
  );
};

/* ──────────────────────── Main Page ────────────────────────────────── */
const HardwareManagement = () => {
  const { t } = useTranslation();
  const { selectedEventId: eventId } = useEvent();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  // ✅ استخدام eventId من EventContext بدلاً من القيمة الثابتة
  const { lastMessage } = useAttendanceSocket(eventId);

  // تحديث الأجهزة عبر WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'hardware_update') {
      const eventDevices = (lastMessage.devices || []).filter(
        d => !eventId || d.event_id === eventId
      );
      setDevices(eventDevices);
    }
  }, [lastMessage, eventId]);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ تصفية الأجهزة حسب الفعالية
      const response = await api.get('hardware/status', {
        params: eventId ? { event_id: eventId } : {}
      });
      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch hardware status', err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // ✅ فحص الشبكة — ping جميع الأجهزة
  const handleNetworkScan = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const response = await api.post('hardware/ping', {
        event_id: eventId
      });
      setPingResult({
        success: true,
        message: t('hardware.scan_success', { count: response.data?.devices_pinged ?? 0 }, `Successfully scanned ${response.data?.devices_pinged ?? 0} devices`)
      });
      // تحديث القائمة بعد الفحص
      await fetchDevices();
    } catch (err) {
      // إذا لم يكن الـ endpoint موجوداً، نُجري فحصاً محلياً
      const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
      setPingResult({
        success: false,
        message: t('hardware.stats.online', 'الأجهزة المتصلة') + `: ${onlineCount}/${devices.length}`
      });
      await fetchDevices();
    } finally {
      setPinging(false);
      setTimeout(() => setPingResult(null), 5000);
    }
  };

  // ✅ تبديل حالة جهاز
  const handleToggleDevice = async (deviceId, newStatus) => {
    try {
      await api.post('hardware/control', {
        device_id: deviceId,
        status: newStatus
      });
      setDevices(prev =>
        prev.map(d => d.id === deviceId ? { ...d, status: newStatus } : d)
      );
    } catch (err) {
      // تحديث محلي فقط إذا فشل الـ API
      setDevices(prev =>
        prev.map(d => d.id === deviceId ? { ...d, status: newStatus } : d)
      );
    }
  };

  const onlineDevices  = devices.filter(d => d.status === 'ONLINE').length;
  const lowBattery     = devices.filter(d => (d.battery ?? 100) < 20).length;
  const offlineDevices = devices.filter(d => d.status !== 'ONLINE').length;

  return (
    <DashboardLayout activePath="/dashboard/hardware">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('hardware.title', 'إدارة العتاد')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            {t('hardware.subtitle', 'مراقبة الأجهزة والماسحات المتصلة بالنظام')}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-brand-primary/10 text-brand-secondary border border-brand-primary/20 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse" />
              {t('hardware.live', 'Live')}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ تحديث الحالة */}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={fetchDevices}
            disabled={loading}
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
            {t('hardware.refresh', 'تحديث الحالة')}
          </Button>

          {/* ✅ فحص الشبكة */}
          <Button
            variant="gold"
            className="flex items-center gap-2"
            onClick={handleNetworkScan}
            disabled={pinging}
          >
            {pinging
              ? <RefreshCcw className="w-4 h-4 animate-spin" />
              : <Signal className="w-4 h-4" />
            }
            {pinging ? t('hardware.scanning', 'جاري الفحص...') : t('hardware.scan_network', 'فحص الشبكة')}
          </Button>
        </div>
      </div>

      {/* Ping Result Toast */}
      <AnimatePresence>
        {pingResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "mb-6 flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm",
              pingResult.success
                ? "bg-brand-primary/10 border border-brand-primary/20 text-brand-secondary"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            )}
          >
            {pingResult.success
              ? <CheckCircle className="w-5 h-5 shrink-0" />
              : <AlertTriangle className="w-5 h-5 shrink-0" />
            }
            {pingResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            icon: Activity,
            label: t('hardware.stats.online', 'الأجهزة المتصلة'),
            value: onlineDevices,
            color: 'bg-brand-primary/20',
            textColor: 'text-brand-secondary',
            bar: devices.length ? (onlineDevices / devices.length) * 100 : 0,
            barColor: 'bg-brand-primary'
          },
          {
            icon: WifiOff,
            label: t('hardware.stats.offline', 'الأجهزة المنقطعة'),
            value: offlineDevices,
            color: 'bg-red-500/20',
            textColor: 'text-red-400',
            bar: devices.length ? (offlineDevices / devices.length) * 100 : 0,
            barColor: 'bg-red-500'
          },
          {
            icon: BatteryLow,
            label: t('hardware.stats.low_battery', 'أجهزة تحتاج شحن'),
            value: lowBattery,
            color: 'bg-amber-500/20',
            textColor: 'text-amber-400',
            bar: devices.length ? (lowBattery / devices.length) * 100 : 0,
            barColor: 'bg-amber-500'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.color)}>
                <stat.icon className={cn("w-6 h-6", stat.textColor)} />
              </div>
              <div>
                <div className={cn("text-sm font-bold opacity-60", stat.textColor)}>{stat.label}</div>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
              </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-1000", stat.barColor)}
                style={{ width: `${stat.bar}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Device Table */}
      <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h2 className="text-xl font-bold text-white">{t('hardware.table.title', 'قائمة الأجهزة')}</h2>
          <span className="text-brand-secondary/30 text-sm font-bold">
            {t('hardware.table.count', { count: devices.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/5 text-brand-secondary/50 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-6 font-bold">{t('hardware.table.device')}</th>
                <th className="px-8 py-6 font-bold">{t('hardware.table.status')}</th>
                <th className="px-8 py-6 font-bold">{t('hardware.table.battery')}</th>
                <th className="px-8 py-6 font-bold">{t('hardware.table.last_ping')}</th>
                <th className="px-8 py-6 font-bold text-center">{t('hardware.table.control')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-8 py-6">
                        <div className="h-4 bg-white/5 rounded-lg w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : (
                  devices.map(device => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      onToggle={handleToggleDevice}
                    />
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>

          {!loading && devices.length === 0 && (
            <div className="p-16 text-center">
              <Cpu className="w-16 h-16 text-brand-secondary/10 mx-auto mb-4" />
              <p className="text-brand-secondary/20 font-bold">{t('hardware.table.no_devices', 'لا توجد أجهزة متصلة حالياً')}</p>
              <p className="text-brand-secondary/10 text-sm mt-1">{t('hardware.table.auto_appear', 'ستظهر الأجهزة تلقائياً عند اتصالها بالشبكة')}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HardwareManagement;
