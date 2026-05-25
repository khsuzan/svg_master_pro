export default function ContextMenu({
  visible,
  x,
  y,
  hasSelection,
  onClose,
  onDelete,
  onGroup,
  onCopy,
  onCut,
  onPaste,
  onExtract,
  onCanvasSize,
  clipboardSize,
}) {
  if (!visible) return null

  const menuWidth = 200
  const menuHeight = 320
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 16)
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 16)
  const style = { left: Math.max(8, clampedX), top: Math.max(8, clampedY) }

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div className="context-menu" style={style}>
        {hasSelection ? (
          <>
            <button className="context-menu-item" onClick={() => { onDelete(); onClose() }} disabled={!hasSelection}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              <span>Delete</span>
              <span className="context-menu-shortcut">Del</span>
            </button>
            <button className="context-menu-item" onClick={() => { onExtract(); onClose() }} disabled={!hasSelection}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span>Extract</span>
              <span className="context-menu-shortcut">Ctrl+E</span>
            </button>
            <div className="context-menu-separator" />
            <button className="context-menu-item" onClick={() => { onCopy(); onClose() }} disabled={!hasSelection}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              <span>Copy</span>
              <span className="context-menu-shortcut">Ctrl+C</span>
            </button>
            <button className="context-menu-item" onClick={() => { onCut(); onClose() }} disabled={!hasSelection}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="8.12" y1="8.12" x2="15.88" y2="15.88" /><line x1="15.88" y1="8.12" x2="8.12" y2="15.88" /></svg>
              <span>Cut</span>
              <span className="context-menu-shortcut">Ctrl+X</span>
            </button>
            <button className="context-menu-item" onClick={() => { onPaste(); onClose() }} disabled={clipboardSize === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
              <span>Paste</span>
              <span className="context-menu-shortcut">Ctrl+V</span>
            </button>
            <div className="context-menu-separator" />
            <button className="context-menu-item" onClick={() => { onGroup(); onClose() }} disabled={!hasSelection}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              <span>Group</span>
              <span className="context-menu-shortcut">Ctrl+G</span>
            </button>
            <div className="context-menu-separator" />
          </>
        ) : null}

        <button className="context-menu-item" onClick={() => { onCanvasSize(); onClose() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span>Canvas Size...</span>
        </button>
      </div>
    </>
  )
}
