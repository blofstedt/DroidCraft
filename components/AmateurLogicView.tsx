
import React from 'react';
import { AppFile } from '../types';
import { SearchIcon, Edit3Icon, HashIcon, ChevronRightIcon, InfoIcon } from 'lucide-react';

interface Props {
  files: Record<string, AppFile>;
  searchQuery: string;
  onUpdateValue: (path: string, originalText: string, newText: string) => void;
}

const AmateurLogicView: React.FC<Props> = ({ files, searchQuery, onUpdateValue }) => {
  // Simple heuristic-based parser for "Amateur Mode"
  // In a real app, this would use a more robust AST to natural language mapper
  const getLogicNodes = (file: AppFile) => {
    const lines = file.content.split('\n');
    const nodes: { label: string, value: string, type: string, originalLine: string }[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Match Tailwind Colors
      if (trimmed.includes('bg-') || trimmed.includes('text-')) {
        const match = trimmed.match(/(bg|text)-[a-z]+-[0-9]+/);
        if (match) nodes.push({ label: 'Visual Style', value: match[0], type: 'color', originalLine: line });
      }

      // Match Strings / Titles
      if (trimmed.includes('<h') || trimmed.includes('<p') || trimmed.includes('title')) {
        const textMatch = trimmed.match(/>([^<]+)</);
        if (textMatch && textMatch[1].trim()) {
          nodes.push({ label: 'Display Text', value: textMatch[1].trim(), type: 'text', originalLine: line });
        }
      }

      // Match Logic
      if (trimmed.includes('addEventListener') || trimmed.includes('onclick')) {
        nodes.push({ label: 'User Interaction', value: 'Performs an action when clicked', type: 'logic', originalLine: line });
      }
    });

    return nodes;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Fix: Explicitly cast Object.values to AppFile[] to resolve 'unknown' type issues */}
      {(Object.values(files) as AppFile[]).filter(f => f.path.endsWith('.html') || f.path.endsWith('.js')).map(file => {
        const nodes = getLogicNodes(file);
        if (nodes.length === 0) return null;

        return (
          <div key={file.path} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{file.path} Structure</h4>
            </div>
            
            <div className="space-y-2">
              {nodes.map((node, i) => {
                const isMatch = searchQuery && (
                  node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  node.value.toLowerCase().includes(searchQuery.toLowerCase())
                );

                return (
                  <div 
                    key={i} 
                    className={`group p-4 rounded-2xl border transition-all ${
                      isMatch 
                      ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            node.type === 'color' ? 'bg-purple-500/20 text-purple-400' :
                            node.type === 'logic' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {node.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-slate-300 font-medium">
                            {node.label === 'Visual Style' ? 'The element color is set to' : 
                             node.label === 'Display Text' ? 'The visible text reads' : 
                             'Logic rule:'}
                          </p>
                          <input 
                            className="bg-white/5 border border-white/5 rounded px-2 py-0.5 text-blue-400 font-bold outline-none focus:border-blue-500/50 transition-all hover:bg-white/10"
                            defaultValue={node.value}
                            onBlur={(e) => {
                              if (e.target.value !== node.value) {
                                onUpdateValue(file.path, node.value, e.target.value);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <ChevronRightIcon size={14} className="text-slate-700 group-hover:text-slate-500 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AmateurLogicView;
