
import React, { useMemo } from 'react';
import { AppFile } from '../types';
import { InfoIcon, SparklesIcon, ChevronRightIcon, TypeIcon, PaletteIcon, LayoutIcon, Edit3Icon } from 'lucide-react';

interface Props {
  files: Record<string, AppFile>;
  activeFile: string;
  searchQuery: string;
  onUpdateValue: (path: string, originalText: string, newText: string) => void;
}

// Helper to translate Tailwind to English
const describeClass = (cls: string): string => {
  // Simple mappings
  if (cls.startsWith('bg-')) {
    const parts = cls.split('-');
    return `${parts[1]} background${parts[2] ? ` (shade ${parts[2]})` : ''}`;
  }
  if (cls.startsWith('text-')) {
    const parts = cls.split('-');
    if (['sm', 'xs', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'].includes(parts[1])) return `${parts[1]} sized text`;
    return `${parts[1]} colored text`;
  }
  if (cls === 'w-full') return 'full width';
  if (cls.startsWith('w-')) {
    const part = cls.split('-')[1];
    if (part.includes('/')) {
      const [n, d] = part.split('/');
      return `${Math.round((parseInt(n) / parseInt(d)) * 100)}% width`;
    }
    return `${part} units wide`;
  }
  if (cls === 'rounded-full') return 'circular corners';
  if (cls.startsWith('rounded')) return 'rounded corners';
  if (cls === 'flex') return 'layout container';
  if (cls === 'items-center') return 'vertically centered content';
  if (cls === 'justify-center') return 'horizontally centered content';
  if (cls === 'p-') return 'padded';
  if (cls.startsWith('p-')) return `padding of ${cls.split('-')[1]}`;
  if (cls.startsWith('shadow')) return 'drop shadow effect';
  
  return cls; // fallback
};

const AmateurLogicView: React.FC<Props> = ({ files, activeFile, searchQuery, onUpdateValue }) => {
  const file = files[activeFile];

  const logicNodes = useMemo(() => {
    if (!file || !file.content || !activeFile.endsWith('.html')) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(file.content, 'text/html');
    const nodes: any[] = [];

    const traverse = (element: Element, depth = 0) => {
      // Skip script, style, head
      if (['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK'].includes(element.tagName)) return;

      const id = element.id || '';
      const tag = element.tagName.toLowerCase();
      const classes = Array.from(element.classList);
      const text = element.childNodes[0]?.nodeType === 3 ? element.childNodes[0].nodeValue?.trim() : '';

      const nodeDescription = {
        tag,
        id,
        text,
        classes,
        depth,
        elementRef: element,
        sentences: [] as string[]
      };

      // Construct the "Novel" sentences
      if (tag === 'body') {
        nodeDescription.sentences.push(`The screen begins with a main container.`);
      } else if (tag === 'header') {
        nodeDescription.sentences.push(`At the top, there is a navigation header.`);
      } else if (tag === 'button') {
        nodeDescription.sentences.push(`Users can click a button.`);
      } else if (['h1', 'h2', 'h3'].includes(tag)) {
        nodeDescription.sentences.push(`A prominent heading is displayed.`);
      } else if (tag === 'p') {
        nodeDescription.sentences.push(`A paragraph of text provides detail.`);
      } else if (tag === 'img' || tag === 'svg') {
        nodeDescription.sentences.push(`A visual image is positioned here.`);
      } else {
        nodeDescription.sentences.push(`There is a ${tag} element.`);
      }

      nodes.push(nodeDescription);

      Array.from(element.children).forEach(child => traverse(child, depth + 1));
    };

    if (doc.body) traverse(doc.body);
    return nodes;
  }, [file?.content, activeFile]);

  if (!file || !activeFile.endsWith('.html')) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8 opacity-40">
        <InfoIcon size={32} className="mb-4 text-slate-500" />
        <p className="text-[10px] font-black uppercase tracking-widest leading-loose">
          Amateur mode is optimized for HTML layout screens.<br/>
          Switch to Pro for direct JS/Logic control.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] space-y-2">
         <div className="flex items-center gap-3 text-blue-400 mb-2">
            <SparklesIcon size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Storyteller View</h3>
         </div>
         <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
           The orchestrator is translating the source code of <span className="text-blue-300 font-bold">{activeFile}</span> into a descriptive story. You can edit the blue highlighted values to change the app.
         </p>
      </div>

      <div className="space-y-6">
        {logicNodes.map((node, idx) => {
          // Filtering logic
          if (searchQuery && !node.tag.includes(searchQuery) && !node.text.includes(searchQuery) && !node.classes.some(c => c.includes(searchQuery))) {
            return null;
          }

          return (
            <div 
              key={idx} 
              className="relative group"
              style={{ marginLeft: `${node.depth * 12}px` }}
            >
              {node.depth > 0 && (
                <div className="absolute -left-4 top-0 bottom-0 w-px bg-white/5 group-hover:bg-blue-500/20 transition-colors" />
              )}
              
              <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-900/10 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl text-slate-500 group-hover:text-blue-400 transition-colors">
                      {node.tag === 'button' ? <Edit3Icon size={14} /> : 
                       ['h1', 'h2', 'p'].includes(node.tag) ? <TypeIcon size={14} /> : 
                       <LayoutIcon size={14} />}
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-[0.2em]">{node.tag}</span>
                  </div>
                  {node.id && <span className="text-[8px] font-mono text-slate-700">#{node.id}</span>}
                </div>

                <div className="space-y-3">
                  {/* Main Description Sentence */}
                  <p className="text-xs text-slate-400 leading-loose">
                    {node.sentences[0]}
                    {node.text && (
                      <> It currently displays the text "
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newText = e.currentTarget.innerText;
                            if (newText !== node.text) onUpdateValue(activeFile, node.text, newText);
                          }}
                          className="inline-block px-1.5 py-0.5 bg-blue-600/10 text-blue-400 border-b border-blue-500/40 rounded cursor-text hover:bg-blue-600/20 transition-all font-bold"
                        >
                          {node.text}
                        </span>
                        ".
                      </>
                    )}
                  </p>

                  {/* Attributes/Classes Breakdown */}
                  {node.classes.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] font-black uppercase text-slate-600 mr-1">Appears with:</span>
                      {node.classes.map((cls: string, cIdx: number) => {
                        const description = describeClass(cls);
                        return (
                          <div key={cIdx} className="group/cls flex items-center">
                            <span 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const newVal = e.currentTarget.innerText;
                                // This is a bit advanced, we try to match the description back or just swap the class
                                // For simplicity in this UI, we just swap the raw class string if changed
                                if (newVal !== cls) onUpdateValue(activeFile, cls, newVal);
                              }}
                              title={description}
                              className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-slate-500 font-medium cursor-text hover:border-blue-500/40 hover:text-blue-300 transition-all flex items-center gap-2"
                            >
                              <PaletteIcon size={10} className="opacity-40" />
                              {cls}
                            </span>
                            {cIdx < node.classes.length - 1 && <span className="text-slate-800 ml-2">,</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Child Pointer */}
                  {node.elementRef.children.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                       <ChevronRightIcon size={12} className="text-slate-700" />
                       <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest">
                         Contains {node.elementRef.children.length} nested item{node.elementRef.children.length > 1 ? 's' : ''}
                       </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-8 text-center space-y-4">
         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
            <SparklesIcon size={20} className="text-blue-500 opacity-40" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">End of Page Narrative</p>
      </div>
    </div>
  );
};

export default AmateurLogicView;
