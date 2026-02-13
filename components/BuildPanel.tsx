
import React, { useState } from 'react';
import { SmartphoneIcon, ShieldCheckIcon, DownloadIcon, Loader2Icon, CheckCircle2Icon, KeyIcon } from 'lucide-react';
import { BuildStatus, ProjectState } from '../types';

interface Props {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
}

const BuildPanel: React.FC<Props> = ({ project, onUpdateProject }) => {
  const [status, setStatus] = useState<BuildStatus>(BuildStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [buildType, setBuildType] = useState<'apk' | 'aab'>('apk');

  const startBuild = () => {
    if (!project.keystore?.generated) {
      alert("Please generate a Keystore first.");
      return;
    }

    setStatus(BuildStatus.PREPARING);
    setProgress(10);

    const stages = [
      { s: BuildStatus.PREPARING, p: 30, d: 2000 },
      { s: BuildStatus.BUILDING, p: 60, d: 4000 },
      { s: BuildStatus.SIGNING, p: 90, d: 2000 },
      { s: BuildStatus.SUCCESS, p: 100, d: 1000 },
    ];

    let current = 0;
    const run = () => {
      if (current >= stages.length) return;
      const stage = stages[current];
      setTimeout(() => {
        setStatus(stage.s);
        setProgress(stage.p);
        current++;
        if (current < stages.length) run();
      }, stage.d);
    };
    run();
  };

  const generateKey = () => {
    onUpdateProject({
      keystore: {
        alias: 'droidcraft-key',
        generated: true,
        validity: 25
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <ShieldCheckIcon size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Android Keystore</h3>
            <p className="text-[10px] text-blue-400 font-bold uppercase">Required for Production Signing</p>
          </div>
        </div>

        {!project.keystore?.generated ? (
          <button 
            onClick={generateKey}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <KeyIcon size={14} /> Generate Production Key
          </button>
        ) : (
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-emerald-500/30">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2Icon size={16} />
              <span className="text-[10px] font-black uppercase">Keystore Active</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Alias: {project.keystore.alias}</span>
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Output Configuration</h3>
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setBuildType('apk')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${buildType === 'apk' ? 'bg-slate-700 text-white' : 'text-slate-600'}`}
            >APK</button>
            <button 
              onClick={() => setBuildType('aab')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${buildType === 'aab' ? 'bg-slate-700 text-white' : 'text-slate-600'}`}
            >AAB</button>
          </div>
        </div>

        {status === BuildStatus.IDLE || status === BuildStatus.SUCCESS ? (
          <div className="space-y-4">
             {status === BuildStatus.SUCCESS && (
               <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-4 animate-in zoom-in duration-300">
                 <p className="text-xs font-bold text-emerald-400">Build Successful! {buildType.toUpperCase()} is ready.</p>
                 <button className="flex items-center gap-2 mx-auto bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/40 hover:scale-105 transition-all">
                   <DownloadIcon size={14} /> Download Final Artifact
                 </button>
               </div>
             )}
             <button 
               onClick={startBuild}
               className="w-full py-6 bg-blue-600 text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               <SmartphoneIcon size={18} /> Compile Native {buildType.toUpperCase()}
             </button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-blue-400 animate-pulse">{status}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Optimizing Assets & Bundling Java</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center gap-2 text-slate-600 animate-bounce">
              <Loader2Icon size={14} className="animate-spin" />
              <span className="text-[8px] font-black uppercase tracking-widest">Compiling Native Bridge</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 opacity-40">
        <p className="text-[8px] uppercase tracking-widest text-center leading-relaxed">
          The build engine utilizes Google Cloud Cloud Build and Capacitor 6.0.<br/>
          Production artifacts are signed with RSA 4096-bit keys.
        </p>
      </div>
    </div>
  );
};

export default BuildPanel;
