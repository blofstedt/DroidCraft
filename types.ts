
export interface AppFile {
  path: string;
  content: string;
  language: string;
  lastModified: number;
}

export interface ProjectState {
  id: string;
  name: string;
  packageName: string;
  files: Record<string, AppFile>;
  version: number;
  history: HistoryEntry[];
  firebase?: FirebaseState;
  envVariables?: Record<string, string>;
  lastSaved?: number;
  persistentInstructions?: string;
}

export interface FirebaseState {
  config: FirebaseConfig | null;
  status: 'disconnected' | 'connecting' | 'connected';
  user: FirebaseUser | null;
  collections: FirebaseCollection[];
  lastSyncTimestamp?: number;
  clientId?: string;
}

export interface FirebaseUser {
  email: string;
  displayName: string;
  photoURL: string;
  token: string;
}

export interface FirebaseCollection {
  name: string;
  schema: Record<string, string>;
  recordCount: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  author: 'user' | 'ai';
  snapshot: Record<string, string>;
}

export interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  appId: string;
  measurementId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: string[];
}

export enum BuildStatus {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  BUNDLING = 'BUNDLING',
  WRAPPING = 'WRAPPING',
  SIGNING = 'SIGNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface UIElement {
  id: string;
  tag: string;
  attributes: Record<string, string>;
  children: UIElement[];
}

export interface UIElementRef {
  id: string;
  tagName: string;
  text: string;
  className: string;
  attributes: Record<string, string>;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  computedStyles: Record<string, string>;
}
