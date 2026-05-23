import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, ExternalLink } from 'lucide-react';

export default function ExternalApp({ url }: { url: string }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Set a timeout to detect blocked iframes
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        // Check if iframe loaded by trying to access contentWindow
        try {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            // If we can access it but it's still loading the same origin, it might be blocked
            // This is a heuristic
          }
        } catch {
          // Cross-origin access blocked - this is normal for most sites
          // We'll keep showing the loading state and let the onLoad/onError handlers deal with it
        }
      }
    }, 5000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url, loading]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className="w-full h-full relative" style={{ background: 'white' }}>
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: '#000814', zIndex: 10 }}>
          <div className="relative" style={{ width: 40, height: 40 }}>
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent animate-loading-arc"
              style={{ borderTopColor: '#00E5FF' }}
            />
          </div>
          <span className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,8,20,0.9)', zIndex: 10 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ShieldOff size={48} style={{ color: '#FF3366' }} className="mb-4" />
          <span className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
            This website cannot be embedded
          </span>
          <span className="text-xs text-center max-w-xs mb-4 px-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            The site has security restrictions that prevent it from being displayed inside another page.
          </span>
          <button
            className="btn-primary text-xs flex items-center gap-2"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink size={12} /> Open in New Tab
          </button>
        </motion.div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="camera; microphone; fullscreen; display-capture"
        title="External App"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
