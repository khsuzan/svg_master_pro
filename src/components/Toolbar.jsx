import { useState } from 'react'

export default function Toolbar({
  activeTool,
  onToolChange,
  selectedCount,
  onDelete,
  onExtract,
  onCopy,
  onCut,
  onPaste,
  onGroup,
  onCleanEmptyGroups,
  onToggleFormat,
  codePrettified,
  canDelete,
  canExtract,
  canCopy,
  canPaste,
  clipboardSize,
}) {
  const [selectOpen, setSelectOpen] = useState(false)
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
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
        </svg>
      ),
    },
  ]

  return (
    <>
      <div className="toolbar-floating">
        <div className="toolbar-floating-group">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`tool-floating-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => onToolChange(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
            >
              {tool.icon}
            </button>
          ))}

          <div className="toolbar-floating-sep" />

          <div className="toolbar-select-wrapper">
            <button
              className="tool-floating-btn"
              onClick={() => setSelectOpen(!selectOpen)}
              title="Select element at cursor"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
            {selectOpen && (
              <>
                <div className="toolbar-dropdown-backdrop" onClick={() => setSelectOpen(false)} />
                <div className="toolbar-dropdown">
                  <button className="toolbar-dropdown-item" onClick={() => { onCodeSelectAction?.('select'); setSelectOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    This Tag
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCodeSelectAction?.('parent'); setSelectOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                    Parent Group
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCodeSelectAction?.('children'); setSelectOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    Children
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCodeSelectAction?.('siblings'); setSelectOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    Siblings
                  </button>
                  <button className="toolbar-dropdown-item" onClick={() => { onCodeSelectAction?.('tag'); setSelectOpen(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    All Same Type
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="toolbar-floating-sep" />

          <button
            className="tool-floating-btn"
            onClick={onCopy}
            disabled={!canCopy}
            title="Copy (Ctrl+C)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <button
            className="tool-floating-btn"
            onClick={onCut}
            disabled={!canCopy}
            title="Cut (Ctrl+X)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="8.12" y1="8.12" x2="15.88" y2="15.88" />
              <line x1="15.88" y1="8.12" x2="8.12" y2="15.88" />
            </svg>
          </button>
          <button
            className="tool-floating-btn"
            onClick={onPaste}
            disabled={!canPaste}
            title="Paste (Ctrl+V)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </button>

          <div className="toolbar-floating-sep" />

          <button
            className="tool-floating-btn"
            onClick={onDelete}
            disabled={!canDelete}
            title="Delete (Del)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          <button
            className="tool-floating-btn"
            onClick={onExtract}
            disabled={!canExtract}
            title="Extract (Ctrl+E)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            className="tool-floating-btn"
            onClick={onGroup}
            disabled={!canExtract}
            title="Group (Ctrl+G)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>

          <div className="toolbar-floating-sep" />

          <button
            className="tool-floating-btn"
            onClick={onCleanEmptyGroups}
            title="Clean Empty Groups"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 6L8 20" /><path d="M2 6l14 14" />
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
            <span className="selection-count">{selectedCount} selected</span>
          )}
          {clipboardSize > 0 && (
            <span className="clipboard-indicator">{clipboardSize} in clipboard</span>
          )}
        </div>
      )}
    </>
  )
}
