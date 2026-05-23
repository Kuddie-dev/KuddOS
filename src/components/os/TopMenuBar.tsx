import { useEffect, useState } from 'react';
import { Wifi, Volume2, Battery } from 'lucide-react';
import { useOS } from '@/lib/osContext';

export default function TopMenuBar() {
  const { state, dispatch } = useOS();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const focusedApp = state.windows.find(w => w.id === state.focusedWindowId);
  const appName = focusedApp ? state.apps.find(a => a.id === focusedApp.appId)?.name || '' : '';

  const formatTime = (d: Date) => {
    if (state.settings.clockFormat === '24h') {
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 h-7 top-menu-bar flex items-center px-3 justify-between"
      style={{ zIndex: 1001 }}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-white hover:text-[#00E5FF] transition-colors"
          onClick={() => {
            const items = [
              { label: 'About KuddOS', action: () => {} },
              { label: 'Settings', action: () => {} },
              { label: 'Change Wallpaper', action: () => document.getElementById('wallpaper-input')?.click() },
            ];
            dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { visible: true, x: 10, y: 30, items } });
          }}
        >
          <span className="text-xs font-semibold" style={{ letterSpacing: '0.02em' }}>
            {'\u{2728}'}
          </span>
        </button>
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {appName}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <Wifi size={13} className="text-white/70" />
        <Volume2 size={13} className="text-white/70" />
        <Battery size={13} className="text-white/70" />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          {formatDate(time)} {formatTime(time)}
        </span>
      </div>
    </div>
  );
}
