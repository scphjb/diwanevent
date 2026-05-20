import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import BadgeCanvas from '../components/designer/BadgeCanvas';
import LeftPanel, { BADGE_ELEMENTS, BADGE_PRESETS } from '../components/designer/LeftPanel';
import PropertiesPanel from '../components/designer/PropertiesPanel';
import templateService from '../services/templateService';
import eventService from '../services/eventService';
import { useEvent } from '../context/EventContext';
import { toast, Toaster } from 'react-hot-toast';

// ── ثوابت ─────────────────────────────────────────────────────────
const CANVAS_W = 533;
const CANVAS_H = 378;

// ── مساعد تحديث الخاصية المتداخلة (مثلاً style.fontSize) ──────────
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
const Header = ({ templateName, setTemplateName, onSave, onExport, saving, exporting, canUndo, canRedo, onUndo, onRedo }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: '#0A3D2B', borderBottom: '1px solid rgba(212,175,55,0.15)', direction: 'rtl', fontFamily: 'Cairo' }}>
    <div style={{ fontSize: 18, fontWeight: '900', color: '#D4AF37' }}>مصمم الشارات</div>
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
      style={{ background: '#D4AF37', color: '#022C22', border: 'none', borderRadius: 8, padding: '7px 22px', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: '900', fontSize: 13 }}
    >
      {saving ? 'جاري الحفظ...' : '💾 حفظ القالب'}
    </button>
  </div>
);

// ── المكوّن الرئيسي ───────────────────────────────────────────────
const BadgeDesigner = () => {
  const { selectedEventId: eventId } = useEvent();
  const [elements, setElements] = useState([]);
  const [background, setBackground] = useState({ color: '#022C22' });
  const [selectedId, setSelectedId] = useState(null);
  const [templateName, setTemplateName] = useState('قالب شارة جديد');
  const [templateId, setTemplateId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [eventData, setEventData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false); // منع الحفظ المبكر

  // ── تحميل بيانات الفعالية ──────────────────────────────────────
  useEffect(() => {
    if (eventId) {
      eventService.getEventSettings(eventId)
        .then(data => setEventData(data))
        .catch(err => console.error("Error fetching event for designer:", err));
    }
  }, [eventId]);

  // ── تحميل القالب المحفوظ ──────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setIsLoaded(false);
    templateService.listTemplates({ event_id: eventId, type: 'badge' })
      .then(list => {
        if (list.length > 0) {
          const t = list[0];
          setTemplateId(t.id);
          setTemplateName(t.name);
          const design = JSON.parse(t.design_json || '{}');
          const loadedElements = design.elements || [];
          const loadedBackground = design.background || { color: '#022C22' };
          setElements(loadedElements);
          setBackground(loadedBackground);
          // إعادة ضبط سجل التاريخ بشكل صحيح
          setHistory([JSON.parse(JSON.stringify(loadedElements))]);
          setHistoryIdx(0);
        }
        setIsLoaded(true);
      }).catch(() => { setIsLoaded(true); });
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
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 80,
      width: elDef.defaultW || 180,
      height: elDef.defaultH || 32,
      zIndex: elements.length + 1,
      style: elDef.defaultStyle || { color: '#FFFFFF', fontSize: '14px', fontFamily: 'Cairo, sans-serif', textAlign: 'right' },
    };
    setElements(prev => { const n = [...prev, el]; pushHistory(n); return n; });
    setSelectedId(id);
  }, [elements.length, pushHistory]);

  // ── تحريك عنصر ─────────────────────────────────────────────────
  const handleMove = useCallback((id, x, y) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, x, y } : el));
  }, []);

  // ── تغيير الحجم ────────────────────────────────────────────────
  const handleResize = useCallback((id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  // ── تغيير خاصية من PropertiesPanel ────────────────────────────
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

  // ── إعادة الترتيب (Z-index) ─────────────────────────────────────
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

  // ── تحميل قالب جاهز ────────────────────────────────────────────
  const handleLoadPreset = useCallback((preset) => {
    setElements(preset.elements);
    setBackground(preset.background);
    setSelectedId(null);
    pushHistory(preset.elements);
  }, [pushHistory]);

  // ── الخلفية ────────────────────────────────────────────────────
  const handleBackgroundChange = useCallback((key, val) => {
    setBackground(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── الحفظ ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isLoaded) {
      toast.error('لا يزال القالب يتحمل، يرجى الانتظار');
      return;
    }
    if (elements.length === 0) {
      toast.error('لا يمكن حفظ قالب فارغ، يرجى إضافة عناصر أولاً');
      return;
    }
    setSaving(true);
    try {
      const designJson = JSON.stringify({ elements, background });
      const payload = { name: templateName, type: 'badge', event_id: eventId, design_json: designJson, width_mm: 148, height_mm: 105, orientation: 'landscape' };
      if (templateId) {
        await templateService.updateTemplate(templateId, payload);
      } else {
        const res = await templateService.createTemplate(payload);
        setTemplateId(res.id);
      }
      pushHistory(elements);
      toast.success(`تم حفظ القالب بنجاح ✅ (${elements.length} عناصر)`);
    } catch {
      toast.error('فشل الحفظ، تأكد من تشغيل الخادم');
    } finally {
      setSaving(false);
    }
  };

  // ── تصدير PDF ──────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await templateService.previewPdf({ elements, background }, 'badge');
      const a = document.createElement('a');
      a.href = url;
      a.download = `badge_${Date.now()}.pdf`;
      a.click();
      toast.success('تم تصدير PDF بنجاح ✅');
    } catch {
      toast.error('فشل تصدير PDF، تأكد من تشغيل الخادم');
    } finally {
      setExporting(false);
    }
  };

  const selectedElement = useMemo(() => elements.find(el => el.id === selectedId), [elements, selectedId]);

  return (
    <DashboardLayout activePath="/dashboard/designer/badge">
      <Toaster position="top-center" />
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: '#022C22', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.15)' }}>
        
        <Header
          templateName={templateName}
          setTemplateName={setTemplateName}
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

          {/* Panel الأيمن: أدوات وطبقات */}
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
            />
          </div>

          {/* Canvas المركزي */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', position: 'relative', overflow: 'hidden' }}>
            {/* شبكة نقطية خفيفة */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
            
            {!eventId && (
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'Cairo' }}>
                ⚠ يرجى اختيار فعالية أولاً من القائمة العلوية
              </div>
            )}

            {/* معلومات أبعاد */}
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.4)', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              A6 Landscape · 148×105mm · {CANVAS_W}×{CANVAS_H}px
            </div>

            <BadgeCanvas
              elements={elements}
              background={background}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={handleMove}
              onResize={handleResize}
              canvasW={CANVAS_W}
              canvasH={CANVAS_H}
              eventLogo={eventData?.logo_url}
            />
          </div>

          {/* Panel الأيسر: الخصائص */}
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

export default BadgeDesigner;
