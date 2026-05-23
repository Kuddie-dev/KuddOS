import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/lib/osContext';

// ─── Ambient Particles Canvas ───────────────────────────────

interface Particle {
  x: number; y: number; size: number; speedX: number; speedY: number;
  opacity: number; opacityDir: number; phase: number;
}

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>, enabled: boolean) {
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 25; i++) {
        particlesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: 2 + Math.random() * 4,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.15,
          opacity: 0.1 + Math.random() * 0.2,
          opacityDir: 0.001 + Math.random() * 0.002,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime < 33) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.speedX;
        p.y += p.speedY + Math.sin(time * 0.0005 + p.phase) * 0.1;
        p.opacity += p.opacityDir;
        if (p.opacity > 0.3 || p.opacity < 0.08) p.opacityDir *= -1;

        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 220, 255, ${p.opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 220, 255, ${p.opacity * 0.15})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, enabled]);
}

// ─── Desktop Icon ───────────────────────────────────────────

function DesktopIconItem({ icon, index }: { icon: { id: string; appId: string; position: { x: number; y: number }; label: string }; index: number }) {
  const { state, dispatch } = useOS();
  const app = state.apps.find(a => a.id === icon.appId);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState(icon.position);

  const handleDoubleClick = useCallback(() => {
    dispatch({ type: 'OPEN_WINDOW', payload: { appId: icon.appId } });
  }, [dispatch, icon.appId]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = icon.position.x;
    const origY = icon.position.y;
    let moved = false;

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      setIsDragging(true);
      const newX = Math.max(0, Math.min(window.innerWidth - 80, origX + dx));
      const newY = Math.max(28, Math.min(window.innerHeight - 120, origY + dy));
      setDragPos({ x: newX, y: newY });
    };

    const handleUp = (ev: PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(ev.pointerId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setIsDragging(false);
      if (moved) {
        const curPos = { x: Math.max(0, dragPos.x), y: Math.max(28, dragPos.y) };
        const snapX = Math.round(curPos.x / 80) * 80;
        const snapY = Math.round(curPos.y / 96) * 96;
        const snapped = { x: Math.max(0, snapX), y: Math.max(28, Math.min(window.innerHeight - 120, snapY)) };
        setDragPos(snapped);
        dispatch({ type: 'UPDATE_ICON_POS', payload: { id: icon.id, position: snapped } });
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [icon.position, icon.id, dispatch, dragPos]);

  if (!app) return null;

  const pos = isDragging ? dragPos : icon.position;

  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center cursor-pointer group"
      style={{
        left: pos.x,
        top: pos.y,
        width: 72,
        height: 80,
        zIndex: isDragging ? 50 : 10,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
    >
      <motion.div
        className="flex items-center justify-center mb-1"
        style={{
          width: 48, height: 48,
          fontSize: 28,
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {app.icon}
      </motion.div>
      <span
        className="text-center leading-tight px-1"
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'white',
          textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)',
          maxWidth: 72,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {icon.label}
      </span>
    </motion.div>
  );
}

// ─── Main Desktop ───────────────────────────────────────────

export default function DesktopEnvironment() {
  const { state, dispatch } = useOS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  useParticles(canvasRef, state.settings.showParticles);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  }, []);

  const handleClick = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleWallpaperChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      dispatch({ type: 'SET_WALLPAPER', payload: result });
      setContextMenu(prev => ({ ...prev, visible: false }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [dispatch]);

  return (
    <div
      className="fixed inset-0"
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      {/* Wallpaper */}
      <img
        src={state.wallpaper}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 8, 20, 0.35)' }}
      />

      {/* Particle canvas */}
      {state.settings.showParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      {/* Desktop icons */}
      {state.desktopIcons.map((icon, i) => (
        <DesktopIconItem key={icon.id} icon={icon} index={i} />
      ))}

      {/* Desktop context menu */}
      {contextMenu.visible && (
        <motion.div
          className="absolute glass-panel-strong"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 150),
            minWidth: 180,
            padding: '6px 0',
            zIndex: 3001,
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: 'Change Wallpaper...', action: 'wallpaper' },
            { label: 'New Folder', action: 'newfolder' },
          ].map((item, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[rgba(0,229,255,0.1)] hover:text-[#00E5FF]"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              onClick={() => {
                if (item.action === 'wallpaper') {
                  document.getElementById('wallpaper-input')?.click();
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Hidden wallpaper upload input */}
      <input
        id="wallpaper-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWallpaperChange}
      />
    </div>
  );
}
