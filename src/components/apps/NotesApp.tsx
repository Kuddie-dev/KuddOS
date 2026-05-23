import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, ChevronRight, ChevronDown, Folder, FileText,
  Bold, Italic, Underline, List, ListOrdered, Trash2,
  Clock, StickyNote
} from 'lucide-react';
import { useOS } from '@/lib/osContext';
import type { Folder as FolderType, Note } from '@/types/os';

// ─── Helpers ────────────────────────────────────────────────

function generateId() { return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// ─── Notes App ──────────────────────────────────────────────

export default function NotesApp({ windowId }: { windowId: string }) {
  const { state, dispatch } = useOS();
  const folders = state.notes.folders;
  const notes = state.notes.notes;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('folder-all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder-all']));
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<{ type: 'folder' | 'note'; id: string } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [newFolderName, setNewFolderName] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Update window title
  useEffect(() => {
    const note = notes.find(n => n.id === selectedNoteId);
    if (note) {
      dispatch({ type: 'UPDATE_WINDOW_TITLE', payload: { id: windowId, title: note.title || 'Untitled' } });
    } else {
      dispatch({ type: 'UPDATE_WINDOW_TITLE', payload: { id: windowId, title: 'Notes' } });
    }
  }, [selectedNoteId, notes, dispatch, windowId]);

  // Focus folder input when editing
  useEffect(() => {
    if (editingFolderId && folderInputRef.current) {
      folderInputRef.current.focus();
      folderInputRef.current.select();
    }
  }, [editingFolderId]);

  const getChildFolders = useCallback((parentId: string | null): FolderType[] => {
    return folders.filter(f => f.parentId === parentId && f.id !== 'folder-all');
  }, [folders]);

  const getNotesInFolder = useCallback((folderId: string): Note[] => {
    if (folderId === 'folder-all') {
      if (!searchQuery) return notes;
      const q = searchQuery.toLowerCase();
      return notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q)
      );
    }
    const childFolderIds = new Set<string>();
    const collect = (pid: string) => {
      childFolderIds.add(pid);
      folders.filter(f => f.parentId === pid).forEach(f => collect(f.id));
    };
    collect(folderId);
    if (!searchQuery) return notes.filter(n => childFolderIds.has(n.folderId));
    const q = searchQuery.toLowerCase();
    return notes.filter(n => childFolderIds.has(n.folderId) && (
      n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q)
    ));
  }, [folders, notes, selectedFolderId, searchQuery]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderType = {
      id: generateId(),
      name: newFolderName.trim(),
      icon: '\u{1F4C1}',
      parentId: selectedFolderId === 'folder-all' ? null : selectedFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'SET_NOTES', payload: { folders: [...folders, newFolder] } });
    setCreatingFolder(false);
    setNewFolderName('');
    setExpandedFolders(prev => new Set([...prev, selectedFolderId || 'folder-all']));
  };

  const createNote = () => {
    const folderId = selectedFolderId === 'folder-all' ? 'folder-work' : (selectedFolderId || 'folder-work');
    const newNote: Note = {
      id: generateId(),
      title: '',
      content: '<p><br></p>',
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'SET_NOTES', payload: { notes: [...notes, newNote] } });
    setSelectedNoteId(newNote.id);
    setSelectedFolderId(folderId);
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
    dispatch({
      type: 'SET_NOTES',
      payload: {
        notes: notes.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: Date.now() } : n),
      },
    });
  };

  const deleteNote = (noteId: string) => {
    dispatch({ type: 'SET_NOTES', payload: { notes: notes.filter(n => n.id !== noteId) } });
    if (selectedNoteId === noteId) setSelectedNoteId(null);
    setShowDeleteDialog(null);
  };

  const deleteFolder = (folderId: string) => {
    const idsToDelete = new Set<string>();
    const collect = (pid: string) => {
      idsToDelete.add(pid);
      folders.filter(f => f.parentId === pid).forEach(f => collect(f.id));
    };
    collect(folderId);
    dispatch({
      type: 'SET_NOTES',
      payload: {
        folders: folders.filter(f => !idsToDelete.has(f.id)),
        notes: notes.filter(n => !idsToDelete.has(n.folderId)),
      },
    });
    if (selectedFolderId && idsToDelete.has(selectedFolderId)) setSelectedFolderId('folder-all');
    setShowDeleteDialog(null);
  };

  const renameFolder = (folderId: string, name: string) => {
    if (!name.trim()) return;
    dispatch({
      type: 'SET_NOTES',
      payload: {
        folders: folders.map(f => f.id === folderId ? { ...f, name: name.trim(), updatedAt: Date.now() } : f),
      },
    });
    setEditingFolderId(null);
  };

  // Rich text commands
  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      if (selectedNoteId) updateNote(selectedNoteId, { content });
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current && selectedNoteId) {
      updateNote(selectedNoteId, { content: editorRef.current.innerHTML });
    }
  };

  const handleTitleChange = (title: string) => {
    if (selectedNoteId) updateNote(selectedNoteId, { title });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Folder tree render
  const renderFolderTree = (parentId: string | null, depth = 0) => {
    const children = getChildFolders(parentId);
    return children.map(folder => (
      <div key={folder.id}>
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none"
          style={{
            paddingLeft: 8 + depth * 16,
            background: selectedFolderId === folder.id ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
          }}
          onClick={() => setSelectedFolderId(folder.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDeleteDialog({ type: 'folder', id: folder.id });
          }}
        >
          <button
            className="flex-shrink-0 p-0.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
          >
            {expandedFolders.has(folder.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <span className="text-sm flex-shrink-0">{folder.icon}</span>
          {editingFolderId === folder.id ? (
            <input
              ref={folderInputRef}
              className="flex-1 bg-transparent text-xs outline-none border-b border-cyan-400/50 text-white"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={() => renameFolder(folder.id, editingFolderName)}
              onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(folder.id, editingFolderName); if (e.key === 'Escape') setEditingFolderId(null); }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-xs truncate"
              style={{ color: selectedFolderId === folder.id ? '#00E5FF' : 'rgba(255,255,255,0.75)' }}
              onDoubleClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
            >
              {folder.name}
            </span>
          )}
        </div>
        <AnimatePresence>
          {expandedFolders.has(folder.id) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {renderFolderTree(folder.id, depth + 1)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ));
  };

  const currentNote = notes.find(n => n.id === selectedNoteId);
  const currentNotes = getNotesInFolder(selectedFolderId || 'folder-all');
  const currentFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'transparent' }}>
      {/* Sidebar */}
      <div className="flex flex-col w-60 border-r border-white/5 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input-field pl-8 text-xs"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Folders */}
        <div className="px-2 pb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Folders</span>
          <button
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onClick={() => setCreatingFolder(true)}
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
          {/* All Notes */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
            style={{ background: selectedFolderId === 'folder-all' ? 'rgba(0, 229, 255, 0.08)' : 'transparent' }}
            onClick={() => setSelectedFolderId('folder-all')}
          >
            <StickyNote size={14} style={{ color: selectedFolderId === 'folder-all' ? '#00E5FF' : 'rgba(255,255,255,0.5)' }} />
            <span className="text-xs" style={{ color: selectedFolderId === 'folder-all' ? '#00E5FF' : 'rgba(255,255,255,0.75)' }}>All Notes</span>
            <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{notes.length}</span>
          </div>

          {renderFolderTree(null)}

          {/* Create folder input */}
          <AnimatePresence>
            {creatingFolder && (
              <motion.div
                className="flex items-center gap-2 px-2 py-1.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Folder size={14} className="text-white/40 flex-shrink-0" />
                <input
                  className="flex-1 bg-transparent text-xs outline-none border-b border-cyan-400/50 text-white"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
                  onBlur={() => { if (newFolderName.trim()) createFolder(); else setCreatingFolder(false); }}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notes list */}
        <div className="border-t border-white/5 pt-2 flex-1 overflow-y-auto custom-scrollbar">
          {currentNotes.map(note => (
            <div
              key={note.id}
              className="flex flex-col px-3 py-2 cursor-pointer transition-colors border-l-2"
              style={{
                background: selectedNoteId === note.id ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
                borderLeftColor: selectedNoteId === note.id ? '#00E5FF' : 'transparent',
              }}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <span className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {note.title || 'Untitled Note'}
              </span>
              <span className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {stripHtml(note.content).slice(0, 50) || 'No content'}
              </span>
            </div>
          ))}
          {currentNotes.length === 0 && (
            <div className="flex flex-col items-center py-6 px-3">
              <FileText size={20} className="text-white/15 mb-2" />
              <span className="text-xs text-white/30">No notes</span>
            </div>
          )}
        </div>

        {/* New Note button */}
        <div className="p-2 border-t border-white/5">
          <button className="btn-primary w-full text-xs" onClick={createNote}>
            <Plus size={13} /> New Note
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentNote ? (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 px-4 py-2 text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span className="cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => setSelectedFolderId('folder-all')}>All Notes</span>
              <ChevronRight size={10} />
              <span className="cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => currentFolder && setSelectedFolderId(currentFolder.id)}>
                {currentFolder?.name || 'Unknown'}
              </span>
              <ChevronRight size={10} />
              <span style={{ color: '#00E5FF' }}>{currentNote.title || 'Untitled'}</span>
              <div className="ml-auto flex items-center gap-2">
                <Clock size={10} />
                <span>{timeAgo(currentNote.updatedAt)}</span>
                <button className="p-1 hover:bg-white/10 rounded transition-colors" onClick={() => setShowDeleteDialog({ type: 'note', id: currentNote.id })}>
                  <Trash2 size={12} className="text-white/40 hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-1.5 border-b border-white/5 flex-shrink-0">
              {[
                { icon: Bold, cmd: 'bold', label: 'Bold' },
                { icon: Italic, cmd: 'italic', label: 'Italic' },
                { icon: Underline, cmd: 'underline', label: 'Underline' },
                null,
                { icon: List, cmd: 'insertUnorderedList', label: 'Bullet' },
                { icon: ListOrdered, cmd: 'insertOrderedList', label: 'Numbered' },
              ].map((item, i) => (
                item ? (
                  <button
                    key={i}
                    className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onClick={() => execCmd(item.cmd)}
                    title={item.label}
                  >
                    <item.icon size={13} />
                  </button>
                ) : (
                  <div key={i} className="w-px h-4 bg-white/10 mx-1" />
                )
              ))}
            </div>

            {/* Title */}
            <input
              className="px-4 pt-3 pb-1 bg-transparent outline-none text-xl font-semibold"
              style={{ color: 'white', borderBottom: '1px solid transparent' }}
              placeholder="Untitled Note"
              value={currentNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />

            {/* Editor */}
            <div
              ref={editorRef}
              className="flex-1 px-4 py-3 outline-none overflow-y-auto custom-scrollbar"
              style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, minHeight: 0 }}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onPaste={handlePaste}
              dangerouslySetInnerHTML={{ __html: currentNote.content }}
            />
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center flex-1">
            <motion.div
              className="text-6xl mb-4"
              style={{ color: 'rgba(255,255,255,0.1)' }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {'\u{1F4DD}'}
            </motion.div>
            <span className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Select a note or create a new one
            </span>
            <button className="btn-primary text-xs" onClick={createNote}>
              <Plus size={13} /> New Note
            </button>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 100, background: 'rgba(0,8,20,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteDialog(null)}
          >
            <motion.div
              className="glass-panel-strong p-5"
              style={{ minWidth: 320, borderRadius: 16 }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-2">Delete {showDeleteDialog.type === 'folder' ? 'Folder' : 'Note'}?</h3>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {showDeleteDialog.type === 'folder'
                  ? 'This folder and all notes within it will be deleted. This action cannot be undone.'
                  : 'This note will be permanently deleted.'}
              </p>
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost text-xs" onClick={() => setShowDeleteDialog(null)}>Cancel</button>
                <button
                  className="btn-primary text-xs"
                  style={{ background: '#FF3366' }}
                  onClick={() => {
                    if (showDeleteDialog.type === 'folder') deleteFolder(showDeleteDialog.id);
                    else deleteNote(showDeleteDialog.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
