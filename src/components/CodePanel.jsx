import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle, memo } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new HtmlWorker()
    }
    return new EditorWorker()
  },
}

loader.config({ monaco })

function getTagNameAtPos(code, pos) {
  let start = pos
  while (start > 0 && code[start] !== '<') start--
  if (code[start] !== '<') return null
  let end = start + 1
  while (end < code.length && code[end] !== '>') end++
  if (end >= code.length) return null
  const tagContent = code.substring(start + 1, end)
  const parts = tagContent.split(/\s+/)
  let tagName = parts[0]
  if (!tagName || tagName.startsWith('/') || tagName.startsWith('!')) return null
  return tagName.replace(/\/+$/, '')
}

function findTagRange(code, pos) {
  let i = pos
  while (i >= 0) {
    if (code[i] === '<') {
      const next = code[i + 1]
      if (next === '/' || next === '!' || !next) { i--; continue }
      break
    }
    i--
  }
  if (i < 0) return null
  const openStart = i
  let j = openStart + 1
  while (j < code.length && !/[>\s]/.test(code[j])) j++
  const tagName = code.slice(openStart + 1, j)
  if (!tagName) return null
  let k = j
  let inQuote = false
  while (k < code.length) {
    if (code[k] === '"') inQuote = !inQuote
    if (!inQuote && code[k] === '>') break
    k++
  }
  if (k >= code.length) return null
  const openEnd = k + 1
  const openTag = code.slice(openStart, openEnd)
  if (/\/\s*>$/.test(openTag.trim())) {
    return { tagName, from: openStart, to: openEnd }
  }
  const closeTag = `</${tagName}`
  const selfTag = `<${tagName}`
  let depth = 1
  let searchPos = openEnd
  while (depth > 0 && searchPos < code.length) {
    const nextOpen = code.indexOf(selfTag, searchPos)
    const nextClose = code.indexOf(closeTag, searchPos)
    if (nextClose === -1) return null
    if (nextOpen !== -1 && nextOpen < nextClose) {
      let tmp = nextOpen + selfTag.length
      let sq = false
      while (tmp < code.length) {
        if (code[tmp] === '"') sq = !sq
        if (!sq && code[tmp] === '>') break
        tmp++
      }
      if (/\/\s*>$/.test(code.slice(nextOpen, tmp + 1).trim())) {
        searchPos = tmp + 1
        continue
      }
      depth++
      searchPos = nextOpen + selfTag.length
    } else {
      depth--
      searchPos = nextClose + closeTag.length
      if (depth === 0) return { tagName, from: openStart, to: searchPos }
    }
  }
  return null
}

function findParentTagRange(code, tagRange) {
  if (tagRange.from <= 0) return null
  return findTagRange(code, tagRange.from - 1)
}

function CodeViewMenu({ x, y, onCopy, onCut, onPaste, onClose, tagAtCursor, onExpandTag, onExpandParent, onSelectContents }) {
  const [showSelect, setShowSelect] = useState(false)
  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div className="context-menu" style={{ left: x, top: y, minWidth: 140 }}>
        <div className="context-menu-item-label">Selection</div>
        <div
          className={`context-menu-item context-menu-submenu ${showSelect ? 'open' : ''}`}
          onMouseEnter={() => setShowSelect(true)}
          onMouseLeave={() => setShowSelect(false)}
        >
          <span>Expand</span>
          <svg className="context-menu-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
          {showSelect && (
            <div className="context-menu-submenu-content">
              <button className="context-menu-item" onClick={() => { onExpandTag(); onClose() }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Expand Tag</span>
                {tagAtCursor && <span style={{marginLeft:4, fontFamily: 'var(--font-mono)'}}>&lt;{tagAtCursor}&gt;</span>}
              </button>
              <button className="context-menu-item" onClick={() => { onExpandParent(); onClose() }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                <span>Expand Parent</span>
              </button>
              <button className="context-menu-item" onClick={() => { onSelectContents(); onClose() }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                <span>Select Contents</span>
              </button>
            </div>
          )}
        </div>
        <div className="context-menu-separator" />
        <div className="context-menu-item-label">Clipboard</div>
        <button className="context-menu-item" onClick={() => { onCopy(); onClose() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <span>Copy</span>
          <span className="context-menu-shortcut">Ctrl+C</span>
        </button>
        <button className="context-menu-item" onClick={() => { onCut(); onClose() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="8.12" y1="8.12" x2="15.88" y2="15.88" /><line x1="15.88" y1="15.88" x2="8.12" y2="8.12" />
          </svg>
          <span>Cut</span>
          <span className="context-menu-shortcut">Ctrl+X</span>
        </button>
        <button className="context-menu-item" onClick={() => { onPaste(); onClose() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          <span>Paste</span>
          <span className="context-menu-shortcut">Ctrl+V</span>
        </button>
      </div>
    </>
  )
}



const CodePanel = forwardRef(function CodePanel({ value, onChange, onCodeSelectElement, hint }, ref) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const [codeMenu, setCodeMenu] = useState(null)

  const onChangeRef = useRef(onChange)
  const suppressListenerRef = useRef(false)
  const contextClickOffsetRef = useRef(-1)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const handleEditorDidMount = useCallback((editor, mon) => {
    editorRef.current = editor
    monacoRef.current = mon

    mon.editor.defineTheme('svg-master-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'tag', foreground: 'c792ea' },
        { token: 'attribute.name', foreground: 'ffcb6b' },
        { token: 'attribute.value', foreground: 'c3e88d' },
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'string', foreground: 'c3e88d' },
        { token: 'keyword', foreground: 'c792ea' },
        { token: 'number', foreground: 'f78c6c' },
        { token: 'delimiter', foreground: '89ddff' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': 'rgba(255,255,255,0.03)',
        'editor.selectionBackground': 'rgba(137,180,250,0.25)',
        'editorCursor.foreground': '#89b4fa',
        'editorLineNumber.foreground': '#585b70',
        'editorLineNumber.activeForeground': '#cdd6f4',
        'editor.selectionHighlightBackground': 'rgba(137,180,250,0.1)',
        'editorBracketMatch.background': 'transparent',
        'editorBracketMatch.border': 'rgba(137,180,250,0.3)',
        'editorIndentGuide.background': 'rgba(255,255,255,0.05)',
        'editorIndentGuide.activeBackground': 'rgba(255,255,255,0.1)',
        'editorGutter.background': '#181825',
        'editorWidget.background': '#1e1e2e',
        'editorWidget.border': '#313244',
      },
    })
    mon.editor.setTheme('svg-master-dark')
  }, [])

  const handleEditorChange = useCallback((newValue) => {
    if (!suppressListenerRef.current && newValue !== undefined) {
      onChangeRef.current?.(newValue)
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const currentText = editor.getValue()
    if (value !== currentText) {
      suppressListenerRef.current = true
      editor.setValue(value)
      suppressListenerRef.current = false
    }
  })

  useImperativeHandle(ref, () => ({
    selectCodeInEditor(htmlString) {
      const editor = editorRef.current
      if (!editor || !htmlString) return
      const model = editor.getModel()
      if (!model) return
      const code = model.getValue()
      const idx = code.indexOf(htmlString.trim())
      if (idx !== -1) {
        const startPos = model.getPositionAt(idx)
        const endPos = model.getPositionAt(idx + htmlString.trim().length)
        editor.focus()
        editor.setSelection(new monaco.Selection(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column))
        editor.revealRangeInCenter(new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column))
      }
    },
    selectRange(htmlStrings) {
      const editor = editorRef.current
      if (!editor || !htmlStrings || htmlStrings.length === 0) return
      const model = editor.getModel()
      if (!model) return
      const code = model.getValue()
      let firstIdx = -1
      let lastEnd = -1
      for (const html of htmlStrings) {
        const idx = code.indexOf(html.trim())
        if (idx === -1) continue
        if (firstIdx === -1 || idx < firstIdx) firstIdx = idx
        const end = idx + html.trim().length
        if (end > lastEnd) lastEnd = end
      }
      if (firstIdx !== -1 && lastEnd !== -1) {
        const startPos = model.getPositionAt(firstIdx)
        const endPos = model.getPositionAt(lastEnd)
        editor.focus()
        editor.setSelection(new monaco.Selection(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column))
        editor.revealRangeInCenter(new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column))
      }
    },
    focus() {
      editorRef.current?.focus()
    },
    getCursorInfo() {
      const editor = editorRef.current
      if (!editor) return null
      const model = editor.getModel()
      if (!model) return null
      const code = model.getValue()
      const position = editor.getPosition()
      if (!position) return { code, pos: 0, tag: null }
      const offset = model.getOffsetAt(position)
      const tag = getTagNameAtPos(code, offset)
      return { code, pos: offset, tag }
    },
  }))

  const handleCodeContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    let cursorOffset = 0
    try {
      const target = editor.getTargetAtClientPoint(e.clientX, e.clientY)
      if (target && target.position) {
        cursorOffset = model.getOffsetAt(target.position)
      } else {
        const pos = editor.getPosition()
        cursorOffset = pos ? model.getOffsetAt(pos) : 0
      }
    } catch {
      const pos = editor.getPosition()
      cursorOffset = pos ? model.getOffsetAt(pos) : 0
    }
    contextClickOffsetRef.current = cursorOffset
    const code = model.getValue()
    const tagAtCursor = getTagNameAtPos(code, cursorOffset)
    const mx = Math.min(e.clientX, window.innerWidth - 160)
    const my = Math.min(e.clientY, window.innerHeight - 100)
    setCodeMenu({ x: Math.max(8, mx), y: Math.max(8, my), tagAtCursor })
  }, [])

  const expandSelection = useCallback((expandFn) => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const code = model.getValue()
    const pos = contextClickOffsetRef.current > -1
      ? contextClickOffsetRef.current
      : model.getOffsetAt(editor.getPosition() || { lineNumber: 1, column: 1 })
    contextClickOffsetRef.current = -1
    const range = expandFn(code, pos)
    if (range) {
      const startPos = model.getPositionAt(range.from)
      const endPos = model.getPositionAt(range.to)
      editor.setSelection(new monaco.Selection(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column))
      editor.revealRangeInCenter(new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column))
    }
  }, [])

  const handleExpandTag = useCallback(() => {
    expandSelection((code, pos) => findTagRange(code, pos))
  }, [expandSelection])

  const handleExpandParent = useCallback(() => {
    expandSelection((code, pos) => {
      const tag = findTagRange(code, pos)
      if (!tag) return null
      return findParentTagRange(code, tag)
    })
  }, [expandSelection])

  const handleSelectContents = useCallback(() => {
    expandSelection((code, pos) => {
      const tag = findTagRange(code, pos)
      if (!tag) return null
      const openTagEnd = code.indexOf('>', tag.from) + 1
      if (openTagEnd >= tag.to) return null
      return { from: openTagEnd, to: tag.to - (tag.tagName.length + 3) }
    })
  }, [expandSelection])

  const handleCodeCopy = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    const text = editor.getModel()?.getValueInRange(selection)
    if (text) navigator.clipboard.writeText(text).catch(() => {})
  }, [])

  const handleCodeCut = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    const text = editor.getModel()?.getValueInRange(selection)
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {})
      editor.executeEdits('cut', [{ range: selection, text: '' }])
    }
  }, [])

  const handleCodePaste = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    try {
      const text = await navigator.clipboard.readText()
      const selection = editor.getSelection()
      if (selection) {
        editor.executeEdits('paste', [{ range: selection, text }])
      }
    } catch {}
  }, [])

  return (
    <div className="code-panel">
      <div className="code-header">
        <span className="code-header-hint">{hint || 'Ctrl+F to search · Tab to indent'}</span>
      </div>
      <div className="code-editor-container" onContextMenu={handleCodeContextMenu}>
        <div className="code-mirror-container">
          <Editor
            height="100%"
            defaultLanguage="html"
            defaultValue={value}
            theme="svg-master-dark"
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineNumbers: 'on',
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              tabSize: 2,
              renderWhitespace: 'selection',
              folding: true,
              contextmenu: false,
              suggestOnTriggerCharacters: false,
              quickSuggestions: false,
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>
      {codeMenu && (
        <CodeViewMenu
          x={codeMenu.x}
          y={codeMenu.y}
          onCopy={handleCodeCopy}
          onCut={handleCodeCut}
          onPaste={handleCodePaste}
          onClose={() => setCodeMenu(null)}
          tagAtCursor={codeMenu.tagAtCursor}
          onExpandTag={handleExpandTag}
          onExpandParent={handleExpandParent}
          onSelectContents={handleSelectContents}
        />
      )}
    </div>
  )
})

export default memo(CodePanel)
