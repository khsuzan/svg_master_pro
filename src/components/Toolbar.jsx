import { useState } from 'react'

const BRUSH_PRESETS = [10, 20, 30, 50, 80]

export default function Toolbar({
  activeTool,
  onToolChange,
  selectedCount,
  onDelete,
  onDeleteAll,
  onDeleteUnselected,
  onCleanEmptyGroups,
  onCleanEmptyAll,
  onEmptyGroupRemoval,
  onToggleFormat,
  onClearSelections,
  codePrettified,
  clipboardSize,
  onSave,
  onZoomToContent,
  onZoomToCenter,
  onSelectZoomIn,
  onRotateSelected,
  pathTagFilter = 'any',
  onPathTagFilterChange,
  brushSize = 30,
  onBrushSizeChange,
}) {
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false)
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false)
  const [cleanMenuOpen, setCleanMenuOpen] = useState(false)
  const [rotateMenuOpen, setRotateMenuOpen] = useState(false)
  const [brushMenuOpen, setBrushMenuOpen] = useState(false)

  const COMMON_SVG_TAGS = ['a', 'circle', 'ellipse', 'g', 'image', 'line', 'path', 'polygon', 'polyline', 'rect', 'text', 'tspan', 'use']
  const tools = [
    {
      id: 'select',
      label: 'Select',
      shortcut: 'V',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      ),
    },
    {
      id: 'path-select',
      label: 'Path Select',
      shortcut: 'P',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9C4.10457 9 5 8.10457 5 7C5 5.89543 4.10457 5 3 5C1.89543 5 1 5.89543 1 7C1 8.10457 1.89543 9 3 9Z" />
          <path d="M21 9C22.1046 9 23 8.10457 23 7C23 5.89543 22.1046 5 21 5C19.8954 5 19 5.89543 19 7C19 8.10457 19.8954 9 21 9Z" />
          <path d="M19 7H15" />
          <path d="M9 7H5" />
          <path d="M7.5 16.5V18.5C7.5 19.11 7.13 19.64 6.61 19.86C6.42 19.95 6.22 20 6 20H4C3.17 20 2.5 19.33 2.5 18.5V16.5C2.5 15.67 3.17 15 4 15H6C6.83 15 7.5 15.67 7.5 16.5Z" />
          <path d="M21.5 16.5V18.5C21.5 19.33 20.83 20 20 20H18C17.78 20 17.58 19.95 17.39 19.86C16.87 19.64 16.5 19.11 16.5 18.5V16.5C16.5 15.67 17.17 15 18 15H20C20.83 15 21.5 15.67 21.5 16.5Z" />
          <path d="M15 5.5V8.5C15 9.32 14.32 10 13.5 10H10.5C9.68 10 9 9.32 9 8.5V5.5C9 4.68 9.68 4 10.5 4H13.5C14.32 4 15 4.68 15 5.5Z" />
          <path d="M15 7.72998C17.37 8.92998 19 11.51 19 14.5C19 14.67 18.99 14.83 18.97 15" />
          <path d="M5.03 15C5.01 14.83 5 14.67 5 14.5C5 11.51 6.63 8.92998 9 7.72998" />
        </svg>
      ),
    },
    {
      id: 'brush-select',
      label: 'Brush Select',
      shortcut: 'B',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2 2 0 000-2.82l-.18-.18a2 2 0 00-2.82 0z"/>
          <path d="M9 13c-2.21 0-4 1.79-4 4 0 .92-.86 1.87-2 2 1.13 0 2 .87 2 2 0 2.21 1.79 4 4 4s4-1.79 4-4"/>
        </svg>
      ),
    },
    {
      id: 'move',
      label: 'Move',
      shortcut: 'M',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 9 2 12 5 15" />
          <polyline points="9 5 12 2 15 5" />
          <polyline points="15 19 12 22 9 19" />
          <polyline points="19 9 22 12 19 15" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      id: 'zoom',
      label: 'Zoom',
      shortcut: 'Z',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      ),
    },
    {
      id: 'delete-tool',
      label: 'Delete Tool',
      shortcut: 'D',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: 'rotate',
      label: 'Rotate',
      shortcut: 'R',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
      ),
    },
  ]

  return (
    <>
      <div className="toolbar-floating">
        <div className="toolbar-floating-group">
          {tools.map((tool) => (
            tool.id === 'delete-tool' ? (
              <div key={tool.id} className="toolbar-select-wrapper">
                <button
                  className={`tool-floating-btn ${activeTool === tool.id ? 'active' : ''}`}
                  onClick={() => onToolChange(tool.id)}
                  onContextMenu={(e) => { e.preventDefault(); setDeleteMenuOpen((v) => !v) }}
                  title={`${tool.label} (${tool.shortcut}) · Right-click for delete options`}
                >
                  {tool.icon}
                </button>
                {deleteMenuOpen && (
                  <>
                    <div className="toolbar-dropdown-backdrop" onClick={() => setDeleteMenuOpen(false)} />
                    <div className="toolbar-dropdown">
                      <button className="toolbar-dropdown-item" onClick={() => { onDelete?.(); setDeleteMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        Delete selection
                      </button>
                      <button className="toolbar-dropdown-item" onClick={() => { onDeleteUnselected?.(); setDeleteMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" /></svg>
                        Delete unselected (inverse)
                      </button>
                      <button className="toolbar-dropdown-item" onClick={() => { onDeleteAll?.(); setDeleteMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        Delete all
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : tool.id === 'zoom' ? (
              <div key={tool.id} className="toolbar-select-wrapper">
                <button
                  className={`tool-floating-btn ${activeTool === tool.id ? 'active' : ''}`}
                  onClick={() => onToolChange(tool.id)}
                  onContextMenu={(e) => { e.preventDefault(); setZoomMenuOpen((v) => !v) }}
                  title={`${tool.label} (${tool.shortcut}) · Right-click for zoom tools`}
                >
                  {tool.icon}
                </button>
                {zoomMenuOpen && (
                  <>
                    <div className="toolbar-dropdown-backdrop" onClick={() => setZoomMenuOpen(false)} />
                    <div className="toolbar-dropdown">
                      <button className="toolbar-dropdown-item" onClick={() => { onSelectZoomIn?.(); setZoomMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><path d="M11 8v6M8 11h6" /></svg>
                        Select to zoom in
                      </button>
                      <button className="toolbar-dropdown-item" onClick={() => { onZoomToContent?.(); setZoomMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                        Snap window to content
                      </button>
                      <button className="toolbar-dropdown-item" onClick={() => { onZoomToCenter?.(); setZoomMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
                        Zoom to center
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : tool.id === 'rotate' ? (
              <div key={tool.id} className="toolbar-select-wrapper">
                <button
                  className={`tool-floating-btn ${activeTool === tool.id ? 'active' : ''}`}
                  onClick={() => onToolChange(tool.id)}
                  onContextMenu={(e) => { e.preventDefault(); setRotateMenuOpen((v) => !v) }}
                  title={`${tool.label} (${tool.shortcut}) · Right-click for rotation options`}
                >
                  {tool.icon}
                </button>
                {rotateMenuOpen && (
                  <>
                    <div className="toolbar-dropdown-backdrop" onClick={() => setRotateMenuOpen(false)} />
                    <div className="toolbar-dropdown" style={{ minWidth: 200 }}>
                      <button className="toolbar-dropdown-item" onClick={() => { onRotateSelected?.(90); setRotateMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                        Rotate 90° CW
                      </button>
                      <button className="toolbar-dropdown-item" onClick={() => { onRotateSelected?.(-90); setRotateMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
                        Rotate 90° CCW
                      </button>
                      <button className="toolbar-dropdown-item" onClick={() => { onRotateSelected?.(180); setRotateMenuOpen(false) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>
                        Rotate 180°
                      </button>
                      <div className="toolbar-dropdown-sep" />
                      <div className="toolbar-dropdown-rotate-row">
                        <input
                          type="number"
                          className="toolbar-dropdown-rotate-input"
                          placeholder="0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const v = parseFloat(e.target.value)
                              if (!isNaN(v)) { onRotateSelected?.(v); setRotateMenuOpen(false) }
                            }
                          }}
                          autoFocus
                        />
                        <span className="toolbar-dropdown-rotate-deg">°</span>
                        <button className="toolbar-dropdown-rotate-apply" onClick={(e) => {
                          const input = e.currentTarget.parentElement.querySelector('input')
                          const v = parseFloat(input?.value)
                          if (!isNaN(v)) { onRotateSelected?.(v); setRotateMenuOpen(false) }
                        }}>Apply</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : tool.id === 'brush-select' ? (
              <div key={tool.id} className="toolbar-select-wrapper">
                <button
                  className={`tool-floating-btn ${activeTool === tool.id ? 'active' : ''}`}
                  onClick={() => onToolChange(tool.id)}
                  onContextMenu={(e) => { e.preventDefault(); setBrushMenuOpen((v) => !v) }}
                  title={`${tool.label} (${tool.shortcut}) · Right-click for brush size`}
                >
                  {tool.icon}
                </button>
                {brushMenuOpen && (
                  <>
                    <div className="toolbar-dropdown-backdrop" onClick={() => setBrushMenuOpen(false)} />
                    <div className="toolbar-dropdown" style={{ minWidth: 160 }}>
                      <div className="toolbar-dropdown-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontSize: 11, opacity: 0.7 }}>Brush size</span>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{brushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={brushSize}
                          onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
                          style={{ width: '100%', margin: 0, accentColor: 'var(--accent)' }}
                        />
                      </div>
                      <div className="toolbar-dropdown-sep" />
                      <div style={{ display: 'flex', gap: 4, padding: '4px 8px', justifyContent: 'center' }}>
                        {BRUSH_PRESETS.map((size) => (
                          <button
                            key={size}
                            className={`tool-floating-btn ${brushSize === size ? 'active' : ''}`}
                            onClick={() => { onBrushSizeChange?.(size); setBrushMenuOpen(false) }}
                            title={`${size}px`}
                            style={{ width: 28, height: 28, fontSize: 10 }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                key={tool.id}
                className={`tool-floating-btn ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => onToolChange(tool.id)}
                title={`${tool.label} (${tool.shortcut})`}
              >
                {tool.icon}
              </button>
            )
          ))}

          <div className="toolbar-select-wrapper" style={{ position: 'relative' }}>
            <button
              className={`tool-floating-btn${pathTagFilter !== 'any' ? ' active' : ''}`}
              onClick={() => setTagMenuOpen((v) => !v)}
              title={`Tag filter: ${pathTagFilter === 'any' ? 'any element' : `<${pathTagFilter}>`}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              {pathTagFilter !== 'any' && <span className="toolbar-tag-badge">&lt;{pathTagFilter}&gt;</span>}
            </button>
            {tagMenuOpen && (
              <>
                <div className="toolbar-dropdown-backdrop" onClick={() => setTagMenuOpen(false)} />
                <div className="toolbar-dropdown toolbar-tag-dropdown">
                  <div className="toolbar-tag-input-row">
                    <span className="toolbar-tag-input-prefix">&lt;</span>
                    <input
                      className="toolbar-tag-input"
                      type="text"
                      value={pathTagFilter === 'any' ? '' : pathTagFilter}
                      onChange={(e) => {
                        const val = e.target.value.trim()
                        onPathTagFilterChange?.(val || 'any')
                      }}
                      placeholder="any"
                      autoFocus
                    />
                    <span className="toolbar-tag-input-suffix">&gt;</span>
                  </div>
                  <div className="toolbar-tag-presets">
                    {COMMON_SVG_TAGS.map((tag) => (
                      <button
                        key={tag}
                        className={`toolbar-tag-chip${pathTagFilter === tag ? ' selected' : ''}`}
                        onClick={() => { onPathTagFilterChange?.(tag); setTagMenuOpen(false) }}
                      >
                        &lt;{tag}&gt;
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="toolbar-floating-sep" />


          <div className="toolbar-floating-sep" />

          <div className="toolbar-select-wrapper">
            <button
              className="tool-floating-btn"
              onClick={() => setCleanMenuOpen((v) => !v)}
              title="Clean / Remove empty groups"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
              </svg>
            </button>
            {cleanMenuOpen && (
              <>
                <div className="toolbar-dropdown-backdrop" onClick={() => setCleanMenuOpen(false)} />
                <div className="toolbar-dropdown" style={{ minWidth: 200 }}>
                  <div className="toolbar-dropdown-label">Clean (no confirmation)</div>
                  <button className="toolbar-dropdown-item" onClick={() => { onCleanEmptyGroups?.('g, div, section'); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" /></svg>
                    Empty groups
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCleanEmptyGroups?.('g'); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /></svg>
                    Empty &lt;g&gt;
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCleanEmptyGroups?.('a'); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2c1.86 0 3.6.51 5.1 1.4" /></svg>
                    Empty &lt;a&gt;
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCleanEmptyGroups?.('defs'); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Empty &lt;defs&gt;
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCleanEmptyAll?.(); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" /><line x1="22" y1="22" x2="18" y2="18" /></svg>
                    All empty elements
                  </button>
                  <div className="toolbar-dropdown-sep" />
                  <div className="toolbar-dropdown-label">Remove (with confirmation)</div>
                  <button className="toolbar-dropdown-item" onClick={() => { onEmptyGroupRemoval?.('g, div, section'); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    Empty groups
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onEmptyGroupRemoval?.('*'); setCleanMenuOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    All empty elements
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            className="tool-floating-btn"
            onClick={onSave}
            title="Export SVG file"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button
            className="tool-floating-btn"
            onClick={onToggleFormat}
            title={codePrettified ? 'Minify (Compress SVG)' : 'Prettify (Format SVG)'}
          >
            {codePrettified ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                <line x1="9" y1="10" x2="15" y2="10" />
              </svg>
            )}
          </button>


        </div>
      </div>

      {(selectedCount > 0 || clipboardSize > 0) && (
        <div className="toolbar-status-bar">
          {selectedCount > 0 && (
            <span className="selection-count">
              <button
                className="clear-selections-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearSelections()
                }}
                title="Clear all selections"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              {selectedCount} selected
            </span>
          )}
          {clipboardSize > 0 && (
            <span className="clipboard-indicator">{clipboardSize} in clipboard</span>
          )}
        </div>
      )}

    </>
  )
}
