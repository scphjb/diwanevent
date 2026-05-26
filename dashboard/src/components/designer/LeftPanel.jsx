import React from 'react';

export const BADGE_ELEMENTS = [
  { id: 'full_name',  icon: '👤', label: 'اسم المشارك',    type: 'dynamic_text', placeholder: 'اسم المشارك الكامل', defaultW: 320, defaultH: 40,  defaultStyle: { color: '#D4AF37', fontSize: '22px', fontWeight: 'bold', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
  { id: 'organization',    icon: '🏛️', label: 'الجهة',          type: 'dynamic_text', placeholder: 'اسم الجهة',          defaultW: 280, defaultH: 28, defaultStyle: { color: '#FFFFFF', fontSize: '14px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
  { id: 'department',      icon: '⚖️', label: 'القسم / التخصص',          type: 'dynamic_text', placeholder: 'القسم أو التخصص',    defaultW: 280, defaultH: 24, defaultStyle: { color: 'rgba(255,255,255,0.7)', fontSize: '12px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
  { id: 'role',       icon: '💼', label: 'الصفة',          type: 'dynamic_text', placeholder: 'الصفة أو المنصب',    defaultW: 200, defaultH: 24, defaultStyle: { color: '#D4AF37', fontSize: '12px', fontWeight: 'bold', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
  { id: 'order_num',  icon: '#',  label: 'رقم المشارك',   type: 'dynamic_text', placeholder: 'DWN-001',            defaultW: 120, defaultH: 20, defaultStyle: { color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'monospace' } },
  { id: 'seat_info',  icon: '💺', label: 'رقم المقعد',    type: 'dynamic_text', placeholder: 'قاعة A - مقعد 15',  defaultW: 200, defaultH: 22, defaultStyle: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
  { id: 'event_name', icon: '📅', label: 'اسم الفعالية',  type: 'dynamic_text', placeholder: '[اسم الفعالية]',    defaultW: 533, defaultH: 28, defaultStyle: { color: '#050B18', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'event_location', icon: '📍', label: 'مكان الفعالية',type: 'dynamic_text', placeholder: '[مكان الفعالية]',  defaultW: 200, defaultH: 22, defaultStyle: { color: 'rgba(255,255,255,0.6)', fontSize: '11px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'event_date', icon: '🕐', label: 'تاريخ الفعالية',type: 'dynamic_text', placeholder: '[تاريخ الفعالية]',  defaultW: 200, defaultH: 22, defaultStyle: { color: 'rgba(255,255,255,0.6)', fontSize: '11px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
  { id: 'qr_code',    icon: '▦',  label: 'رمز QR',        type: 'qr',           defaultW: 90,  defaultH: 90 },
  { id: 'logo',       icon: '🖼', label: 'شعار الفعالية', type: 'image',        defaultW: 80,  defaultH: 80 },
  { id: 'rectangle',  icon: '▬',  label: 'مستطيل / شريط', type: 'shape',        defaultW: 533, defaultH: 28, color: '#D4AF37' },
  { id: 'role_color_banner', icon: '🎨', label: 'شريط الصفة الديناميكي', type: 'role_color_shape', defaultW: 533, defaultH: 30, roleColors: { vip: '#F59E0B', speaker: '#8B5CF6', press: '#3B82F6', organizer: '#EF4444', default: '#2A64EC' } },
  { id: 'line',       icon: '—',  label: 'خط فاصل',       type: 'shape',        defaultW: 400, defaultH: 2,  color: 'rgba(212,175,55,0.5)' },
];

export const BADGE_PRESETS = [
  {
    id: 'classic_dark',
    name: 'كلاسيك داكن',
    preview: '#050B18',
    background: { color: '#050B18' },
    elements: [
      { id: 'top_bar', type: 'shape', color: '#D4AF37', x: 0, y: 0, width: 533, height: 30, zIndex: 1 },
      { id: 'event_name', type: 'dynamic_text', placeholder: '[اسم الفعالية]', x: 0, y: 5, width: 533, height: 22, zIndex: 2, style: { color: '#050B18', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'full_name', type: 'dynamic_text', placeholder: 'اسم المشارك الكامل', x: 20, y: 55, width: 350, height: 44, zIndex: 3, style: { color: '#D4AF37', fontSize: '24px', fontWeight: '900', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'organization', type: 'dynamic_text', placeholder: 'اسم الجهة', x: 20, y: 104, width: 320, height: 26, zIndex: 3, style: { color: '#FFFFFF', fontSize: '14px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'department', type: 'dynamic_text', placeholder: 'القسم / التخصص', x: 20, y: 132, width: 280, height: 22, zIndex: 3, style: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'order_num', type: 'dynamic_text', placeholder: 'DWN-001', x: 20, y: 345, width: 140, height: 20, zIndex: 3, style: { color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace' } },
      { id: 'qr_code', type: 'qr', x: 413, y: 260, width: 100, height: 100, zIndex: 3 },
    ]
  },
  {
    id: 'white_minimal',
    name: 'أبيض نظيف',
    preview: '#FFFFFF',
    background: { color: '#FFFFFF' },
    elements: [
      { id: 'side_bar', type: 'shape', color: '#050B18', x: 0, y: 0, width: 10, height: 378, zIndex: 1 },
      { id: 'top_bar', type: 'shape', color: '#D4AF37', x: 0, y: 0, width: 533, height: 4, zIndex: 2 },
      { id: 'full_name', type: 'dynamic_text', placeholder: 'الاسم الكامل', x: 22, y: 50, width: 380, height: 50, zIndex: 2, style: { color: '#050B18', fontSize: '28px', fontWeight: '900', fontFamily: 'Cairo, sans-serif', textAlign: 'right' } },
      { id: 'organization', type: 'dynamic_text', placeholder: 'الجهة', x: 22, y: 104, width: 380, height: 28, zIndex: 2, style: { color: '#D4AF37', fontSize: '15px', fontFamily: 'Cairo, sans-serif', textAlign: 'right' } },
      { id: 'role', type: 'dynamic_text', placeholder: 'الصفة', x: 22, y: 136, width: 280, height: 22, zIndex: 2, style: { color: '#555', fontSize: '12px', fontFamily: 'Cairo, sans-serif', textAlign: 'right' } },
      { id: 'qr_code', type: 'qr', x: 413, y: 258, width: 100, height: 100, zIndex: 2 },
      { id: 'order_num', type: 'dynamic_text', placeholder: 'DWN-001', x: 22, y: 348, width: 140, height: 18, zIndex: 2, style: { color: '#aaa', fontSize: '10px', fontFamily: 'monospace' } },
    ]
  },
  {
    id: 'gold_premium',
    name: 'ذهبي فاخر',
    preview: '#1A0E00',
    background: { color: '#1A0E00', gradient: 'linear-gradient(135deg, #1A0E00 0%, #2D1F00 100%)' },
    elements: [
      { id: 'frame', type: 'shape', color: '#D4AF37', x: 0, y: 0, width: 533, height: 4, zIndex: 1 },
      { id: 'frame_b', type: 'shape', color: '#D4AF37', x: 0, y: 374, width: 533, height: 4, zIndex: 1 },
      { id: 'full_name', type: 'dynamic_text', placeholder: 'اسم المشارك الكامل', x: 20, y: 60, width: 400, height: 50, zIndex: 3, style: { color: '#D4AF37', fontSize: '26px', fontWeight: '900', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'organization', type: 'dynamic_text', placeholder: 'الجهة', x: 20, y: 114, width: 360, height: 28, zIndex: 3, style: { color: 'rgba(212,175,55,0.7)', fontSize: '14px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'qr_code', type: 'qr', x: 413, y: 258, width: 100, height: 100, zIndex: 3 },
      { id: 'order_num', type: 'dynamic_text', placeholder: 'DWN-001', x: 20, y: 348, width: 140, height: 18, zIndex: 3, style: { color: 'rgba(212,175,55,0.35)', fontSize: '10px', fontFamily: 'monospace' } },
    ]
  },
  {
    id: 'blue_official',
    name: 'رسمي أزرق',
    preview: '#1B3A6B',
    background: { color: '#1B3A6B' },
    elements: [
      { id: 'top_bar', type: 'shape', color: '#FFFFFF', x: 0, y: 0, width: 533, height: 28, zIndex: 1 },
      { id: 'event_name', type: 'dynamic_text', placeholder: '[اسم الفعالية]', x: 0, y: 4, width: 533, height: 22, zIndex: 2, style: { color: '#1B3A6B', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Cairo, sans-serif' } },
      { id: 'full_name', type: 'dynamic_text', placeholder: 'اسم المشارك الكامل', x: 20, y: 55, width: 380, height: 44, zIndex: 3, style: { color: '#FFFFFF', fontSize: '24px', fontWeight: '900', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'organization', type: 'dynamic_text', placeholder: 'اسم الجهة', x: 20, y: 104, width: 320, height: 26, zIndex: 3, style: { color: 'rgba(255,255,255,0.8)', fontSize: '14px', textAlign: 'right', fontFamily: 'Cairo, sans-serif' } },
      { id: 'qr_code', type: 'qr', x: 413, y: 260, width: 100, height: 100, zIndex: 3 },
      { id: 'bottom_bar', type: 'shape', color: '#2563EB', x: 0, y: 370, width: 533, height: 8, zIndex: 1 },
    ]
  },
];

const LeftPanel = ({ elements, selectedId, onSelect, onReorder, onAddElement, onLoadPreset, background, onBackgroundChange, presets = BADGE_PRESETS, elementTypes = BADGE_ELEMENTS }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl', fontFamily: 'Cairo', overflowY: 'auto' }}>
      
      {/* قوالب جاهزة */}
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, color: '#D4AF37', fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>قوالب جاهزة</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset)}
              title={preset.name}
              style={{ aspectRatio: '1.4', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: preset.background?.color || '#050B18', overflow: 'hidden', transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', textAlign: 'center', padding: '4px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#D4AF37'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* الخلفية */}
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, color: '#D4AF37', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>خلفية التصميم</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input type="color" value={background?.color || '#050B18'} onChange={e => onBackgroundChange('color', e.target.value)} style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
          <span style={{ fontSize: 12, color: 'rgba(240,244,242,0.5)' }}>لون الخلفية</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: 'rgba(240,244,242,0.6)' }}>
          🖼 رفع صورة خلفية
          <input type="file" hidden accept="image/*" onChange={e => {
            const f = e.target.files[0]; if (!f) return;
            const r = new FileReader(); r.onloadend = () => onBackgroundChange('image', r.result); r.readAsDataURL(f);
          }} />
        </label>
      </div>

      {/* إضافة عنصر */}
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, color: '#D4AF37', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>إضافة عنصر</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {elementTypes.map(el => (
            <button
              key={el.id + '_btn'}
              onClick={() => onAddElement(el)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(240,244,242,0.65)', fontSize: 12, fontFamily: 'Cairo', textAlign: 'right', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#D4AF37', fontSize: 14 }}>+</span>
              <span>{el.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* الطبقات */}
      <div style={{ padding: 12, flex: 1 }}>
        <div style={{ fontSize: 10, color: '#D4AF37', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          الطبقات ({elements.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[...elements].reverse().map((el, revI) => {
            const i = elements.length - 1 - revI;
            return (
              <div
                key={el.id}
                onClick={() => onSelect(el.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 8, cursor: 'pointer', background: selectedId === el.id ? 'rgba(212,175,55,0.18)' : 'transparent', color: selectedId === el.id ? '#D4AF37' : 'rgba(240,244,242,0.85)', fontSize: 12, fontFamily: 'Cairo', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (el.id !== selectedId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (el.id !== selectedId) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {el.label || (el.type === 'static_text' || el.type === 'dynamic_text' ? el.value || el.placeholder || el.id : el.id)}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={e => { e.stopPropagation(); onReorder(i, i + 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,244,242,0.3)', fontSize: 11, padding: '1px 3px' }}>↑</button>
                  <button onClick={e => { e.stopPropagation(); onReorder(i, i - 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,244,242,0.3)', fontSize: 11, padding: '1px 3px' }}>↓</button>
                </div>
              </div>
            );
          })}
          {elements.length === 0 && <div style={{ color: 'rgba(240,244,242,0.2)', fontSize: 11, textAlign: 'center', padding: 12 }}>لا توجد طبقات</div>}
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
