import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function UploadedHtmlApp({ htmlContent }: { htmlContent?: string; htmlBlobId?: string }) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let url = '';
    if (htmlContent) {
      url = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
      setBlobUrl(url);
      setLoading(false);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [htmlContent]);

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
          <span className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading app...</span>
        </div>
      )}

      {blobUrl && (
        <motion.iframe
          ref={iframeRef}
          src={blobUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="Uploaded App"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setLoading(false)}
        />
      )}
    </div>
  );
}
