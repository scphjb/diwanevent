import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import BadgeCanvas from '../components/designer/BadgeCanvas';
import LeftPanel from '../components/designer/LeftPanel';
import PropertiesPanel from '../components/designer/PropertiesPanel';
import templateService from '../services/templateService';
import { useEvent } from '../context/EventContext';
import { toast, Toaster } from 'react-hot-toast';

// ── ثوابت ─────────────────────────────────────────────────────────
// أبعاد A4 أفقي: 297mm × 210mm. لنجعل العرض على الشاشة 1060px ليناسب الـ Editor
const CANVAS_W = 1060;
const CANVAS_H = 750;

export const CERTIFICATE_ELEMENTS = [
  { id: 'cert_title',    icon: '📜', label: 'عنوان الشهادة',  type: 'static_text',    value: 'شهادة حضور', defaultW: 800, defaultH: 80, defaultStyle: { color: '#D4AF37', fontSize: '48px', fontWeight: '900', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'cert_body',     icon: '📝', label: 'نص الشهادة',     type: 'multiline_text', value: 'يُشهد بأن السيد/ة', defaultW: 800, defaultH: 50, defaultStyle: { color: '#333333', fontSize: '24px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'full_name',     icon: '👤', label: 'اسم المشارك',    type: 'dynamic_text',   placeholder: 'الاسم الكامل', defaultW: 800, defaultH: 70, defaultStyle: { color: '#050B18', fontSize: '42px', fontWeight: '900', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'event_name',    icon: '📅', label: 'اسم الفعالية',   type: 'dynamic_text',   placeholder: '[اسم الفعالية]', defaultW: 800, defaultH: 50, defaultStyle: { color: '#050B18', fontSize: '28px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'event_date',    icon: '🕐', label: 'تاريخ الفعالية', type: 'dynamic_text',   placeholder: '[التاريخ]', defaultW: 400, defaultH: 40, defaultStyle: { color: '#555555', fontSize: '20px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'event_location',icon: '📍', label: 'مكان الفعالية',  type: 'dynamic_text',   placeholder: '[المكان]', defaultW: 400, defaultH: 40, defaultStyle: { color: '#555555', fontSize: '20px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'cert_number',   icon: '#',  label: 'رقم الشهادة',    type: 'dynamic_text',   placeholder: 'CERT-2026-0001', defaultW: 300, defaultH: 30, defaultStyle: { color: '#AAAAAA', fontSize: '14px', fontFamily: 'monospace', textAlign: 'left' } },
  { id: 'signature',     icon: '✍',  label: 'توقيع',          type: 'signature',      defaultW: 250, defaultH: 150 },
  { id: 'qr_verify',     icon: '▦',  label: 'QR للتحقق',      type: 'qr',             defaultW: 100, defaultH: 100 },
  { id: 'logo',          icon: '🖼', label: 'شعار الجهة',     type: 'image',          defaultW: 150, defaultH: 150 },
  { id: 'border_frame',  icon: '🔲', label: 'إطار زخرفي',     type: 'frame',          defaultW: 1060, defaultH: 750, color: '#D4AF37' },
  { id: 'divider',       icon: '—',  label: 'خط فاصل',        type: 'shape',          defaultW: 800, defaultH: 3, color: '#D4AF37' },
  { id: 'background',    icon: '▬',  label: 'شريط خلفي',      type: 'shape',          defaultW: 1060, defaultH: 100, color: '#050B18' },
  { id: 'watermark',     icon: '💧', label: 'علامة مائية',    type: 'watermark',      value: 'DIWAN EVENT', defaultW: 600, defaultH: 300, defaultStyle: { color: 'rgba(2,44,34,0.03)', fontSize: '120px' } },
];

export const CERTIFICATE_PRESETS = [
  {
    id: 'formal_arabic',
    name: 'رسمي عربي',
    background: { color: '#FFFFFF' },
    elements: [
      { id: 'frame', type: 'frame', color: '#D4AF37', x: 0, y: 0, width: 1060, height: 750, zIndex: 1 },
      { id: 'top_bar', type: 'shape', color: '#050B18', x: 30, y: 30, width: 1000, height: 80, zIndex: 2 },
      { id: 'cert_title', type: 'static_text', value: 'شـهـادة حـضـور', x: 30, y: 38, width: 1000, height: 60, zIndex: 3, style: { color: '#D4AF37', fontSize: '36px', fontWeight: '900', textAlign: 'center', fontFamily: 'Cairo, sans-serif', letterSpacing: '8px' } },
      { id: 'basmala', type: 'static_text', value: 'بسم الله الرحمن الرحيم', x: 30, y: 130, width: 1000, height: 30, zIndex: 2, style: { color: '#7B5B00', fontSize: '18px', textAlign: 'center', fontFamily: 'Amiri, serif' } },
      { id: 'cert_body', type: 'multiline_text', value: 'يُشهد بأن السيد/ة', x: 30, y: 180, width: 1000, height: 40, zIndex: 2, style: { color: '#333333', fontSize: '22px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'full_name', type: 'dynamic_text', placeholder: 'اسم المشارك الكامل', x: 30, y: 230, width: 1000, height: 70, zIndex: 3, style: { color: '#050B18', fontSize: '42px', fontWeight: '900', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'cert_body_2', type: 'multiline_text', value: 'قد حضر فعالية', x: 30, y: 310, width: 1000, height: 36, zIndex: 2, style: { color: '#333333', fontSize: '22px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'event_name', type: 'dynamic_text', placeholder: '[اسم الفعالية]', x: 30, y: 360, width: 1000, height: 50, zIndex: 3, style: { color: '#050B18', fontSize: '28px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'event_date_loc', type: 'dynamic_text', placeholder: '[التاريخ والمكان]', x: 30, y: 430, width: 1000, height: 30, zIndex: 2, style: { color: '#555555', fontSize: '18px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'bottom_bar', type: 'shape', color: '#D4AF37', x: 230, y: 530, width: 600, height: 2, zIndex: 2 },
      { id: 'signature', type: 'signature', signerName: 'توقيع المنظم', x: 700, y: 550, width: 250, height: 140, zIndex: 3 },
      { id: 'logo', type: 'image', x: 100, y: 550, width: 140, height: 140, zIndex: 3 },
      { id: 'qr_verify', type: 'qr', x: 480, y: 570, width: 100, height: 100, zIndex: 3 },
      { id: 'cert_number', type: 'dynamic_text', placeholder: 'CERT-2026-0001', x: 30, y: 710, width: 300, height: 20, zIndex: 2, style: { color: '#AAAAAA', fontSize: '12px', fontFamily: 'monospace', textAlign: 'left' } },
    ]
  },
  {
    id: 'modern_minimal',
    name: 'حديث مبسط',
    background: { color: '#FFFDF5' },
    elements: [
      { id: 'side_bar', type: 'shape', color: '#050B18', x: 0, y: 0, width: 30, height: 750, zIndex: 1 },
      { id: 'cert_title', type: 'static_text', value: 'شهادة مشاركة', x: 80, y: 80, width: 900, height: 80, zIndex: 3, style: { color: '#050B18', fontSize: '48px', fontWeight: '900', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'cert_body', type: 'multiline_text', value: 'تُسلَّم هذه الشهادة لـ', x: 80, y: 200, width: 900, height: 40, zIndex: 2, style: { color: '#555555', fontSize: '20px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'full_name', type: 'dynamic_text', placeholder: 'الاسم الكامل', x: 80, y: 250, width: 900, height: 70, zIndex: 3, style: { color: '#D4AF37', fontSize: '46px', fontWeight: '900', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'cert_body_2', type: 'multiline_text', value: 'تقديراً لمشاركته الفاعلة في:', x: 80, y: 340, width: 900, height: 36, zIndex: 2, style: { color: '#555555', fontSize: '20px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'event_name', type: 'dynamic_text', placeholder: '[اسم الفعالية]', x: 80, y: 390, width: 900, height: 50, zIndex: 3, style: { color: '#050B18', fontSize: '28px', fontWeight: 'bold', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'qr_verify', type: 'qr', x: 80, y: 550, width: 120, height: 120, zIndex: 3 },
      { id: 'signature', type: 'signature', signerName: 'الرئيس', x: 730, y: 550, width: 250, height: 140, zIndex: 3 },
    ]
  }
];

// ── مساعد تحديث الخاصية المتداخلة ────────────────────────────────
function setNestedProp(obj, path, value) {
  const keys = path.split('.');
  const clone = { ...obj };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

// ── مكوّن إجراءات الرأس ───────────────────────────────────────────
const Header = ({ templateName, setTemplateName, certType, setCertType, onSave, onExport, saving, exporting, canUndo, canRedo, onUndo, onRedo }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: '#0D1527', borderBottom: '1px solid rgba(212,175,55,0.15)', direction: 'rtl', fontFamily: 'Cairo' }}>
    <div style={{ fontSize: 18, fontWeight: '900', color: '#D4AF37' }}>مصمم الشهادة</div>
    
    <select
      value={certType}
      onChange={e => setCertType(e.target.value)}
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F0F4F2', fontFamily: 'Cairo', padding: '6px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' }}
    >
      <option value="certificate_attendance">شهادة حضور</option>
      <option value="certificate_participation">شهادة مشاركة</option>
      <option value="certificate_training">شهادة تدريب</option>
    </select>

    <input
      value={templateName}
      onChange={e => setTemplateName(e.target.value)}
      style={{ flex: 1, maxWidth: 280, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F0F4F2', fontFamily: 'Cairo', padding: '6px 12px', fontSize: 13, outline: 'none' }}
      placeholder="اسم القالب..."
    />

    <div style={{ flex: 1 }} />

    {/* Undo/Redo */}
    <button onClick={onUndo} disabled={!canUndo} title="تراجع (Ctrl+Z)" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: canUndo ? '#F0F4F2' : 'rgba(255,255,255,0.2)', cursor: canUndo ? 'pointer' : 'default', padding: '6px 10px', fontSize: 14 }}>↩</button>
    <button onClick={onRedo} disabled={!canRedo} title="إعادة (Ctrl+Y)" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: canRedo ? '#F0F4F2' : 'rgba(255,255,255,0.2)', cursor: canRedo ? 'pointer' : 'default', padding: '6px 10px', fontSize: 14 }}>↪</button>

    <button
      onClick={onExport}
      disabled={exporting}
      style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37', borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 'bold', fontSize: 13 }}
    >
      {exporting ? 'جاري التصدير...' : '⬇ تصدير PDF'}
    </button>
    <button
      onClick={onSave}
      disabled={saving}
      style={{ background: '#D4AF37', color: '#050B18', border: 'none', borderRadius: 8, padding: '7px 22px', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: '900', fontSize: 13 }}
    >
      {saving ? 'جاري الحفظ...' : '💾 حفظ القالب'}
    </button>
  </div>
);

// ── المكوّن الرئيسي ───────────────────────────────────────────────
const CertificateDesigner = () => {
  const { selectedEventId: eventId } = useEvent();
  const [elements, setElements] = useState([]);
  const [background, setBackground] = useState({ color: '#FFFFFF' });
  const [selectedId, setSelectedId] = useState(null);
  const [templateName, setTemplateName] = useState('شهادة حضور قياسية');
  const [certType, setCertType] = useState('certificate_attendance');
  const [templateId, setTemplateId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Scale لـ Canvas المعاينة ليلائم الشاشة
  // عرض A4 بـ pixels = 1060. في الشاشة ربما يأخذ مساحة 750px مثلاً.
  // سنستخدم CSS transform أو zoom لتصغير المعاينة. سنعتمد على transform scale
  const [scale, setScale] = useState(1);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const s = Math.min((w - 80) / CANVAS_W, (h - 80) / CANVAS_H);
        setScale(s);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── تحميل القالب المحفوظ ──────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    templateService.listTemplates({ event_id: eventId })
      .then(list => {
        const certs = list.filter(t => t.type.startsWith('certificate'));
        if (certs.length > 0) {
          const t = certs[0];
          setTemplateId(t.id);
          setTemplateName(t.name);
          setCertType(t.type);
          const design = JSON.parse(t.design_json || '{}');
          if (design.elements) setElements(design.elements);
          if (design.background) setBackground(design.background);
          pushHistory(design.elements || []);
        } else {
          // تحميل Preset افتراضي
          handleLoadPreset(CERTIFICATE_PRESETS[0]);
        }
      }).catch(() => {});
  }, [eventId]);

  // ── سجل العمليات ──────────────────────────────────────────────
  const pushHistory = useCallback((els) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1);
      const next = [...trimmed, JSON.parse(JSON.stringify(els))];
      if (next.length > 20) next.shift();
      return next;
    });
    setHistoryIdx(prev => Math.min(prev + 1, 19));
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setElements(JSON.parse(JSON.stringify(history[historyIdx - 1])));
      setHistoryIdx(i => i - 1);
      setSelectedId(null);
    }
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setElements(JSON.parse(JSON.stringify(history[historyIdx + 1])));
      setHistoryIdx(i => i + 1);
      setSelectedId(null);
    }
  }, [history, historyIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setElements(prev => { const n = prev.filter(el => el.id !== selectedId); pushHistory(n); return n; });
        setSelectedId(null);
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, undo, redo, pushHistory]);

  // ── إضافة عنصر ─────────────────────────────────────────────────
  const handleAddElement = useCallback((elDef) => {
    const id = `${elDef.id}_${Date.now()}`;
    const el = {
      id,
      type: elDef.type,
      label: elDef.label,
      placeholder: elDef.placeholder,
      value: elDef.value || '',
      src: elDef.src || null,
      color: elDef.color || '#D4AF37',
      x: CANVAS_W / 2 - (elDef.defaultW || 200) / 2,
      y: CANVAS_H / 2 - (elDef.defaultH || 50) / 2,
      width: elDef.defaultW || 200,
      height: elDef.defaultH || 50,
      zIndex: elements.length + 1,
      style: elDef.defaultStyle || { color: '#050B18', fontSize: '20px', fontFamily: 'Cairo, sans-serif', textAlign: 'center' },
    };
    setElements(prev => { const n = [...prev, el]; pushHistory(n); return n; });
    setSelectedId(id);
  }, [elements.length, pushHistory]);

  const handleMove = useCallback((id, x, y) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, x, y } : el));
  }, []);

  const handleResize = useCallback((id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const handlePropChange = useCallback((path, value) => {
    if (path === '_delete') {
      setElements(prev => { const n = prev.filter(el => el.id !== selectedId); pushHistory(n); return n; });
      setSelectedId(null);
      return;
    }
    setElements(prev => {
      const n = prev.map(el => {
        if (el.id !== selectedId) return el;
        return setNestedProp(el, path, value);
      });
      return n;
    });
  }, [selectedId, pushHistory]);

  const handleReorder = useCallback((fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= elements.length) return;
    setElements(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      const reindexed = arr.map((el, i) => ({ ...el, zIndex: i + 1 }));
      pushHistory(reindexed);
      return reindexed;
    });
  }, [elements, pushHistory]);

  const handleLoadPreset = useCallback((preset) => {
    setElements(preset.elements);
    setBackground(preset.background);
    setSelectedId(null);
    pushHistory(preset.elements);
  }, [pushHistory]);

  const handleBackgroundChange = useCallback((key, val) => {
    setBackground(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const designJson = JSON.stringify({ elements, background });
      // width: 297, height: 210 for A4 landscape
      const payload = { name: templateName, type: certType, event_id: eventId, design_json: designJson, width_mm: 297, height_mm: 210, orientation: 'landscape' };
      if (templateId) {
        await templateService.updateTemplate(templateId, payload);
      } else {
        const res = await templateService.createTemplate(payload);
        setTemplateId(res.id);
      }
      pushHistory(elements);
      toast.success('تم حفظ قالب الشهادة بنجاح ✅');
    } catch {
      toast.error('فشل الحفظ، تأكد من الخادم');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await templateService.previewPdf({ elements, background }, certType);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${Date.now()}.pdf`;
      a.click();
      toast.success('تم تصدير الشهادة بنجاح ✅');
    } catch {
      toast.error('فشل تصدير الشهادة');
    } finally {
      setExporting(false);
    }
  };

  const selectedElement = useMemo(() => elements.find(el => el.id === selectedId), [elements, selectedId]);

  return (
    <DashboardLayout activePath="/dashboard/designer/certificate">
      <Toaster position="top-center" />
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: '#050B18', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.15)' }}>
        
        <Header
          templateName={templateName}
          setTemplateName={setTemplateName}
          certType={certType}
          setCertType={setCertType}
          onSave={handleSave}
          onExport={handleExport}
          saving={saving}
          exporting={exporting}
          canUndo={historyIdx > 0}
          canRedo={historyIdx < history.length - 1}
          onUndo={undo}
          onRedo={redo}
        />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          <div style={{ width: 220, background: '#071F14', borderLeft: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, overflowY: 'auto' }}>
            <LeftPanel
              elements={elements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={handleReorder}
              onAddElement={handleAddElement}
              onLoadPreset={handleLoadPreset}
              background={background}
              onBackgroundChange={handleBackgroundChange}
              presets={CERTIFICATE_PRESETS}
              elementTypes={CERTIFICATE_ELEMENTS}
            />
          </div>

          <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
            
            {!eventId && (
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'Cairo' }}>
                ⚠ يرجى اختيار فعالية
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.4)', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              A4 Landscape · 297×210mm · {CANVAS_W}×{CANVAS_H}px
            </div>

            <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
              <BadgeCanvas
                elements={elements}
                background={background}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={handleMove}
                onResize={handleResize}
                canvasW={CANVAS_W}
                canvasH={CANVAS_H}
              />
            </div>
          </div>

          <div style={{ width: 240, background: '#071F14', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(212,175,55,0.15)', fontSize: 10, color: '#D4AF37', fontWeight: 'bold', fontFamily: 'Cairo', textTransform: 'uppercase', letterSpacing: 1, direction: 'rtl' }}>
              خصائص العنصر
            </div>
            <PropertiesPanel
              element={selectedElement}
              onChange={handlePropChange}
              onDelete={() => {
                setElements(prev => { const n = prev.filter(el => el.id !== selectedId); pushHistory(n); return n; });
                setSelectedId(null);
              }}
            />
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default CertificateDesigner;
