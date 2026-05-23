import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/osContext';

const DOCK_ICON_SIZE = 48;
const DOCK_MAGNIFIED = 64;
const DOCK_NEIGHBOR = 56;
const DOCK_GAP = 8;

function DockIcon({ appId, index, hoveredIndex }: { appId: string; index: number; hoveredIndex: number | null }) {
  const { state, dispatch } = useOS();
  const app = state.apps.find(a => a.id === appId);
  const [showTooltip, setShowTooltip] = useState(false);
  const hasWindow = state.windows.some(w => w.appId === appId);
  const isMinimized = state.windows.some(w => w.appId === appId && w.state === 'minimized');

  const scale = useMotionValue(1);

  const getScale = useCallback(() => {
    if (hoveredIndex === null) return 1;
    const dist = Math.abs(index - hoveredIndex);
    if (dist === 0) return DOCK_MAGNIFIED / DOCK_ICON_SIZE;
    if (dist === 1) return DOCK_NEIGHBOR / DOCK_ICON_SIZE;
    if (dist === 2) return 1 + (DOCK_NEIGHBOR / DOCK_ICON_SIZE - 1) * 0.4;
    return 1;
  }, [hoveredIndex, index]);

  const dynamicScale = useTransform(scale, () => getScale());

  const handleClick = () => {
    const existingWindow = state.windows.find(w => w.appId === appId && w.state !== 'minimized');
    if (existingWindow) {
      if (existingWindow.isFocused) {
        dispatch({ type: 'MINIMIZE_WINDOW', payload: existingWindow.id });
      } else {
        dispatch({ type: 'FOCUS_WINDOW', payload: existingWindow.id });
      }
    } else {
      const minimized = state.windows.find(w => w.appId === appId && w.state === 'minimized');
      if (minimized) {
        dispatch({ type: 'RESTORE_WINDOW', payload: minimized.id });
      } else {
        dispatch({ type: 'OPEN_WINDOW', payload: { appId } });
      }
    }
  };

  if (!app) return null;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{
        width: DOCK_ICON_SIZE + DOCK_GAP,
        height: DOCK_ICON_SIZE + 16,
        scale: dynamicScale,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="absolute glass-panel-strong px-2 py-1 pointer-events-none whitespace-nowrap"
            style={{
              bottom: '100%',
              marginBottom: 8,
              borderRadius: 6,
              zIndex: 100,
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {app.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon container */}
      <motion.div
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: DOCK_ICON_SIZE,
          height: DOCK_ICON_SIZE,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: 24,
          position: 'relative',
        }}
        whileHover={{
          background: 'rgba(255, 255, 255, 0.18)',
          borderColor: 'rgba(100, 220, 255, 0.5)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {app.icon}
      </motion.div>

      {/* Running indicator dot */}
      {(hasWindow || isMinimized) && (
        <motion.div
          className="absolute"
          style={{
            bottom: 2,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#00E5FF',
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

export default function FloatingDock() {
  const { state } = useOS();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const dockApps = state.dockItems
    .map(di => state.apps.find(a => a.id === di.appId))
    .filter(Boolean) as typeof state.apps;

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2"
      style={{ zIndex: 1000 }}
    >
      <div
        ref={dockRef}
        className="dock-container flex items-end px-3 pb-1.5 pt-2"
        style={{ gap: DOCK_GAP }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {dockApps.map((app, i) => (
          <div
            key={app.id}
            onMouseEnter={() => setHoveredIndex(i)}
          >
            <DockIcon appId={app.id} index={i} hoveredIndex={hoveredIndex} />
          </div>
        ))}
      </div>
    </div>
  );
}
