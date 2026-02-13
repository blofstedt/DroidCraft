
import React, { useState, useRef, useEffect } from 'react';
import NativePwaFrame from './NativePwaFrame';
import NavigationArrows from './NavigationArrows';
import { ScreenPosition, UIElementRef, NavigationConnection } from '../types';
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon } from 'lucide-react';

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
  connections: NavigationConnection[];
  onAddConnection: (connection: NavigationConnection) => void;
  onRemoveConnection: (connectionId: string) => void;
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
  version,
  connections,
  onAddConnection,
  onRemoveConnection
}) => {
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{ screen: string; elementId: string; elementLabel: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; screen: string; element?: UIElementRef } | null>(null);
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
    if (contextMenu) setContextMenu(null);
  };

  const handleScreenClick = (path: string) => {
    if (connectingFrom) {
      if (connectingFrom.screen !== path) {
        const newConnection: NavigationConnection = {
          id: Date.now().toString(),
          fromScreen: connectingFrom.screen,
          fromElementId: connectingFrom.elementId,
          fromElementLabel: connectingFrom.elementLabel,
          toScreen: path,
          action: 'navigate'
        };
        onAddConnection(newConnection);
      }
      setConnectingFrom(null);
      return;
    }
    onSelectScreen(path);
  };

  const handleContextMenu = (e: React.MouseEvent, screen: string, element?: UIElementRef) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== 'build') return;
    setContextMenu({ x: e.clientX, y: e.clientY, screen, element });
  };

  const startConnecting = (screen: string, elementId: string, elementLabel: string) => {
    setConnectingFrom({ screen, elementId, elementLabel });
    setContextMenu(null);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setConnectingFrom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`flex-1 relative overflow-hidden bg-[#080808] ${connectingFrom ? 'cursor-pointer' : 'cursor-crosshair'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
    >
      {/* Navigation Arrows Layer */}
      <NavigationArrows
        connections={connections}
        screenPositions={screenPositions}
        htmlFiles={htmlFiles}
        zoom={zoom}
        pan={pan}
        onAddConnection={onAddConnection}
        onRemoveConnection={onRemoveConnection}
        activeFile={activeFile}
        connectingFrom={connectingFrom}
        onStartConnect={(screen, elementId, elementLabel) => setConnectingFrom({ screen, elementId, elementLabel })}
        onCancelConnect={() => setConnectingFrom(null)}
      />

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
              className={`absolute transition-shadow duration-300 ${isActive ? 'z-50' : 'z-10'} ${connectingFrom && connectingFrom.screen !== path ? 'ring-4 ring-orange-500/30 rounded-[4rem] animate-pulse' : ''}`}
              style={{ left: pos.x, top: pos.y }}
            >
              {/* Screen Label */}
              <div 
                className={`mb-4 flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md cursor-pointer transition-all ${
                  isActive 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                  : connectingFrom && connectingFrom.screen !== path
                  ? 'bg-orange-600/80 border-orange-400 text-white shadow-lg shadow-orange-900/40'
                  : 'bg-[#111]/80 border-white/10 text-slate-500 hover:border-white/30'
                }`}
                onClick={() => handleScreenClick(path)}
                onContextMenu={(e) => handleContextMenu(e, path)}
                onMouseDown={(e) => {
                  if (connectingFrom) return;
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
              <div 
                className={isActive ? 'ring-4 ring-blue-500/30 rounded-[4rem]' : ''}
                onContextMenu={(e) => {
                  if (mode === 'build') {
                    handleContextMenu(e, path);
                  }
                }}
              >
                <NativePwaFrame
                  key={`${path}-${version}`}
                  html={files[path]?.content || ''}
                  js={(files['app.js']?.content || '') + '\n' + (files[path.replace('.html', '.nav.js')]?.content || '')}
                  mode={isActive ? mode : 'test'}
                  highlightId={isActive ? selectedElementId : null}
                  onInteract={(el) => {
                    if (connectingFrom) {
                      if (connectingFrom.screen !== path) {
                        const newConnection: NavigationConnection = {
                          id: Date.now().toString(),
                          fromScreen: connectingFrom.screen,
                          fromElementId: connectingFrom.elementId,
                          fromElementLabel: connectingFrom.elementLabel,
                          toScreen: path,
                          action: 'navigate'
                        };
                        onAddConnection(newConnection);
                        setConnectingFrom(null);
                      }
                      return;
                    }
                    if (!isActive) onSelectScreen(path);
                    onInteract(el, null);
                  }}
                  onRightClick={(el) => {
                    if (mode === 'build' && el) {
                      startConnecting(path, el.id, el.text || el.tagName || 'Element');
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-2 border-b border-white/5 mb-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              {contextMenu.screen} {contextMenu.element ? `· ${contextMenu.element.tagName}` : ''}
            </span>
          </div>
          {htmlFiles.filter(f => f !== contextMenu.screen).map(targetScreen => (
            <button
              key={targetScreen}
              onClick={() => {
                const elementId = contextMenu.element?.id || `${contextMenu.screen}-element`;
                const elementLabel = contextMenu.element?.text?.substring(0, 20) || contextMenu.element?.tagName || 'Element';
                const newConnection: NavigationConnection = {
                  id: Date.now().toString(),
                  fromScreen: contextMenu.screen,
                  fromElementId: elementId,
                  fromElementLabel: elementLabel,
                  toScreen: targetScreen,
                  action: 'navigate'
                };
                onAddConnection(newConnection);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-all group"
            >
              <div className="w-6 h-6 bg-orange-600/20 rounded-lg flex items-center justify-center group-hover:bg-orange-600/30 transition-all">
                <MaximizeIcon size={10} className="text-orange-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-300 block">Navigate to {targetScreen}</span>
                <span className="text-[8px] text-slate-600">Creates arrow connection</span>
              </div>
            </button>
          ))}
          <div className="border-t border-white/5 mt-1 pt-1">
            <button
              onClick={() => {
                const elementId = contextMenu.element?.id || `${contextMenu.screen}-element`;
                const elementLabel = contextMenu.element?.text?.substring(0, 20) || contextMenu.element?.tagName || 'Element';
                startConnecting(contextMenu.screen, elementId, elementLabel);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-all"
            >
              <div className="w-6 h-6 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <MaximizeIcon size={10} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-400">Pick target screen...</span>
            </button>
          </div>
        </div>
      )}

      {/* Canvas HUD Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#111]/90 border border-white/10 p-1.5 rounded-xl backdrop-blur-xl shadow-2xl z-[100]">
        <button 
          onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all"
        ><ZoomOutIcon size={14} /></button>
        <div className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button 
          onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all"
        ><ZoomInIcon size={14} /></button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button 
          onClick={() => { setPan({ x: 60, y: 60 }); setZoom(0.5); }}
          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-all"
        ><MaximizeIcon size={14} /></button>
      </div>

      {/* Helper Text */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] pointer-events-none">
        Alt + Drag to Pan • Ctrl + Scroll to Zoom • Right-click to connect screens
      </div>
    </div>
  );
};

export default AppCanvas;
