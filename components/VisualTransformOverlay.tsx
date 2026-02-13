
import React, { useState, useEffect } from 'react';
import { UIElementRef } from '../types';

interface Props {
  element: UIElementRef;
  onUpdate: (newRect: { top: number, left: number, width: number, height: number }) => void;
  onFinish: () => void;
}

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
      const newTop = e.clientY - dragOffset.y;
      const newLeft = e.clientX - dragOffset.x;
      const updated = { ...rect, top: newTop, left: newLeft };
      setRect(updated);
      onUpdate(updated);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, rect, onUpdate]);

  return (
    <div 
      className="absolute border-2 border-blue-500 bg-blue-500/10 cursor-move z-[60] shadow-[0_0_15px_rgba(59,130,246,0.5)]"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'all'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Resizer Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 cursor-nwse-resize rounded-tl-lg"
        onMouseDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const startW = rect.width;
          const startH = rect.height;

          const handleResize = (moveEvent: MouseEvent) => {
            const newW = startW + (moveEvent.clientX - startX);
            const newH = startH + (moveEvent.clientY - startY);
            const updated = { ...rect, width: Math.max(20, newW), height: Math.max(20, newH) };
            setRect(updated);
            onUpdate(updated);
          };

          const stopResize = () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResize);
          };

          window.addEventListener('mousemove', handleResize);
          window.addEventListener('mouseup', stopResize);
        }}
      />
      
      {/* Done Button */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
        Release to apply changes
      </div>
    </div>
  );
};

export default VisualTransformOverlay;
