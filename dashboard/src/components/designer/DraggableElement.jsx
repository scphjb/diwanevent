import React, { useCallback } from 'react';
import { QrCode } from 'lucide-react';
import { getImageUrl } from '../../utils/image';

const ResizeHandles = ({ element, onResize }) => {
  const handles = [
    { cursor: 'nwse-resize', style: { top: -4, left: -4 },     dx: -1, dy: -1, dw: 1, dh: 1 },
    { cursor: 'nesw-resize', style: { top: -4, right: -4 },    dx:  0, dy: -1, dw: 1, dh: 1 },
    { cursor: 'nesw-resize', style: { bottom: -4, left: -4 },  dx: -1, dy:  0, dw: 1, dh: 1 },
    { cursor: 'nwse-resize', style: { bottom: -4, right: -4 }, dx:  0, dy:  0, dw: 1, dh: 1 },
  ];
  const handleMouseDown = (e, h) => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const se = { x: element.x, y: element.y, width: element.width, height: element.height };
    const mv = (me) => {
      const dx = me.clientX - sx, dy = me.clientY - sy;
      onResize({ x: se.x + h.dx * dx, y: se.y + h.dy * dy, width: Math.max(30, se.width + h.dw * dx), height: Math.max(16, se.height + h.dh * dy) });
    };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  };
  return handles.map((h, i) => (
    <div key={i} onMouseDown={(e) => handleMouseDown(e, h)} style={{ position:'absolute', width:8, height:8, background:'#D4AF37', border:'1.5px solid white', borderRadius:2, cursor:h.cursor, zIndex:1000, ...h.style }} />
  ));
};

const ElementContent = ({ element }) => {
  const textStyle = { display:'block', width:'100%', height:'100%', overflow:'hidden', whiteSpace:'pre-wrap', fontFamily: element.style?.fontFamily || 'Cairo, sans-serif', ...element.style };
  switch (element.type) {
    case 'dynamic_text':
      return <span style={textStyle}>{element.placeholder || `[${element.label}]`}</span>;
    case 'static_text': case 'multiline_text':
      return <span style={textStyle}>{element.value || element.label}</span>;
    case 'qr':
      return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'white', padding:4 }}><QrCode style={{ width:'100%', height:'100%', color:'#000' }} /></div>;
    case 'image':
      {
        const displaySrc = element.id === 'logo' && !element.src ? getImageUrl(element.eventLogo) : element.src;
        return displaySrc
          ? <img src={displaySrc} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none' }} />
          : <div style={{ width:'100%', height:'100%', border:'2px dashed rgba(212,175,55,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'rgba(212,175,55,0.7)', fontFamily:'Cairo' }}>{element.label || 'صورة'}</div>;
      }
    case 'shape':
      return <div style={{ width:'100%', height:'100%', backgroundColor: element.color || '#D4AF37', borderRadius: element.borderRadius || 0 }} />;
    case 'role_color_shape':
      return (
        <div style={{ 
          width:'100%', 
          height:'100%', 
          background: `linear-gradient(90deg, ${element.roleColors?.vip || '#F59E0B'} 0%, ${element.roleColors?.speaker || '#8B5CF6'} 30%, ${element.roleColors?.press || '#3B82F6'} 60%, ${element.roleColors?.default || '#10B981'} 100%)`, 
          borderRadius: element.borderRadius || 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          opacity: 0.95
        }}>
          <span style={{ fontSize: 9, color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontFamily: 'Cairo' }}>شريط الصفة الديناميكي 🎨</span>
        </div>
      );
    case 'signature':
      return (
        <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', borderBottom:'1px dashed #aaa', paddingBottom:4, fontFamily:'Cairo', fontSize:10, color:'#999', textAlign:'center' }}>
          {element.image ? <img src={element.image} style={{ maxHeight:'70%', objectFit:'contain' }} alt="sig" /> : <><div>[ختم وتوقيع]</div><div style={{fontSize:9}}>{element.signerName || 'رئيس اللجنة'}</div></>}
        </div>
      );
    case 'watermark':
      return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: element.style?.fontSize || 60, color: element.style?.color || 'rgba(2,44,34,0.05)', fontFamily:'Cairo', fontWeight:'900', transform:'rotate(-30deg)', userSelect:'none', pointerEvents:'none' }}>{element.value || 'ديوان'}</div>;
    default: return null;
  }
};

const DraggableElement = ({ element, isSelected, onSelect, onMove, onResize, canvasW, canvasH, eventLogo }) => {
  const elementWithLogo = { ...element, eventLogo };
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    const startX = e.clientX - element.x, startY = e.clientY - element.y;
    const mv = (me) => {
      onMove(element.id, Math.max(0, Math.min(canvasW - element.width, me.clientX - startX)), Math.max(0, Math.min(canvasH - element.height, me.clientY - startY)));
    };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }, [element, canvasW, canvasH, onSelect, onMove]);

  if (element.type === 'frame') {
    return (
      <div onMouseDown={handleMouseDown} style={{ position:'absolute', inset:0, cursor:'move', zIndex: isSelected ? 100 : element.zIndex || 1, outline: isSelected ? '2px dashed #D4AF37' : 'none' }}>
        <div style={{ position:'absolute', inset:8, border:`2px solid ${element.color || '#D4AF37'}`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:14, border:`1px solid ${element.color || '#D4AF37'}`, pointerEvents:'none' }} />
        {[{top:6,left:6},{top:6,right:6},{bottom:6,left:6},{bottom:6,right:6}].map((pos,i) => (
          <div key={i} style={{ position:'absolute', width:20, height:20, borderTop:i<2?`3px solid ${element.color || '#D4AF37'}`:'none', borderBottom:i>=2?`3px solid ${element.color || '#D4AF37'}`:'none', borderLeft:(i===0||i===2)?`3px solid ${element.color || '#D4AF37'}`:'none', borderRight:(i===1||i===3)?`3px solid ${element.color || '#D4AF37'}`:'none', pointerEvents:'none', ...pos }} />
        ))}
      </div>
    );
  }

  return (
    <div onMouseDown={handleMouseDown} style={{ position:'absolute', left:element.x, top:element.y, width:element.width, height:element.height, cursor:'move', outline: isSelected ? '2px solid #D4AF37' : 'none', outlineOffset:2, zIndex: isSelected ? 100 : element.zIndex || 1, userSelect:'none' }}>
      <ElementContent element={elementWithLogo} />
      {isSelected && (
        <>
          <ResizeHandles element={element} onResize={(u) => onResize(element.id, u)} />
          <div style={{ position:'absolute', top:-20, left:0, background:'#D4AF37', color:'#022C22', fontSize:9, fontFamily:'monospace', fontWeight:'bold', padding:'1px 6px', borderRadius:4, whiteSpace:'nowrap', pointerEvents:'none' }}>
            {Math.round(element.x)}, {Math.round(element.y)} · {Math.round(element.width)}×{Math.round(element.height)}
          </div>
        </>
      )}
    </div>
  );
};

export default DraggableElement;
