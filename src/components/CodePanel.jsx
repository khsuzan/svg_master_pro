import { useRef, useEffect, useCallback } from 'react'

export default function CodePanel({ value, onChange, readOnly }) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)

  const updateLineNumbers = useCallback(() => {
    if (!textareaRef.current || !lineNumbersRef.current) return
    const lines = textareaRef.current.value.split('\n')
    const count = lines.length
    lineNumbersRef.current.innerHTML = Array.from(
      { length: count },
      (_, i) => `<span>${i + 1}</span>`
    ).join('')
  }, [])

  useEffect(() => {
    updateLineNumbers()
  }, [value, updateLineNumbers])

  const handleScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newVal)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }, [value, onChange])

  const handlePaste = useCallback((e) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted && pasted.includes('<')) {
      setTimeout(() => updateLineNumbers(), 0)
    }
  }, [updateLineNumbers])

  return (
    <div className="code-panel">
      <div className="code-header">
        <span className="code-header-title">HTML / SVG Editor</span>
        <span className="code-header-hint">Paste your markup here</span>
      </div>
      <div className="code-editor-container">
        <div ref={lineNumbersRef} className="line-numbers" />
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          spellCheck={false}
          readOnly={readOnly}
          placeholder={`<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">\n  <rect x="10" y="10" width="100" height="50" fill="blue" />\n  <circle cx="200" cy="100" r="40" fill="red" />\n  <g id="group-1">\n    <path d="M50,200 L150,250 L100,300 Z" fill="green" />\n  </g>\n</svg>`}
        />
      </div>
    </div>
  )
}
