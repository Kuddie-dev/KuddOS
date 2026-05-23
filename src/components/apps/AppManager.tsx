import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trash2, Globe, FileCode, UploadCloud } from 'lucide-react';
import { useOS } from '@/lib/osContext';
import type { AppDefinition } from '@/types/os';

const PRESET_ICONS = ['\u{1F3B5}', '\u{1F4F1}', '\u{1F310}', '\u2699\uFE0F', '\u{1F4BB}', '\u{1F4CA}', '\u{1F3AE}', '\u{1F4F7}', '\u270F\uFE0F', '\u{1F50D}', '\u{1F4C1}', '\u{1F3A8}'];

function generateId() { return `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export default function AppManager() {
  const { state, dispatch } = useOS();
  const [tab, setTab] = useState<'add' | 'installed'>('add');
  const [appType, setAppType] = useState<'upload' | 'external'>('external');
  const [appName, setAppName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('\u{1F310}');
  const [customIcon, setCustomIcon] = useState('');
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('');
  const [addToDesktop, setAddToDesktop] = useState(true);
  const [addToDock, setAddToDock] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEmojiInput, setShowEmojiInput] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!appName.trim()) errs.name = 'App name is required';
    if (appType === 'external' && !url.trim()) errs.url = 'URL is required';
    if (appType === 'external' && url.trim() && !url.match(/^https?:\/\/.+/)) errs.url = 'Must start with http:// or https://';
    if (appType === 'upload' && !htmlContent) errs.html = 'Please upload an HTML file';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const icon = customIcon || selectedIcon;
    const newApp: AppDefinition = {
      id: generateId(),
      name: appName.trim(),
      icon,
      type: appType === 'external' ? 'external' : 'uploaded',
      url: appType === 'external' ? url.trim() : undefined,
      htmlContent: appType === 'upload' ? htmlContent : undefined,
      onDesktop: addToDesktop,
      inDock: addToDock,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_APP', payload: newApp });

    if (addToDesktop) {
      dispatch({
        type: 'ADD_DESKTOP_ICON',
        payload: {
          id: `icon-${newApp.id}`,
          appId: newApp.id,
          position: { x: 20 + (state.desktopIcons.length % 3) * 80, y: 20 + Math.floor(state.desktopIcons.length / 3) * 96 },
          label: newApp.name,
        },
      });
    }

    if (addToDock) {
      dispatch({
        type: 'ADD_DOCK_ITEM',
        payload: { appId: newApp.id, order: state.dockItems.length },
      });
    }

    // Reset form
    setAppName('');
    setUrl('');
    setHtmlContent('');
    setHtmlFileName('');
    setCustomIcon('');
    setErrors({});
    setTab('installed');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setHtmlContent(reader.result as string);
      setHtmlFileName(file.name);
    };
    reader.readAsText(file);
  };

  const removeApp = (appId: string) => {
    dispatch({ type: 'REMOVE_APP', payload: appId });
  };

  const launchApp = (appId: string) => {
    dispatch({ type: 'OPEN_WINDOW', payload: { appId } });
  };

  return (
    <div className="flex flex-col h-full w-full" style={{ background: 'transparent' }}>
      {/* Tabs */}
      <div className="flex border-b border-white/5 px-4 flex-shrink-0">
        <button
          className="px-4 py-2.5 text-xs font-medium transition-colors border-b-2"
          style={{
            borderColor: tab === 'add' ? '#00E5FF' : 'transparent',
            color: tab === 'add' ? '#00E5FF' : 'rgba(255,255,255,0.4)',
          }}
          onClick={() => setTab('add')}
        >
          Add App
        </button>
        <button
          className="px-4 py-2.5 text-xs font-medium transition-colors border-b-2"
          style={{
            borderColor: tab === 'installed' ? '#00E5FF' : 'transparent',
            color: tab === 'installed' ? '#00E5FF' : 'rgba(255,255,255,0.4)',
          }}
          onClick={() => setTab('installed')}
        >
          Installed ({state.apps.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'add' ? (
          <motion.div
            key="add"
            className="flex-1 overflow-y-auto custom-scrollbar p-5"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Type selector */}
            <div className="flex rounded-lg overflow-hidden border border-white/10 mb-5">
              <button
                className="flex-1 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: appType === 'upload' ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: appType === 'upload' ? '#00E5FF' : 'rgba(255,255,255,0.5)',
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                }}
                onClick={() => setAppType('upload')}
              >
                <FileCode size={13} /> Upload HTML
              </button>
              <button
                className="flex-1 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: appType === 'external' ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: appType === 'external' ? '#00E5FF' : 'rgba(255,255,255,0.5)',
                }}
                onClick={() => setAppType('external')}
              >
                <Globe size={13} /> External URL
              </button>
            </div>

            <div className="space-y-4">
              {/* App Name */}
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>App Name</label>
                <input
                  className="input-field text-xs"
                  placeholder={appType === 'external' ? 'TikTok' : 'My App'}
                  value={appName}
                  onChange={(e) => { setAppName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                />
                {errors.name && <span className="text-xs mt-1 block" style={{ color: '#FF3366' }}>{errors.name}</span>}
              </div>

              {/* Icon picker */}
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Choose Icon</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {PRESET_ICONS.map((icon, i) => (
                    <button
                      key={i}
                      className="flex items-center justify-center h-10 rounded-lg transition-all"
                      style={{
                        fontSize: 20,
                        background: selectedIcon === icon && !customIcon ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)',
                        border: selectedIcon === icon && !customIcon ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                      onClick={() => { setSelectedIcon(icon); setCustomIcon(''); }}
                    >
                      {icon}
                    </button>
                  ))}
                  <button
                    className="flex items-center justify-center h-10 rounded-lg transition-all"
                    style={{
                      background: customIcon ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)',
                      border: customIcon ? '1px solid rgba(0,229,255,0.4)' : '1px dashed rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 14,
                    }}
                    onClick={() => setShowEmojiInput(!showEmojiInput)}
                  >
                    +
                  </button>
                </div>
                <AnimatePresence>
                  {showEmojiInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <input
                        className="input-field text-xs mt-2"
                        placeholder="Type any emoji..."
                        value={customIcon}
                        onChange={(e) => setCustomIcon(e.target.value)}
                        maxLength={2}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* External URL or Upload */}
              {appType === 'external' ? (
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Website URL</label>
                  <input
                    className="input-field text-xs"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setErrors(prev => ({ ...prev, url: '' })); }}
                  />
                  {errors.url && <span className="text-xs mt-1 block" style={{ color: '#FF3366' }}>{errors.url}</span>}
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    The website will open inside a KuddOS window
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>HTML File</label>
                  <label
                    className="flex flex-col items-center justify-center h-24 rounded-lg cursor-pointer transition-all"
                    style={{
                      border: '2px dashed rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {htmlFileName ? (
                      <>
                        <FileCode size={20} className="text-cyan-400 mb-1" />
                        <span className="text-xs text-cyan-400">{htmlFileName}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Click to upload HTML file</span>
                      </>
                    )}
                    <input type="file" accept=".html,.htm" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {errors.html && <span className="text-xs mt-1 block" style={{ color: '#FF3366' }}>{errors.html}</span>}
                </div>
              )}

              {/* Options */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-colors"
                    style={{
                      background: addToDesktop ? '#00E5FF' : 'rgba(255,255,255,0.1)',
                      border: addToDesktop ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    }}
                    onClick={() => setAddToDesktop(!addToDesktop)}
                  >
                    {addToDesktop && <span className="text-xs font-bold" style={{ color: '#000814' }}>{'\u2713'}</span>}
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Add to Desktop</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-colors"
                    style={{
                      background: addToDock ? '#00E5FF' : 'rgba(255,255,255,0.1)',
                      border: addToDock ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    }}
                    onClick={() => setAddToDock(!addToDock)}
                  >
                    {addToDock && <span className="text-xs font-bold" style={{ color: '#000814' }}>{'\u2713'}</span>}
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Add to Dock</span>
                </label>
              </div>

              {/* Submit */}
              <button
                className="btn-primary w-full text-xs mt-2"
                onClick={handleSubmit}
                disabled={!appName.trim()}
              >
                Add Application
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="installed"
            className="flex-1 overflow-y-auto custom-scrollbar p-4"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-3 gap-3">
              {state.apps.map((app) => (
                <motion.div
                  key={app.id}
                  className="glass-panel p-3 flex flex-col items-center cursor-pointer group relative"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-3xl mb-2">{app.icon}</span>
                  <span className="text-xs font-medium text-center truncate w-full" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {app.name}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full mt-1"
                    style={{
                      fontSize: 8,
                      background: app.type === 'native' ? 'rgba(0,229,255,0.1)' : app.type === 'external' ? 'rgba(100,180,255,0.1)' : 'rgba(180,100,255,0.1)',
                      color: app.type === 'native' ? '#00E5FF' : app.type === 'external' ? '#64B4FF' : '#B464FF',
                    }}
                  >
                    {app.type.toUpperCase()}
                  </span>

                  {/* Actions */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      onClick={(e) => { e.stopPropagation(); launchApp(app.id); }}
                    >
                      <Play size={10} className="text-white/60" />
                    </button>
                    {app.type !== 'native' && (
                      <button
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); removeApp(app.id); }}
                      >
                        <Trash2 size={10} className="text-white/40 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
