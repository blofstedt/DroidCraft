
import React from 'react';
import { HistoryIcon, RotateCcwIcon, UserIcon, CpuIcon, CheckIcon } from 'lucide-react';
import { ProjectState, HistoryEntry } from '../types';

interface Props {
  project: ProjectState;
  onRollback: (entry: HistoryEntry) => void;
}

const VersionsPanel: React.FC<Props> = ({ project, onRollback }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-3">
          <HistoryIcon size={14} className="text-slate-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Repository History</h3>
        </div>
        <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase">v{project.version}.0</span>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-6 top-4 bottom-4 w-px bg-white/5" />
        
        {project.history?.length === 0 ? (
          <div className="text-center py-20 opacity-20 space-y-4">
            <HistoryIcon size={40} className="mx-auto" />
            <p className="text-[10px] font-black uppercase tracking-widest">Initial commit pending</p>
          </div>
        ) : (
          project.history.map((entry, idx) => (
            <div key={entry.id} className="relative pl-12 group">
              <div className={`absolute left-5 top-1.5 w-3 h-3 rounded-full border-2 border-[#111] z-10 transition-all ${idx === 0 ? 'bg-blue-600 scale-125 shadow-lg shadow-blue-900/40' : 'bg-slate-700'}`} />
              
              <div className={`p-6 rounded-3xl border transition-all ${idx === 0 ? 'bg-white/5 border-white/10 ring-1 ring-blue-500/20' : 'bg-white/5 border-white/5 opacity-60 hover:opacity-100 hover:border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {entry.author === 'user' ? <UserIcon size={12} className="text-blue-400" /> : <CpuIcon size={12} className="text-purple-400" />}
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {idx === 0 ? (
                    <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-blue-400">
                      <CheckIcon size={10} /> Active HEAD
                    </span>
                  ) : (
                    <button 
                      onClick={() => onRollback(entry)}
                      className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all"
                      title="Rollback to this version"
                    >
                      <RotateCcwIcon size={14} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{entry.description}</p>
                <div className="mt-4 flex gap-2">
                  <div className="px-2 py-0.5 bg-black/40 rounded text-[8px] font-mono text-slate-500">+{Object.keys(entry.snapshot).length} files</div>
                  <div className="px-2 py-0.5 bg-black/40 rounded text-[8px] font-mono text-slate-500">SHA:{entry.id.slice(-6).toUpperCase()}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VersionsPanel;
