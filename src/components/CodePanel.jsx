import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle, memo } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

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

function CodeViewMenu({ x, y, currentView, onSwitchView, onCopy, onCut, onPaste, onClose, tagAtCursor, onExpandTag, onExpandParent, onSelectContents }) {
  const [showSelect, setShowSelect] = useState(false)
  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div className="context-menu" style={{ left: x, top: y, minWidth: 140 }}>
        <div className="context-menu-item-label">View</div>
        <button
          className={`context-menu-item ${currentView === 'raw' ? 'active' : ''}`}
          onClick={() => { onSwitchView('raw'); onClose() }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Raw Code</span>
        </button>
        <button
          className={`context-menu-item ${currentView === 'tree' ? 'active' : ''}`}
          onClick={() => { onSwitchView('tree'); onClose() }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3h14" /><path d="M9 3v18" /><path d="M14 3v7" /><path d="M14 10h-4" />
          </svg>
          <span>Tree View</span>
        </button>
        <div className="context-menu-separator" />
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
                {tagAtCursor && <span className="tree-tag" style={{marginLeft:4}}>&lt;{tagAtCursor}&gt;</span>}
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
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="8.12" y1="8.12" x2="15.88" y2="15.88" /><line x1="15.88" y1="8.12" x2="8.12" y2="15.88" />
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

function parseHtmlToTree(html) {
  const container = document.createElement('div')
  container.innerHTML = html.trim()
  function walk(node, depth = 0) {
    const nodes = []
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase()
      const attrs = {}
      for (const attr of child.attributes) {
        if (!attr.name.startsWith('data-marq-')) {
          attrs[attr.name] = attr.value
        }
      }
      const children = walk(child, depth + 1)
      nodes.push({ tag, attrs, children, el: child })
    }
    return nodes
  }
  return walk(container)
}

const SVG_KEY_ATTRS = {
  rect: ['x', 'y', 'width', 'height', 'rx', 'fill', 'stroke'],
  circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
  ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke'],
  line: ['x1', 'y1', 'x2', 'y2', 'stroke'],
  path: ['d', 'fill', 'stroke'],
  text: ['x', 'y', 'font-size', 'fill'],
  g: ['id', 'class', 'transform', 'fill'],
  svg: ['viewBox', 'width', 'height'],
  polygon: ['points', 'fill', 'stroke'],
  polyline: ['points', 'fill', 'stroke'],
  image: ['href', 'x', 'y', 'width', 'height'],
  use: ['href', 'x', 'y'],
  linearGradient: ['id', 'x1', 'y1', 'x2', 'y2'],
  radialGradient: ['id', 'cx', 'cy', 'r'],
  clipPath: ['id'],
  mask: ['id'],
  filter: ['id'],
  defs: [],
}

function getKeyAttrs(tag, attrs) {
  const keys = SVG_KEY_ATTRS[tag] || Object.keys(attrs).slice(0, 3)
  return keys.filter(k => k in attrs).map(k => [k, attrs[k]])
}

function filterTree(nodes, searchText) {
  if (!searchText) return nodes
  const result = []
  for (const node of nodes) {
    const tagStr = node.tag + Object.entries(node.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')
    const selfMatch = tagStr.toLowerCase().includes(searchText.toLowerCase())
    const filteredChildren = node.children.length > 0 ? filterTree(node.children, searchText) : []
    if (selfMatch || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren })
    }
  }
  return result
}

function TreeNode({ node, depth, searchText, onSelect, selectedPath }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const tagStr = node.tag + Object.entries(node.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')
  const isSelected = selectedPath && node.el === selectedPath
  const keyAttrs = getKeyAttrs(node.tag, node.attrs)

  return (
    <div>
      <div
        className={`tree-node ${isSelected ? 'tree-selected' : ''}`}
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={() => onSelect(node.el, tagStr)}
      >
        {hasChildren ? (
          <span className="tree-toggle" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}>
            {expanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="tree-toggle tree-toggle-placeholder" />
        )}
        <span className={`tree-tag tree-tag-${node.tag}`}>{node.tag}</span>
        {keyAttrs.length > 0 && (
          <span className="tree-attrs-preview">
            {keyAttrs.map(([k, v]) => (
              <span key={k} className="tree-attr">
                {' '}<span className="tree-attr-name">{k}</span>=<span className="tree-attr-val">"{v}"</span>
              </span>
            ))}
          </span>
        )}
        {hasChildren && (
          <span className="tree-child-count">{node.children.length}</span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} searchText={searchText} onSelect={onSelect} selectedPath={selectedPath} />
          ))}
        </div>
      )}
    </div>
  )
}

const CodePanel = forwardRef(function CodePanel({ value, onChange, searchText, selectedElement, onCodeSelectElement, hint }, ref) {
  const editorContainerRef = useRef(null)
  const editorViewRef = useRef(null)
  const [view, setView] = useState('raw')
  const [tree, setTree] = useState(() => parseHtmlToTree(value))
  const [selectedPath, setSelectedPath] = useState(null)
  const [codeMenu, setCodeMenu] = useState(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeSearch, setTreeSearch] = useState('')

  const valueRef = useRef(value)
  const isUserTypingRef = useRef(false)
  const syncTimerRef = useRef(null)
  const suppressListenerRef = useRef(false)
  const scheduleSyncRef = useRef(null)
  const contextClickPosRef = useRef(-1)

  useEffect(() => {
    scheduleSyncRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!editorContainerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          html(),
          oneDark,
          EditorView.theme({
            '&': { height: '100%', fontSize: '12px', backgroundColor: 'var(--bg-primary)' },
            '.cm-editor': { backgroundColor: 'var(--bg-primary)' },
            '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: '1.6', backgroundColor: 'var(--bg-primary)' },
            '.cm-gutters': { backgroundColor: 'var(--bg-tertiary)', borderRight: '1px solid var(--border-color)' },
            '.cm-activeLineGutter': { backgroundColor: 'transparent' },
            '&.cm-focused': { outline: 'none' },
            '.cm-content': { padding: '12px 16px', caretColor: 'var(--accent)' },
            '.cm-cursor': { borderLeftColor: 'var(--accent)' },
            '.cm-selectionBackground': { backgroundColor: 'var(--accent-bg) !important' },
            '&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--accent-bg) !important' },
            '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !suppressListenerRef.current) {
              scheduleSyncRef.current?.(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: editorContainerRef.current,
    })
    editorViewRef.current = view
    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return
    const currentText = view.state.doc.toString()
    if (value !== currentText) {
      suppressListenerRef.current = true
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: value },
      })
      suppressListenerRef.current = false
    }
  })

  useEffect(() => {
    if (view === 'tree') {
      setTreeLoading(true)
      const timer = setTimeout(() => {
        const parsed = parseHtmlToTree(value)
        const filtered = filterTree(parsed, treeSearch)
        setTree(filtered)
        setTreeLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [view, value, treeSearch])

  useEffect(() => {
    setSelectedPath(selectedElement)
  }, [selectedElement])

  useEffect(() => () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
  }, [])

  useEffect(() => {
    if (view === 'raw' && editorViewRef.current) {
      requestAnimationFrame(() => editorViewRef.current?.requestMeasure())
    }
  }, [view])

  useImperativeHandle(ref, () => ({
    selectCodeInEditor(htmlString) {
      const view = editorViewRef.current
      if (!view || !htmlString) return
      const code = view.state.doc.toString()
      const idx = code.indexOf(htmlString.trim())
      if (idx !== -1) {
        view.focus()
        view.dispatch({
          selection: { anchor: idx, head: idx + htmlString.trim().length },
          scrollIntoView: true,
        })
      }
    },
    selectRange(htmlStrings) {
      const view = editorViewRef.current
      if (!view || !htmlStrings || htmlStrings.length === 0) return
      const code = view.state.doc.toString()
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
        view.focus()
        view.dispatch({
          selection: { anchor: firstIdx, head: lastEnd },
          scrollIntoView: true,
        })
      }
    },
    focus() {
      editorViewRef.current?.focus()
    },
    getCursorInfo() {
      const view = editorViewRef.current
      if (!view) return null
      const code = view.state.doc.toString()
      const pos = view.state.selection.main.from
      const tag = getTagNameAtPos(code, pos)
      return { code, pos, tag }
    },
  }))

  const handleCodeContextMenu = useCallback((e) => {
    e.preventDefault()
    const view = editorViewRef.current
    let tagAtCursor = null
    if (view) {
      const coords = view.posAtCoords({ x: e.clientX, y: e.clientY })
      const clickPos = coords !== null ? coords : view.state.selection.main.from
      contextClickPosRef.current = clickPos
      const start = Math.max(0, clickPos - 100)
      const snippet = view.state.sliceDoc(start, 200)
      tagAtCursor = getTagNameAtPos(snippet, clickPos - start)
    }
    const mx = Math.min(e.clientX, window.innerWidth - 160)
    const my = Math.min(e.clientY, window.innerHeight - 100)
    setCodeMenu({ x: Math.max(8, mx), y: Math.max(8, my), tagAtCursor })
  }, [])

  const expandSelection = useCallback((expandFn) => {
    const view = editorViewRef.current
    if (!view) return
    const code = view.state.doc.toString()
    const pos = contextClickPosRef.current > -1 ? contextClickPosRef.current : view.state.selection.main.from
    contextClickPosRef.current = -1
    const range = expandFn(code, pos)
    if (range) {
      view.dispatch({
        selection: { anchor: range.from, head: range.to },
        scrollIntoView: true,
      })
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

  const handleSwitchView = useCallback((v) => {
    setView(v)
  }, [])

  const handleCodeCopy = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    if (from === to) return
    const text = view.state.sliceDoc(from, to)
    navigator.clipboard.writeText(text).catch(() => {})
  }, [])

  const handleCodeCut = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    if (from === to) return
    const text = view.state.sliceDoc(from, to)
    navigator.clipboard.writeText(text).catch(() => {})
    view.dispatch({ changes: { from, to } })
  }, [])

  const handleCodePaste = useCallback(async () => {
    const view = editorViewRef.current
    if (!view) return
    try {
      const text = await navigator.clipboard.readText()
      const { from, to } = view.state.selection.main
      view.dispatch({ changes: { from, to, insert: text } })
    } catch {}
  }, [])

  const handleTreeSelect = useCallback((el, tagStr) => {
    setSelectedPath(el)
    const htmlStr = el.outerHTML || `<${tagStr}></${el.tagName.toLowerCase()}>`
    const view = editorViewRef.current
    if (view) {
      const code = view.state.doc.toString()
      const idx = code.indexOf(htmlStr.trim())
      if (idx !== -1) {
        view.dispatch({
          selection: { anchor: idx, head: idx + htmlStr.trim().length },
          scrollIntoView: true,
        })
      }
    }
    onCodeSelectElement?.(htmlStr)
  }, [onCodeSelectElement])

  const viewHint = view === 'raw'
    ? 'Ctrl+F to search · Tab to indent'
    : 'Click nodes to navigate · ▸ to expand'

  return (
    <div className="code-panel">
      <div className="code-header">
        <div className="code-header-left">
          <span className="code-header-title">Code</span>
        </div>
        <span className="code-header-hint">{hint || viewHint}</span>
      </div>
      <div className="code-editor-container" style={{ display: view === 'raw' ? 'flex' : 'none' }} onContextMenu={handleCodeContextMenu}>
        <div ref={editorContainerRef} className="code-mirror-container" />
      </div>
      {view === 'tree' && (
        <div className="code-tree-container" onContextMenu={handleCodeContextMenu}>
          <div className="tree-search-bar">
            <svg className="tree-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="tree-search-input"
              type="text"
              placeholder="Filter elements..."
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              spellCheck={false}
            />
            {!treeLoading && <span className="tree-count">{tree.length} element{tree.length !== 1 ? 's' : ''}</span>}
          </div>
          {treeLoading ? (
            <div className="tree-loading">Parsing tree...</div>
          ) : tree.length === 0 ? (
            <div className="tree-empty">{treeSearch ? 'No matching elements' : 'No elements to display'}</div>
          ) : (
            <div className="tree-scroll">
              {tree.map((node, i) => (
                <TreeNode key={i} node={node} depth={0} searchText={treeSearch} onSelect={handleTreeSelect} selectedPath={selectedPath} />
              ))}
            </div>
          )}
        </div>
      )}
      {codeMenu && (
        <CodeViewMenu
          x={codeMenu.x}
          y={codeMenu.y}
          currentView={view}
          onSwitchView={handleSwitchView}
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
