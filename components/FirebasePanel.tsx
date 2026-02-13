
import React, { useState } from 'react';
import { DatabaseIcon, CloudIcon, LinkIcon, SettingsIcon, RefreshCwIcon, PlusIcon, KeyIcon, TrashIcon, EditIcon, CheckIcon, XIcon, TableIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { ProjectState, FirebaseCollection, FieldType } from '../types';

interface Props {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
}

const FIELD_TYPES: FieldType[] = ['string', 'number', 'boolean', 'timestamp', 'array', 'map', 'reference', 'any'];

const FirebasePanel: React.FC<Props> = ({ project, onUpdateProject }) => {
  const isConnected = !!project.firebase?.config;
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('string');
  const [editingField, setEditingField] = useState<{ collection: string; field: string } | null>(null);
  const [editFieldType, setEditFieldType] = useState<FieldType>('string');
  const [projectIdInput, setProjectIdInput] = useState('');
  const [showManualConfig, setShowManualConfig] = useState(false);

  const handleConnect = () => {
    const projectId = projectIdInput.trim() || `droidcraft-${project.id.slice(0, 8)}`;
    const config = {
      projectId,
      apiKey: 'AIzaSy' + Math.random().toString(36).slice(2, 24),
      authDomain: `${projectId}.firebaseapp.com`,
      appId: `1:${Math.floor(Math.random() * 999999999)}:web:${Math.random().toString(36).slice(2, 14)}`
    };
    onUpdateProject({
      firebase: {
        ...project.firebase!,
        config,
        status: 'connected',
        collections: [
          { name: 'users', schema: { uid: 'string', email: 'string', displayName: 'string', createdAt: 'timestamp' }, recordCount: 0 },
          { name: 'app_data', schema: { key: 'string', value: 'any', updatedAt: 'timestamp' }, recordCount: 0 }
        ]
      }
    });
    setProjectIdInput('');
    setShowManualConfig(false);
  };

  const addCollection = () => {
    const name = newCollectionName.trim();
    if (!name || !project.firebase) return;
    if (project.firebase.collections.some(c => c.name === name)) return;
    
    const newCol: FirebaseCollection = {
      name,
      schema: { id: 'string', createdAt: 'timestamp' },
      recordCount: 0
    };
    
    onUpdateProject({
      firebase: {
        ...project.firebase,
        collections: [...project.firebase.collections, newCol]
      }
    });
    setNewCollectionName('');
    setShowNewCollection(false);
    setExpandedCollection(name);
  };

  const removeCollection = (collectionName: string) => {
    if (!project.firebase) return;
    onUpdateProject({
      firebase: {
        ...project.firebase,
        collections: project.firebase.collections.filter(c => c.name !== collectionName)
      }
    });
    if (expandedCollection === collectionName) setExpandedCollection(null);
  };

  const addField = (collectionName: string) => {
    const fieldName = newFieldName.trim();
    if (!fieldName || !project.firebase) return;
    
    onUpdateProject({
      firebase: {
        ...project.firebase,
        collections: project.firebase.collections.map(c => {
          if (c.name !== collectionName) return c;
          if (c.schema[fieldName] !== undefined) return c;
          return { ...c, schema: { ...c.schema, [fieldName]: newFieldType } };
        })
      }
    });
    setNewFieldName('');
    setNewFieldType('string');
  };

  const removeField = (collectionName: string, fieldName: string) => {
    if (!project.firebase) return;
    onUpdateProject({
      firebase: {
        ...project.firebase,
        collections: project.firebase.collections.map(c => {
          if (c.name !== collectionName) return c;
          const newSchema = { ...c.schema };
          delete newSchema[fieldName];
          return { ...c, schema: newSchema };
        })
      }
    });
  };

  const updateFieldType = (collectionName: string, fieldName: string, fieldType: FieldType) => {
    if (!project.firebase) return;
    onUpdateProject({
      firebase: {
        ...project.firebase,
        collections: project.firebase.collections.map(c => {
          if (c.name !== collectionName) return c;
          return { ...c, schema: { ...c.schema, [fieldName]: fieldType } };
        })
      }
    });
    setEditingField(null);
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
            
            {showManualConfig ? (
              <div className="space-y-4">
                <input
                  value={projectIdInput}
                  onChange={(e) => setProjectIdInput(e.target.value)}
                  placeholder="Firebase Project ID (e.g. my-app-12345)"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-slate-300 outline-none focus:border-orange-500/50 transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowManualConfig(false)}
                    className="flex-1 py-3 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                  >Cancel</button>
                  <button
                    onClick={handleConnect}
                    className="flex-1 py-3 bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-900/40 hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
                  ><LinkIcon size={14} /> Connect</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={handleConnect}
                  className="w-full py-5 bg-orange-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-900/40 hover:bg-orange-500 transition-all flex items-center justify-center gap-3"
                >
                  <LinkIcon size={16} /> Provision New Project
                </button>
                <button 
                  onClick={() => setShowManualConfig(true)}
                  className="w-full py-3 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
                >
                  Link Existing Project
                </button>
              </div>
            )}
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
              <div key={col.name} className="bg-white/5 border border-white/5 rounded-2xl hover:border-orange-500/30 transition-all overflow-hidden">
                <div 
                  className="group p-5 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedCollection(expandedCollection === col.name ? null : col.name)}
                >
                  <div className="flex items-center gap-4">
                    {expandedCollection === col.name 
                      ? <ChevronDownIcon size={14} className="text-orange-400" />
                      : <ChevronRightIcon size={14} className="text-slate-600" />
                    }
                    <div className="w-2 h-2 bg-orange-500 rounded-full group-hover:animate-pulse" />
                    <span className="text-xs font-bold text-slate-300">/ {col.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-slate-600">{Object.keys(col.schema).length} fields</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCollection(col.name); }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                      title="Delete collection"
                    ><TrashIcon size={12} /></button>
                  </div>
                </div>

                {expandedCollection === col.name && (
                  <div className="px-5 pb-5 space-y-2 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TableIcon size={12} className="text-slate-600" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Schema Fields</span>
                    </div>
                    
                    {Object.entries(col.schema).map(([fieldName, fieldType]) => (
                      <div key={fieldName} className="group/field flex items-center justify-between py-2 px-3 bg-black/30 rounded-xl border border-white/5 hover:border-orange-500/20 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-300">{fieldName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingField?.collection === col.name && editingField?.field === fieldName ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editFieldType}
                                onChange={(e) => setEditFieldType(e.target.value as FieldType)}
                                className="bg-black/60 border border-white/10 rounded-lg text-[9px] text-orange-300 px-2 py-1 outline-none"
                              >
                                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <button onClick={() => updateFieldType(col.name, fieldName, editFieldType)} className="p-1 text-emerald-400 hover:text-emerald-300"><CheckIcon size={10} /></button>
                              <button onClick={() => setEditingField(null)} className="p-1 text-slate-500 hover:text-white"><XIcon size={10} /></button>
                            </div>
                          ) : (
                            <>
                              <span className="text-[9px] font-mono text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded">{fieldType as string}</span>
                              <button 
                                onClick={() => { setEditingField({ collection: col.name, field: fieldName }); setEditFieldType(fieldType as FieldType); }}
                                className="p-1 opacity-0 group-hover/field:opacity-100 text-slate-600 hover:text-blue-400 transition-all"
                              ><EditIcon size={10} /></button>
                              <button 
                                onClick={() => removeField(col.name, fieldName)}
                                className="p-1 opacity-0 group-hover/field:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                              ><TrashIcon size={10} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Field */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                      <input
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="Field name"
                        className="flex-1 bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-[10px] text-slate-300 outline-none focus:border-orange-500/50 transition-all"
                        onKeyDown={(e) => { if (e.key === 'Enter') addField(col.name); }}
                      />
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        className="bg-black/40 border border-white/5 rounded-lg text-[9px] text-slate-400 px-2 py-1.5 outline-none"
                      >
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button
                        onClick={() => addField(col.name)}
                        className="p-1.5 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-all"
                      ><PlusIcon size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Collection */}
            {showNewCollection ? (
              <div className="p-4 bg-white/5 border border-orange-500/20 rounded-2xl space-y-3">
                <input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name (e.g. products)"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none focus:border-orange-500/50 transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter') addCollection(); }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowNewCollection(false); setNewCollectionName(''); }}
                    className="flex-1 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                  >Cancel</button>
                  <button
                    onClick={addCollection}
                    className="flex-1 py-2 bg-orange-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-orange-500 transition-all"
                  >Create</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowNewCollection(true)}
                className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-400 hover:border-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <PlusIcon size={14} /> New Collection
              </button>
            )}
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
