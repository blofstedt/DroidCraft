
import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, AppFile, ChatMessage, ScreenPosition, UIElementRef, HistoryEntry, NavigationConnection } from './types';
import { getInitialPwaProject } from './utils/projectTemplates';
import { GeminiAppService, GeminiUpdateResponse } from './services/geminiService';
import AppCanvas from './components/AppCanvas';
import AmateurLogicView from './components/AmateurLogicView';
import BuildPanel from './components/BuildPanel';
import FirebasePanel from './components/FirebasePanel';
import VersionsPanel from './components/VersionsPanel';
import ConnectionsPanel from './components/ConnectionsPanel';
import { 
  CodeIcon, 
  MessageSquareIcon, 
  SettingsIcon,
  Loader2Icon,
  ChevronRightIcon,
  Menu as MenuIcon,
  PlusCircleIcon,
  RefreshCwIcon,
  MousePointer2Icon,
  LayersIcon,
  PlusIcon,
  EyeIcon,
  HistoryIcon,
  SmartphoneIcon,
  SparklesIcon,
  SearchIcon,
  UserIcon,
  CpuIcon,
  BookOpenIcon,
  RotateCcwIcon,
  DatabaseIcon,
  XIcon,
  Info as InfoIcon,
  LinkIcon
} from 'lucide-react';

const STORAGE_KEY = 'droidcraft_projects_v6';
const DEFAULT_INSTRUCTIONS = `DroidCraft Studio Rules:
- Adhere strictly to Tailwind CSS.
- Maintain a clean "Material Design 3" look.
- Use the Combined Logic view to bridge user needs to source code.`;

const App: React.FC = () => {
  const [allProjects, setAllProjects] = useState<ProjectState[]>([]);
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.length > 0) return parsed[0];
    }
    return {
      id: 'default',
      name: 'DroidCraft App',
      packageName: 'com.droidcraft.app',
      files: getInitialPwaProject('DroidCraft App', 'com.droidcraft.app'),
      version: 1,
      history: [],
      persistentInstructions: DEFAULT_INSTRUCTIONS,
      firebase: { config: null, status: 'disconnected', user: null, collections: [], clientId: '' },
      screenPositions: {},
      connections: []
    };
  });

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'screens' | 'logic' | 'firebase' | 'versions' | 'build' | 'connections'>('logic');
  const [editorMode, setEditorMode] = useState<'pro' | 'amateur'>('amateur');
  
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mode, setMode] = useState<'build' | 'test'>('build');
  const [selectedElement, setSelectedElement] = useState<UIElementRef | null>(null);

  const geminiRef = useRef<GeminiAppService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAllProjects(JSON.parse(saved));
    geminiRef.current = new GeminiAppService();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects));
  }, [allProjects]);

  useEffect(() => {
    setAllProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      if (!exists) return [project, ...prev];
      return prev.map(p => p.id === project.id ? { ...project, lastSaved: Date.now() } : p);
    });
  }, [project]);

  const recordHistory = (description: string, author: 'user' | 'ai' | 'system', snapshotFiles: Record<string, AppFile>) => {
    const snapshot: Record<string, string> = {};
    Object.entries(snapshotFiles).forEach(([path, file]) => { snapshot[path] = file.content; });
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      description,
      author,
      snapshot
    };
    return [newEntry, ...(project.history || [])];
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const initialFiles = getInitialPwaProject(newProjectName, 'com.droidcraft.app');
    const newProject: ProjectState = { 
      id: Date.now().toString(), 
      name: newProjectName, 
      packageName: 'com.droidcraft.app', 
      files: initialFiles, 
      version: 1, 
      history: [], 
      persistentInstructions: DEFAULT_INSTRUCTIONS, 
      firebase: { config: null, status: 'disconnected', user: null, collections: [], clientId: '' },
      screenPositions: {},
      connections: []
    };
    newProject.history = recordHistory('Project initialized', 'system', initialFiles);
    setProject(newProject);
    setShowNewProjectModal(false);
    setNewProjectName('');
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || userInput;
    if (!textToSend.trim() || !geminiRef.current) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() };
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setUserInput('');
    setIsProcessing(true);
    let finalResponseText = '';
    try {
      const stream = geminiRef.current.processRequestStream(textToSend, project, messages, 'general', project.persistentInstructions || DEFAULT_INSTRUCTIONS);
      for await (const chunkText of stream) {
        finalResponseText += chunkText;
        let displayContent = finalResponseText;
        try { 
          const parsed = JSON.parse(finalResponseText + (finalResponseText.endsWith('}') ? '' : '"}')); 
          displayContent = parsed.explanation || ''; 
        } catch (e) { 
          const match = finalResponseText.match(/"explanation":\s*"([^"]*)*"/); 
          if (match) displayContent = match[1]; 
        }
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: displayContent } : m));
      }
      
      const result: GeminiUpdateResponse = JSON.parse(finalResponseText);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: result.explanation } : m));
      setIsPreviewLoading(true);
      
      setProject(prev => {
        const newFiles = { ...prev.files };
        result.filesToUpdate?.forEach((f) => { newFiles[f.path] = { ...f, lastModified: Date.now() } as AppFile; });
        result.newFiles?.forEach((f) => { newFiles[f.path] = { ...f, lastModified: Date.now() } as AppFile; });
        result.deleteFiles?.forEach((path: string) => { delete newFiles[path]; });
        
        // Apply backend updates from AI (auto-create/edit Firebase collections)
        let updatedFirebase = prev.firebase;
        if (result.backendUpdates?.collections && updatedFirebase?.config) {
          const existingCollections = [...(updatedFirebase.collections || [])];
          result.backendUpdates.collections.forEach((col: { name: string; schema: any; rules?: string }) => {
            const existingIdx = existingCollections.findIndex(c => c.name === col.name);
            if (existingIdx >= 0) {
              existingCollections[existingIdx] = {
                ...existingCollections[existingIdx],
                schema: { ...existingCollections[existingIdx].schema, ...col.schema }
              };
            } else {
              existingCollections.push({ name: col.name, schema: col.schema, recordCount: 0 });
            }
          });
          updatedFirebase = { ...updatedFirebase, collections: existingCollections };
        }

        return { 
          ...prev, 
          files: newFiles, 
          firebase: updatedFirebase,
          version: prev.version + 1, 
          history: recordHistory(result.explanation || 'AI Orchestration Update', 'ai', newFiles)
        };
      });
      setTimeout(() => setIsPreviewLoading(false), 800);
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "I encountered an error." } : m));
      setIsPreviewLoading(false);
    } finally { setIsProcessing(false); }
  };

  // DIRECT ACTIONS (No AI needed)
  const addScreen = () => {
    const screenCount = Object.keys(project.files).filter(f => f.endsWith('.html')).length;
    const path = `screen${screenCount + 1}.html`;
    const content = `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen p-8">
    <h1 class="text-3xl font-black text-slate-800">New Screen</h1>
    <p class="mt-4 text-slate-500">Add logic to this screen using the orchestrator or direct edits.</p>
</body>
</html>`;
    
    setProject(prev => {
      const newFiles = { 
        ...prev.files, 
        [path]: { path, content, language: 'html', lastModified: Date.now() } 
      };
      return { 
        ...prev, 
        files: newFiles, 
        version: prev.version + 1,
        history: recordHistory(`Added direct screen: ${path}`, 'user', newFiles)
      };
    });
    setActiveFile(path);
  };

  const updateFileDirectly = (path: string, content: string) => {
    setProject(prev => {
      const newFiles = { ...prev.files, [path]: { ...prev.files[path], content, lastModified: Date.now() } };
      return { 
        ...prev, 
        files: newFiles, 
        version: prev.version + 1,
        history: recordHistory(`Direct edit of ${path}`, 'user', newFiles)
      };
    });
  };

  const handleAmateurUpdate = (path: string, originalText: string, newText: string) => {
    // Attempt direct replacement first
    const file = project.files[path];
    if (!file) return;
    
    // Simple direct replacement logic for common strings
    if (file.content.includes(originalText)) {
      const newContent = file.content.replace(originalText, newText);
      updateFileDirectly(path, newContent);
    } else {
      // Fallback to AI if simple replacement fails
      handleSendMessage(`In file ${path}, change the value "${originalText}" to "${newText}". Respond with the updated repo.`);
    }
  };

  const handleRollback = (entry: HistoryEntry) => {
    if (!confirm("Are you sure you want to rollback to this version? Current changes will be lost.")) return;
    
    const newFiles: Record<string, AppFile> = {};
    Object.entries(entry.snapshot).forEach(([path, content]) => {
      newFiles[path] = { 
        path, 
        content, 
        language: path.split('.').pop() || 'text', 
        lastModified: Date.now() 
      };
    });
    
    setProject(prev => ({
      ...prev,
      files: newFiles,
      version: prev.version + 1,
      history: recordHistory(`Rollback to ${new Date(entry.timestamp).toLocaleTimeString()}`, 'user', newFiles)
    }));
  };

  const generateNavigationCode = (connections: NavigationConnection[]): string => {
    if (connections.length === 0) return '';
    const handlers = connections.map(conn => {
      const escapedId = conn.fromElementId.replace(/'/g, "\\'");
      return `
// Navigation: ${conn.fromElementLabel} -> ${conn.toScreen}
(function() {
  var el = document.getElementById('${escapedId}') || document.querySelector('.${escapedId}');
  if (el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '${conn.toScreen}';
    });
  }
})();`;
    }).join('\n');

    return `\n// === Auto-generated Navigation (DroidCraft Studio) ===\n${handlers}\n// === End Navigation ===\n`;
  };

  const handleAddConnection = (connection: NavigationConnection) => {
    setProject(prev => {
      const existingConnections = prev.connections || [];
      // Prevent duplicate connections
      const isDuplicate = existingConnections.some(
        c => c.fromScreen === connection.fromScreen && 
             c.fromElementId === connection.fromElementId && 
             c.toScreen === connection.toScreen
      );
      if (isDuplicate) return prev;

      const newConnections = [...existingConnections, connection];
      
      // Generate and inject navigation code into the source screen
      const screenConnections = newConnections.filter(c => c.fromScreen === connection.fromScreen);
      const navCode = generateNavigationCode(screenConnections);
      const newFiles = { ...prev.files };
      
      // Find or create the JS for the screen's navigation
      const jsPath = connection.fromScreen.replace('.html', '.nav.js');
      newFiles[jsPath] = {
        path: jsPath,
        content: navCode,
        language: 'javascript',
        lastModified: Date.now()
      };

      return {
        ...prev,
        connections: newConnections,
        files: newFiles,
        version: prev.version + 1,
        history: recordHistory(
          `Connected ${connection.fromElementLabel} in ${connection.fromScreen} → ${connection.toScreen}`,
          'user',
          newFiles
        )
      };
    });
  };

  const handleRemoveConnection = (connectionId: string) => {
    setProject(prev => {
      const existingConnections = prev.connections || [];
      const removedConnection = existingConnections.find(c => c.id === connectionId);
      const newConnections = existingConnections.filter(c => c.id !== connectionId);
      const newFiles = { ...prev.files };

      // Regenerate nav code for the affected screen
      if (removedConnection) {
        const screenConnections = newConnections.filter(c => c.fromScreen === removedConnection.fromScreen);
        const jsPath = removedConnection.fromScreen.replace('.html', '.nav.js');
        if (screenConnections.length === 0) {
          delete newFiles[jsPath];
        } else {
          newFiles[jsPath] = {
            path: jsPath,
            content: generateNavigationCode(screenConnections),
            language: 'javascript',
            lastModified: Date.now()
          };
        }
      }

      return {
        ...prev,
        connections: newConnections,
        files: newFiles,
        version: prev.version + 1,
        history: recordHistory(
          `Removed connection${removedConnection ? ` from ${removedConnection.fromScreen}` : ''}`,
          'user',
          newFiles
        )
      };
    });
  };

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans select-none">
      
      {/* Sidebar Navigation */}
      <div className="w-16 bg-[#111] border-r border-white/5 flex flex-col items-center py-6 gap-6 z-50 shadow-xl">
        <button onClick={() => setShowNewProjectModal(true)} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-blue-900/40"><PlusIcon size={20} /></button>
        <div className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('logic')} className={`p-3 rounded-xl transition-all ${activeTab === 'logic' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><BookOpenIcon size={20} /></button>
          <button onClick={() => setActiveTab('screens')} className={`p-3 rounded-xl transition-all ${activeTab === 'screens' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><LayersIcon size={20} /></button>
          <button onClick={() => setActiveTab('connections')} className={`p-3 rounded-xl transition-all ${activeTab === 'connections' ? 'bg-orange-600/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}><LinkIcon size={20} /></button>
          <button onClick={() => setActiveTab('firebase')} className={`p-3 rounded-xl transition-all ${activeTab === 'firebase' ? 'bg-orange-600/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}><DatabaseIcon size={20} /></button>
          <button onClick={() => setActiveTab('versions')} className={`p-3 rounded-xl transition-all ${activeTab === 'versions' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}><HistoryIcon size={20} /></button>
          <button onClick={() => setActiveTab('build')} className={`p-3 rounded-xl transition-all ${activeTab === 'build' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}><SmartphoneIcon size={20} /></button>
        </div>
        <div className="mt-auto">
          <button onClick={() => setShowInstructionsModal(true)} className="p-3 text-slate-500 hover:text-white"><SettingsIcon size={20} /></button>
        </div>
      </div>

      {/* Primary Sidebar Content */}
      <div className={`${sidebarOpen ? 'w-96' : 'w-0'} bg-[#111]/40 border-r border-white/5 transition-all duration-300 flex flex-col overflow-hidden relative`}>
        <div className="p-6 border-b border-white/5 bg-black/20 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none">{activeTab}</h2>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><ChevronRightIcon size={14} className="rotate-180" /></button>
          </div>
          
          {activeTab === 'logic' && (
            <div className="flex items-center bg-[#050505] p-1 rounded-xl border border-white/5">
              <button onClick={() => setEditorMode('amateur')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editorMode === 'amateur' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}><UserIcon size={12} className="inline mr-1" /> Amateur</button>
              <button onClick={() => setEditorMode('pro')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editorMode === 'pro' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}><CpuIcon size={12} className="inline mr-1" /> Pro</button>
            </div>
          )}

          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input 
              className="w-full bg-[#050505] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-blue-500/50 transition-all"
              placeholder="Search assets or logic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'logic' ? (
            editorMode === 'amateur' ? (
              <AmateurLogicView files={project.files} activeFile={activeFile} searchQuery={searchQuery} onUpdateValue={handleAmateurUpdate} />
            ) : (
              <div className="space-y-4">
                {(Object.values(project.files) as AppFile[]).map(file => (
                  <div key={file.path} className="group p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{file.path}</span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase">{file.language}</span>
                    </div>
                    <textarea 
                      className="w-full h-32 bg-black/40 p-3 rounded-xl text-[11px] font-mono text-slate-400 outline-none resize-none border border-transparent focus:border-blue-500/30"
                      value={file.content}
                      onChange={(e) => updateFileDirectly(file.path, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'screens' ? (
            <div className="space-y-2">
              <button onClick={addScreen} className="w-full py-4 border-2 border-dashed border-white/10 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-600/10 hover:border-blue-500/30 transition-all mb-4 group"><PlusIcon size={16} /> Add New Screen</button>
              {Object.keys(project.files).filter(p => p.endsWith('.html')).map(p => (
                <button key={p} onClick={() => setActiveFile(p)} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all group ${activeFile === p ? 'bg-blue-600 text-white shadow-xl' : 'bg-white/5 border border-white/5 text-slate-500 hover:text-slate-300'}`}>
                  <div className="flex items-center gap-4">
                    <SmartphoneIcon size={18} />
                    <span className="text-xs font-bold tracking-tight">{p}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : activeTab === 'firebase' ? (
            <FirebasePanel project={project} onUpdateProject={(u) => setProject(p => ({ ...p, ...u }))} />
          ) : activeTab === 'connections' ? (
            <ConnectionsPanel 
              connections={project.connections || []} 
              htmlFiles={Object.keys(project.files).filter(f => f.endsWith('.html'))}
              onRemoveConnection={handleRemoveConnection}
              activeFile={activeFile}
            />
          ) : activeTab === 'versions' ? (
            <VersionsPanel project={project} onRollback={handleRollback} />
          ) : activeTab === 'build' ? (
            <BuildPanel project={project} onUpdateProject={(u) => setProject(p => ({ ...p, ...u }))} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8">
               <InfoIcon size={40} className="mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">Select a toolkit.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace (Canvas Engine) */}
      <div className="flex-1 flex flex-col relative bg-[#050505]">
        <div className="h-16 bg-[#111]/80 flex items-center px-8 border-b border-white/5 justify-between z-40 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-all"><MenuIcon size={20} /></button>}
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center border border-blue-600/30"><SmartphoneIcon size={16} className="text-blue-500" /></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">{project.name}</span>
                 <span className="text-[9px] text-slate-600 font-bold uppercase">{activeFile}</span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-[#080808] rounded-2xl p-1.5 border border-white/5 shadow-inner">
               <button onClick={() => setMode('build')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'build' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><MousePointer2Icon size={14} /> Design</button>
               <button onClick={() => setMode('test')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'test' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><EyeIcon size={14} /> Play</button>
            </div>
            <button onClick={() => setIsPreviewLoading(true)} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 transition-all hover:text-white"><RefreshCwIcon size={18} className={isPreviewLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {isPreviewLoading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-6">
               <Loader2Icon size={48} className="animate-spin text-blue-500" />
               <p className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em]">Rendering Native Artifacts</p>
            </div>
          )}
          
          <AppCanvas 
            files={project.files}
            activeFile={activeFile}
            onSelectScreen={setActiveFile}
            mode={mode}
            onInteract={(el) => { if (mode === 'build') { setSelectedElement(el); setSidebarOpen(true); setActiveTab('logic'); } }}
            selectedElementId={selectedElement?.id}
            screenPositions={project.screenPositions || {}}
            onUpdatePosition={(path, pos) => setProject(prev => ({ ...prev, screenPositions: { ...prev.screenPositions, [path]: pos } }))}
            version={project.version}
            connections={project.connections || []}
            onAddConnection={handleAddConnection}
            onRemoveConnection={handleRemoveConnection}
          />
        </div>
      </div>

      {/* Right AI Orchestration Panel */}
      <div className="w-96 bg-[#111] border-l border-white/5 flex flex-col z-20 shadow-[-40px_0_80px_rgba(0,0,0,0.6)]">
         <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/10">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-600/30 shadow-inner"><SparklesIcon size={24} className="text-blue-500" /></div>
             <div>
               <h3 className="text-sm font-black text-white tracking-wide uppercase leading-none mb-1">Orchestrator</h3>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[9px] text-emerald-500 uppercase tracking-[0.2em] font-black">Online</p>
               </div>
             </div>
           </div>
           <button onClick={() => setMessages([])} className="p-2 text-slate-600 hover:text-white transition-colors"><RotateCcwIcon size={16} /></button>
         </div>

         <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#050505]/30 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6"><MessageSquareIcon size={40} /></div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] leading-relaxed">System Ready. Command UI logic or structural shifts.</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[90%] p-5 rounded-[1.8rem] text-[12px] shadow-2xl leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-[#1a1a1a] text-slate-300 border border-white/5 rounded-bl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-4 p-4 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <Loader2Icon size={16} className="animate-spin text-blue-500" />
                Synthesizing Repo Changes
              </div>
            )}
            <div ref={chatEndRef} />
         </div>

         <div className="p-8 bg-[#111] border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="relative">
              <textarea 
                rows={3} 
                placeholder="Talk to the orchestrator..." 
                className="w-full bg-[#050505] border border-white/5 focus:border-blue-500/50 rounded-3xl p-6 pr-14 text-xs text-slate-300 outline-none transition-all shadow-inner resize-none overflow-auto" 
                value={userInput} 
                onChange={e => setUserInput(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
              />
              <button 
                onClick={() => handleSendMessage()} 
                disabled={isProcessing || !userInput.trim()} 
                className="absolute bottom-6 right-6 p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40"
              >
                <ChevronRightIcon size={20} />
              </button>
            </div>
         </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="w-full max-w-xl bg-[#111] border border-white/5 rounded-[3.5rem] shadow-2xl p-12 space-y-10">
             <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10 shadow-2xl"><PlusIcon size={48} className="text-white" /></div>
                <h3 className="text-3xl font-black text-white uppercase">Initialize Project</h3>
             </div>
             <input 
                value={newProjectName} 
                onChange={e => setNewProjectName(e.target.value)} 
                className="w-full bg-[#050505] border border-white/10 rounded-3xl p-6 text-xl font-black text-white outline-none focus:border-blue-500 transition-all" 
                placeholder="App Name (e.g. MyFitnessApp)" 
             />
             <div className="flex gap-4">
                <button onClick={() => setShowNewProjectModal(false)} className="flex-1 py-5 bg-[#1a1a1a] rounded-3xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Cancel</button>
                <button onClick={handleCreateProject} className="flex-1 py-5 bg-blue-600 rounded-3xl text-[11px] font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-900/40 transition-all">Launch Studio</button>
             </div>
          </div>
        </div>
      )}

      {/* Persistent Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[300] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
           <div className="w-full max-w-2xl bg-[#111] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
                <h2 className="text-xl font-black uppercase tracking-widest">Studio Directives</h2>
                <button onClick={() => setShowInstructionsModal(false)} className="p-4 hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-white"><XIcon size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Core Guidelines for the AI Orchestrator</p>
                <textarea 
                  className="w-full h-80 bg-black/40 border border-white/5 rounded-3xl p-8 text-sm text-slate-300 font-mono outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                  value={project.persistentInstructions}
                  onChange={(e) => setProject(prev => ({ ...prev, persistentInstructions: e.target.value }))}
                />
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;
