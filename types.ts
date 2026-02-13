
export interface AppFile {
  path: string;
  content: string;
  language: string;
  lastModified: number;
}

export interface ScreenPosition {
  x: number;
  y: number;
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
  screenPositions?: Record<string, ScreenPosition>;
  keystore?: KeystoreState;
  connections?: NavigationConnection[];
}

export interface KeystoreState {
  alias: string;
  password?: string;
  validity: number;
  generated: boolean;
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
  schema: Record<string, FieldType>;
  recordCount: number;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'timestamp' | 'array' | 'map' | 'reference' | 'any';

export interface NavigationConnection {
  id: string;
  fromScreen: string;
  fromElementId: string;
  fromElementLabel: string;
  toScreen: string;
  action: 'navigate' | 'modal' | 'replace';
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  author: 'user' | 'ai' | 'system';
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
  SIGNING = 'SIGNING',
  BUILDING = 'BUILDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

// Added UIElement interface for legacy/obsolete components
export interface UIElement {
  id: string;
  tag: string;
  attributes: Record<string, any>;
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
