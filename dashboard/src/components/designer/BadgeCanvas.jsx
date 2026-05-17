import React from 'react';
import DraggableElement from './DraggableElement';

const BadgeCanvas = ({ elements, background, selectedId, onSelect, onMove, onResize, canvasW = 533, canvasH = 378, eventLogo }) => {
  const sorted = [...elements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

  return (
    <div
      className="relative shadow-2xl overflow-hidden select-none"
      style={{
        width: canvasW,
        height: canvasH,
        backgroundColor: background?.color || '#022C22',
        backgroundImage: background?.image ? `url(${background.image})` : (background?.gradient || 'none'),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 8,
        flexShrink: 0,
      }}
      onMouseDown={() => onSelect(null)}
    >
      {sorted.map((el) => (
        <DraggableElement
          key={el.id}
          element={el}
          isSelected={el.id === selectedId}
          onSelect={() => onSelect(el.id)}
          onMove={onMove}
          onResize={onResize}
          canvasW={canvasW}
          canvasH={canvasH}
          eventLogo={eventLogo}
        />
      ))}
    </div>
  );
};

export default BadgeCanvas;
