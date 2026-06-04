import { useState, useRef, useCallback, useEffect } from 'react'

export default function CssPanel({
  cssContent,
  visualCssEnabled,
  cssPseudoDisabled,
  onCssChange,
  onTogglePseudoEffects,
}) {
  const [draft, setDraft] = useState(cssContent)
  const [menuOpen, setMenuOpen] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setDraft(cssContent)
  }, [cssContent])

  const apply = useCallback((content, enabled) => {
    onCssChange({ cssContent: content, visualCssEnabled: enabled })
  }, [onCssChange])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setDraft(val)
    apply(val, visualCssEnabled)
  }, [visualCssEnabled, apply])

  const handlePaste = useCallback(() => {
    setTimeout(() => {
      const val = textareaRef.current.value
      setDraft(val)
      apply(val, visualCssEnabled)
    }, 0)
  }, [visualCssEnabled, apply])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result
        setDraft(text)
        apply(text, true)
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }, [apply])

  const handleRemove = useCallback(() => {
    setDraft('')
    apply('', false)
  }, [apply])

  const handleToggleEnabled = useCallback(() => {
    apply(draft, !visualCssEnabled)
  }, [draft, visualCssEnabled, apply])

  return (
    <div className="css-panel">
      <div className="css-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="tool-floating-btn css-select-btn"
              onClick={() => setMenuOpen((v) => !v)}
              title="CSS options"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', width: 'auto', fontSize: 12 }}
            >
              <span>CSS Options</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="toolbar-dropdown-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="toolbar-dropdown" style={{ right: 0, top: '100%', marginTop: 4, zIndex: 100, minWidth: 200, left: 'auto', bottom: 'auto', transform: 'none', background: 'var(--bg-secondary)' }}>
                  <label className="toolbar-dropdown-item" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={visualCssEnabled}
                      onChange={handleToggleEnabled}
                      style={{ margin: 0 }}
                    />
                    CSS Active
                  </label>
                  <div className="toolbar-dropdown-sep" />
                  <label className="toolbar-dropdown-item" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={cssPseudoDisabled}
                      onChange={onTogglePseudoEffects}
                      style={{ margin: 0 }}
                    />
                    Disable hover effects
                  </label>
                </div>
              </>
            )}
          </div>
          <button className="modal-btn modal-btn-secondary" onClick={handleImport} style={{ fontSize: 12, padding: '4px 10px' }}>
            Import CSS
          </button>
          {draft && (
            <button className="modal-btn modal-btn-danger-outline" onClick={handleRemove} style={{ fontSize: 12, padding: '4px 10px' }}>
              Remove
            </button>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className="css-modal-textarea"
        value={draft}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={`/* Write SVG CSS here */\n* { outline: 1px solid red; }\n*:hover { fill: rgba(0,153,255,0.15) !important; stroke: #09f !important; }`}
        spellCheck={false}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".css"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
