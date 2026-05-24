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
  canDelete,
  canExtract,
  canCopy,
  canPaste,
  clipboardSize,
}) {
  const tools = [
    {
      id: 'select',
      label: 'Select',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      ),
    },
    {
      id: 'path-select',
      label: 'Path',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      id: 'delete-tool',
      label: 'Delete',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-label">Tools</span>
        <div className="toolbar-buttons">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => onToolChange(tool.id)}
              title={tool.label}
            >
              {tool.icon}
              <span className="tool-btn-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-label">Actions</span>
        <div className="toolbar-buttons">
          <button
            className="tool-btn"
            onClick={onCopy}
            disabled={!canCopy}
            title="Copy (Ctrl+C)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span className="tool-btn-label">Copy</span>
          </button>
          <button
            className="tool-btn"
            onClick={onCut}
            disabled={!canCopy}
            title="Cut (Ctrl+X)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="8.12" y1="8.12" x2="15.88" y2="15.88" />
              <line x1="15.88" y1="8.12" x2="8.12" y2="15.88" />
            </svg>
            <span className="tool-btn-label">Cut</span>
          </button>
          <button
            className="tool-btn"
            onClick={onPaste}
            disabled={!canPaste}
            title="Paste (Ctrl+V)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span className="tool-btn-label">Paste</span>
          </button>
          <button
            className="tool-btn"
            onClick={onDelete}
            disabled={!canDelete}
            title="Delete (Del)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            <span className="tool-btn-label">Delete</span>
          </button>
          <button
            className="tool-btn"
            onClick={onExtract}
            disabled={!canExtract}
            title="Extract (Ctrl+E)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="tool-btn-label">Extract</span>
          </button>
          <button
            className="tool-btn"
            onClick={onGroup}
            disabled={!canExtract}
            title="Group (Ctrl+G)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span className="tool-btn-label">Group</span>
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={onCleanEmptyGroups}
          title="Remove empty group tags"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 6L8 20" /><path d="M2 6l14 14" />
          </svg>
          <span className="tool-btn-label">Clean Groups</span>
        </button>
      </div>

      <div className="toolbar-spacer" />

      {selectedCount > 0 && (
        <div className="toolbar-status">
          <span className="selection-count">{selectedCount} selected</span>
        </div>
      )}
      {clipboardSize > 0 && (
        <div className="toolbar-status">
          <span className="clipboard-indicator">Clipboard: {clipboardSize}</span>
        </div>
      )}
    </div>
  )
}
