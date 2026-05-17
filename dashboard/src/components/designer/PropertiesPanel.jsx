import React from 'react';

const FONTS = [
  { value: 'Cairo, sans-serif', label: 'Cairo (عربي حديث)' },
  { value: 'Amiri, serif', label: 'Amiri (رسمي كلاسيكي)' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: "'IBM Plex Arabic', sans-serif", label: 'IBM Plex Arabic' },
  { value: 'monospace', label: 'Monospace (رقمي)' },
];

const Row = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, color: 'rgba(212,175,55,0.7)', fontFamily: 'Cairo', marginBottom: 4, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    {children}
  </div>
);

const InputBase = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F4F2', fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box', padding: '7px 10px', fontSize: 13 };

const PropertiesPanel = ({ element, onChange, onDelete }) => {
  if (!element) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'Cairo', color: 'rgba(240,244,242,0.3)', fontSize: 13, marginTop: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
        انقر على عنصر لتعديل خصائصه
      </div>
    );
  }

  const style = element.style || {};
  const set = (path, val) => onChange(path, val);

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%', direction: 'rtl', fontFamily: 'Cairo' }}>
      <div style={{ fontSize: 13, color: '#D4AF37', fontWeight: 'bold', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        {element.label}
      </div>

      {/* النص القابل للتعديل */}
      {(element.type === 'static_text' || element.type === 'multiline_text') && (
        <Row label="النص">
          <textarea
            value={element.value || ''}
            onChange={(e) => set('value', e.target.value)}
            rows={3}
            style={{ ...InputBase, resize: 'vertical', lineHeight: 1.5 }}
          />
        </Row>
      )}

      {/* نوع التوقيع */}
      {element.type === 'signature' && (
        <Row label="اسم الموقِّع">
          <input type="text" value={element.signerName || ''} onChange={(e) => set('signerName', e.target.value)} style={InputBase} />
        </Row>
      )}

      {/* لون الشكل */}
      {element.type === 'shape' && (
        <Row label="لون الشكل">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={element.color || '#D4AF37'} onChange={(e) => set('color', e.target.value)} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
            <input type="text" value={element.color || '#D4AF37'} onChange={(e) => set('color', e.target.value)} style={{ ...InputBase, flex: 1 }} />
          </div>
        </Row>
      )}

      {/* الشريط اللوني الديناميكي */}
      {element.type === 'role_color_shape' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#D4AF37', marginBottom: 8, fontWeight: 'bold' }}>ألوان الفئات (تتغير تلقائياً حسب الصفة)</div>
          {[
            { key: 'vip', label: '⭐ ضيف VIP / شرف' },
            { key: 'speaker', label: '🎤 متحدث' },
            { key: 'press', label: '📰 صحافة وإعلام' },
            { key: 'organizer', label: '⚙️ لجنة تنظيم' },
            { key: 'default', label: '👤 مشارك (افتراضي)' }
          ].map(({ key, label }) => (
            <Row key={key} label={label}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={element.roleColors?.[key] || '#10B981'} 
                  onChange={(e) => set(`roleColors.${key}`, e.target.value)} 
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} 
                />
                <input 
                  type="text" 
                  value={element.roleColors?.[key] || '#10B981'} 
                  onChange={(e) => set(`roleColors.${key}`, e.target.value)} 
                  style={{ ...InputBase, flex: 1 }} 
                />
              </div>
            </Row>
          ))}
        </div>
      )}

      {/* لون الإطار */}
      {element.type === 'frame' && (
        <Row label="لون الإطار">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={element.color || '#D4AF37'} onChange={(e) => set('color', e.target.value)} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
            <input type="text" value={element.color || '#D4AF37'} onChange={(e) => set('color', e.target.value)} style={{ ...InputBase, flex: 1 }} />
          </div>
        </Row>
      )}

      {/* رفع صورة للشعار */}
      {element.type === 'image' && (
        <Row label="الصورة">
          <label style={{ display: 'block', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', borderRadius: 8, padding: '8px 12px', textAlign: 'center', cursor: 'pointer', fontSize: 12 }}>
            رفع صورة...
            <input type="file" accept="image/*" hidden onChange={(e) => {
              const f = e.target.files[0]; if (!f) return;
              const r = new FileReader(); r.onloadend = () => set('src', r.result); r.readAsDataURL(f);
            }} />
          </label>
        </Row>
      )}

      {/* خصائص الخط للنصوص */}
      {['dynamic_text', 'static_text', 'multiline_text'].includes(element.type) && (
        <>
          <Row label="نوع الخط">
            <select value={style.fontFamily || 'Cairo, sans-serif'} onChange={(e) => set('style.fontFamily', e.target.value)} style={{ ...InputBase, cursor: 'pointer' }}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Row>

          <Row label={`حجم الخط: ${parseInt(style.fontSize) || 14}px`}>
            <input type="range" min={8} max={72} value={parseInt(style.fontSize) || 14} onChange={(e) => set('style.fontSize', e.target.value + 'px')} style={{ width: '100%', accentColor: '#D4AF37' }} />
          </Row>

          <Row label="لون النص">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={style.color || '#FFFFFF'} onChange={(e) => set('style.color', e.target.value)} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
              <input type="text" value={style.color || '#FFFFFF'} onChange={(e) => set('style.color', e.target.value)} style={{ ...InputBase, flex: 1 }} />
            </div>
          </Row>

          <Row label="وزن الخط">
            <div style={{ display: 'flex', gap: 6 }}>
              {[['normal','عادي'],['bold','عريض'],['900','أسود']].map(([v, l]) => (
                <button key={v} onClick={() => set('style.fontWeight', v)} style={{ flex:1, padding:'6px 4px', background: style.fontWeight === v ? '#D4AF37' : 'rgba(255,255,255,0.05)', color: style.fontWeight === v ? '#022C22' : '#F0F4F2', border:'1px solid rgba(212,175,55,0.3)', borderRadius:8, cursor:'pointer', fontFamily:'Cairo', fontSize:11 }}>{l}</button>
              ))}
            </div>
          </Row>

          <Row label="المحاذاة">
            <div style={{ display: 'flex', gap: 6 }}>
              {[['right','←يمين'],['center','وسط'],['left','يسار→']].map(([v, l]) => (
                <button key={v} onClick={() => set('style.textAlign', v)} style={{ flex:1, padding:'6px 4px', background: style.textAlign === v ? '#D4AF37' : 'rgba(255,255,255,0.05)', color: style.textAlign === v ? '#022C22' : '#F0F4F2', border:'1px solid rgba(212,175,55,0.3)', borderRadius:8, cursor:'pointer', fontFamily:'Cairo', fontSize:11 }}>{l}</button>
              ))}
            </div>
          </Row>
        </>
      )}

      {/* الموضع والحجم */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontSize: 10, color: 'rgba(240,244,242,0.4)', marginBottom: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>الموضع والحجم</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['X', 'x'],['Y', 'y'],['العرض', 'width'],['الارتفاع', 'height']].map(([label, key]) => (
            <div key={key}>
              <div style={{ fontSize: 9, color: 'rgba(240,244,242,0.3)', marginBottom: 3 }}>{label}</div>
              <input
                type="number"
                value={Math.round(element[key] || 0)}
                onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
                style={{ ...InputBase, padding: '5px 8px', fontSize: 12, textAlign: 'center' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* حذف */}
      <button
        onClick={onDelete}
        style={{ width:'100%', marginTop:16, padding:'9px', background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, cursor:'pointer', fontFamily:'Cairo', fontSize:13 }}
      >
        🗑️ حذف العنصر
      </button>
    </div>
  );
};

export default PropertiesPanel;
