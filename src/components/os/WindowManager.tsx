import { useCallback, useRef, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, RotateCcw } from 'lucide-react';
import { useOS } from '@/lib/osContext';
import type { WindowInstance } from '@/types/os';

// Lazy load app components
const NotesApp = lazy(() => import('@/components/apps/NotesApp'));
const MusicApp = lazy(() => import('@/components/apps/MusicApp'));
const AppManager = lazy(() => import('@/components/apps/AppManager'));
const ExternalApp = lazy(() => import('@/components/apps/ExternalApp'));
const UploadedHtmlApp = lazy(() => import('@/components/apps/UploadedHtmlApp'));

const APP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  NotesApp,
  MusicApp,
  AppManager,
  ExternalApp,
  UploadedHtmlApp,
};

function WindowChrome({ window: win }: { window: WindowInstance }) {
  const { state, dispatch } = useOS();
  const app = state.apps.find(a => a.id === win.appId);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeDirRef = useRef<string>('');
  const startRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  const isMaximized = win.state === 'maximized';

  // Window bounds for safe areas
  const TOP_BAR_H = 28;
  const DOCK_H = 80;

  const handleFocus = useCallback(() => {
    if (!win.isFocused) {
      dispatch({ type: 'FOCUS_WINDOW', payload: win.id });
    }
  }, [dispatch, win.id, win.isFocused]);

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_WINDOW', payload: win.id });
  }, [dispatch, win.id]);

  const handleMinimize = useCallback(() => {
    dispatch({ type: 'MINIMIZE_WINDOW', payload: win.id });
  }, [dispatch, win.id]);

  const handleMaximizeRestore = useCallback(() => {
    if (isMaximized) {
      dispatch({ type: 'RESTORE_WINDOW', payload: win.id });
    } else {
      dispatch({ type: 'MAXIMIZE_WINDOW', payload: win.id });
    }
  }, [dispatch, win.id, isMaximized]);

  // Drag via title bar
  const handleTitlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    handleFocus();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = win.position.x;
    const origY = win.position.y;

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newX = Math.max(-win.size.width + 40, Math.min(window.innerWidth - 40, origX + dx));
      const newY = Math.max(TOP_BAR_H, Math.min(window.innerHeight - DOCK_H, origY + dy));
      dispatch({ type: 'UPDATE_WINDOW_POS', payload: { id: win.id, position: { x: newX, y: newY } } });
    };

    const handleUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [dispatch, win.id, win.position, win.size, isMaximized, handleFocus]);

  // Resize
  const handleResizePointerDown = useCallback((e: React.PointerEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeDirRef.current = dir;
    startRef.current = {
      x: e.clientX, y: e.clientY,
      width: win.size.width, height: win.size.height,
      posX: win.position.x, posY: win.position.y,
    };

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startRef.current.x;
      const dy = ev.clientY - startRef.current.y;
      let newW = startRef.current.width;
      let newH = startRef.current.height;
      let newX = startRef.current.posX;
      let newY = startRef.current.posY;

      if (dir.includes('e')) newW = Math.max(320, startRef.current.width + dx);
      if (dir.includes('w')) {
        newW = Math.max(320, startRef.current.width - dx);
        newX = startRef.current.posX + (startRef.current.width - newW);
      }
      if (dir.includes('s')) newH = Math.max(240, startRef.current.height + dy);
      if (dir.includes('n')) {
        newH = Math.max(240, startRef.current.height - dy);
        newY = startRef.current.posY + (startRef.current.height - newH);
      }

      dispatch({ type: 'UPDATE_WINDOW_SIZE', payload: { id: win.id, size: { width: newW, height: newH } } });
      if (dir.includes('w') || dir.includes('n')) {
        dispatch({ type: 'UPDATE_WINDOW_POS', payload: { id: win.id, position: { x: newX, y: newY } } });
      }
    };

    const handleUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [dispatch, win.id, win.size, win.position]);

  // Position and size for maximized
  const position = isMaximized
    ? { x: 0, y: TOP_BAR_H }
    : win.position;
  const size = isMaximized
    ? { width: window.innerWidth, height: window.innerHeight - TOP_BAR_H - DOCK_H + 60 }
    : win.size;

  // Render app content
  const renderAppContent = () => {
    if (!app) return null;
    if (app.type === 'native' && app.component && APP_COMPONENTS[app.component]) {
      const Component = APP_COMPONENTS[app.component];
      return <Component windowId={win.id} />;
    }
    if (app.type === 'external' && app.url) {
      return <ExternalApp url={app.url} />;
    }
    if (app.type === 'uploaded' && (app.htmlContent || app.htmlBlobId)) {
      return <UploadedHtmlApp htmlContent={app.htmlContent} htmlBlobId={app.htmlBlobId} />;
    }
    return <div className="flex items-center justify-center h-full text-white/40 text-sm">Unknown app type</div>;
  };

  return (
    <motion.div
      className={`window-chrome absolute ${win.isFocused ? 'active' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: win.zIndex,
        opacity: win.state === 'minimized' ? 0 : win.isFocused ? 1 : 0.97,
        pointerEvents: win.state === 'minimized' ? 'none' : 'auto',
        cursor: isResizing ? 'nwse-resize' : 'default',
      }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: win.state === 'minimized' ? 0.5 : 1,
        opacity: win.state === 'minimized' ? 0 : 1,
      }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onPointerDown={handleFocus}
    >
      {/* Title bar */}
      <div
        ref={titleBarRef}
        className="window-title-bar"
        style={{ cursor: isMaximized ? 'default' : 'grab' }}
        onPointerDown={handleTitlePointerDown}
      >
        {/* Window controls */}
        <div className="flex items-center gap-2">
          <button className="window-control close" onClick={handleClose}>
            <X size={8} color="white" />
          </button>
          <button className="window-control minimize" onClick={handleMinimize}>
            <Minus size={8} color="white" />
          </button>
          <button className="window-control maximize" onClick={handleMaximizeRestore}>
            {isMaximized ? <RotateCcw size={7} color="white" /> : <Maximize2 size={7} color="white" />}
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 text-center pr-16">
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {win.title}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="relative" style={{ width: 40, height: 40 }}>
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: '#00E5FF',
                  animation: 'loading-arc 1s linear infinite',
                }}
              />
            </div>
          </div>
        }>
          {renderAppContent()}
        </Suspense>
      </div>

      {/* Resize handles (only when not maximized) */}
      {!isMaximized && (
        <>
          <div className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" onPointerDown={(e) => handleResizePointerDown(e, 'n')} />
          <div className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" onPointerDown={(e) => handleResizePointerDown(e, 's')} />
          <div className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize" onPointerDown={(e) => handleResizePointerDown(e, 'w')} />
          <div className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize" onPointerDown={(e) => handleResizePointerDown(e, 'e')} />
          <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onPointerDown={(e) => handleResizePointerDown(e, 'nw')} />
          <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onPointerDown={(e) => handleResizePointerDown(e, 'ne')} />
          <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onPointerDown={(e) => handleResizePointerDown(e, 'sw')} />
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onPointerDown={(e) => handleResizePointerDown(e, 'se')} />
        </>
      )}
    </motion.div>
  );
}

export default function WindowManager() {
  const { state } = useOS();

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      <AnimatePresence>
        {state.windows.filter(w => w.state !== 'minimized').map(win => (
          <div key={win.id} className="pointer-events-auto">
            <WindowChrome window={win} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
