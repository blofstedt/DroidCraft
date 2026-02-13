
import React from 'react';
import { NavigationConnection } from '../types';
import { ArrowRightIcon, TrashIcon, LinkIcon, MousePointerClickIcon, MonitorIcon } from 'lucide-react';

interface Props {
  connections: NavigationConnection[];
  htmlFiles: string[];
  onRemoveConnection: (connectionId: string) => void;
  activeFile: string;
}

const ConnectionsPanel: React.FC<Props> = ({ connections, htmlFiles, onRemoveConnection, activeFile }) => {
  const activeConnections = connections.filter(
    c => c.fromScreen === activeFile || c.toScreen === activeFile
  );

  const otherConnections = connections.filter(
    c => c.fromScreen !== activeFile && c.toScreen !== activeFile
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-orange-600/10 border border-orange-500/20 p-6 rounded-[2rem] space-y-3">
        <div className="flex items-center gap-3 text-orange-400">
          <LinkIcon size={16} />
          <h3 className="text-[10px] font-black uppercase tracking-widest">Screen Connections</h3>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
          Connect buttons and elements to other screens. In <span className="text-orange-300 font-bold">Design</span> mode, 
          right-click any element to create a navigation link.
        </p>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-16 opacity-20 space-y-4">
          <MousePointerClickIcon size={40} className="mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-widest leading-loose">
            No connections yet.<br/>Right-click elements in Design mode.
          </p>
        </div>
      ) : (
        <>
          {activeConnections.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2">
                Active Screen ({activeConnections.length})
              </span>
              {activeConnections.map(conn => (
                <ConnectionRow key={conn.id} connection={conn} onRemove={onRemoveConnection} />
              ))}
            </div>
          )}

          {otherConnections.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2">
                Other Connections ({otherConnections.length})
              </span>
              {otherConnections.map(conn => (
                <ConnectionRow key={conn.id} connection={conn} onRemove={onRemoveConnection} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ConnectionRow: React.FC<{ connection: NavigationConnection; onRemove: (id: string) => void }> = ({ connection, onRemove }) => {
  return (
    <div className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-orange-500/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MonitorIcon size={12} className="text-orange-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-300 truncate">{connection.fromScreen}</span>
          <ArrowRightIcon size={12} className="text-orange-500 shrink-0" />
          <MonitorIcon size={12} className="text-blue-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-300 truncate">{connection.toScreen}</span>
        </div>
        <button
          onClick={() => onRemove(connection.id)}
          className="p-1 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"
        >
          <TrashIcon size={12} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono text-orange-400/60 bg-orange-500/10 px-2 py-0.5 rounded">{connection.fromElementLabel}</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">{connection.action}</span>
      </div>
    </div>
  );
};

export default ConnectionsPanel;
