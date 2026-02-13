
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProjectState, AppFile, ChatMessage, BuildStatus, FirebaseState, HistoryEntry, FirebaseUser } from './types';
import { getInitialPwaProject } from './utils/projectTemplates';
import { GeminiAppService } from './services/geminiService';
import NativePwaFrame from './components/NativePwaFrame';
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
  SmartphoneIcon,
  Menu as MenuIcon,
  PlusCircleIcon,
  SparklesIcon,
  HashIcon,
  CpuIcon,
  RefreshCwIcon,
  TargetIcon,
  ZapIcon,
  ExpandIcon,
  GlobeIcon,
  ShieldCheckIcon,
  ScrollTextIcon,
  FileCodeIcon,
  HistoryIcon,
  RotateCcwIcon,
  ClockIcon,
  KeyIcon,
  LockIcon,
  PackageIcon,
  CloudIcon,
  LogInIcon,
  ServerIcon,
  TableIcon,
  ActivityIcon,
  LinkIcon,
  AlertTriangleIcon,
  InfoIcon
} from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

const STORAGE_KEY = 'droidcraft_projects_v5';
const PROPERTIES = ['width', 'height', 'background', 'color', 'font-size', 'padding', 'margin', 'border-radius', 'opacity', 'shadow', 'font-weight', 'alignment', 'display', 'position', 'flex-direction', 'justify-content', 'align-items', 'z-index', 'overflow', 'border-color', 'border-width'];
const ATTRIBUTE_CATEGORIES = ['style', 'attributes', 'content', 'events'];
const SCOPES = [
  { value: 'precise', icon: TargetIcon, desc: 'Exact target only' },
  { value: 'general', icon: ZapIcon, desc: 'Target + immediate context' },
  { value: 'wide', icon: ExpandIcon, desc: 'Section or component-wide' },
  { value: 'full-app', icon: GlobeIcon, desc: 'Global architecture' }
];

const DEFAULT_INSTRUCTIONS = `Gemini should be specific and adhere strictly to the user's requests.
Follow coding best practices including:
- High security standards (prevent XSS, injection, etc.)
- Performance optimization
- Efficient code reuse and modularity
- Clear, helpful comments
- Maintain a logical repository structure
- Do not break existing functionality
- Proactively identify and fix bugs
- Ensure cross-platform compatibility where applicable.
- UX ADHERENCE: For general requests, adhere to the current app's aesthetic.
- CLARIFY BEFORE CODING: If a request is ambiguous, ask for more details before writing code.`;

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
      firebase: {
        config: null,
        status: 'disconnected',
        user: null,
        collections: [],
        clientId: ''
      }
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
  const [activeTab, setActiveTab] = useState<'files' | 'firebase' | 'build' | 'versions'>('files');
  
  const [suggestions, setSuggestions] = useState<{type: 'element' | 'category' | 'property' | 'scope' | 'file', value: string}[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const geminiRef = useRef<GeminiAppService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tokenClientRef = useRef<any>(null);

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

  // Google OAuth Initialization
  const initGsi = (clientId: string) => {
    if (!window.google || !clientId || clientId.includes('example')) return;
    
    try {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setAuthError(tokenResponse.error_description || 'Authentication failed');
            return;
          }
          
          if (tokenResponse.access_token) {
            try {
              setIsPreviewLoading(true);
              const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              }).then(res => res.json());

              setProject(prev => ({
                ...prev,
                firebase: {
                  ...prev.firebase!,
                  user: {
                    email: userInfo.email,
                    displayName: userInfo.name,
                    photoURL: userInfo.picture,
                    token: tokenResponse.access_token
                  },
                  status: 'connected'
                }
              }));
              setAuthError(null);
            } catch (err) {
              setAuthError('Failed to retrieve user profile');
            } finally {
              setIsPreviewLoading(false);
            }
          }
        },
      });
    } catch (e) {
      console.error('GSI Init Error:', e);
      setAuthError('OAuth Initialization failed. Check console.');
    }
  };

  useEffect(() => {
    if (project.firebase?.clientId) {
      const timer = setInterval(() => {
        if (window.google) {
          initGsi(project.firebase!.clientId!);
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, [project.firebase?.clientId]);

  const availableElements = useMemo(() => {
    const html = project.files['index.html']?.content || '';
    const ids = Array.from(html.matchAll(/id=["']([^"']+)["']/g)).map(m => m[1]);
    const classes = Array.from(html.matchAll(/class=["']([^"']+)["']/g))
      .flatMap(m => m[1].split(' '))
      .filter(c => c.length > 2 && !c.includes('['));
    return Array.from(new Set([...ids, ...classes]));
  }, [project.files]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setUserInput(val);
    const cursor = e.target.selectionStart;
    const beforeCursor = val.substring(0, cursor);
    if (beforeCursor.endsWith(' ')) { setSuggestions([]); setHoveredElementId(null); return; }
    const segmentsAfterSplit = beforeCursor.split(/\s+/);
    const lastWord = segmentsAfterSplit[segmentsAfterSplit.length - 1] || '';
    if (lastWord.startsWith('/')) {
      const pathSegments = lastWord.split('/');
      const depth = pathSegments.length;
      const currentSegment = pathSegments[depth - 1].toLowerCase();
      if (depth === 2) { setSuggestions(availableElements.filter(el => el.toLowerCase().includes(currentSegment)).map(el => ({ type: 'element' as const, value: el })).slice(0, 8)); }
      else if (depth === 3) { setSuggestions(ATTRIBUTE_CATEGORIES.filter(cat => cat.toLowerCase().includes(currentSegment)).map(cat => ({ type: 'category' as const, value: cat }))); }
      else if (depth >= 4) { setSuggestions(PROPERTIES.filter(p => p.toLowerCase().includes(currentSegment)).map(p => ({ type: 'property' as const, value: p })).slice(0, 8)); }
      setSelectedSuggestionIndex(0);
    } else if (lastWord.startsWith('*')) {
      const currentInputSegment = lastWord.substring(1).toLowerCase();
      setSuggestions(SCOPES.filter(s => s.value.includes(currentInputSegment)).map(s => ({ type: 'scope' as const, value: s.value })));
      setSelectedSuggestionIndex(0);
    } else if (lastWord.startsWith('\\')) {
      const currentInputSegment = lastWord.substring(1).toLowerCase();
      setSuggestions(Object.keys(project.files).filter(f => f.toLowerCase().includes(currentInputSegment)).map(f => ({ type: 'file' as const, value: f })));
      setSelectedSuggestionIndex(0);
    } else { setSuggestions([]); setHoveredElementId(null); }
  };

  const applySuggestion = (s: {type: 'element' | 'category' | 'property' | 'scope' | 'file', value: string}) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart;
    const beforeCursor = userInput.substring(0, cursor);
    const afterCursor = userInput.substring(cursor);
    const words = beforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];
    let newWord = '';
    if (s.type === 'scope') { newWord = '*' + s.value; words[words.length - 1] = newWord; setUserInput(words.join(' ') + ' ' + afterCursor); setSuggestions([]); }
    else if (s.type === 'file') { newWord = '\\' + s.value; words[words.length - 1] = newWord; setUserInput(words.join(' ') + ' ' + afterCursor); setSuggestions([]); }
    else { const pathSegments = lastWord.split('/'); pathSegments[pathSegments.length - 1] = s.value; newWord = pathSegments.join('/'); words[words.length - 1] = newWord; const newVal = words.join(' ') + (s.type === 'property' ? ' ' : '') + afterCursor; setUserInput(newVal); if (s.type === 'property') { setSuggestions([]); setHoveredElementId(null); } }
    const wordsString = words.join(' ');
    const finalPos = wordsString.length + (s.type === 'property' ? 1 : 0);
    setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); inputRef.current.setSelectionRange(finalPos, finalPos); } }, 0);
  };

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
    setSuggestions([]);
    setHoveredElementId(null);
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
        let updatedFirebase = prev.firebase;
        if (result.backendUpdates) {
          updatedFirebase = { ...prev.firebase!, collections: result.backendUpdates.collections || prev.firebase?.collections, lastSyncTimestamp: Date.now() };
          if (result.backendUpdates.configSync && prev.firebase?.config) {
            const configContent = `export const firebaseConfig = ${JSON.stringify(prev.firebase.config, null, 2)};`;
            newFiles['firebase-config.js'] = { path: 'firebase-config.js', content: configContent, language: 'javascript', lastModified: Date.now() };
          }
        }
        const snapshot: Record<string, string> = {};
        Object.entries(newFiles).forEach(([path, file]) => { snapshot[path] = (file as AppFile).content; });
        const newHistoryEntry: HistoryEntry = { id: Date.now().toString(), timestamp: Date.now(), description: result.explanation || 'Manual Update', author: 'ai', snapshot };
        return { ...prev, files: newFiles, version: prev.version + 1, history: [newHistoryEntry, ...(prev.history || [])], firebase: updatedFirebase };
      });
      setTimeout(() => setIsPreviewLoading(false), 800);
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "I encountered an error processing your request." } : m));
      setIsPreviewLoading(false);
    } finally { setIsProcessing(false); }
  };

  const handleFirebaseLogin = () => {
    if (!project.firebase?.clientId || project.firebase.clientId.length < 10) {
      setAuthError('Valid Google Client ID required. Configure it in the panel below.');
      setShowConfigPanel(true);
      return;
    }
    if (!tokenClientRef.current) {
      initGsi(project.firebase.clientId);
      setTimeout(() => tokenClientRef.current?.requestAccessToken(), 100);
    } else {
      tokenClientRef.current.requestAccessToken();
    }
  };

  const handleSaveClientId = (id: string) => {
    setProject(prev => ({
      ...prev,
      firebase: { ...prev.firebase!, clientId: id }
    }));
    setAuthError(null);
    setShowConfigPanel(false);
  };

  const handleCreateFirebaseProject = async () => {
    if (!project.firebase?.user?.token) return;
    setIsPreviewLoading(true);
    try {
      const projectName = `droid-${project.name.toLowerCase().replace(/\s/g, '-')}-${Math.floor(Math.random() * 1000)}`;
      const mockConfig = {
        projectId: projectName,
        apiKey: 'AIzaSy' + Math.random().toString(36).substring(7),
        authDomain: `${projectName}.firebaseapp.com`,
        appId: '1:' + Math.floor(Math.random() * 10000000) + ':web:' + Math.random().toString(36).substring(7)
      };
      setProject(prev => ({
        ...prev,
        firebase: { ...prev.firebase!, config: mockConfig, status: 'connected' }
      }));
      handleSendMessage('Initialize Firebase in my app and link all necessary configuration files.');
    } catch (err) {
      setAuthError('Failed to provision cloud resources');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSyncSchema = () => {
    handleSendMessage('*full-app Automate the creation of database projects and tables, pushing any necessary SQL-like schema updates to match current app functionality.');
  };

  const handleBuildAAB = async () => {
    const generatedKeys = { 'ANDROID_KEY_ALIAS': 'droidcraft_release', 'ANDROID_KEY_PASSWORD': Math.random().toString(36).slice(-12), 'ANDROID_STORE_PASSWORD': Math.random().toString(36).slice(-12), 'BUILD_TYPE': 'AAB' };
    setProject(prev => ({ ...prev, envVariables: { ...(prev.envVariables || {}), ...generatedKeys } }));
    handleSendMessage(`Generate an Android App Bundle (AAB) for production. Use the provided signing credentials in the environment variables.`);
  };

  const handleRestoreVersion = (entry: HistoryEntry) => {
    setIsPreviewLoading(true);
    setProject(prev => {
      const restoredFiles: Record<string, AppFile> = {};
      Object.entries(entry.snapshot).forEach(([path, content]) => { restoredFiles[path] = { path, content, language: path.split('.').pop() || 'text', lastModified: Date.now() }; });
      const restoreLog: HistoryEntry = { id: Date.now().toString(), timestamp: Date.now(), description: `Restored version from ${new Date(entry.timestamp).toLocaleString()}`, author: 'user', snapshot: entry.snapshot };
      return { ...prev, files: restoredFiles, version: prev.version + 1, history: [restoreLog, ...(prev.history || [])] };
    });
    setTimeout(() => setIsPreviewLoading(false), 800);
  };

  const highlightUserInput = (text: string) => {
    const parts = text.split(/(\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?|\*\w+|\\\w+\.[a-zA-Z0-9]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('/')) return <span key={i} className="text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]">{part}</span>;
      if (part.startsWith('*')) return <span key={i} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">{part}</span>;
      if (part.startsWith('\\')) return <span key={i} className="text-purple-400 font-bold drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]">{part}</span>;
      return <span key={i} className="text-slate-300">{part}</span>;
    });
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?|\*\w+|\\\w+\.[a-zA-Z0-9]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('/')) return <span key={i} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-md font-mono text-[11px] border border-blue-500/30 mx-0.5">{part}</span>;
      if (part.startsWith('*')) return <span key={i} className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-mono text-[11px] border border-emerald-500/30 mx-0.5">{part}</span>;
      if (part.startsWith('\\')) return <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-md font-mono text-[11px] border border-purple-500/30 mx-0.5">{part}</span>;
      return part;
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans select-none">
      
      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8">
             <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-600/20"><PlusCircleIcon size={32} className="text-blue-500" /></div>
                <h3 className="text-2xl font-bold">New App Project</h3>
             </div>
             <div className="space-y-4 mb-8">
                <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm outline-none focus:border-blue-500" placeholder="App Name" />
             </div>
             <div className="flex gap-3">
                <button onClick={() => setShowNewProjectModal(false)} className="flex-1 py-4 bg-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest">Cancel</button>
                <button onClick={handleCreateProject} className="flex-1 py-4 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/40">Create</button>
             </div>
          </div>
        </div>
      )}

      {/* Persistent Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
           <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-blue-600/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/40"><ScrollTextIcon size={24} /></div>
                  <div><h2 className="text-xl font-black">AI Orchestrator Rules</h2><p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Set Persistent Directives</p></div>
                </div>
                <button onClick={() => setShowInstructionsModal(false)} className="p-3 hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-white"><XIcon size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">System Instructions</label>
                  <textarea 
                    className="w-full h-80 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-sm text-slate-300 font-mono leading-relaxed outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                    value={project.persistentInstructions}
                    onChange={(e) => setProject(prev => ({ ...prev, persistentInstructions: e.target.value }))}
                  />
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Global Sidebar */}
      <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-8 gap-8 z-50 shadow-2xl">
        <button onClick={() => setShowNewProjectModal(true)} className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-all">
          <PlusCircleIcon size={28} />
        </button>
        <div className="flex flex-col gap-4">
          <button onClick={() => setActiveTab('files')} className={`p-3 rounded-2xl transition-all ${activeTab === 'files' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><FolderIcon size={24} /></button>
          <button onClick={() => setActiveTab('versions')} className={`p-3 rounded-2xl transition-all ${activeTab === 'versions' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}><HistoryIcon size={24} /></button>
          <button onClick={() => setActiveTab('firebase')} className={`p-3 rounded-2xl transition-all ${activeTab === 'firebase' ? 'bg-orange-600/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}><DatabaseIcon size={24} /></button>
          <button onClick={() => setActiveTab('build')} className={`p-3 rounded-2xl transition-all ${activeTab === 'build' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}><CpuIcon size={24} /></button>
        </div>
      </div>

      {/* Explorer Column */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-slate-900/40 border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeTab}</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-500 transition-all"><ChevronRightIcon size={16} className="rotate-180" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'files' && Object.keys(project.files).sort().map(path => (
            <button key={path} onClick={() => setActiveFile(path)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${activeFile === path ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500 hover:bg-slate-800/50'}`}>
              <CodeIcon size={16} /><span className="truncate font-mono text-xs">{path}</span>
            </button>
          ))}
          {activeTab === 'firebase' && (
            <div className="space-y-6">
               {authError && (
                 <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400">
                    <AlertTriangleIcon size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed">{authError}</p>
                 </div>
               )}

               {!project.firebase?.user ? (
                 <div className="space-y-4">
                   <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-[2rem] text-center space-y-4 shadow-xl shadow-orange-950/20">
                      <CloudIcon size={32} className="mx-auto text-orange-400 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Cloud Sync Required</p>
                      <button onClick={handleFirebaseLogin} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-900/30 active:scale-95">
                         <LogInIcon size={16} /> Sign in with Google
                      </button>
                      <button onClick={() => setShowConfigPanel(!showConfigPanel)} className="text-[9px] font-black uppercase text-slate-500 hover:text-orange-400 transition-all">
                        {showConfigPanel ? 'Close Configuration' : 'Setup Credentials'}
                      </button>
                   </div>
                   
                   {showConfigPanel && (
                     <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                           <KeyIcon size={14} className="text-blue-400" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Client Credentials</span>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-normal italic">Provide your OAuth 2.0 Client ID from Google Cloud Console to enable "REAL" functionality and fix the 404 error.</p>
                        <input 
                          type="text" 
                          placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-blue-300 outline-none focus:border-blue-500"
                          defaultValue={project.firebase?.clientId}
                          onBlur={(e) => handleSaveClientId(e.target.value)}
                        />
                        <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 flex gap-3">
                           <InfoIcon size={14} className="text-blue-400 shrink-0 mt-0.5" />
                           <p className="text-[9px] text-slate-400 leading-relaxed">Ensure you have added the current URL origin to "Authorized JavaScript origins" in Google Console.</p>
                        </div>
                     </div>
                   )}
                 </div>
               ) : (
                 <>
                   <div className="p-4 bg-slate-800/20 border border-slate-700/50 rounded-[2rem] space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                         <img src={project.firebase.user.photoURL} className="w-10 h-10 rounded-full border-2 border-orange-500 shadow-lg" alt="Avatar" />
                         <div>
                            <p className="text-[10px] font-black text-white">{project.firebase.user.displayName}</p>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest">Authenticated GCP Developer</p>
                         </div>
                      </div>
                      {!project.firebase.config ? (
                        <button onClick={handleCreateFirebaseProject} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
                           <PlusCircleIcon size={16} /> Provision Cloud Project
                        </button>
                      ) : (
                        <div className="space-y-3">
                           <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 flex flex-col">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Linked Project ID</span>
                              <span className="text-[10px] font-mono text-blue-400 truncate">{project.firebase.config.projectId}</span>
                           </div>
                           <button onClick={handleSyncSchema} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
                              <ActivityIcon size={16} /> Orchestrate Backend Sync
                           </button>
                        </div>
                      )}
                   </div>
                 </>
               )}
            </div>
          )}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              {project.history?.map((entry) => (
                <div key={entry.id} className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold">{new Date(entry.timestamp).toLocaleString()}</span>
                  <p className="text-[11px] text-slate-300 italic">"{entry.description}"</p>
                  <button onClick={() => handleRestoreVersion(entry)} className="w-full py-2 bg-slate-700/50 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <RotateCcwIcon size={12} /> Restore Snapshot
                  </button>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'build' && (
            <div className="space-y-6">
                <button onClick={() => handleSendMessage('Build me a release APK for Android.')} className="w-full py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3"><PackageIcon size={16} /> Build to APK</button>
                <button onClick={handleBuildAAB} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3"><PlayIcon size={16} /> Build to AAB</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-slate-950">
        <div className="h-12 bg-slate-900/30 flex items-center px-6 border-b border-slate-800 justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-slate-800 rounded text-slate-500"><MenuIcon size={16} /></button>}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
              <CodeIcon size={14} /><span className="text-slate-400">{project.name}</span><span className="text-slate-700">/</span><span>{activeFile}</span>
            </div>
          </div>
          <button onClick={() => setIsPreviewLoading(true)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><RefreshCwIcon size={14} className={isPreviewLoading ? 'animate-spin' : ''} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 border-r border-slate-800 p-6 overflow-auto bg-slate-950/50 custom-scrollbar">
            <textarea className="w-full h-full bg-transparent text-slate-400 font-mono text-sm outline-none resize-none" value={project.files[activeFile]?.content || ''} onChange={(e) => setProject(prev => ({...prev, files: {...prev.files, [activeFile]: {...prev.files[activeFile], content: e.target.value}}}))} />
          </div>
          <div className="w-[480px] flex items-center justify-center relative bg-slate-900/10">
             {isPreviewLoading && <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[60] flex flex-col items-center justify-center gap-4"><Loader2Icon size={32} className="animate-spin text-blue-500" /><p className="text-[10px] font-black uppercase text-blue-400">Syncing Workspace...</p></div>}
             <NativePwaFrame key={project.version} html={project.files['index.html']?.content || ''} js={project.files['app.js']?.content || ''} highlightId={hoveredElementId} onInteract={() => {}} />
          </div>
        </div>
      </div>

      <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.4)]">
         <div className="p-6 border-b border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-600/20"><MessageSquareIcon size={20} className="text-blue-500" /></div>
             <div><h3 className="text-sm font-bold text-white tracking-tight">DroidCraft AI</h3><p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Ready</p></div>
           </div>
           <button onClick={() => setShowInstructionsModal(true)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"><SettingsIcon size={16} /></button>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20 custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-[1.5rem] text-[13px] shadow-lg ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-blue-900/20' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            {isProcessing && <div className="flex items-center gap-3 p-4 animate-pulse text-slate-500 text-[10px] font-black uppercase tracking-widest"><Loader2Icon size={16} className="animate-spin text-blue-500" /> Orchestrating...</div>}
            <div ref={chatEndRef} />
         </div>

         <div className="p-6 bg-slate-900 border-t border-slate-800 relative">
            <div className="relative group min-h-[100px]">
              <div className="absolute inset-0 p-4 text-sm font-sans pointer-events-none whitespace-pre-wrap break-words leading-relaxed overflow-hidden">{highlightUserInput(userInput)}</div>
              <textarea ref={inputRef} rows={4} placeholder="Target UI (/), files (\), and scope (*)..." className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-[1.2rem] p-4 text-sm text-transparent caret-white outline-none transition-all shadow-inner resize-none overflow-auto" value={userInput} onChange={handleInputChange} onKeyDown={(e) => { if (suggestions.length > 0 && (e.key === 'Tab' || e.key === 'Enter')) { e.preventDefault(); applySuggestion(suggestions[selectedSuggestionIndex]); } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
              <button onClick={() => handleSendMessage()} disabled={isProcessing || !userInput.trim()} className="absolute bottom-4 right-4 p-2.5 rounded-xl transition-all shadow-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"><ChevronRightIcon size={20} /></button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default App;
