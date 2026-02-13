
import React, { useState, useRef } from 'react';
import { NavigationConnection, ScreenPosition } from '../types';
import { TrashIcon, ArrowRightIcon, MonitorIcon, MousePointerClickIcon } from 'lucide-react';

interface Props {
  connections: NavigationConnection[];
  screenPositions: Record<string, ScreenPosition>;
  htmlFiles: string[];
  zoom: number;
  pan: { x: number; y: number };
  onAddConnection: (connection: NavigationConnection) => void;
  onRemoveConnection: (connectionId: string) => void;
  activeFile: string;
  connectingFrom: { screen: string; elementId: string; elementLabel: string } | null;
  onStartConnect: (screen: string, elementId: string, elementLabel: string) => void;
  onCancelConnect: () => void;
}

const SCREEN_WIDTH = 360;
const SCREEN_HEIGHT = 740;
const SCREEN_LABEL_HEIGHT = 40;
const FRAME_PADDING = 12;

const getScreenCenter = (path: string, positions: Record<string, ScreenPosition>, htmlFiles: string[]): { x: number; y: number } => {
  const pos = positions[path] || { x: htmlFiles.indexOf(path) * 450, y: 0 };
  return {
    x: pos.x + SCREEN_WIDTH / 2 + FRAME_PADDING,
    y: pos.y + SCREEN_LABEL_HEIGHT + SCREEN_HEIGHT / 2 + FRAME_PADDING
  };
};

const getScreenEdge = (
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
  positions: Record<string, ScreenPosition>,
  screen: string,
  htmlFiles: string[],
  side: 'from' | 'to'
): { x: number; y: number } => {
  const pos = positions[screen] || { x: htmlFiles.indexOf(screen) * 450, y: 0 };
  const left = pos.x + FRAME_PADDING;
  const right = left + SCREEN_WIDTH;
  const top = pos.y + SCREEN_LABEL_HEIGHT + FRAME_PADDING;
  const bottom = top + SCREEN_HEIGHT;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  const dx = side === 'from' ? toPos.x - fromPos.x : fromPos.x - toPos.x;
  const dy = side === 'from' ? toPos.y - fromPos.y : fromPos.y - toPos.y;
  
  // Determine which edge to connect from
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      return { x: right + 6, y: cy };
    } else {
      return { x: left - 6, y: cy };
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      return { x: cx, y: bottom + 6 };
    } else {
      return { x: cx, y: top - 6 };
    }
  }
};

const NavigationArrows: React.FC<Props> = ({
  connections,
  screenPositions,
  htmlFiles,
  zoom,
  pan,
  onRemoveConnection,
  activeFile,
  connectingFrom,
  onCancelConnect
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  return (
    <>
      {/* SVG Arrow Layer */}
      <svg
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '10000px',
          height: '10000px',
          overflow: 'visible'
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
          </marker>
          <marker
            id="arrowhead-hover"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#fb923c" />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {connections.map(conn => {
          if (!htmlFiles.includes(conn.fromScreen) || !htmlFiles.includes(conn.toScreen)) return null;

          const fromCenter = getScreenCenter(conn.fromScreen, screenPositions, htmlFiles);
          const toCenter = getScreenCenter(conn.toScreen, screenPositions, htmlFiles);

          const fromEdge = getScreenEdge(fromCenter, toCenter, screenPositions, conn.fromScreen, htmlFiles, 'from');
          const toEdge = getScreenEdge(fromCenter, toCenter, screenPositions, conn.toScreen, htmlFiles, 'to');

          const isHovered = hoveredConnection === conn.id;
          const isActive = conn.fromScreen === activeFile || conn.toScreen === activeFile;
          
          // Compute control points for a smooth bezier curve
          const dx = toEdge.x - fromEdge.x;
          const dy = toEdge.y - fromEdge.y;
          const cpOffset = Math.min(Math.abs(dx), Math.abs(dy), 120) + 60;
          
          let cp1x = fromEdge.x, cp1y = fromEdge.y, cp2x = toEdge.x, cp2y = toEdge.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            cp1x = fromEdge.x + (dx > 0 ? cpOffset : -cpOffset);
            cp2x = toEdge.x + (dx > 0 ? -cpOffset : cpOffset);
          } else {
            cp1y = fromEdge.y + (dy > 0 ? cpOffset : -cpOffset);
            cp2y = toEdge.y + (dy > 0 ? -cpOffset : cpOffset);
          }

          const pathD = `M ${fromEdge.x} ${fromEdge.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toEdge.x} ${toEdge.y}`;
          
          const markerEnd = isActive ? 'url(#arrowhead-active)' : isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)';

          // Midpoint for label
          const midX = (fromEdge.x + toEdge.x) / 2;
          const midY = (fromEdge.y + toEdge.y) / 2;

          return (
            <g key={conn.id}>
              {/* Invisible wider path for hover detection */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredConnection(conn.id)}
                onMouseLeave={() => setHoveredConnection(null)}
              />
              {/* Visible path */}
              <path
                d={pathD}
                fill="none"
                stroke={isActive ? '#3b82f6' : isHovered ? '#fb923c' : '#f97316'}
                strokeWidth={isHovered ? 3 : 2}
                strokeDasharray={conn.action === 'modal' ? '8 4' : 'none'}
                markerEnd={markerEnd}
                opacity={isActive ? 0.9 : isHovered ? 0.8 : 0.5}
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Connection label */}
              {isHovered && (
                <g>
                  <rect
                    x={midX - 60}
                    y={midY - 14}
                    width={120}
                    height={28}
                    rx={8}
                    fill="#1a1a1a"
                    stroke={isActive ? '#3b82f6' : '#f97316'}
                    strokeWidth={1}
                    opacity={0.95}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="Inter, sans-serif"
                  >
                    {conn.fromElementLabel} → {conn.toScreen}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Connection Delete Buttons (rendered in DOM layer for interaction) */}
      {connections.map(conn => {
        if (!htmlFiles.includes(conn.fromScreen) || !htmlFiles.includes(conn.toScreen)) return null;
        if (hoveredConnection !== conn.id) return null;

        const fromCenter = getScreenCenter(conn.fromScreen, screenPositions, htmlFiles);
        const toCenter = getScreenCenter(conn.toScreen, screenPositions, htmlFiles);
        const fromEdge = getScreenEdge(fromCenter, toCenter, screenPositions, conn.fromScreen, htmlFiles, 'from');
        const toEdge = getScreenEdge(fromCenter, toCenter, screenPositions, conn.toScreen, htmlFiles, 'to');

        const midX = (fromEdge.x + toEdge.x) / 2;
        const midY = (fromEdge.y + toEdge.y) / 2 + 18;

        return (
          <div
            key={`del-${conn.id}`}
            className="absolute z-[6]"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              left: midX - 10,
              top: midY,
              pointerEvents: 'all'
            }}
          >
            <button
              onClick={() => onRemoveConnection(conn.id)}
              className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all shadow-lg shadow-red-900/40"
              title="Remove connection"
            >
              <TrashIcon size={10} />
            </button>
          </div>
        );
      })}

      {/* Connection Mode Banner */}
      {connectingFrom && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-orange-900/40 animate-in slide-in-from-top-2 duration-300">
          <MousePointerClickIcon size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Click a target screen for "{connectingFrom.elementLabel}"
          </span>
          <button
            onClick={onCancelConnect}
            className="ml-2 p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-all"
          >
            <span className="text-[9px] font-black uppercase">Cancel</span>
          </button>
        </div>
      )}
    </>
  );
};

export default NavigationArrows;
