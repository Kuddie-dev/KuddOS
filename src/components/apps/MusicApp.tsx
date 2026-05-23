import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Shuffle, ListMusic, UploadCloud, Trash2, Music
} from 'lucide-react';
import { useOS } from '@/lib/osContext';
import type { MediaItem } from '@/types/os';
import { saveBlob, getBlob } from '@/lib/storage';

function generateId() { return `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Audio Visualizer Canvas ────────────────────────────────

function AudioVisualizer({ audioRef, visible }: { audioRef: React.RefObject<HTMLAudioElement | null>; visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible || !audioRef.current) return;

    const audio = audioRef.current;
    let audioCtx: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      audioCtx = new AudioContext();
      source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch {
      // Already connected or other error
      return;
    }

    if (!analyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas || !ctx || !analyserRef.current) return;
      rafRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseRadius = Math.min(cx, cy) * 0.45;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const angle = (i / bufferLength) * Math.PI * 2 - Math.PI / 2;
        const barHeight = (value / 255) * 40;
        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + barHeight);
        const y2 = cy + Math.sin(angle) * (baseRadius + barHeight);

        const hue = 180 + (i / bufferLength) * 30;
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + (value / 255) * 0.7})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { audioCtx?.close(); } catch {}
    };
  }, [visible, audioRef]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={240}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ─── Music App ──────────────────────────────────────────────

export default function MusicApp({ windowId }: { windowId: string }) {
  const { state, dispatch } = useOS();
  const playlist = state.media.playlist;
  const [view, setView] = useState<'player' | 'library'>('player');
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(state.media.currentIndex);
  const [volume, setVolume] = useState(state.media.volume);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(state.media.isShuffled);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(state.media.repeatMode);
  const [blobUrls, setBlobUrls] = useState<Map<string, string | undefined>>(new Map());

  const currentTrack = playlist[currentIndex] || null;

  // Update window title
  useEffect(() => {
    dispatch({ type: 'UPDATE_WINDOW_TITLE', payload: { id: windowId, title: currentTrack?.name || 'Music' } });
  }, [currentTrack, dispatch, windowId]);

  // Load audio blob URL
  useEffect(() => {
    if (!currentTrack) return;
    const load = async () => {
      let url = blobUrls.get(currentTrack.blobId);
      if (!url) {
        const data = await getBlob('media', currentTrack.blobId);
        if (data?.blob) {
          url = URL.createObjectURL(data.blob as Blob);
          setBlobUrls(prev => new Map([...prev, [currentTrack.blobId, url]]));
        }
      }
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    };
    load();
  }, [currentTrack]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => handleNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentTrack, currentIndex, repeatMode]);

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    if (repeatMode === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
      return;
    }
    if (shuffleMode) {
      const next = Math.floor(Math.random() * playlist.length);
      setCurrentIndex(next);
    } else {
      setCurrentIndex(prev => (prev + 1) % playlist.length);
    }
  }, [playlist.length, repeatMode, shuffleMode]);

  const handlePrev = () => {
    if (playlist.length === 0) return;
    if (shuffleMode) {
      const prev = Math.floor(Math.random() * playlist.length);
      setCurrentIndex(prev);
    } else {
      setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
    setIsMuted(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      if (!isAudio && !isVideo) continue;

      const id = generateId();
      await saveBlob('media', id, file, { name: file.name, type: file.type });

      const mediaItem: MediaItem = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown',
        fileName: file.name,
        type: isAudio ? 'audio' : 'video',
        format: file.name.split('.').pop() || '',
        duration: 0,
        blobId: id,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_MEDIA', payload: mediaItem });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeTrack = (trackId: string) => {
    dispatch({ type: 'REMOVE_MEDIA', payload: trackId });
    if (currentTrack?.id === trackId) {
      setCurrentIndex(0);
    }
  };

  const toggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const idx = modes.indexOf(repeatMode);
    setRepeatMode(modes[(idx + 1) % 3]);
  };

  const progress = duration ? currentTime / duration : 0;

  return (
    <div className="flex flex-col h-full w-full" style={{ background: 'transparent' }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* View toggle */}
      <div className="flex items-center justify-end px-3 py-1.5 border-b border-white/5 flex-shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            className="px-3 py-1 text-xs transition-colors"
            style={{
              background: view === 'player' ? 'rgba(0,229,255,0.15)' : 'transparent',
              color: view === 'player' ? '#00E5FF' : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => setView('player')}
          >
            Player
          </button>
          <button
            className="px-3 py-1 text-xs transition-colors"
            style={{
              background: view === 'library' ? 'rgba(0,229,255,0.15)' : 'transparent',
              color: view === 'library' ? '#00E5FF' : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => setView('library')}
          >
            Library
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'player' ? (
          <motion.div
            key="player"
            className="flex-1 flex flex-col items-center justify-center px-8 py-4 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {playlist.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center">
                <motion.div
                  className="text-6xl mb-4"
                  style={{ color: 'rgba(255,255,255,0.1)' }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {'\u{1F3B5}'}
                </motion.div>
                <span className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Your music library is empty
                </span>
                <span className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Upload audio or video files to get started
                </span>
                <label className="btn-primary text-xs cursor-pointer">
                  <UploadCloud size={13} /> Upload Music
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </label>
              </div>
            ) : (
              <>
                {/* Visualizer / Album Art */}
                <div className="relative mb-6" style={{ width: 200, height: 200 }}>
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, rgba(0,0,0,0.3) 70%)',
                      border: '2px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <AudioVisualizer audioRef={audioRef} visible={showVisualizer && isPlaying} />
                    <span className="text-4xl relative z-10" style={{ filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.3))' }}>
                      {currentTrack?.type === 'video' ? '\u{1F3AC}' : '\u{1F3B5}'}
                    </span>
                  </div>
                  {isPlaying && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: '2px solid transparent',
                        borderTopColor: '#00E5FF',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </div>

                {/* Track info */}
                <div className="text-center mb-4 w-full">
                  <motion.p
                    className="text-sm font-medium truncate px-8"
                    style={{ color: 'white' }}
                    key={currentTrack?.name}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {currentTrack?.name || 'No Track'}
                  </motion.p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {currentTrack?.type === 'video' ? 'Video Extract' : 'Uploaded Audio'}
                  </p>
                </div>

                {/* Progress */}
                <div className="w-full max-w-xs mb-4 px-4">
                  <div
                    className="relative h-3 flex items-center cursor-pointer group"
                    onClick={handleSeek}
                  >
                    <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress * 100}%`,
                          background: 'linear-gradient(90deg, #00E5FF, #00B8D4)',
                        }}
                      />
                    </div>
                    <div
                      className="absolute w-3 h-3 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      style={{
                        left: `calc(${progress * 100}% - 6px)`,
                        boxShadow: '0 0 10px rgba(0,229,255,0.5)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatTime(currentTime)}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    className="p-2 rounded-full transition-colors hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    onClick={handlePrev}
                    disabled={playlist.length <= 1}
                  >
                    <SkipBack size={18} />
                  </button>
                  <motion.button
                    className="p-3 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #00E5FF, #00B8D4)',
                      color: '#000814',
                      boxShadow: isPlaying ? '0 0 20px rgba(0,229,255,0.3)' : 'none',
                    }}
                    onClick={handlePlayPause}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    animate={isPlaying ? { boxShadow: ['0 0 15px rgba(0,229,255,0.2)', '0 0 30px rgba(0,229,255,0.4)', '0 0 15px rgba(0,229,255,0.2)'] } : {}}
                    transition={isPlaying ? { duration: 2, repeat: Infinity } : {}}
                  >
                    {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                  </motion.button>
                  <button
                    className="p-2 rounded-full transition-colors hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    onClick={handleNext}
                    disabled={playlist.length <= 1}
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                {/* Secondary controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded transition-colors hover:bg-white/10"
                      style={{ color: isMuted ? '#FF3366' : 'rgba(255,255,255,0.5)' }}
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <div
                      className="relative w-16 h-1 rounded-full cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                      onClick={handleVolumeChange}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${volume * 100}%`,
                          background: 'linear-gradient(90deg, #00E5FF, #00B8D4)',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    className="p-1.5 rounded transition-colors hover:bg-white/10"
                    style={{ color: repeatMode !== 'off' ? '#00E5FF' : 'rgba(255,255,255,0.4)' }}
                    onClick={toggleRepeat}
                    title={`Repeat: ${repeatMode}`}
                  >
                    <Repeat size={14} />
                  </button>

                  <button
                    className="p-1.5 rounded transition-colors hover:bg-white/10"
                    style={{ color: shuffleMode ? '#00E5FF' : 'rgba(255,255,255,0.4)' }}
                    onClick={() => setShuffleMode(!shuffleMode)}
                    title="Shuffle"
                  >
                    <Shuffle size={14} />
                  </button>

                  <button
                    className="p-1.5 rounded transition-colors hover:bg-white/10"
                    style={{ color: showVisualizer ? '#00E5FF' : 'rgba(255,255,255,0.4)' }}
                    onClick={() => setShowVisualizer(!showVisualizer)}
                    title="Visualizer"
                  >
                    <ListMusic size={14} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="library"
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Drop zone */}
            <div
              className="m-3 p-4 rounded-xl flex flex-col items-center justify-center transition-all flex-shrink-0"
              style={{
                border: dragOver ? '2px dashed rgba(0,229,255,0.5)' : '2px dashed rgba(255,255,255,0.15)',
                background: dragOver ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.03)',
                minHeight: 100,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <UploadCloud size={28} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Drop audio or video files here
              </span>
              <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Supports MP3, WAV, OGG, MP4, WEBM
              </span>
              <label className="btn-ghost text-xs mt-2 cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept="audio/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </div>

            {/* Playlist */}
            <div className="flex-1 overflow-y-auto custom-scrollbar mx-3 mb-3">
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Music size={32} className="text-white/10 mb-2" />
                  <span className="text-xs text-white/30">No tracks yet</span>
                </div>
              ) : (
                <div>
                  {/* Header */}
                  <div className="flex items-center px-3 py-2 text-xs uppercase tracking-wider border-b border-white/5 sticky top-0" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                    <span className="w-8">#</span>
                    <span className="flex-1">Title</span>
                    <span className="w-20 text-center">Source</span>
                    <span className="w-16 text-right">Duration</span>
                    <span className="w-8" />
                  </div>

                  {playlist.map((track, i) => (
                    <div
                      key={track.id}
                      className="flex items-center px-3 py-2.5 transition-colors cursor-pointer group"
                      style={{
                        background: i === currentIndex ? 'rgba(0,229,255,0.05)' : 'transparent',
                        borderLeft: i === currentIndex ? '2px solid #00E5FF' : '2px solid transparent',
                      }}
                      onClick={() => setCurrentIndex(i)}
                    >
                      <span className="w-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {i === currentIndex && isPlaying ? (
                          <span className="flex gap-0.5 items-end" style={{ height: 12 }}>
                            <span className="w-0.5 bg-cyan-400 animate-pulse" style={{ height: 8 }} />
                            <span className="w-0.5 bg-cyan-400 animate-pulse" style={{ height: 12, animationDelay: '0.1s' }} />
                            <span className="w-0.5 bg-cyan-400 animate-pulse" style={{ height: 6, animationDelay: '0.2s' }} />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="flex-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {track.name}
                      </span>
                      <span className="w-20 text-center">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            background: track.type === 'audio' ? 'rgba(0,229,255,0.1)' : 'rgba(255,179,0,0.1)',
                            color: track.type === 'audio' ? '#00E5FF' : '#FFB300',
                            fontSize: 9,
                          }}
                        >
                          {track.type === 'audio' ? 'AUDIO' : 'VIDEO'}
                        </span>
                      </span>
                      <span className="w-16 text-right text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {formatTime(track.duration)}
                      </span>
                      <button
                        className="w-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                      >
                        <Trash2 size={12} className="text-white/30 hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
