import { useState, useRef, useCallback, useEffect, useLayoutEffect, memo } from 'react'

function computeElementPath(el) {
  const path = []
  let current = el
  while (current.parentElement) {
    const parent = current.parentElement
    let index = 0
    let found = false
    for (const sibling of parent.children) {
      const tag = sibling.tagName?.toLowerCase()
      if (tag === 'defs' || tag === 'style') continue
      if (sibling === current) {
        path.unshift(index)
        found = true
        break
      }
      index++
    }
    if (!found) return null
    current = parent
  }
  return path
}

function findNodeByPath(nodes, path) {
  if (!path || path.length === 0) return null
  for (const node of nodes) {
    if (node.path.length === path.length && node.path.every((v, i) => v === path[i])) return node
    if (node.children.length > 0) {
      const found = findNodeByPath(node.children, path)
      if (found) return found
    }
  }
  return null
}

const TYPE_NAMES = {
  rect: 'Rectangle',
  circle: 'Ellipse',
  ellipse: 'Ellipse',
  path: 'Path',
  text: 'Text',
  line: 'Line',
  polygon: 'Polygon',
  polyline: 'Polyline',
  image: 'Image',
  g: 'Group',
  svg: 'Frame',
  use: 'Use',
  defs: 'Defs',
  clipPath: 'Clip Path',
  mask: 'Mask',
  filter: 'Filter',
  linearGradient: 'Linear Gradient',
  radialGradient: 'Radial Gradient',
}

function getElementName(el, siblingsBefore) {
  const id = el.getAttribute('id')
  if (id) return id

  const tag = el.tagName.toLowerCase()
  const typeName = TYPE_NAMES[tag] || tag.charAt(0).toUpperCase() + tag.slice(1)
  return `${typeName} ${siblingsBefore + 1}`
}

function getTagIcon(tag) {
  const map = {
    rect: '□',
    circle: '○',
    ellipse: '○',
    path: '◈',
    text: 'T',
    line: '╱',
    polygon: '⬠',
    polyline: '⌇',
    image: '▣',
    g: '⊞',
    svg: '◇',
    use: '↗',
  }
  return map[tag] || '•'
}

function parseLayers(containerEl) {
  const svg = containerEl.querySelector('svg')
  if (!svg) return []

  function walk(parent, path = []) {
    const nodes = []
    let childIndex = 0
    for (const child of parent.children) {
      if (child.tagName?.toLowerCase() === 'defs') continue
      if (child.tagName?.toLowerCase() === 'style') continue
      const tag = child.tagName.toLowerCase()
      const currentPath = [...path, childIndex]
      const siblingsBefore = nodes.filter(n => n.tag === tag).length
      const name = getElementName(child, siblingsBefore)
      const children = walk(child, currentPath)
      nodes.push({
        tag,
        el: child,
        name,
        children,
        path: currentPath,
        icon: getTagIcon(tag),
      })
      childIndex++
    }
    return nodes
  }

  return walk(svg)
}

function autoExpandNodes(nodes, set) {
  for (const n of nodes) {
    if (n.children.length > 0) {
      set.add(n.el)
      autoExpandNodes(n.children, set)
    }
  }
}

function getRealEl(path) {
  const canvasContent = document.querySelector('.canvas-content')
  if (!canvasContent) return null
  const svg = canvasContent.querySelector('svg')
  if (!svg) return null
  let cur = svg
  for (const idx of path) {
    let c = 0
    let found = false
    for (const child of cur.children) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'defs' || tag === 'style') continue
      if (c === idx) { cur = child; found = true; break }
      c++
    }
    if (!found) return null
  }
  return cur
}

function isVisible(path) {
  const el = getRealEl(path)
  if (!el) return true
  return el.style.visibility !== 'hidden'
}

function isLocked(path) {
  const el = getRealEl(path)
  if (!el) return false
  return el.style.pointerEvents === 'none' && el.style.visibility !== 'hidden'
}

const LayerItem = memo(function LayerItem({
  node,
  depth,
  selectedPath,
  onSelect,
  onOpenProperties,
  onOpenContextMenu,
  expanded,
  onToggle,
  onToggleVisibility,
  onToggleLock,
}) {
  const isSelected = selectedPath && node.el === selectedPath
  const hasChildren = node.children.length > 0
  const visible = isVisible(node.path)
  const locked = isLocked(node.path)
  const itemRef = useRef(null)

  useLayoutEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isSelected])

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(node.path)
  }, [onSelect, node.path])

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    onOpenProperties(node.path)
  }, [onOpenProperties, node.path])

  const handleToggle = useCallback((e) => {
    e.stopPropagation()
    onToggle(node.el)
  }, [onToggle, node.el])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(node.path)
    const tag = node.tag
    onOpenContextMenu(e.clientX, e.clientY, node.el, `<${tag}>`, true, false)
  }, [onSelect, onOpenContextMenu, node.el, node.tag])

  const handleVisibilityClick = useCallback((e) => {
    e.stopPropagation()
    onToggleVisibility(node.path)
  }, [onToggleVisibility, node.path])

  const handleLockClick = useCallback((e) => {
    e.stopPropagation()
    onToggleLock(node.path)
  }, [onToggleLock, node.path])

  return (
    <div>
      <div
        ref={itemRef}
        className={`layer-item${isSelected ? ' layer-selected' : ''}${!visible || locked ? ' layer-dimmed' : ''}`}
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {hasChildren ? (
          <span className="layer-toggle" onClick={handleToggle}>
            {expanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="layer-toggle layer-toggle-empty" />
        )}
        <span className={`layer-icon layer-icon-${node.tag}`}>{node.icon}</span>
        <span className="layer-name">{node.name}</span>
        <span
          className={`layer-vis-btn ${visible ? '' : 'layer-vis-hidden'}`}
          onClick={handleVisibilityClick}
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          )}
        </span>
        <span
          className={`layer-lock-btn ${locked ? 'layer-lock-locked' : ''}`}
          onClick={handleLockClick}
          title={locked ? 'Unlock' : 'Lock'}
        >
          {locked ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/>
            </svg>
          )}
        </span>
      </div>
      {hasChildren && expanded.has(node.el) && (
        <div>
          {node.children.map((child, i) => (
            <LayerItem
              key={i}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onOpenProperties={onOpenProperties}
              onOpenContextMenu={onOpenContextMenu}
              expanded={expanded}
              onToggle={onToggle}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  )
})

function LayerPanel({ htmlCode, selectedElement, onLayerSelect, onOpenContextMenu, onOpenProperties, onToggleVisibility, onToggleLock }) {
  const [expanded, setExpanded] = useState(() => new Set())
  const [layers, setLayers] = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [searchText, setSearchText] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const temp = document.createElement('div')
    temp.innerHTML = htmlCode
    const parsed = parseLayers(temp)
    setLayers(parsed)

    setExpanded((prev) => {
      const next = new Set(prev)
      autoExpandNodes(parsed, next)
      return next
    })
  }, [htmlCode])

  useEffect(() => {
    if (selectedElement && layers.length > 0) {
      const path = computeElementPath(selectedElement)
      const node = findNodeByPath(layers, path)
      setSelectedPath(node ? node.el : null)
      if (path && path.length > 1) {
        setExpanded((prev) => {
          const next = new Set(prev)
          for (let len = 1; len < path.length; len++) {
            const parentPath = path.slice(0, len)
            const parent = findNodeByPath(layers, parentPath)
            if (parent) next.add(parent.el)
          }
          return next
        })
      }
    } else {
      setSelectedPath(null)
    }
  }, [selectedElement, layers])

  const handleSelect = useCallback((path) => {
    onLayerSelect(path)
  }, [onLayerSelect])

  const handleToggle = useCallback((el) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(el)) next.delete(el)
      else next.add(el)
      return next
    })
  }, [])

  const filteredLayers = useCallback(() => {
    if (!searchText) return layers
    const filter = (nodes) => {
      return nodes.reduce((acc, n) => {
        const match = n.name.toLowerCase().includes(searchText.toLowerCase()) ||
          n.tag.includes(searchText.toLowerCase())
        const filteredChildren = n.children.length > 0 ? filter(n.children) : []
        if (match || filteredChildren.length > 0) {
          acc.push({ ...n, children: filteredChildren })
        }
        return acc
      }, [])
    }
    return filter(layers)
  }, [layers, searchText])

  const displayLayers = filteredLayers()

  return (
    <div className="layer-panel">
      <div className="layer-header">
        <span className="layer-header-title">Layers</span>
      </div>
      <div className="layer-search">
        <input
          className="layer-search-input"
          type="text"
          placeholder="Filter layers..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="layer-scroll" ref={scrollRef}>
          {displayLayers.length === 0 ? (
          <div className="layer-empty">
            {searchText ? 'No matching layers' : 'No layers'}
          </div>
        ) : (
          displayLayers.map((node, i) => (
            <LayerItem
              key={i}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={handleSelect}
              onOpenProperties={onOpenProperties}
              onOpenContextMenu={onOpenContextMenu}
              expanded={expanded}
              onToggle={handleToggle}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default memo(LayerPanel)
