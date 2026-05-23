import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import type {
  AppDefinition, WindowInstance, DesktopIconData, DockItemData,
  MediaItem, Folder, Note, SystemSettings, ContextMenuState, Notification
} from '@/types/os';

// ─── Default Data ───────────────────────────────────────────

const BUILTIN_APPS: AppDefinition[] = [
  { id: 'notes', name: 'Notes', icon: '\u{1F4DD}', type: 'native', component: 'NotesApp', onDesktop: true, inDock: true, createdAt: Date.now() },
  { id: 'music', name: 'Music', icon: '\u{1F3B5}', type: 'native', component: 'MusicApp', onDesktop: true, inDock: true, createdAt: Date.now() },
  { id: 'appmanager', name: 'App Manager', icon: '\u2795', type: 'native', component: 'AppManager', onDesktop: true, inDock: true, createdAt: Date.now() },
];

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'folder-all', name: 'All Notes', icon: '\u{1F4C1}', parentId: null, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'folder-work', name: 'Work', icon: '\u{1F4BC}', parentId: null, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'folder-personal', name: 'Personal', icon: '\u{1F465}', parentId: null, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'folder-ideas', name: 'Ideas', icon: '\u{1F4A1}', parentId: null, createdAt: Date.now(), updatedAt: Date.now() },
];

const DEFAULT_NOTES: Note[] = [
  { id: 'note-welcome', title: 'Welcome to KuddOS Notes', content: '<h1>Welcome to KuddOS Notes!</h1><p>This is your personal notes app. Create folders, organize your thoughts, and write with a beautiful rich text editor.</p><ul><li>Create folders from the sidebar</li><li>Use the toolbar to format text</li><li>Everything auto-saves</li></ul>', folderId: 'folder-work', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'note-first', title: 'My First Note', content: '<p>Start writing here...</p>', folderId: 'folder-personal', createdAt: Date.now(), updatedAt: Date.now() },
];

// ─── State ──────────────────────────────────────────────────

interface OSState {
  booted: boolean;
  settings: SystemSettings;
  apps: AppDefinition[];
  windows: WindowInstance[];
  nextZIndex: number;
  focusedWindowId: string | null;
  desktopIcons: DesktopIconData[];
  dockItems: DockItemData[];
  wallpaper: string;
  contextMenu: ContextMenuState;
  notifications: Notification[];
  media: {
    playlist: MediaItem[];
    currentIndex: number;
    isPlaying: boolean;
    volume: number;
    isShuffled: boolean;
    repeatMode: 'off' | 'all' | 'one';
    progress: number;
    showGlobalPlayer: boolean;
  };
  notes: {
    folders: Folder[];
    notes: Note[];
  };
}

const initialState: OSState = {
  booted: false,
  settings: { theme: 'aero-dark', showParticles: true, clockFormat: '12h', soundEnabled: true },
  apps: [...BUILTIN_APPS],
  windows: [],
  nextZIndex: 100,
  focusedWindowId: null,
  desktopIcons: BUILTIN_APPS.map((app, i) => ({
    id: `icon-${app.id}`,
    appId: app.id,
    position: { x: 20, y: 20 + i * 96 },
    label: app.name,
  })),
  dockItems: BUILTIN_APPS.map((app, i) => ({ appId: app.id, order: i })),
  wallpaper: '/wallpaper.jpg',
  contextMenu: { visible: false, x: 0, y: 0, items: [] },
  notifications: [],
  media: {
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    volume: 0.7,
    isShuffled: false,
    repeatMode: 'off',
    progress: 0,
    showGlobalPlayer: false,
  },
  notes: {
    folders: DEFAULT_FOLDERS,
    notes: DEFAULT_NOTES,
  },
};

// ─── Actions ────────────────────────────────────────────────

type OSAction =
  | { type: 'SET_BOOTED'; payload: boolean }
  | { type: 'SET_WALLPAPER'; payload: string }
  | { type: 'SET_SETTINGS'; payload: Partial<SystemSettings> }
  | { type: 'OPEN_WINDOW'; payload: { appId: string; title?: string } }
  | { type: 'CLOSE_WINDOW'; payload: string }
  | { type: 'FOCUS_WINDOW'; payload: string }
  | { type: 'MINIMIZE_WINDOW'; payload: string }
  | { type: 'MAXIMIZE_WINDOW'; payload: string }
  | { type: 'RESTORE_WINDOW'; payload: string }
  | { type: 'UPDATE_WINDOW_POS'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'UPDATE_WINDOW_SIZE'; payload: { id: string; size: { width: number; height: number } } }
  | { type: 'UPDATE_WINDOW_TITLE'; payload: { id: string; title: string } }
  | { type: 'ADD_APP'; payload: AppDefinition }
  | { type: 'REMOVE_APP'; payload: string }
  | { type: 'UPDATE_APP'; payload: { id: string; updates: Partial<AppDefinition> } }
  | { type: 'ADD_DESKTOP_ICON'; payload: DesktopIconData }
  | { type: 'REMOVE_DESKTOP_ICON'; payload: string }
  | { type: 'UPDATE_ICON_POS'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'ADD_DOCK_ITEM'; payload: DockItemData }
  | { type: 'REMOVE_DOCK_ITEM'; payload: string }
  | { type: 'SHOW_CONTEXT_MENU'; payload: ContextMenuState }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_MEDIA'; payload: Partial<OSState['media']> }
  | { type: 'ADD_MEDIA'; payload: MediaItem }
  | { type: 'REMOVE_MEDIA'; payload: string }
  | { type: 'SET_NOTES'; payload: Partial<OSState['notes']> }
  | { type: 'LOAD_STATE'; payload: Partial<OSState> };

// ─── Reducer ────────────────────────────────────────────────

let zIndexCounter = 100;

function osReducer(state: OSState, action: OSAction): OSState {
  switch (action.type) {
    case 'SET_BOOTED':
      return { ...state, booted: action.payload };

    case 'SET_WALLPAPER':
      return { ...state, wallpaper: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'OPEN_WINDOW': {
      const app = state.apps.find(a => a.id === action.payload.appId);
      if (!app) return state;
      const id = `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      zIndexCounter++;
      const offset = state.windows.length * 24;
      const newWindow: WindowInstance = {
        id,
        appId: app.id,
        title: action.payload.title || app.name,
        position: { x: 100 + offset, y: 60 + offset },
        size: { width: 900, height: 640 },
        state: 'normal',
        zIndex: zIndexCounter,
        isFocused: true,
      };
      // Special sizes
      if (app.component === 'MusicApp') newWindow.size = { width: 800, height: 560 };
      if (app.component === 'AppManager') newWindow.size = { width: 640, height: 520 };
      if (app.type === 'external' || app.type === 'uploaded') newWindow.size = { width: 1024, height: 700 };

      return {
        ...state,
        windows: [
          ...state.windows.map(w => ({ ...w, isFocused: false })),
          newWindow,
        ],
        nextZIndex: zIndexCounter + 1,
        focusedWindowId: id,
      };
    }

    case 'CLOSE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter(w => w.id !== action.payload),
        focusedWindowId: state.focusedWindowId === action.payload
          ? (state.windows.filter(w => w.id !== action.payload).slice(-1)[0]?.id || null)
          : state.focusedWindowId,
      };

    case 'FOCUS_WINDOW': {
      zIndexCounter++;
      return {
        ...state,
        windows: state.windows.map(w => ({
          ...w,
          isFocused: w.id === action.payload,
          zIndex: w.id === action.payload ? zIndexCounter : w.zIndex,
        })),
        nextZIndex: zIndexCounter + 1,
        focusedWindowId: action.payload,
      };
    }

    case 'MINIMIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload ? { ...w, state: 'minimized' as const, isFocused: false } : w
        ),
        focusedWindowId: state.focusedWindowId === action.payload
          ? (state.windows.find(w => w.id !== action.payload && w.state !== 'minimized')?.id || null)
          : state.focusedWindowId,
      };

    case 'MAXIMIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload
            ? { ...w, state: 'maximized' as const, prevPosition: { ...w.position }, prevSize: { ...w.size }, isFocused: true }
            : w
        ),
      };

    case 'RESTORE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload
            ? {
                ...w,
                state: 'normal' as const,
                position: w.prevPosition || w.position,
                size: w.prevSize || w.size,
                isFocused: true,
              }
            : w
        ),
      };

    case 'UPDATE_WINDOW_POS':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, position: action.payload.position } : w
        ),
      };

    case 'UPDATE_WINDOW_SIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, size: action.payload.size } : w
        ),
      };

    case 'UPDATE_WINDOW_TITLE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, title: action.payload.title } : w
        ),
      };

    case 'ADD_APP':
      return { ...state, apps: [...state.apps, action.payload] };

    case 'REMOVE_APP':
      return {
        ...state,
        apps: state.apps.filter(a => a.id !== action.payload),
        desktopIcons: state.desktopIcons.filter(i => i.appId !== action.payload),
        dockItems: state.dockItems.filter(d => d.appId !== action.payload),
      };

    case 'UPDATE_APP':
      return {
        ...state,
        apps: state.apps.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
      };

    case 'ADD_DESKTOP_ICON':
      return { ...state, desktopIcons: [...state.desktopIcons, action.payload] };

    case 'REMOVE_DESKTOP_ICON':
      return { ...state, desktopIcons: state.desktopIcons.filter(i => i.id !== action.payload) };

    case 'UPDATE_ICON_POS':
      return {
        ...state,
        desktopIcons: state.desktopIcons.map(i =>
          i.id === action.payload.id ? { ...i, position: action.payload.position } : i
        ),
      };

    case 'ADD_DOCK_ITEM':
      return { ...state, dockItems: [...state.dockItems, action.payload] };

    case 'REMOVE_DOCK_ITEM':
      return { ...state, dockItems: state.dockItems.filter(d => d.appId !== action.payload) };

    case 'SHOW_CONTEXT_MENU':
      return { ...state, contextMenu: action.payload };

    case 'HIDE_CONTEXT_MENU':
      return { ...state, contextMenu: { ...state.contextMenu, visible: false } };

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };

    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };

    case 'SET_MEDIA':
      return { ...state, media: { ...state.media, ...action.payload } };

    case 'ADD_MEDIA':
      return { ...state, media: { ...state.media, playlist: [...state.media.playlist, action.payload] } };

    case 'REMOVE_MEDIA':
      return {
        ...state,
        media: {
          ...state.media,
          playlist: state.media.playlist.filter(m => m.id !== action.payload),
          currentIndex: Math.min(state.media.currentIndex, state.media.playlist.length - 2),
        },
      };

    case 'SET_NOTES':
      return { ...state, notes: { ...state.notes, ...action.payload } };

    case 'LOAD_STATE': {
      const { wallpaper: _, ...payloadWithoutWallpaper } = action.payload as Partial<OSState>;
      return { ...state, ...payloadWithoutWallpaper, apps: [...BUILTIN_APPS, ...(payloadWithoutWallpaper.apps || []).filter(a => !BUILTIN_APPS.find(b => b.id === a.id))] };
    }

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────

interface OSContextValue {
  state: OSState;
  dispatch: React.Dispatch<OSAction>;
}

const OSContext = createContext<OSContextValue | null>(null);

export function OSProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(osReducer, initialState);
  const savedRef = useRef(false);

  // Load saved state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kuddos:state');
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      }
    } catch (e) {
      console.warn('Failed to load saved state:', e);
    }
    savedRef.current = true;
  }, []);

  // Auto-save state (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!savedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const { windows, nextZIndex, focusedWindowId, contextMenu, notifications, ...stateToSave } = state;
        localStorage.setItem('kuddos:state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to save state:', e);
      }
    }, 300);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state]);

  return (
    <OSContext.Provider value={{ state, dispatch }}>
      {children}
    </OSContext.Provider>
  );
}

export function useOS() {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used within OSProvider');
  return ctx;
}
