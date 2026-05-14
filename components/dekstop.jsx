import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Square, Play, Pause, Square as Stop, Plus, Folder, FileText, Upload, Link as LinkIcon, Image as ImageIcon, Settings } from 'lucide-react';

// --- Mini IndexedDB Helper untuk file besar (Video/Audio/Wallpaper) ---
const DB_NAME = 'KuddOS_Storage';
const STORE_NAME = 'files';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveFileToDB = async (key, file) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const getFileFromDB = async (key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const DEFAULT_APPS = [
  { id: 'notes', name: 'Notes', emoji: '📝', type: 'system' },
  { id: 'music', name: 'Music', emoji: '🎵', type: 'system' },
  { id: 'uploader', name: 'App Store', emoji: '📥', type: 'system' },
  { id: 'settings', name: 'Settings', emoji: '⚙️', type: 'system' }
];

const Window = ({ app, onClose, onFocus, isFocused, zIndex, children }) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const handleMouseDown = (e) => {
    onFocus();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: Math.max(0, dragRef.current.initialY + dy) // Cegah keluar layar atas
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onClick={onFocus}
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, zIndex: zIndex }}
      className={`absolute w-[400px] md:w-[600px] h-[400px] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-white/20 transition-shadow ${isFocused ? 'shadow-black/30' : 'shadow-black/10'}`}
    >
      {/* Title Bar */}
      <div 
        onMouseDown={handleMouseDown}
        className="h-10 bg-gray-100/80 border-b border-gray-200 flex items-center px-4 cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex gap-2 w-20">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group"><X size={10} className="text-red-900 opacity-0 group-hover:opacity-100"/></button>
          <button className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group"><Minus size={10} className="text-yellow-900 opacity-0 group-hover:opacity-100"/></button>
          <button className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group"><Square size={8} className="text-green-900 opacity-0 group-hover:opacity-100"/></button>
        </div>
        <div className="flex-1 text-center font-semibold text-gray-700 text-sm pointer-events-none select-none">
          {app.name}
        </div>
        <div className="w-20"></div>
      </div>
      {/* App Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

const NotesApp = () => {
  const [folders, setFolders] = useState(() => JSON.parse(localStorage.getItem('kuddos_folders')) || [{ id: 'f1', name: 'Personal' }]);
  const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem('kuddos_notes')) || []);
  const [activeFolder, setActiveFolder] = useState('f1');
  const [activeNote, setActiveNote] = useState(null);

  useEffect(() => {
    localStorage.setItem('kuddos_folders', JSON.stringify(folders));
    localStorage.setItem('kuddos_notes', JSON.stringify(notes));
  }, [folders, notes]);

  const addFolder = () => {
    const name = prompt('Folder Name:');
    if (name) setFolders([...folders, { id: Date.now().toString(), name }]);
  };

  const addNote = () => {
    const newNote = { id: Date.now().toString(), folderId: activeFolder, title: 'New Note', content: '' };
    setNotes([...notes, newNote]);
    setActiveNote(newNote.id);
  };

  const updateNote = (field, value) => {
    if (!activeNote) return;
    setNotes(notes.map(n => n.id === activeNote ? { ...n, [field]: value } : n));
  };

  const currentNotes = notes.filter(n => n.folderId === activeFolder);
  const currentNoteData = notes.find(n => n.id === activeNote);

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar Folders */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center">
          <span className="font-bold text-gray-700">Folders</span>
          <button onClick={addFolder} className="p-1 hover:bg-gray-200 rounded"><Plus size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {folders.map(f => (
            <div 
              key={f.id} 
              onClick={() => { setActiveFolder(f.id); setActiveNote(null); }}
              className={`p-2 flex items-center gap-2 rounded-lg cursor-pointer ${activeFolder === f.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              <Folder size={16} /> {f.name}
            </div>
          ))}
        </div>
      </div>

      {/* Note List & Editor */}
      <div className="w-2/3 flex flex-col relative">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white">
          <button onClick={addNote} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Plus size={20}/></button>
        </div>
        
        {activeNote ? (
          <div className="flex-1 flex flex-col p-4">
            <input 
              className="text-2xl font-bold border-none outline-none mb-4 text-gray-800"
              value={currentNoteData?.title || ''}
              onChange={(e) => updateNote('title', e.target.value)}
              placeholder="Note Title..."
            />
            <textarea 
              className="flex-1 resize-none border-none outline-none text-gray-600 leading-relaxed"
              value={currentNoteData?.content || ''}
              onChange={(e) => updateNote('content', e.target.value)}
              placeholder="Start typing..."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            {currentNotes.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">No notes in this folder.</div>
            ) : (
              currentNotes.map(n => (
                <div key={n.id} onClick={() => setActiveNote(n.id)} className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <div className="font-semibold text-gray-800">{n.title}</div>
                  <div className="text-sm text-gray-400 truncate">{n.content || 'Empty note...'}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MusicApp = ({ globalMedia, setGlobalMedia }) => {
  const [localFile, setLocalFile] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Simpan ke IndexedDB untuk persistensi
    await saveFileToDB('saved_media', file);
    
    const url = URL.createObjectURL(file);
    setLocalFile({ name: file.name, url, type: file.type });
  };

  const playMedia = () => {
    if (localFile) {
      setGlobalMedia({ ...localFile, isPlaying: true });
    }
  };

  const stopGlobalMedia = () => {
    setGlobalMedia(null);
  };

  useEffect(() => {
    // Coba load media dari DB saat app dibuka pertama kali
    const loadSavedMedia = async () => {
      try {
        const file = await getFileFromDB('saved_media');
        if (file) {
          const url = URL.createObjectURL(file);
          setLocalFile({ name: file.name, url, type: file.type });
        }
      } catch (e) {
        console.error("No saved media found");
      }
    };
    if (!localFile && !globalMedia) loadSavedMedia();
  }, [localFile, globalMedia]);

  return (
    <div className="p-6 h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play size={40} className="ml-2" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Music & Video Player</h2>
        <p className="text-sm text-gray-500 mb-6">Plays in background even if closed.</p>
        
        <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-2 mb-4 w-full justify-center">
          <Upload size={18} /> Upload Video/Audio
          <input type="file" accept="video/*,audio/*" className="hidden" onChange={handleUpload} />
        </label>

        {localFile && (
          <div className="text-sm font-medium text-gray-700 mb-4 truncate w-full px-2">
            Ready: {localFile.name}
          </div>
        )}

        <div className="flex gap-2 justify-center mt-4">
          <button 
            onClick={playMedia}
            disabled={!localFile}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-full font-bold shadow flex items-center gap-2"
          >
            <Play size={18} /> Play
          </button>
          <button 
            onClick={stopGlobalMedia}
            disabled={!globalMedia}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-full font-bold shadow flex items-center gap-2"
          >
            <Stop size={18} /> Stop
          </button>
        </div>

        {globalMedia?.isPlaying && (
           <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm animate-pulse">
             Now playing in background...
           </div>
        )}
      </div>
    </div>
  );
};

const AppUploader = ({ customApps, setCustomApps }) => {
  const [appName, setAppName] = useState('');
  const [emoji, setEmoji] = useState('🌐');
  const [url, setUrl] = useState('');

  const handleInstall = () => {
    if (!appName || !url) return;
    
    // Perbaiki link jika tidak ada https
    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const newApp = {
      id: `app_${Date.now()}`,
      name: appName,
      emoji: emoji,
      type: 'iframe',
      url: finalUrl
    };

    const updatedApps = [...customApps, newApp];
    setCustomApps(updatedApps);
    
    // Reset form
    setAppName('');
    setUrl('');
  };

  return (
    <div className="p-6 h-full bg-gray-50 flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Install New App</h2>
      
      <div className="space-y-4 max-w-md mx-auto w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
          <input 
            type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. TikTok"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">App Icon (Emoji)</label>
          <input 
            type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
            className="w-20 p-2 border border-gray-300 rounded-lg text-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="bg-gray-100 px-3 flex items-center text-gray-500"><LinkIcon size={16}/></span>
            <input 
              type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              className="w-full p-2 outline-none"
              placeholder="tiktok.com"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Note: Some sites (like Google/GitHub) block iframe embedding for security reasons.</p>
        </div>
        <button 
          onClick={handleInstall}
          disabled={!appName || !url}
          className="w-full bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg mt-4 shadow-sm hover:bg-blue-700 transition"
        >
          Install Application
        </button>
      </div>
    </div>
  );
};

const WebFrameApp = ({ app }) => {
  return (
    <div className="w-full h-full bg-white flex flex-col relative">
      <div className="bg-gray-100 px-3 py-1 flex items-center border-b border-gray-200 text-xs text-gray-500">
        <LinkIcon size={12} className="mr-2" /> {app.url}
      </div>
      <iframe 
        src={app.url} 
        className="w-full flex-1 border-none"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title={app.name}
      />
    </div>
  );
};

const SettingsApp = ({ setWallpaper }) => {
  const handleWallpaperUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await saveFileToDB('kuddos_wallpaper', file);
    const url = URL.createObjectURL(file);
    setWallpaper(url);
  };

  return (
    <div className="p-6 bg-white h-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ImageIcon size={20}/> Desktop Wallpaper</h3>
        <p className="text-sm text-gray-500 mb-4">Upload an image to personalize your desktop background. It will be saved permanently.</p>
        <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-2">
          <Upload size={16} /> Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={handleWallpaperUpload} />
        </label>
      </div>
    </div>
  );
}


export default function KuddOS() {
  const [customApps, setCustomApps] = useState(() => JSON.parse(localStorage.getItem('kuddos_custom_apps')) || []);
  const [openWindows, setOpenWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [highestZIndex, setHighestZIndex] = useState(10);
  const [wallpaper, setWallpaper] = useState('');
  
  // Global Media State
  const [globalMedia, setGlobalMedia] = useState(null);
  const audioRef = useRef(null);

  // Kombinasikan app default dan custom
  const allApps = [...DEFAULT_APPS, ...customApps];

  useEffect(() => {
    localStorage.setItem('kuddos_custom_apps', JSON.stringify(customApps));
  }, [customApps]);

  useEffect(() => {
    // Load Wallpaper dari DB
    const loadWallpaper = async () => {
      try {
        const file = await getFileFromDB('kuddos_wallpaper');
        if (file) {
          setWallpaper(URL.createObjectURL(file));
        }
      } catch (e) {
        // No wallpaper saved
      }
    };
    loadWallpaper();
  }, []);

  const openApp = (app) => {
    if (!openWindows.find(w => w.id === app.id)) {
      setOpenWindows([...openWindows, app]);
    }
    focusWindow(app.id);
  };

  const closeWindow = (appId) => {
    setOpenWindows(openWindows.filter(w => w.id !== appId));
  };

  const focusWindow = (appId) => {
    setActiveWindowId(appId);
    setHighestZIndex(prev => prev + 1);
  };

  const renderAppContent = (app) => {
    switch(app.id) {
      case 'notes': return <NotesApp />;
      case 'music': return <MusicApp globalMedia={globalMedia} setGlobalMedia={setGlobalMedia} />;
      case 'uploader': return <AppUploader customApps={customApps} setCustomApps={setCustomApps} />;
      case 'settings': return <SettingsApp setWallpaper={setWallpaper} />;
      default: 
        if (app.type === 'iframe') return <WebFrameApp app={app} />;
        return <div className="p-4">App under construction.</div>;
    }
  };

  return (
    <div 
      className="w-screen h-screen overflow-hidden flex flex-col relative bg-cover bg-center"
      style={{ 
        backgroundImage: wallpaper ? `url(${wallpaper})` : 'linear-gradient(to right bottom, #4facfe 0%, #00f2fe 100%)' 
      }}
    >
      {/* GLOBAL HIDDEN MEDIA PLAYER */}
      {globalMedia && (
        <div className={`absolute top-4 right-4 z-50 bg-black/80 p-2 rounded-xl backdrop-blur-md text-white shadow-xl ${globalMedia.type.startsWith('video') ? 'w-64 h-48' : 'w-64 h-16'}`}>
           <div className="flex justify-between items-center px-2 mb-1">
             <span className="text-xs truncate font-medium">Now Playing: {globalMedia.name}</span>
             <button onClick={() => setGlobalMedia(null)} className="text-gray-400 hover:text-white"><X size={14}/></button>
           </div>
           {globalMedia.type.startsWith('video') ? (
             <video src={globalMedia.url} autoPlay controls className="w-full h-32 rounded bg-black object-contain" />
           ) : (
             <audio src={globalMedia.url} autoPlay controls className="w-full h-8" />
           )}
        </div>
      )}

      {/* DESKTOP ICONS */}
      <div className="flex-1 p-4 flex flex-col flex-wrap gap-4 items-start content-start">
        {allApps.map(app => (
          <div 
            key={app.id} 
            onClick={() => openApp(app)}
            className="flex flex-col items-center gap-1 w-20 cursor-pointer group rounded-lg hover:bg-white/20 p-2 transition"
          >
            <div className="w-14 h-14 bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform">
              {app.emoji}
            </div>
            <span className="text-white text-xs text-center drop-shadow-md font-medium truncate w-full">
              {app.name}
            </span>
          </div>
        ))}
      </div>

      {/* WINDOWS */}
      {openWindows.map(app => (
        <Window 
          key={app.id} 
          app={app} 
          onClose={() => closeWindow(app.id)}
          onFocus={() => focusWindow(app.id)}
          isFocused={activeWindowId === app.id}
          zIndex={activeWindowId === app.id ? highestZIndex : 10}
        >
          {renderAppContent(app)}
        </Window>
      ))}

      {/* TASKBAR */}
      <div className="h-16 bg-white/20 backdrop-blur-xl border-t border-white/30 flex items-center px-4 gap-2 z-[9999]">
        <div className="font-bold text-white text-xl tracking-wider mr-6 drop-shadow-md cursor-default select-none">
          KuddOS
        </div>
        
        {/* Open Apps in Taskbar */}
        <div className="flex gap-2">
          {openWindows.map(app => (
            <div 
              key={`taskbar-${app.id}`}
              onClick={() => focusWindow(app.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl cursor-pointer transition ${activeWindowId === app.id ? 'bg-white/40 border border-white/50 shadow-inner' : 'bg-white/10 hover:bg-white/20'}`}
              title={app.name}
            >
              {app.emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
