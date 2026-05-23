# KuddOS — Technical Specification

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15 | Framework, static export to `dist/` |
| react | ^19 | UI library |
| react-dom | ^19 | React DOM renderer |
| typescript | ^5 | Type safety |
| tailwindcss | ^4 | Utility-first CSS |
| @tailwindcss/postcss | ^4 | PostCSS integration for Tailwind v4 |
| framer-motion | ^12 | All animations, drag physics, window transitions, layout animations, spring effects |
| lucide-react | ^0.460 | System icons (window controls, UI chrome) |
| id3js | ^2 | Client-side ID3 tag parsing for music metadata extraction |
| jszip | ^3 | Optional: zip import/export for notes backup |

---

## Component Inventory

### Layout (OS Chrome — rendered once, always present)

| Component | Source | Notes |
|-----------|--------|-------|
| BootScreen | Custom | Cinematic 4-phase boot sequence, self-dismissing |
| DesktopEnvironment | Custom | Wallpaper layer + particle canvas + icon grid + overlay |
| TopMenuBar | Custom | 28px system bar: system menu, app name, clock, status icons |
| FloatingDock | Custom | Bottom-center glass dock with magnification spring physics |
| GlobalMediaController | Custom | Floating mini-player when music is active, draggable, visualizer toggle |
| WindowManager | Custom | Renders all active WindowInstance components from registry |
| ContextMenu | Custom | Portal-based, positioned absolutely at cursor, sub-menu support |
| NotificationToast | Custom | Stacked toasts top-right, auto-dismiss with progress bar |
| SpotlightSearch | Custom | Cmd+Space overlay, searches across apps/notes |

### Reusable Components

| Component | Source | Used By |
|-----------|--------|---------|
| GlassPanel | Custom | Windows, cards, menus, dock, media controller — foundational glass surface with blur/glow/border recipe |
| GlassButton | Custom | Primary (gradient fill) and Ghost (transparent) variants — all interactive surfaces |
| WindowChrome | Custom | Wraps every app: title bar, traffic-light controls, resize handles, focus glow |
| DialogModal | Custom | Confirmations (delete folder/note/app), edit dialogs — portal-based overlay |
| DesktopIcon | Custom | Grid-snappable shortcut on desktop |
| DockItem | Custom | Individual app icon in dock with magnification, tooltip, running indicator |
| InputField | Custom | Text entry throughout: search, titles, forms |
| CustomScrollbar | Custom | Scrollbar styling for all scrollable panels |
| SegmentedControl | Custom | App Manager tab toggle, view switchers |
| EmojiPicker | Custom | Grid of preset emoji + custom text input for app/note icons |

### App Modules (rendered inside WindowChrome instances)

| Component | Source | Notes |
|-----------|--------|-------|
| NotesApp | Custom | 3-panel layout: folder tree sidebar, rich text editor, optional preview |
| MusicApp | Custom | Player view + Library view with tab toggle |
| AppManager | Custom | 2-tab form: Add App (upload HTML / external URL) + Installed Apps grid |
| ExternalApp | Custom | Iframe wrapper for external URL apps with loading/error states |
| UploadedHtmlApp | Custom | Blob-URL iframe for user-uploaded HTML apps |

### Music Sub-Components

| Component | Notes |
|-----------|-------|
| AudioVisualizer | Canvas 2D radial + linear frequency bars, Web Audio API AnalyserNode |
| UploadDropZone | Drag-and-drop area with file type validation and progress |
| PlaylistTable | Scrollable track list with sticky header, playing-state equalizer animation |

### Notes Sub-Components

| Component | Notes |
|-----------|-------|
| FolderTree | Recursive tree render with expand/collapse, indent lines, context menus |
| NotesList | Filtered note list within selected folder |
| RichTextEditor | contentEditable div with inline toolbar, sanitizes pasted HTML to allowed tag set |
| EditorToolbar | Floating glass toolbar: bold/italic/underline/lists/headings, active-state highlighting |
| BreadcrumbNav | Clickable folder path segments |

---

## Animation Implementation

| Animation | Library | Approach | Complexity |
|-----------|---------|----------|------------|
| Boot sequence (4-phase: glow, letter stagger, progress bar, desktop reveal) | Framer Motion | AnimatePresence + staggerChildren on boot screen; phase transitions orchestrated by a state machine cycling through phases with setTimeout delays | **High** |
| Window open (scale from dock position) | Framer Motion | `animate` with scale/opacity from dock icon coordinates calculated via getBoundingClientRect | **Medium** |
| Window close (shrink + fade) | Framer Motion | AnimatePresence exit animation with scale(0.9) and opacity(0) | **Low** |
| Window minimize (shrink toward dock icon) | Framer Motion | Calculate dock icon position, animate scale/translate toward that coordinate | **Medium** |
| Window maximize/restore | Framer Motion | `animate` width/height/x/y to fullscreen bounds or saved position/size | **Low** |
| Window drag | Framer Motion | `drag` prop on title bar with `dragMomentum={false}`, dragConstraints for screen-edge clamping | **Low** |
| Window resize | Custom (mouse events) | 8 invisible resize handles track mouse delta, update window size/position imperatively | **High** 🔒 |
| Dock magnification (spring neighbor scaling) | Framer Motion | `useMotionValue` + `useTransform` per dock item; each item's scale derived from distance to hovered index using spring physics | **High** 🔒 |
| Desktop particles | Custom (Canvas 2D) | rAF loop on canvas overlay; 20-30 circles with random drift, sine oscillation, opacity pulsing | **Medium** |
| Audio visualizer (radial bars) | Custom (Canvas 2D) | Web Audio API AnalyserNode → getByteFrequencyData → rAF canvas render; radial layout with glow | **High** 🔒 |
| Album art rotating border ring | Framer Motion | `animate` rotate 0→360 on track change, 8s linear infinite | **Low** |
| Progress bar thumb appear | CSS transition | Height/opacity transition on hover pseudo-state | **Low** |
| Play/pause button pulse glow | Framer Motion | `animate` boxShadow between two glow values, repeat Infinity | **Low** |
| Note creation slide-in | Framer Motion | `initial={{ y: -10, opacity: 0 }}` `animate={{ y: 0, opacity: 1 }}` with ease-out-back | **Low** |
| Folder expand/collapse | Framer Motion | `AnimatePresence` on child list with height auto animation; chevron rotate via `animate={{ rotate }}` | **Low** |
| Context menu appear | Framer Motion | `initial={{ scale: 0.95, opacity: 0 }}` `animate={{ scale: 1, opacity: 1 }}` | **Low** |
| Toast slide-in | Framer Motion | `initial={{ x: '100%' }}` `animate={{ x: 0 }}` with spring; stacked layout via `layout` prop | **Low** |
| App icon pop-in (desktop/dock) | Framer Motion | scale 0→1 with ease-out-back on mount | **Low** |
| Desktop icon drag + grid snap | Custom (pointer events) | Track pointer delta, on release snap x/y to nearest 80x96 grid cell, save position | **Medium** |
| Iframe loading spinner | CSS animation | Rotating cyan arc on glass circle, pure CSS keyframes | **Low** |
| Global media controller drag | Framer Motion | `drag` with elastic snap-to-edge on release (detect nearest screen edge) | **Medium** |

---

## State & Logic Plan

### 1. Centralized OS Context (React Context + useReducer)

A single top-level context holds the entire OS state. Split into domain slices for organization, but unified in one context to avoid cross-domain synchronization issues.

**Why Context over Zustand/Redux:** The OS is a single tree with tightly coupled domains (windows reference apps, dock references windows, desktop references apps). Context provides simple access patterns without external dependencies. Given the scale (~6 state domains), Context + useReducer is sufficient without adding a store library.

**State domains:** `system`, `desktop`, `windows`, `dock`, `apps`, `media`

### 2. Persistence Layer (IndexedDB + localStorage)

A single `PersistenceManager` class handles all storage operations:

- **IndexedDB** (`kuddos-os` database, 3 object stores: `wallpapers`, `media`, `uploadedApps`): stores Blob data — wallpapers, audio/video files, uploaded HTML. Uses `idb` or raw IndexedDB API.
- **localStorage** (8 keys): stores JSON-serializable data — settings, desktop icons, dock items, installed apps, window positions, notes, playlist metadata, media state.
- **Save strategy:** All state changes trigger a debounced save (300ms) through the persistence manager. On first load, the manager reads from storage and seeds default data where empty.
- **LRU eviction:** If IndexedDB quota exceeded during media save, oldest entries (by `lastAccessed` timestamp) are removed, with a warning toast.

### 3. Window Manager

The window manager is the most complex piece of orchestration:

- **Registry:** Array of open window instances. Each has a unique UUID, position, size, state (`normal`/`minimized`/`maximized`), and z-index.
- **Z-index management:** A monotonically increasing counter (`nextZIndex`). On focus, a window gets the current counter value and the counter increments. No recycling needed.
- **Multi-instance:** Same app ID can have multiple windows. Each window carries its own state independently via React key.
- **App-to-component mapping:** A lookup table maps `app.type` + `app.component` to the correct React component. `native` → direct component render, `external` → ExternalApp with URL prop, `uploaded` → UploadedHtmlApp with blob content.
- **Resize system:** Custom implementation using pointer events on 8 invisible handles. Mouse deltas directly mutate width/height/position imperatively for 60fps performance; final values sync to React state on mouseup.

### 4. Global Audio System

An `<audio>` element lives outside the React tree at the OS root level, controlled via refs:

- The audio element's `src` is set to a blob URL from IndexedDB when a track is selected.
- A global media context provides: play/pause/prev/next/seek/volume functions, current track metadata, playback progress.
- The AnalyserNode is connected to the audio element via `AudioContext.createMediaElementSource()` for the visualizer.
- Playback continues when the Music app window closes — the audio element is NOT inside the app component tree.
- On page load, the last playing track and position are restored from localStorage, and playback auto-resumes if it was playing.

### 5. Audio Extraction from Video

When a video file is uploaded:

- Create a hidden `<video>` element with the file as an `object URL`.
- Use `captureStream()` to get a MediaStream from the video element.
- Use `MediaRecorder` to capture the audio track into a new Blob.
- Store the resulting audio Blob in IndexedDB alongside the original video Blob.
- Mark the MediaItem as `type: 'video'` with `extractedAudio: true`.
- During playback, the audio element plays the extracted audio blob, not the video.

### 6. Notes Rich Text Editor

A `contentEditable` div approach (not a library — keeps bundle small and ensures glassmorphism styling):

- `document.execCommand` for formatting toggles (bold, italic, underline, lists, headings).
- Paste handler sanitizes HTML to an allowed tag whitelist: `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `ul`, `ol`, `li`, `h1`, `h2`, `h3`, `span`.
- Content stored as HTML string in localStorage, auto-saved debounced 1000ms.
- Toolbar uses `document.queryCommandState` to determine active formatting and highlight buttons.

### 7. Iframe App Sandboxing

- **External apps:** `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` with `allow` attribute for camera/microphone/fullscreen. Error detection: check `iframe.contentWindow` access after 5s timeout; if null/blocked, show error overlay.
- **Uploaded HTML apps:** `sandbox="allow-scripts"` only (stricter, no network). HTML rendered via `URL.createObjectURL(new Blob([htmlContent], {type: 'text/html'}))`.

---

## Other Key Decisions

### Static Export (Next.js)

The app is fully client-side with no server-side requirements. Use `next export` (output: `export`) to generate a static `dist/` folder for Vercel deployment. All routing is internal to the OS (no Next.js pages router needed — single page).

### Single Page, No Next.js Router

KuddOS is a single-page desktop environment. App "windows" are React components rendered conditionally within the same page, not separate routes. No `next/router` usage.

### Emoji for App Icons

App icons use native emoji characters (not an icon library). This keeps the bundle smaller and aligns with the user's explicit request for "emoji-based app icons only." No additional emoji font or library needed — system emoji rendering.

### Canvas Overlays

Two canvas layers exist outside the normal DOM flow:
1. **Desktop particles** — full-viewport canvas at z-index 0, always rendering atmospheric particles
2. **Audio visualizer** — embedded in the Music app (radial) and Global Media Controller (linear)

Both use `requestAnimationFrame` and skip rendering when `document.hidden` is true.

### No Server-Side APIs

All data persistence is client-side (IndexedDB + localStorage). No API routes, no database, no authentication. The OS operates entirely in the browser.
