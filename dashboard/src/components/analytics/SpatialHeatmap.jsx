import React, { useState, useEffect } from 'react';
import { Map, AlertTriangle, Users, TrendingUp } from 'lucide-react';

const SpatialHeatmap = ({ eventId }) => {
  const [zones, setZones] = useState([
    { id: 'main_hall', name: 'Main Hall', density: 85, forecast: 'high', coords: { top: '20%', left: '30%', width: '40%', height: '30%' } },
    { id: 'workshop_a', name: 'Workshop A', density: 40, forecast: 'normal', coords: { top: '55%', left: '10%', width: '25%', height: '20%' } },
    { id: 'exhibition_zone', name: 'Exhibition', density: 65, forecast: 'increasing', coords: { top: '55%', left: '40%', width: '50%', height: '35%' } },
    { id: 'vip_lounge', name: 'VIP Lounge', density: 20, forecast: 'normal', coords: { top: '10%', left: '10%', width: '15%', height: '15%' } },
  ]);

  // محاكاة تحديث البيانات اللحظية
  useEffect(() => {
    const interval = setInterval(() => {
      setZones(prev => prev.map(zone => ({
        ...zone,
        density: Math.min(100, Math.max(0, zone.density + (Math.random() * 10 - 5)))
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getDensityColor = (density) => {
    if (density > 80) return 'bg-red-500/60 border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
    if (density > 50) return 'bg-yellow-500/60 border-yellow-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    return 'bg-brand-primary/60 border-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.5)]';
  };

  return (
    <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Map className="text-indigo-400" />
            Live Spatial Intelligence
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time crowd distribution & congestion forecasting</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
            <Users className="text-indigo-400 w-4 h-4" />
            <span className="text-white font-medium">1,240 Present</span>
          </div>
        </div>
      </div>

      {/* الخريطة التفاعلية */}
      <div className="relative aspect-video bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
        {/* رسم تخطيطي للقاعة (SVG Overlay يمكن وضعه هنا) */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 gap-2 p-8 opacity-10 pointer-events-none">
          {[...Array(72)].map((_, i) => <div key={i} className="border border-slate-500 rounded-sm" />)}
        </div>

        {/* المناطق الحرارية */}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`absolute rounded-2xl border-2 transition-all duration-1000 flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-pointer hover:scale-105 ${getDensityColor(zone.density)}`}
            style={{
              top: zone.coords.top,
              left: zone.coords.left,
              width: zone.coords.width,
              height: zone.coords.height
            }}
          >
            <span className="text-white font-bold text-lg mb-1 drop-shadow-md">{zone.name}</span>
            <div className="flex items-center gap-2 bg-black/30 px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-bold">{Math.round(zone.density)}%</span>
            </div>

            {/* مؤشر التنبؤ */}
            {zone.forecast === 'high' && (
              <div className="absolute -top-3 -right-3 animate-pulse bg-red-600 text-white p-1.5 rounded-full shadow-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            {zone.forecast === 'increasing' && (
              <div className="absolute -top-3 -right-3 bg-yellow-500 text-white p-1.5 rounded-full shadow-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* وسيلة الإيضاح (Legend) */}
      <div className="mt-8 flex justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-primary rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
          <span className="text-slate-300">Comfortable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div>
          <span className="text-slate-300">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
          <span className="text-slate-300">Congested</span>
        </div>
      </div>
    </div>
  );
};

export default SpatialHeatmap;
