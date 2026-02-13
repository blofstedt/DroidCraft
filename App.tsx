
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProjectState, AppFile, ChatMessage, BuildStatus, FirebaseState, HistoryEntry, FirebaseUser, UIElementRef } from './types';
import { getInitialPwaProject } from './utils/projectTemplates';
import { GeminiAppService } from './services/geminiService';
import NativePwaFrame from './components/NativePwaFrame';
import VisualTransformOverlay from './components/VisualTransformOverlay';
import { 
  FolderIcon, 
  CodeIcon, 
  MessageSquareIcon, 
  PlayIcon, 
  DatabaseIcon, 
  XIcon,
  SettingsIcon,
  Loader2Icon,
  ChevronRightIcon,
  Menu as MenuIcon,
  PlusCircleIcon,
  HashIcon,
  CpuIcon,
  RefreshCwIcon,
  TargetIcon,
  ZapIcon,
  ExpandIcon,
  RotateCcwIcon,
  PackageIcon,
  CloudIcon,
  LogInIcon,
  ActivityIcon,
  AlertTriangleIcon,
  InfoIcon,
  MousePointer2Icon,
  FlaskConicalIcon,
  PenToolIcon,
  PaletteIcon,
  TypeIcon,
  LayoutIcon,
  LayersIcon,
  PlusIcon,
  Type as FontIcon,
  SquareIcon,
  MousePointerClickIcon,
  ImageIcon,
  ListIcon,
  ColumnsIcon,
  EyeIcon,
  KeyIcon,
  ScrollTextIcon,
  HistoryIcon,
  // Added missing icons to fix compilation errors
  SmartphoneIcon,
  SparklesIcon
} from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

const STORAGE_KEY = 'droidcraft_projects_v5';
const SCOPES = [
  { value: 'precise', icon: TargetIcon, desc: 'Exact target only' },
  { value: 'general', icon: ZapIcon, desc: 'Target + immediate context' },
  { value: 'wide', icon: ExpandIcon, desc: 'Section or component-wide' },
  { value: 'full-app', icon: LayersIcon, desc: 'Global architecture' }
];

const COMPONENT_LIBRARY = [
  { id: 'btn', name: 'Primary Button', icon: MousePointerClickIcon, prompt: 'Insert a primary action button with a modern blue aesthetic.' },
  { id: 'input', name: 'Text Field', icon: FontIcon, prompt: 'Insert a labeled text input field with border and focus states.' },
  { id: 'card', name: 'Info Card', icon: SquareIcon, prompt: 'Insert a clean white card with a title, description, and shadow.' },
  { id: 'img', name: 'Image Box', icon: ImageIcon, prompt: 'Insert an image placeholder with rounded corners.' },
  { id: 'list', name: 'Data List', icon: ListIcon, prompt: 'Insert a simple vertical list component with items and icons.' },
  { id: 'grid', name: '2-Col Grid', icon: ColumnsIcon, prompt: 'Insert a two-column responsive grid container.' },
];

const DEFAULT_INSTRUCTIONS = `DroidCraft Studio Rules:
- Adhere strictly to Tailwind CSS.
- Maintain a clean "Material Design 3" look.
- When inserting components, prioritize accessibility and responsive design.
- If an element has an ID, use it for CSS rules.
- Clarify if the insertion target is ambiguous.`;

interface VisualChange {
  top: number;
  left: number;
  width: number;
  height: number;
  tagName: string;
  styles?: Record<string, string>;
  text?: string;
}

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
      firebase: { config: null, status: 'disconnected', user: null, collections: [], clientId: '' }
    };
  });

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'screens' | 'insert' | 'firebase' | 'versions'>('screens');
  
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mode, setMode] = useState<'build' | 'test'>('build');
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [selectedElement, setSelectedElement] = useState<UIElementRef | null>(null);
  const [pendingVisualChanges, setPendingVisualChanges] = useState<Record<string, VisualChange>>({});

  const geminiRef = useRef<GeminiAppService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const tokenClientRef = useRef<any>(null);

  const currentEffectiveMode = isAltPressed ? 'test' : mode;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt') setIsAltPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') setIsAltPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (currentEffectiveMode === 'test') setSelectedElement(null);
  }, [currentEffectiveMode]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAllProjects(JSON.parse(saved));
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

  useEffect(() => {
    geminiRef.current = new GeminiAppService();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: ProjectState = { id: Date.now().toString(), name: newProjectName, packageName: 'com.droidcraft.app', files: getInitialPwaProject(newProjectName, 'com.droidcraft.app'), version: 1, history: [], persistentInstructions: DEFAULT_INSTRUCTIONS, firebase: { config: null, status: 'disconnected', user: null, collections: [], clientId: '' } };
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
      const scopeMatch = textToSend.match(/\*(\w+)/);
      const scope = scopeMatch ? scopeMatch[1] : 'general';
      const stream = geminiRef.current.processRequestStream(textToSend, project, messages, scope, project.persistentInstructions || DEFAULT_INSTRUCTIONS);
      for await (const chunkText of stream) {
        finalResponseText = chunkText;
        let displayContent = finalResponseText;
        try { const parsed = JSON.parse(finalResponseText + (finalResponseText.endsWith('}') ? '' : '"}')); displayContent = parsed.explanation || ''; }
        catch (e) { const match = finalResponseText.match(/"explanation":\s*"([^"]*)*"/); if (match) displayContent = match[1]; }
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: displayContent } : m));
      }
      const result = JSON.parse(finalResponseText);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: result.explanation } : m));
      setIsPreviewLoading(true);
      setProject(prev => {
        const newFiles = { ...prev.files };
        result.filesToUpdate?.forEach((f: any) => { newFiles[f.path] = { ...f, lastModified: Date.now() }; });
        result.newFiles?.forEach((f: any) => { newFiles[f.path] = { ...f, lastModified: Date.now() }; });
        result.deleteFiles?.forEach((path: string) => { delete newFiles[path]; });
        const snapshot: Record<string, string> = {};
        Object.entries(newFiles).forEach(([path, file]) => { snapshot[path] = (file as AppFile).content; });
        const newHistoryEntry: HistoryEntry = { id: Date.now().toString(), timestamp: Date.now(), description: result.explanation || 'Manual Update', author: 'ai', snapshot };
        return { ...prev, files: newFiles, version: prev.version + 1, history: [newHistoryEntry, ...(prev.history || [])] };
      });
      setTimeout(() => setIsPreviewLoading(false), 800);
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "I encountered an error." } : m));
      setIsPreviewLoading(false);
    } finally { setIsProcessing(false); }
  };

  const pushToIframe = (msg: any) => {
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) iframe.contentWindow.postMessage(msg, '*');
  };

  const handleVisualTransform = (newRect: { top: number, left: number, width: number, height: number }) => {
    if (!selectedElement) return;
    setPendingVisualChanges(prev => ({
      ...prev,
      [selectedElement.id]: { ...(prev[selectedElement.id] || { tagName: selectedElement.tagName, styles: {}, text: selectedElement.text }), ...newRect }
    }));
    pushToIframe({ type: 'APPLY_LAYOUT', id: selectedElement.id, rect: newRect });
  };

  const updateSelectedStyle = (property: string, value: string) => {
    if (!selectedElement) return;
    setPendingVisualChanges(prev => ({
      ...prev,
      [selectedElement.id]: { ...(prev[selectedElement.id] || { tagName: selectedElement.tagName, styles: {}, text: selectedElement.text, ...selectedElement.rect }), styles: { ...(prev[selectedElement.id]?.styles || {}), [property]: value } }
    }));
    pushToIframe({ type: 'APPLY_STYLE', id: selectedElement.id, style: { [property]: value } });
  };

  const updateSelectedText = (text: string) => {
    if (!selectedElement) return;
    setPendingVisualChanges(prev => ({
      ...prev,
      [selectedElement.id]: { ...(prev[selectedElement.id] || { tagName: selectedElement.tagName, styles: {}, text: selectedElement.text, ...selectedElement.rect }), text }
    }));
    pushToIframe({ type: 'APPLY_TEXT', id: selectedElement.id, text });
  };

  const handleWritePendingChanges = async () => {
    const changesCount = Object.keys(pendingVisualChanges).length;
    if (changesCount === 0) return;
    const changeSummary = Object.entries(pendingVisualChanges).map(([id, data]: [string, VisualChange]) => {
      const s = data.styles ? Object.entries(data.styles).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
      return `- Element /${id} (${data.tagName}): pos(${Math.round(data.top)}px, ${Math.round(data.left)}px), size: ${Math.round(data.width)}x${Math.round(data.height)}${s ? `, styles: {${s}}` : ''}${data.text ? `, text: "${data.text}"` : ''}`;
    }).join('\n');
    await handleSendMessage(`*precise Update visual styles and layout:\n${changeSummary}`);
    setPendingVisualChanges({});
    setSelectedElement(null);
  };

  const handleRestoreVersion = (entry: HistoryEntry) => {
    setIsPreviewLoading(true);
    setProject(prev => {
      const restoredFiles: Record<string, AppFile> = {};
      Object.entries(entry.snapshot).forEach(([path, content]) => { restoredFiles[path] = { path, content, language: path.split('.').pop() || 'text', lastModified: Date.now() }; });
      return { ...prev, files: restoredFiles, version: prev.version + 1 };
    });
    setTimeout(() => setIsPreviewLoading(false), 800);
  };

  const currentShadowBlur = useMemo(() => {
    if (!selectedElement) return 0;
    const shadow = pendingVisualChanges[selectedElement.id]?.styles?.boxShadow || selectedElement.computedStyles?.boxShadow || 'none';
    const blurMatch = shadow.match(/(\d+)px/g);
    return blurMatch && blurMatch.length >= 3 ? parseInt(blurMatch[2]) : 0;
  }, [selectedElement, pendingVisualChanges]);

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans select-none">
      
      {/* Sidebar Navigation */}
      <div className="w-16 bg-[#111] border-r border-white/5 flex flex-col items-center py-6 gap-6 z-50 shadow-xl">
        <button onClick={() => setShowNewProjectModal(true)} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"><PlusIcon size={20} /></button>
        <div className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('screens')} className={`p-3 rounded-xl transition-all ${activeTab === 'screens' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><LayersIcon size={20} /></button>
          <button onClick={() => setActiveTab('insert')} className={`p-3 rounded-xl transition-all ${activeTab === 'insert' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}><PlusCircleIcon size={20} /></button>
          <button onClick={() => setActiveTab('firebase')} className={`p-3 rounded-xl transition-all ${activeTab === 'firebase' ? 'bg-orange-600/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}><DatabaseIcon size={20} /></button>
          <button onClick={() => setActiveTab('versions')} className={`p-3 rounded-xl transition-all ${activeTab === 'versions' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}><HistoryIcon size={20} /></button>
        </div>
        <div className="mt-auto">
          <button onClick={() => setShowInstructionsModal(true)} className="p-3 text-slate-500 hover:text-white"><SettingsIcon size={20} /></button>
        </div>
      </div>

      {/* Primary Sidebar Content */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-[#111]/40 border-r border-white/5 transition-all duration-300 flex flex-col overflow-hidden`}>
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedElement && currentEffectiveMode === 'build' ? 'Properties' : activeTab}</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded text-slate-500 transition-all"><ChevronRightIcon size={16} className="rotate-180" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {selectedElement && currentEffectiveMode === 'build' ? (
            <div className="space-y-6 animate-in slide-in-from-left-4">
              {/* Layout Controls */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-1"><LayoutIcon size={12}/> Layout</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => updateSelectedStyle('display', 'flex')} className="bg-white/5 p-2 rounded-lg text-[9px] font-bold border border-white/5 hover:border-blue-500/50">Flex</button>
                  <button onClick={() => updateSelectedStyle('display', 'block')} className="bg-white/5 p-2 rounded-lg text-[9px] font-bold border border-white/5 hover:border-blue-500/50">Block</button>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-3">
                   <div className="space-y-1">
                     <span className="text-[8px] text-slate-500 font-bold uppercase">Direction</span>
                     <div className="flex gap-1">
                       <button onClick={() => updateSelectedStyle('flexDirection', 'row')} className="flex-1 p-1.5 bg-white/5 rounded text-[8px] font-black">ROW</button>
                       <button onClick={() => updateSelectedStyle('flexDirection', 'column')} className="flex-1 p-1.5 bg-white/5 rounded text-[8px] font-black">COL</button>
                     </div>
                   </div>
                </div>
              </div>

              {/* Spacing Controls */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">Spacing</label>
                <div className="bg-white/5 p-3 rounded-xl space-y-4">
                   <div className="space-y-1">
                     <div className="flex justify-between text-[8px] font-bold uppercase">Padding <span>{pendingVisualChanges[selectedElement.id]?.styles?.padding || selectedElement.computedStyles.padding}</span></div>
                     <input type="range" min="0" max="64" className="w-full accent-blue-600" onChange={(e) => updateSelectedStyle('padding', `${e.target.value}px`)} />
                   </div>
                </div>
              </div>

              {/* Aesthetics */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-1"><PaletteIcon size={12}/> Appearance</label>
                <div className="bg-white/5 p-3 rounded-xl space-y-4">
                  <div className="flex gap-2">
                    <input type="color" className="w-10 h-10 bg-transparent rounded cursor-pointer" value={pendingVisualChanges[selectedElement.id]?.styles?.backgroundColor || selectedElement.computedStyles.backgroundColor || '#ffffff'} onChange={(e) => updateSelectedStyle('backgroundColor', e.target.value)} />
                    <input type="color" className="w-10 h-10 bg-transparent rounded cursor-pointer" value={pendingVisualChanges[selectedElement.id]?.styles?.color || selectedElement.computedStyles.color || '#000000'} onChange={(e) => updateSelectedStyle('color', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                     <div className="flex justify-between text-[8px] font-bold uppercase">Radius <span>{pendingVisualChanges[selectedElement.id]?.styles?.borderRadius || selectedElement.computedStyles.borderRadius}</span></div>
                     <input type="range" min="0" max="40" className="w-full accent-blue-600" onChange={(e) => updateSelectedStyle('borderRadius', `${e.target.value}px`)} />
                  </div>
                  <div className="space-y-1">
                     <div className="flex justify-between text-[8px] font-bold uppercase">Shadow <span>{currentShadowBlur}px</span></div>
                     <input type="range" min="0" max="40" className="w-full accent-blue-600" value={currentShadowBlur} onChange={(e) => {
                       const v = parseInt(e.target.value);
                       const shadow = v === 0 ? 'none' : `0 ${v/2}px ${v}px rgba(0,0,0,0.15)`;
                       updateSelectedStyle('boxShadow', shadow);
                     }} />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 px-1"><FontIcon size={12}/> Typography</label>
                <textarea className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs outline-none focus:border-blue-500/50 min-h-[60px]" value={pendingVisualChanges[selectedElement.id]?.text || selectedElement.text} onChange={(e) => updateSelectedText(e.target.value)} />
              </div>

              <button onClick={() => setSelectedElement(null)} className="w-full py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all">Deselect</button>
            </div>
          ) : (
            <>
              {activeTab === 'screens' && (
                <div className="space-y-2">
                  <button onClick={() => handleSendMessage('Add a new screen called settings.html with basic layout.')} className="w-full py-3 border border-white/5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-600/10 transition-all mb-4"><PlusIcon size={14} /> New Screen</button>
                  {Object.keys(project.files).filter(p => p.endsWith('.html')).map(p => (
                    <button key={p} onClick={() => setActiveFile(p)} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeFile === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
                      <SmartphoneIcon size={16} /> <span className="text-xs font-bold">{p}</span>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'insert' && (
                <div className="grid grid-cols-2 gap-2">
                  {COMPONENT_LIBRARY.map(c => (
                    <button key={c.id} onClick={() => handleSendMessage(c.prompt)} className="flex flex-col items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><c.icon size={20} /></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-300">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'firebase' && (
                <div className="p-4 text-center space-y-4">
                  <CloudIcon size={32} className="mx-auto text-orange-400 opacity-50" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Manage backend orchestration and database collections.</p>
                </div>
              )}
              {activeTab === 'versions' && (
                <div className="space-y-3">
                  {project.history?.map(h => (
                    <div key={h.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
                      <div className="text-[8px] font-black text-slate-500 uppercase">{new Date(h.timestamp).toLocaleTimeString()}</div>
                      <p className="text-[10px] text-slate-300 italic">"{h.description}"</p>
                      <button onClick={() => handleRestoreVersion(h)} className="w-full py-2 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">Restore</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col relative bg-[#050505]">
        <div className="h-14 bg-[#111]/60 flex items-center px-6 border-b border-white/5 justify-between z-40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><MenuIcon size={18} /></button>}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-1 rounded-md">{project.name}</span>
              <span className="text-slate-700">/</span>
              <span className="text-[10px] font-mono text-slate-500">{activeFile}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#050505] rounded-full p-1 border border-white/10 shadow-inner">
               <button onClick={() => setMode('build')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${currentEffectiveMode === 'build' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}><MousePointer2Icon size={12} /> Design</button>
               <button onClick={() => setMode('test')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${currentEffectiveMode === 'test' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'}`}><EyeIcon size={12} /> Play</button>
            </div>
            {Object.keys(pendingVisualChanges).length > 0 && (
              <button onClick={handleWritePendingChanges} disabled={isProcessing} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 animate-pulse active:scale-95 disabled:opacity-50"><PenToolIcon size={12} /> Sync Edits ({Object.keys(pendingVisualChanges).length})</button>
            )}
            <button onClick={() => setIsPreviewLoading(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><RefreshCwIcon size={16} className={isPreviewLoading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Code Inspector */}
          <div className="flex-1 border-r border-white/5 p-6 overflow-auto bg-[#080808] custom-scrollbar">
            <div className="flex items-center gap-2 mb-4 opacity-40">
               <CodeIcon size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Logic Inspector</span>
            </div>
            <textarea className="w-full h-full bg-transparent text-blue-300/80 font-mono text-sm outline-none resize-none leading-relaxed" value={project.files[activeFile]?.content || ''} onChange={(e) => setProject(prev => ({...prev, files: {...prev.files, [activeFile]: {...prev.files[activeFile], content: e.target.value}}}))} />
          </div>
          
          {/* Visual Canvas */}
          <div className="w-[500px] flex items-center justify-center relative bg-[#0a0a0a] p-8 overflow-hidden">
             {isPreviewLoading && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-[60] flex flex-col items-center justify-center gap-4"><Loader2Icon size={32} className="animate-spin text-blue-500" /><p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Syncing Styles...</p></div>}
             <div className="relative">
               <NativePwaFrame 
                 key={project.version} 
                 html={project.files[activeFile]?.content || ''} 
                 js={project.files['app.js']?.content || ''} 
                 mode={currentEffectiveMode}
                 highlightId={selectedElement?.id} 
                 onInteract={(el) => { if (currentEffectiveMode === 'build') { setSelectedElement(el); setSidebarOpen(true); } }} 
               />
               {selectedElement && currentEffectiveMode === 'build' && (
                 <VisualTransformOverlay element={selectedElement} onUpdate={handleVisualTransform} onFinish={handleVisualTransform} />
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Right Orchestrator Panel */}
      <div className="w-96 bg-[#111] border-l border-white/5 flex flex-col z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.4)]">
         <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-600/20"><SparklesIcon size={20} className="text-blue-500" /></div>
             <div><h3 className="text-sm font-bold text-white tracking-tight">AI Orchestrator</h3><p className="text-[10px] text-emerald-500 uppercase tracking-widest font-black">Connected</p></div>
           </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050505]/20 custom-scrollbar">
            {messages.length === 0 && <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20"><MessageSquareIcon size={48} className="mb-4" /><p className="text-xs font-bold uppercase tracking-widest">Ready to build your next masterpiece.</p></div>}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-2xl text-[12px] shadow-lg leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1a1a1a] text-slate-300 border border-white/5 rounded-bl-none'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isProcessing && <div className="flex items-center gap-3 p-4 animate-pulse text-slate-500 text-[10px] font-black uppercase tracking-widest"><Loader2Icon size={16} className="animate-spin text-blue-500" /> Orchestrating Logic...</div>}
            <div ref={chatEndRef} />
         </div>

         <div className="p-6 bg-[#111] border-t border-white/5">
            <div className="relative">
              <textarea rows={3} placeholder="Ask Gemini to build logic, add screens, or change themes..." className="w-full bg-[#050505] border border-white/5 focus:border-blue-500/50 rounded-2xl p-4 text-xs text-slate-300 outline-none transition-all shadow-inner resize-none overflow-auto" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
              <button onClick={() => handleSendMessage()} disabled={isProcessing || !userInput.trim()} className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all"><ChevronRightIcon size={18} /></button>
            </div>
         </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#111] border border-white/5 rounded-[2.5rem] shadow-2xl p-10 space-y-8">
             <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-600/20"><PlusIcon size={40} className="text-blue-500" /></div>
                <h3 className="text-2xl font-black">Design New App</h3>
             </div>
             <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full bg-[#050505] border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-blue-500 transition-all" placeholder="Project Identifier" />
             <div className="flex gap-4">
                <button onClick={() => setShowNewProjectModal(false)} className="flex-1 py-4 bg-[#1a1a1a] rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                <button onClick={handleCreateProject} className="flex-1 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40">Launch Studio</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
