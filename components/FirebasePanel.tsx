
import React from 'react';
import { DatabaseIcon, CloudIcon, LinkIcon, SettingsIcon, RefreshCwIcon, PlusIcon, KeyIcon } from 'lucide-react';
import { ProjectState } from '../types';

interface Props {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
}

const FirebasePanel: React.FC<Props> = ({ project, onUpdateProject }) => {
  const isConnected = !!project.firebase?.config;

  const handleConnect = () => {
    const config = {
      projectId: `droidcraft-${project.id.slice(0, 6)}`,
      apiKey: 'AIzaSy' + Math.random().toString(36).slice(2, 24),
      authDomain: `droidcraft-${project.id.slice(0, 6)}.firebaseapp.com`,
      appId: `1:123456789:web:${Math.random().toString(36).slice(2, 10)}`
    };
    onUpdateProject({
      firebase: {
        ...project.firebase!,
        config,
        status: 'connected',
        collections: [
          { name: 'users', schema: { name: 'string', email: 'string' }, recordCount: 0 },
          { name: 'app_data', schema: { key: 'string', value: 'any' }, recordCount: 0 }
        ]
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className={`p-8 rounded-[2.5rem] border transition-all ${isConnected ? 'bg-orange-600/10 border-orange-500/20' : 'bg-white/5 border-white/5'}`}>
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isConnected ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
              <CloudIcon size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Firebase Backend</h3>
              <p className="text-[10px] text-orange-400 font-bold uppercase">{isConnected ? 'Link Active' : 'Disconnected'}</p>
            </div>
          </div>
          {isConnected && <button onClick={() => onUpdateProject({ firebase: { ...project.firebase!, config: null, status: 'disconnected' } })} className="p-2 text-slate-600 hover:text-white"><SettingsIcon size={16} /></button>}
        </div>

        {!isConnected ? (
          <div className="space-y-6">
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Connect your Android project to Firebase for Realtime Database, Authentication, and Cloud Messaging.</p>
            <button 
              onClick={handleConnect}
              className="w-full py-5 bg-orange-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-900/40 hover:bg-orange-500 transition-all flex items-center justify-center gap-3"
            >
              <LinkIcon size={16} /> Provision Cloud Resources
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Project ID</p>
                <p className="text-[10px] text-orange-200 font-mono truncate">{project.firebase?.config?.projectId}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Region</p>
                <p className="text-[10px] text-orange-200 font-mono">us-central1</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <DatabaseIcon size={12} /> Collections
            </h4>
            <button className="p-1.5 hover:bg-white/5 rounded-lg text-slate-600 hover:text-white transition-all"><RefreshCwIcon size={12} /></button>
          </div>
          <div className="space-y-3">
            {project.firebase?.collections.map(col => (
              <div key={col.name} className="group p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-orange-500/30 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full group-hover:animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">/ {col.name}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-600">{col.recordCount} Documents</span>
              </div>
            ))}
            <button className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-400 hover:border-orange-500/20 transition-all flex items-center justify-center gap-2">
              <PlusIcon size={14} /> New Collection
            </button>
          </div>
        </div>
      )}

      <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <KeyIcon size={14} className="text-slate-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Rules</h4>
        </div>
        <div className="bg-black/60 p-4 rounded-xl border border-white/5">
          <code className="text-[9px] text-emerald-400/80 font-mono leading-loose">
            allow read, write: if request.auth != null;
          </code>
        </div>
      </div>
    </div>
  );
};

export default FirebasePanel;
