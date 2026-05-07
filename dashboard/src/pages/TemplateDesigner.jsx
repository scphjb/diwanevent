import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Move, Type, QrCode, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import credentialService from '../services/credentialService';

const TemplateDesigner = ({ eventId = 1 }) => {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [elements, setElements] = useState({
    full_name: { x: 50, y: 150, fontSize: 24, color: '#000000', label: 'الاسم الكامل' },
    council: { x: 50, y: 200, fontSize: 18, color: '#444444', label: 'الجهة/المؤسسة' },
    qr_code: { x: 200, y: 50, size: 80, label: 'رمز QR' }
  });
  
  const [saving, setSaving] = useState(false);
  const containerRef = useRef(null);

  const handleDrag = (key, info) => {
    const container = containerRef.current.getBoundingClientRect();
    setElements(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        x: info.point.x - container.left,
        y: info.point.y - container.top
      }
    }));
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await credentialService.saveBadgeDesign(eventId, elements);
      alert('تم حفظ القالب بنجاح!');
    } catch (err) {
      console.error('Save failed', err);
      alert('فشل حفظ القالب');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setBackgroundImage(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-[#022C22] text-white">
      {/* Sidebar Controls */}
      <div className="w-80 bg-white/5 border-l border-white/10 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
          <ImageIcon className="text-amber-500" /> مصمم الشارات
        </h2>

        <div className="space-y-8">
          {/* Background Upload */}
          <section>
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-4">خلفية الشارة</label>
            <div className="relative h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center hover:border-amber-500/50 transition-all group">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
              <ImageIcon className="w-8 h-8 text-white/20 group-hover:text-amber-500 transition-colors" />
              <span className="text-xs text-white/40 mt-2">اسحب الصورة هنا</span>
            </div>
          </section>

          {/* Elements Config */}
          <section className="space-y-4">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">تعديل العناصر</label>
            {Object.entries(elements).map(([key, config]) => (
              <div key={key} className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  {key === 'qr_code' ? <QrCode className="w-4 h-4 text-amber-500" /> : <Type className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-bold">{config.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/30">X: {Math.round(config.x)}</span>
                    <input type="range" className="w-full" value={config.x} onChange={(e) => setElements(prev => ({...prev, [key]: {...prev[key], x: parseInt(e.target.value)}}))} max="400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/30">Y: {Math.round(config.y)}</span>
                    <input type="range" className="w-full" value={config.y} onChange={(e) => setElements(prev => ({...prev, [key]: {...prev[key], y: parseInt(e.target.value)}}))} max="600" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <button 
            onClick={saveTemplate}
            disabled={saving}
            className="w-full py-4 bg-amber-500 text-emerald-950 font-black rounded-2xl shadow-xl shadow-amber-500/10 hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
          >
            {saving ? 'جاري الحفظ...' : <><Save className="w-5 h-5" /> حفظ القالب</>}
          </button>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="flex-1 flex items-center justify-center p-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 to-transparent">
        <div 
          ref={containerRef}
          className="relative bg-white shadow-2xl overflow-hidden"
          style={{ 
            width: '400px', 
            height: '600px', 
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Draggable Full Name */}
          <motion.div
            drag
            dragMomentum={false}
            onDrag={(e, info) => handleDrag('full_name', info)}
            className="absolute cursor-move p-2 border border-dashed border-transparent hover:border-blue-500 group"
            style={{ left: elements.full_name.x, top: elements.full_name.y }}
          >
            <div className="absolute -top-6 right-0 bg-blue-500 text-[10px] px-2 py-0.5 rounded hidden group-hover:block">الاسم الكامل</div>
            <div style={{ fontSize: `${elements.full_name.fontSize}px`, color: elements.full_name.color, fontWeight: 'bold' }}>
              الاسم الكامل للمشارك
            </div>
          </motion.div>

          {/* Draggable Council */}
          <motion.div
            drag
            dragMomentum={false}
            onDrag={(e, info) => handleDrag('council', info)}
            className="absolute cursor-move p-2 border border-dashed border-transparent hover:border-emerald-500 group"
            style={{ left: elements.council.x, top: elements.council.y }}
          >
            <div className="absolute -top-6 right-0 bg-emerald-500 text-[10px] px-2 py-0.5 rounded hidden group-hover:block">المؤسسة</div>
            <div style={{ fontSize: `${elements.council.fontSize}px`, color: elements.council.color }}>
              الجهة أو المؤسسة التابع لها
            </div>
          </motion.div>

          {/* Draggable QR Code */}
          <motion.div
            drag
            dragMomentum={false}
            onDrag={(e, info) => handleDrag('qr_code', info)}
            className="absolute cursor-move bg-slate-100 border-2 border-slate-200 flex items-center justify-center group"
            style={{ 
              left: elements.qr_code.x, 
              top: elements.qr_code.y, 
              width: `${elements.qr_code.size}px`, 
              height: `${elements.qr_code.size}px` 
            }}
          >
            <div className="absolute -top-6 right-0 bg-amber-500 text-[10px] px-2 py-0.5 rounded hidden group-hover:block">QR Code</div>
            <QrCode className="w-1/2 h-1/2 text-slate-400" />
          </motion.div>

          {!backgroundImage && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none italic">
              قم بتحميل صورة الخلفية للبدء
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateDesigner;
