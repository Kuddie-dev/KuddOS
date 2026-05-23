// App Types
export type AppType = 'native' | 'external' | 'uploaded';

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  type: AppType;
  component?: string;
  url?: string;
  htmlContent?: string;
  htmlBlobId?: string;
  onDesktop: boolean;
  inDock: boolean;
  createdAt: number;
}

// Window Types
export type WindowState = 'normal' | 'minimized' | 'maximized';

export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  prevPosition?: { x: number; y: number };
  prevSize?: { width: number; height: number };
  state: WindowState;
  zIndex: number;
  isFocused: boolean;
}

// Desktop Types
export interface DesktopIconData {
  id: string;
  appId: string;
  position: { x: number; y: number };
  label: string;
}

// Dock Types
export interface DockItemData {
  appId: string;
  order: number;
}

// Media Types
export interface MediaItem {
  id: string;
  name: string;
  artist: string;
  fileName: string;
  type: 'audio' | 'video';
  format: string;
  duration: number;
  blobId: string;
  createdAt: number;
}

// Notes Types
export interface Folder {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;
}

// System Types
export interface SystemSettings {
  theme: string;
  showParticles: boolean;
  clockFormat: '12h' | '24h';
  soundEnabled: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
}

// Context Menu Types
export interface MenuItem {
  label: string;
  action: () => void;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  children?: MenuItem[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}
