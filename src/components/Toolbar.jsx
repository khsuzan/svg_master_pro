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
  onClearSelections,
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
            <span className="selection-count">
              {selectedCount} selected
              <button
                className="clear-selections-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm('Clear all selections?')) {
                    onClearSelections()
                  }
                }}
                title="Clear all selections"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
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
