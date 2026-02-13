
import React, { useState, useRef, useEffect } from 'react';
import NativePwaFrame from './NativePwaFrame';
import { ScreenPosition, UIElementRef } from '../types';
import { MoveIcon, MousePointer2Icon, ZoomInIcon, ZoomOutIcon, MaximizeIcon } from 'lucide-react';

interface Props {
  files: Record<string, any>;
  activeFile: string;
  onSelectScreen: (path: string) => void;
  mode: 'build' | 'test';
  onInteract: (element: UIElementRef, event: any) => void;
  selectedElementId?: string;
  screenPositions: Record<string, ScreenPosition>;
  onUpdatePosition: (path: string, pos: ScreenPosition) => void;
  version: number;
}

const AppCanvas: React.FC<Props> = ({ 
  files, 
  activeFile, 
  onSelectScreen, 
  mode, 
  onInteract, 
  selectedElementId, 
  screenPositions,
  onUpdatePosition,
  version
}) => {
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html'));

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(prev => Math.min(Math.max(0.1, prev + delta), 2));
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
    }
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      }
    };
    const handleGlobalUp = () => setIsPanning(false);

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isPanning]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[#080808] cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
    >
      {/* Canvas Layer */}
      <div 
        className="absolute transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {htmlFiles.map((path) => {
          const pos = screenPositions[path] || { x: htmlFiles.indexOf(path) * 450, y: 0 };
          const isActive = path === activeFile;

          return (
            <div 
              key={path}
              className={`absolute transition-shadow duration-300 ${isActive ? 'z-50' : 'z-10'}`}
              style={{ left: pos.x, top: pos.y }}
            >
              {/* Screen Label */}
              <div 
                className={`mb-4 flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md cursor-pointer transition-all ${
                  isActive 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                  : 'bg-[#111]/80 border-white/10 text-slate-500 hover:border-white/30'
                }`}
                onClick={() => onSelectScreen(path)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startPos = { ...pos };

                  const handleDrag = (moveEvent: MouseEvent) => {
                    onUpdatePosition(path, {
                      x: startPos.x + (moveEvent.clientX - startX) / zoom,
                      y: startPos.y + (moveEvent.clientY - startY) / zoom
                    });
                  };

                  const stopDrag = () => {
                    window.removeEventListener('mousemove', handleDrag);
                    window.removeEventListener('mouseup', stopDrag);
                  };

                  window.addEventListener('mousemove', handleDrag);
                  window.addEventListener('mouseup', stopDrag);
                }}
              >
                <MaximizeIcon size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">{path}</span>
                {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
              </div>

              {/* Native Device Frame */}
              <div className={isActive ? 'ring-4 ring-blue-500/30 rounded-[4rem]' : ''}>
                <NativePwaFrame
                  key={`${path}-${version}`}
                  html={files[path]?.content || ''}
                  js={files['app.js']?.content || ''}
                  mode={isActive ? mode : 'test'}
                  highlightId={isActive ? selectedElementId : null}
                  onInteract={(el) => {
                    if (!isActive) onSelectScreen(path);
                    onInteract(el, null);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas HUD Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#111]/90 border border-white/10 p-2 rounded-2xl backdrop-blur-xl shadow-2xl z-[100]">
        <button 
          onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
          className="p-3 hover:bg-white/5 rounded-xl text-slate-400 transition-all"
        ><ZoomOutIcon size={18} /></button>
        <div className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[80px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button 
          onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
          className="p-3 hover:bg-white/5 rounded-xl text-slate-400 transition-all"
        ><ZoomInIcon size={18} /></button>
        <div className="w-px h-6 bg-white/10 mx-2" />
        <button 
          onClick={() => { setPan({ x: 100, y: 100 }); setZoom(0.6); }}
          className="p-3 hover:bg-white/5 rounded-xl text-slate-400 transition-all"
        ><MaximizeIcon size={18} /></button>
      </div>

      {/* Helper Text */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] pointer-events-none">
        Alt + Drag to Pan • Ctrl + Scroll to Zoom
      </div>
    </div>
  );
};

export default AppCanvas;
