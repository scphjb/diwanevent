import React, { useState, useEffect } from 'react';
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
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { cn } from '../utils/cn';

const HardwareManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useAttendanceSocket(1);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'hardware_update') {
      setDevices(lastMessage.devices);
    }
  }, [lastMessage]);

  const fetchDevices = async () => {
    try {
      const response = await api.get('/hardware/status');
      setDevices(response.data);
    } catch (err) {
      console.error("Failed to fetch hardware status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ONLINE': return <Wifi className="w-4 h-4 text-emerald-400" />;
      case 'OFFLINE': return <WifiOff className="w-4 h-4 text-red-400" />;
      default: return <RefreshCcw className="w-4 h-4 text-amber-400 animate-spin" />;
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/hardware">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">إدارة العتاد</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            مراقبة الأجهزة والماسحات المتصلة بالنظام
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={fetchDevices}>
            <RefreshCcw className="w-4 h-4" />
            تحديث الحالة
          </Button>
          <Button variant="gold" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            فحص الشبكة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-emerald-400/50 text-sm font-bold">الأجهزة المتصلة</div>
              <div className="text-3xl font-bold text-white">{devices.filter(d => d.status === 'ONLINE').length}</div>
            </div>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${(devices.filter(d => d.status === 'ONLINE').length / (devices.length || 1)) * 100}%` }} 
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <BatteryLow className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="text-amber-500/50 text-sm font-bold">أجهزة تحتاج شحن</div>
              <div className="text-3xl font-bold text-white">{devices.filter(d => d.battery < 20).length}</div>
            </div>
          </div>
          <p className="text-xs text-amber-500/30">يرجى التحقق من وحدات المسح المحمولة</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h2 className="text-xl font-bold text-white">قائمة الأجهزة النشطة</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/5 text-emerald-400/50 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-6 font-bold">الجهاز</th>
                <th className="px-8 py-6 font-bold">الحالة</th>
                <th className="px-8 py-6 font-bold">البطارية</th>
                <th className="px-8 py-6 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {devices.map((device) => (
                  <motion.tr 
                    key={device.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          {device.type === 'ZEBRA' ? <Smartphone className="w-5 h-5 text-emerald-400" /> : <Printer className="w-5 h-5 text-amber-500" />}
                        </div>
                        <div>
                          <div className="text-white font-bold">{device.id}</div>
                          <div className="text-emerald-400/20 text-xs">{device.type || 'Universal Scanner'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border",
                        device.status === 'ONLINE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {getStatusIcon(device.status)}
                        {device.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Battery className={cn("w-4 h-4", device.battery < 20 ? "text-red-400" : "text-emerald-400")} />
                        <span className="text-white font-mono text-sm">{device.battery}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button className="p-2 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {devices.length === 0 && <div className="p-10 text-center text-emerald-400/20 italic">لا توجد أجهزة متصلة حالياً...</div>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HardwareManagement;
