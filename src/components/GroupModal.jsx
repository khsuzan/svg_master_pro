import { useState, useRef, useCallback } from 'react'

const COMMON_EVENTS = [
  'onclick', 'onmousedown', 'onmouseup', 'onmousemove',
  'onmouseover', 'onmouseout', 'onmouseenter', 'onmouseleave',
  'ondblclick', 'oncontextmenu',
  'onfocus', 'onblur',
  'onkeydown', 'onkeyup', 'onkeypress',
]

export default function GroupModal({
  visible,
  target,
  onClose,
  onSave,
}) {
  const [tagName, setTagName] = useState('')
  const [attributes, setAttributes] = useState({})
  const [attrKeys, setAttrKeys] = useState([])

  if (visible && target && target.tagName) {
    const tag = target.tagName.toLowerCase()
    if (tag !== tagName) {
      setTagName(tag)
      const attrs = {}
      for (const attr of target.attributes) {
        if (!attr.name.startsWith('data-marq-')) {
          attrs[attr.name] = attr.value
        }
      }
      setAttributes(attrs)
      setAttrKeys(Object.keys(attrs))
    }
  }

  const updateAttr = useCallback((key, value) => {
    setAttributes((prev) => ({ ...prev, [key]: value }))
    if (!attrKeys.includes(key)) {
      setAttrKeys((prev) => [...prev, key])
    }
  }, [attrKeys])

  const removeAttr = useCallback((key) => {
    const next = { ...attributes }
    delete next[key]
    setAttributes(next)
    setAttrKeys((prev) => prev.filter((k) => k !== key))
  }, [attributes])

  const addAttr = useCallback(() => {
    const name = prompt('Attribute name:')
    if (!name || name.startsWith('data-marq-')) return
    setAttrKeys((prev) => [...prev, name])
    setAttributes((prev) => ({ ...prev, [name]: '' }))
  }, [])

  const handleSave = useCallback(() => {
    if (target && onSave) {
      onSave(target, attributes)
    }
    onClose()
  }, [target, attributes, onSave, onClose])

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!visible) return null

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="group-modal">
        <div className="modal-header">
          <h3>Element Properties</h3>
          <span className="modal-tag">{'<'}{tagName}{' />'}</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-header">
              <span className="modal-section-title">Attributes</span>
              <button className="modal-add-btn" onClick={addAttr}>+ Add</button>
            </div>
            <div className="attr-list">
              {attrKeys.length === 0 && (
                <div className="attr-empty">No attributes defined</div>
              )}
              {attrKeys.map((key) => (
                <div key={key} className="attr-row">
                  <input
                    className="attr-name"
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value
                      if (newKey && !newKey.startsWith('data-marq-')) {
                        const val = attributes[key]
                        removeAttr(key)
                        updateAttr(newKey, val)
                      }
                    }}
                    placeholder="name"
                  />
                  <span className="attr-eq">=</span>
                  <input
                    className="attr-value"
                    value={attributes[key] || ''}
                    onChange={(e) => updateAttr(key, e.target.value)}
                    placeholder="value"
                  />
                  <button className="attr-remove" onClick={() => removeAttr(key)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-header">
              <span className="modal-section-title">Quick Add Events</span>
            </div>
            <div className="quick-events">
              {COMMON_EVENTS.map((evt) => (
                <button
                  key={evt}
                  className={`quick-event-btn ${attrKeys.includes(evt) ? 'added' : ''}`}
                  onClick={() => {
                    if (attrKeys.includes(evt)) {
                      removeAttr(evt)
                    } else {
                      updateAttr(evt, '')
                    }
                  }}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-header">
              <span className="modal-section-title">HTML Preview</span>
            </div>
            <div className="attr-preview">
              {'<'}{tagName}
              {attrKeys
                .filter((k) => attributes[k] !== undefined)
                .map((k) => (
                  <span key={k}>
                    {' '}
                    <span className="preview-attr-name">{k}</span>
                    {attributes[k] !== '' && (
                      <span>
                        =<span className="preview-attr-value">"{attributes[k]}"</span>
                      </span>
                    )}
                  </span>
                ))}
              {' />'}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>Apply</button>
        </div>
      </div>
    </div>
  )
}
