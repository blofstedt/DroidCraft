import React, { useState, useEffect } from 'react';
import { UIElementRef } from '../types';

interface Props {
  element: UIElementRef;
  onUpdate: (newRect: { top: number, left: number, width: number, height: number }) => void;
  onFinish: (newRect: { top: number, left: number, width: number, height: number }) => void;
}

const GRID_SIZE = 8;

const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

const VisualTransformOverlay: React.FC<Props> = ({ element, onUpdate, onFinish }) => {
  const [rect, setRect] = useState(element.rect);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setRect(element.rect);
  }, [element.rect]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newTop = snap(e.clientY - dragOffset.y);
      const newLeft = snap(e.clientX - dragOffset.x);
      const updated = { ...rect, top: newTop, left: newLeft };
      setRect(updated);
      onUpdate(updated);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onFinish(rect);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, rect, onUpdate, onFinish]);

  return (
    <div 
      className="absolute border-2 border-blue-500 bg-blue-500/10 cursor-move z-[60] shadow-[0_0_15px_rgba(59,130,246,0.5)] group"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'all'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Grid Pattern Overlay when dragging */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] bg-[size:8px_8px]"></div>
      )}

      {/* Resize Handle - Bottom Right */}
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 cursor-nwse-resize rounded-tl-xl flex items-center justify-center shadow-lg hover:scale-125 transition-transform"
        onMouseDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const startW = rect.width;
          const startH = rect.height;

          const handleResize = (moveEvent: MouseEvent) => {
            const newW = snap(Math.max(GRID_SIZE, startW + (moveEvent.clientX - startX)));
            const newH = snap(Math.max(GRID_SIZE, startH + (moveEvent.clientY - startY)));
            const updated = { ...rect, width: newW, height: newH };
            setRect(updated);
            onUpdate(updated);
          };

          const stopResize = () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResize);
            setRect(prev => {
              onFinish(prev);
              return prev;
            });
          };

          window.addEventListener('mousemove', handleResize);
          window.addEventListener('mouseup', stopResize);
        }}
      >
        <div className="w-1 h-1 bg-white/60 rounded-full"></div>
      </div>
      
      {/* Target Label */}
      <div className="absolute -top-8 left-0 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg flex items-center gap-1.5">
        <span className="opacity-60">{element.tagName}</span>
        <span>#{element.id.substring(0,8)}</span>
      </div>

      {/* Dimensions Bubble */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-300 text-[8px] font-mono px-2 py-1 rounded-md whitespace-nowrap border border-slate-800 shadow-xl">
        {Math.round(rect.width)}x{Math.round(rect.height)} @ {Math.round(rect.left)},{Math.round(rect.top)}
      </div>
    </div>
  );
};

export default VisualTransformOverlay;