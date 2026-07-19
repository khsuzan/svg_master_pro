# SVG Master Pro — Project Status

## Overview

Developer-focused interactive SVG design tool + code editor. Built with React 19 + Monaco Editor + Vite.

## Tech Stack

- **React 19** with hooks (useState, useRef, useCallback, useEffect, useImperativeHandle)
- **Monaco Editor** via `@monaco-editor/react` (v4.7)
- **Vite 8** as bundler
- **CSS** only (no CSS-in-JS or preprocessors)
- No state management library — all state lives in `App.jsx` via `useState`/`useRef`

## Project Structure

```
svg_master_pro/
├── src/
│   ├── App.jsx              # Main component, all state & callbacks
│   ├── App.css              # All styles (1570 lines)
│   ├── index.css            # Global CSS variables, resets, scrollbar styles
│   ├── components/
│   │   ├── Canvas.jsx       # SVG rendering, mouse/touch interaction, selection
│   │   ├── CodePanel.jsx    # Monaco editor wrapper, code↔element sync
│   │   ├── LayerPanel.jsx   # Tree/layer view with visibility & lock toggles
│   │   ├── Toolbar.jsx      # Top toolbar with tool icons
│   │   ├── ContextMenu.jsx  # Right-click menu on canvas
│   │   ├── GroupModal.jsx   # Edit group element attributes
│   │   ├── ArtboardModal.jsx # Edit SVG viewBox/dimensions
│   │   ├── CssPanel.jsx     # Custom CSS injection panel
│   │   └── ConfirmModal.jsx # Generic confirm dialog
│   └── utils/
│       ├── domUtils.js      # DOM traversal, leaf/group detection
│       ├── serializer.js    # HTML pretty-print/minify/strip markers
│       └── storage.js       # IndexedDB persistence
├── vite.config.js
├── eslint.config.js
└── package.json
```

## How to Run

```bash
npm run dev     # Vite dev server
npm run build   # Production build
npm run lint    # ESLint
npm run preview # Preview production build
```

## Architecture: Three-Way Selection Sync

Canvas, Code Panel, and Layer Panel are **selection-synchronized** bidirectionally:

### Data Flow

| Direction | Mechanism | Status |
|---|---|---|
| Canvas → Code | `onSelectionUpdate` → `App.handleSelectionUpdate` → `codePanelRef.selectCodeInEditor()` | ✅ |
| Canvas → Layer | `onSelectionUpdate` → `setSelectedElement` → `<LayerPanel selectedElement={...}>` | ✅ |
| Layer → Canvas | `onLayerSelect(el)` → `actionsRef.selectElementRef(el)` → updates Canvas selection | ✅ |
| Layer → Code | Indirect: Layer → Canvas → App.handleSelectionUpdate → CodePanel | ✅ |
| Code → Canvas | Monaco `onDidChangeCursorPosition` → `onCodeSelectElement(code, offset)` → `Canvas.selectAtCursorPos()` | ✅ |
| Code → Layer | Indirect: Code → Canvas → onSelectionUpdate → setSelectedElement → LayerPanel | ✅ |

### Key State

```
App.jsx:
  selectedRefs (useRef<Set>)  — Mutable Set of selected DOM elements (source of truth)
  selectedElement (useState)  — First element of selection (drives LayerPanel)
  selectedCount  (useState)   — Selection count (drives Toolbar)
```

### Imperative Handles

- `codePanelRef.current.selectCodeInEditor(html)` — Select text in Monaco by outerHTML
- `codePanelRef.current.selectRange(htmlStrings[])` — Select range spanning multiple HTML strings
- `codePanelRef.current.getCode()` — Get current editor content
- `codePanelRef.current.focus()` — Focus editor
- `actionsRef.current.selectElementRef(el)` — Select element in Canvas by DOM reference
- `actionsRef.current.selectAtCursorPos(code, pos)` — Select element by code cursor position
- `actionsRef.current.selectByOuterHTML(html)` — Select element by exact outerHTML match
- `actionsRef.current.centerOnElement(el)` — Scroll canvas viewport to element

### Canvas Selection Details (`src/components/Canvas.jsx`)

- Selection is stored in a mutable `Set<DOMElement>` (`selectedRefs`)
- `selectElement(el, shiftKey)` handles click/selection
- `clearSelection()` clears all
- `selectAtCursorPos(code, cursorPos)` — finds element matching cursor position in code text
  - For leaf elements: matches by exact `code.indexOf(el.outerHTML)`
  - For groups: matches by opening tag + closing tag lookup in code
- `selectByOuterHTML(html)` — matches by exact outerHTML comparison

### Code Panel Selection Details (`src/components/CodePanel.jsx`)

- `findTagRange(code, pos)` — finds a tag's range (opening to closing tag), handles nesting
- `selectCodeInEditor(htmlString)` — selects text in Monaco
  - Tries exact outerHTML match first
  - Falls back to matching by opening tag + `findTagRange` for groups
- `selectRange(htmlStrings[])` — selects range spanning multiple elements
- Cursor listener (`onDidChangeCursorPosition`) — triggers canvas selection sync
  - Suppressed during programmatic selections via `suppressCursorSyncRef`

### Layer Panel Selection Details (`src/components/LayerPanel.jsx`)

- Parses HTML into tree: `parseLayers(containerEl)` → recursive tree of `{ tag, el, name, children, path, icon }`
- `computeElementPath(el)` — builds sibling-index path from root to element
- `findNodeByPath(nodes, path)` — walks parsed tree to find the node by path
- Selection highlighted via `selectedPath` comparing `node.el === selectedElement`
- Auto-expands parent nodes on selection

## Layer Panel: Visibility & Lock

Each `LayerItem` has two icon buttons (Figma-style):

- **Eye** (visibility toggle):
  - Sets `el.style.visibility = 'hidden'` / `''` and `el.style.pointerEvents = 'none'` / `''`
  - SVG eye icon (open) / eye-off icon (closed)
  - Hidden layers show muted icon

- **Lock** (interaction lock):
  - Sets `el.style.pointerEvents = 'none'` / `''`
  - SVG lock icon (locked) / unlock icon (unlocked)
  - Locked layers show accent-colored icon

Both buttons appear on hover (`opacity: 0 → 0.6 → 1`).
Both trigger `serializeContainer()` + `setHtmlCode()` to sync changes back to code.

State is read from actual DOM element styles (not React state), so it survives re-renders.

## Undo/Redo

- History stored as `history[]` array (max 50 entries) + `historyIndex`
- Ctrl+Z / Ctrl+Shift+Z undo/redo
- IndexedDB auto-saves code + history every 500ms

## Keyboard Shortcuts

- Ctrl+Z / Ctrl+Shift+Z: undo/redo
- Delete/Backspace: delete selected elements
- Ctrl+C/V/X: copy/paste/cut
- Space+drag: pan canvas
- Scroll: zoom (or Ctrl+scroll)
- [ / ]: decrease/increase brush size

## Context Menus

- **Canvas right-click** (`ContextMenu.jsx`): Delete, Group, Copy, Cut, Paste, Snap to Code, Canvas Size/Stretch
- **Code right-click** (`CodeViewMenu` in `CodePanel.jsx`): Expand Tag, Expand Parent, Select Contents, Copy, Cut, Paste

## Styling

All CSS in `src/App.css` (~1570 lines). CSS variables defined in `src/index.css`:
- `--bg-primary` (#16161e), `--bg-secondary` (#1e1e2e), `--bg-tertiary` (#181825)
- `--accent` (#89b4fa), `--accent-bg` (rgba(137,180,250,0.08))
- `--text-primary` (#cdd6f4), `--text-secondary` (#bac2de), `--text-muted` (#6c7086)
- Fonts: `--font-sans` (Inter), `--font-mono` (JetBrains Mono / Fira Code)

## Known Issues / Future Work

- Group selection from canvas to code panel uses opening tag matching which works for single-line opening tags but may fail with multi-line attributes
- No tests exist yet
- No TypeScript (plain JSX)
- No persistent selection across page reload (doesn't save to IndexedDB)
- Layer panel search doesn't persist visibility/lock filter
