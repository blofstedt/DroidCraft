
import React, { useMemo } from 'react';
import { UIElement } from '../types';
import { parseAndroidXml } from '../utils/xmlParser';

interface Props {
  xmlContent: string;
  onElementClick: (element: UIElement, event: React.MouseEvent) => void;
  selectedId?: string;
}

const SimulatedAndroidDevice: React.FC<Props> = ({ xmlContent, onElementClick, selectedId }) => {
  const layout = useMemo(() => parseAndroidXml(xmlContent), [xmlContent]);

  const renderElement = (el: UIElement) => {
    const isSelected = selectedId === el.id;
    
    // Mapping Android Styles to CSS
    const style: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      padding: el.attributes['android:padding'] ? parseInt(el.attributes['android:padding']) : 0,
      margin: el.attributes['android:layout_margin'] ? parseInt(el.attributes['android:layout_margin']) : 0,
      backgroundColor: el.attributes['android:background'] || 'transparent',
      color: el.attributes['android:textColor'] || 'inherit',
      fontSize: el.attributes['android:textSize'] ? parseInt(el.attributes['android:textSize']) : 'inherit',
      border: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(255,255,255,0.05)',
      position: 'relative',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    };

    // Width/Height logic
    if (el.attributes['android:layout_width'] === 'match_parent') style.width = '100%';
    if (el.attributes['android:layout_height'] === 'match_parent') style.height = '100%';

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onElementClick(el, e);
    };

    switch (el.tag) {
      case 'TextView':
        return (
          <div key={el.id} style={style} onClick={handleClick} className="hover:bg-blue-500/10 rounded">
            {el.attributes['android:text']}
          </div>
        );
      case 'Button':
        return (
          <button 
            key={el.id} 
            style={{...style, backgroundColor: el.attributes['android:background'] || '#3b82f6', borderRadius: '8px', padding: '12px', color: 'white', fontWeight: 'bold'}} 
            onClick={handleClick}
          >
            {el.attributes['android:text']}
          </button>
        );
      case 'ImageView':
        return (
          <div key={el.id} style={{...style, minHeight: '100px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={handleClick}>
             <span className="text-[10px] text-slate-500">IMAGE: {el.attributes['android:src'] || 'No Source'}</span>
          </div>
        );
      default:
        return (
          <div key={el.id} style={style} onClick={handleClick} className="flex-1">
            {el.children.map(child => renderElement(child))}
          </div>
        );
    }
  };

  return (
    <div className="w-[340px] h-[700px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col mx-auto">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
      
      {/* Status Bar */}
      <div className="h-8 bg-slate-800/50 flex justify-between items-center px-8 text-[10px] font-bold text-slate-400">
        <span>12:45</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
          <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
        </div>
      </div>

      {/* Screen Content */}
      <div className="flex-1 bg-white text-slate-900 overflow-y-auto p-4 flex flex-col">
        {layout ? renderElement(layout) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center px-4">
            Invalid Layout XML
          </div>
        )}
      </div>

      {/* Nav Bar */}
      <div className="h-12 bg-slate-800/50 flex justify-around items-center px-12">
        <div className="w-1 h-4 bg-slate-600 rounded"></div>
        <div className="w-4 h-4 border-2 border-slate-600 rounded"></div>
        <div className="w-4 h-4 border-2 border-slate-600 rounded-sm rotate-45"></div>
      </div>
    </div>
  );
};

export default SimulatedAndroidDevice;
