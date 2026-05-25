import { useRef, useState, useEffect, useCallback, memo } from 'react'
import {
  isLeafElement,
  getLeafElementsInRect,
  findNearestPath,
  isGroupElement,
  extractElement,
  getElementPathDescription,
} from '../utils/domUtils'
import { serializeContainer } from '../utils/serializer'

const SELECTION_COLOR = '#0099ff'

function getTagInfoAtCursor(code, pos) {
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
  tagName = tagName.replace(/\/+$/, '')

  return { tagName, tagStart: start, tagEnd: end + 1 }
}

function findElementAtCursor(container, tagName, code, cursorPos) {
  const all = container.querySelectorAll(tagName)
  let best = null
  let bestSize = Infinity
  for (const el of all) {
    if (el.children.length > 0) continue
    const html = el.outerHTML
    if (!html) continue
    const idx = code.indexOf(html)
    if (idx === -1) continue
    const end = idx + html.length
    if (cursorPos >= idx && cursorPos <= end) {
      const size = end - idx
      if (size < bestSize) {
        best = el
        bestSize = size
      }
    }
  }
  return best
}

function Canvas({
  htmlCode,
  onCodeChange,
  activeTool,
  selectedRefs,
  onSelectionChange,
  onOpenContextMenu,
  onOpenGroupModal,
  clipboardRef,
  actionsRef,
  onClipboardChange,
  onSelectionUpdate,
  onToggleCodePanel,
  codePanelVisible,
  parsing,
}) {
  const wrapperRef = useRef(null)
  const containerRef = useRef(null)
  const currentHtmlRef = useRef(htmlCode)
  const [marqueeStyle, setMarqueeStyle] = useState(null)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const dragStart = useRef(null)
  const draggedRef = useRef(false)
  const [overlays, setOverlays] = useState([])
  const onMoveRef = useRef(null)
  const onUpRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 })
  const [dragOver, setDragOver] = useState(false)
  const [transientTool, setTransientTool] = useState(null)
  const savedToolRef = useRef(null)
  const effectiveTool = transientTool || activeTool

  const applySelectionStyles = useCallback(() => {
    if (!containerRef.current) return
    containerRef.current.querySelectorAll('[data-marq-selected]').forEach((el) => {
      el.removeAttribute('data-marq-selected')
      el.style.removeProperty('outline')
      el.style.removeProperty('outline-offset')
    })
    selectedRefs.current.forEach((el) => {
      if (document.contains(el)) {
        el.setAttribute('data-marq-selected', '')
        el.style.outline = `2px solid ${SELECTION_COLOR}`
        el.style.outlineOffset = '-1px'
      }
    })
  }, [selectedRefs])

  const updateOverlayPositions = useCallback(() => {
    if (!containerRef.current) return
    const contentRect = containerRef.current.getBoundingClientRect()
    const newOverlays = []
    selectedRefs.current.forEach((el) => {
      if (document.contains(el)) {
        const rect = el.getBoundingClientRect()
        newOverlays.push({
          left: rect.left - contentRect.left,
          top: rect.top - contentRect.top,
          width: rect.width,
          height: rect.height,
        })
      }
    })
    setOverlays(newOverlays)
  }, [selectedRefs])

  const syncToEditor = useCallback(() => {
    if (!containerRef.current) return
    const newHtml = serializeContainer(containerRef.current, true)
    currentHtmlRef.current = newHtml
    onCodeChange(newHtml)
  }, [onCodeChange])

  useEffect(() => {
    if (!containerRef.current) return
    if (currentHtmlRef.current !== htmlCode) {
      const timer = setTimeout(() => {
        if (!containerRef.current) return
        containerRef.current.innerHTML = htmlCode
        currentHtmlRef.current = htmlCode
        selectedRefs.current.clear()
        onSelectionChange(0)
        setOverlays([])
        applySelectionStyles()
        updateOverlayPositions()
      }, 150)
      return () => clearTimeout(timer)
    } else {
      applySelectionStyles()
      updateOverlayPositions()
    }
  }, [htmlCode, applySelectionStyles, updateOverlayPositions, selectedRefs, onSelectionChange])

  useEffect(() => {
    if (!containerRef.current) return
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return
    const vb = svg.getAttribute('viewBox')
    let nw = 800, nh = 600
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/).map(Number)
      if (parts.length === 4) { nw = parts[2]; nh = parts[3] }
    }
    setSvgSize({ w: nw, h: nh })
    svg.setAttribute('width', nw * zoom)
    svg.setAttribute('height', nh * zoom)
  }, [htmlCode, zoom])

  const selectElement = useCallback((el, shiftKey) => {
    if (shiftKey) {
      if (selectedRefs.current.has(el)) {
        selectedRefs.current.delete(el)
      } else {
        selectedRefs.current.add(el)
      }
    } else {
      selectedRefs.current.clear()
      selectedRefs.current.add(el)
    }
    onSelectionChange(selectedRefs.current.size)
    onSelectionUpdate?.(selectedRefs.current)
    applySelectionStyles()
    updateOverlayPositions()
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions])

  const clearSelection = useCallback(() => {
    selectedRefs.current.clear()
    onSelectionChange(0)
    onSelectionUpdate?.(selectedRefs.current)
    setOverlays([])
    applySelectionStyles()
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles])

  const performDelete = useCallback(() => {
    if (!containerRef.current || selectedRefs.current.size === 0) return
    selectedRefs.current.forEach((el) => {
      if (document.contains(el)) el.remove()
    })
    selectedRefs.current.clear()
    onSelectionChange(0)
    onSelectionUpdate?.(selectedRefs.current)
    setOverlays([])
    applySelectionStyles()
    syncToEditor()
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, syncToEditor])

  const performCopy = useCallback(() => {
    if (selectedRefs.current.size === 0) return
    const htmls = []
    selectedRefs.current.forEach((el) => {
      if (document.contains(el)) htmls.push(el.outerHTML)
    })
    clipboardRef.current = htmls
    onClipboardChange?.(htmls.length)
  }, [selectedRefs, clipboardRef, onClipboardChange])

  const performCut = useCallback(() => {
    performCopy()
    performDelete()
  }, [performCopy, performDelete])

  const performPaste = useCallback(() => {
    if (!containerRef.current || !clipboardRef.current || clipboardRef.current.length === 0) return
    const html = clipboardRef.current.join('\n')
    containerRef.current.insertAdjacentHTML('beforeend', html)
    selectedRefs.current.clear()
    onSelectionChange(0)
    onSelectionUpdate?.(selectedRefs.current)
    setOverlays([])
    applySelectionStyles()
    syncToEditor()
  }, [clipboardRef, syncToEditor, selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles])

  const performExtract = useCallback(() => {
    if (!containerRef.current || selectedRefs.current.size === 0) return
    const root = containerRef.current
    const elements = Array.from(selectedRefs.current).filter((el) => document.contains(el))
    selectedRefs.current.clear()
    onSelectionChange(0)
    onSelectionUpdate?.(selectedRefs.current)
    setOverlays([])
    elements.forEach((el) => {
      try {
        extractElement(el, root)
      } catch {
          // element may have been detached
        }
      })
    applySelectionStyles()
    syncToEditor()
  }, [selectedRefs, onSelectionChange, applySelectionStyles, syncToEditor])

  const performGroup = useCallback(() => {
    if (!containerRef.current || selectedRefs.current.size < 1) return
    const elements = Array.from(selectedRefs.current).filter((el) => document.contains(el))
    if (elements.length === 0) return

    const parent = elements[0].parentElement
    if (!parent) return

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    parent.insertBefore(g, elements[0])
    elements.forEach((el) => g.appendChild(el))

    selectedRefs.current.clear()
    selectedRefs.current.add(g)
    onSelectionChange(1)
    onSelectionUpdate?.(selectedRefs.current)
    applySelectionStyles()
    updateOverlayPositions()
    syncToEditor()
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions, syncToEditor])

  const cleanEmptyGroups = useCallback(() => {
    if (!containerRef.current) return
    const groups = containerRef.current.querySelectorAll('g, div, section')
    groups.forEach((g) => {
      const html = g.innerHTML.trim()
      if (!html || html === '') g.remove()
    })
    syncToEditor()
  }, [syncToEditor])

  const selectByOuterHTML = useCallback((html) => {
    if (!containerRef.current || !html) return
    const all = containerRef.current.querySelectorAll('*')
    for (const el of all) {
      if (el.outerHTML === html) {
        selectedRefs.current.clear()
        selectedRefs.current.add(el)
        onSelectionChange(1)
        onSelectionUpdate?.(selectedRefs.current)
        applySelectionStyles()
        updateOverlayPositions()
        return
      }
    }
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions])

  const selectAtCursorPos = useCallback((code, cursorPos) => {
    if (!containerRef.current || !code) return
    const tagInfo = getTagInfoAtCursor(code, cursorPos)
    if (!tagInfo) return
    const best = findElementAtCursor(containerRef.current, tagInfo.tagName, code, cursorPos)
    if (best) {
      selectedRefs.current.clear()
      selectedRefs.current.add(best)
      onSelectionChange(1)
      onSelectionUpdate?.(selectedRefs.current)
      applySelectionStyles()
      updateOverlayPositions()
    }
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions])

  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        performDelete,
        performCopy,
        performCut,
        performPaste,
        performExtract,
        performGroup,
        cleanEmptyGroups,
        selectByOuterHTML,
        selectAtCursorPos,
      }
    }
  }, [actionsRef, performDelete, performCopy, performCut, performPaste, performExtract, performGroup, cleanEmptyGroups, selectByOuterHTML, selectAtCursorPos])

  const stableMouseMove = useCallback((e) => onMoveRef.current?.(e), [])
  const stableMouseUp = useCallback((e) => onUpRef.current?.(e), [])

  useEffect(() => {
    onMoveRef.current = handleMouseMove
    onUpRef.current = handleMouseUp
  })

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (activeTool === 'select' || activeTool === 'path-select') {
        const isEditing = document.activeElement?.tagName === 'TEXTAREA' ||
                          document.activeElement?.tagName === 'INPUT'
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (isEditing) return
          e.preventDefault()
          performDelete()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          if (isEditing) return
          e.preventDefault()
          performCopy()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
          if (isEditing) return
          e.preventDefault()
          performCut()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          if (isEditing) return
          performPaste()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
          if (isEditing) return
          e.preventDefault()
          performExtract()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
          if (isEditing) return
          e.preventDefault()
          performGroup()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTool, performDelete, performCopy, performCut, performPaste, performExtract, performGroup])

  useEffect(() => {
    const handleResize = () => updateOverlayPositions()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateOverlayPositions])

  useEffect(() => {
    const onCtrlDown = (e) => {
      if (e.key === 'Control' && !transientTool && !draggingRef.current) {
        savedToolRef.current = activeTool
        setTransientTool('zoom')
      }
    }
    const onCtrlUp = (e) => {
      if (e.key === 'Control' && transientTool) {
        setTransientTool(null)
        savedToolRef.current = null
      }
    }
    window.addEventListener('keydown', onCtrlDown)
    window.addEventListener('keyup', onCtrlUp)
    return () => {
      window.removeEventListener('keydown', onCtrlDown)
      window.removeEventListener('keyup', onCtrlUp)
    }
  }, [transientTool, activeTool])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e) => {
      if (effectiveTool !== 'zoom' && !e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(z => Math.max(0.1, Math.min(5, +(z + delta).toFixed(2))))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [effectiveTool])

  const startDrag = useCallback((e) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    draggingRef.current = true
    setDragging(true)
    draggedRef.current = false
    setMarqueeStyle({
      left: e.clientX,
      top: e.clientY,
      width: 0,
      height: 0,
    })
    window.addEventListener('mousemove', stableMouseMove)
    window.addEventListener('mouseup', stableMouseUp)
  }, [stableMouseMove, stableMouseUp])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return
    const target = e.target
    if (!containerRef.current) return
    if (target === containerRef.current) {
      if (effectiveTool === 'zoom') return
      clearSelection()
      startDrag(e)
      return
    }
    if (effectiveTool === 'zoom') return
    if (effectiveTool === 'select') {
      if (isLeafElement(target)) {
        selectElement(target, e.shiftKey)
        startDrag(e)
      } else if (target.tagName.toLowerCase() === 'g') {
        onOpenGroupModal(target)
      } else if (isGroupElement(target)) {
        onOpenGroupModal(target)
      } else {
        clearSelection()
        startDrag(e)
      }
    } else if (effectiveTool === 'path-select') {
      const path = findNearestPath(target)
      if (path) {
        selectElement(path, e.shiftKey)
      } else {
        clearSelection()
      }
    } else if (effectiveTool === 'delete-tool') {
      if (target !== containerRef.current) {
        target.remove()
        selectedRefs.current.delete(target)
        onSelectionChange(selectedRefs.current.size)
        applySelectionStyles()
        updateOverlayPositions()
        syncToEditor()
      }
    }
  }, [effectiveTool, selectElement, clearSelection, syncToEditor, onOpenGroupModal, selectedRefs, onSelectionChange, applySelectionStyles, updateOverlayPositions])

  const handleMouseMove = useCallback((e) => {
    if (!draggingRef.current || !dragStart.current || !containerRef.current) return

    const dx = Math.abs(e.clientX - dragStart.current.x)
    const dy = Math.abs(e.clientY - dragStart.current.y)
    if (dx > 3 || dy > 3) draggedRef.current = true

    setMarqueeStyle({
      left: Math.min(dragStart.current.x, e.clientX),
      top: Math.min(dragStart.current.y, e.clientY),
      width: Math.abs(e.clientX - dragStart.current.x),
      height: Math.abs(e.clientY - dragStart.current.y),
    })

    if (activeTool === 'select' || activeTool === 'path-select') {
      const contentRect = containerRef.current.getBoundingClientRect()
      const cLeft = Math.min(dragStart.current.x, e.clientX) - contentRect.left
      const cTop = Math.min(dragStart.current.y, e.clientY) - contentRect.top
      const cW = Math.abs(e.clientX - dragStart.current.x)
      const cH = Math.abs(e.clientY - dragStart.current.y)
      const marqueeRect = {
        left: cLeft,
        top: cTop,
        right: cLeft + cW,
        bottom: cTop + cH,
      }
      const leaves = getLeafElementsInRect(containerRef.current, marqueeRect)
      selectedRefs.current.clear()
      leaves.forEach(el => selectedRefs.current.add(el))
      onSelectionChange(selectedRefs.current.size)
      onSelectionUpdate?.(selectedRefs.current)
      applySelectionStyles()
      updateOverlayPositions()
    }
  }, [activeTool, selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions])

  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    setMarqueeStyle(null)
    dragStart.current = null
    draggedRef.current = false
    window.removeEventListener('mousemove', stableMouseMove)
    window.removeEventListener('mouseup', stableMouseUp)
  }, [stableMouseMove, stableMouseUp])

  const zoomReset = useCallback(() => setZoom(1), [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.name.endsWith('.svg')) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      if (typeof text === 'string') {
        onCodeChange(text)
      }
    }
    reader.readAsText(file)
  }, [onCodeChange])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const target = e.target
    const isCanvasBg = !containerRef.current?.contains(target)
    if (isCanvasBg) {
      onOpenContextMenu(e.clientX, e.clientY, null, 'Canvas', false, true)
      return
    }
    if (target === containerRef.current) {
      onOpenContextMenu(e.clientX, e.clientY, null, 'Canvas', false, true)
      return
    }
    if (!selectedRefs.current.has(target) && isLeafElement(target)) {
      selectedRefs.current.clear()
      selectedRefs.current.add(target)
      onSelectionChange(1)
      applySelectionStyles()
      updateOverlayPositions()
    }
    onSelectionUpdate?.(selectedRefs.current)
    const desc = getElementPathDescription(target)
    onOpenContextMenu(e.clientX, e.clientY, target, desc, selectedRefs.current.size > 0)
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, onOpenContextMenu, applySelectionStyles, updateOverlayPositions])

  return (
    <div className="canvas-panel">
      <div className="canvas-floating-bar">
        <span className="canvas-dimension">{svgSize.w} × {svgSize.h}</span>
        <button className="canvas-zoom-val" onClick={zoomReset} title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <button
          className="canvas-expand-btn"
          onClick={onToggleCodePanel}
          title={codePanelVisible ? 'Hide code panel' : 'Show code panel'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {codePanelVisible ? (
              <><line x1="17" y1="7" x2="7" y2="17" /><polyline points="17 17 7 17 7 7" /></>
            ) : (
              <><line x1="7" y1="7" x2="17" y2="17" /><polyline points="7 17 17 17 17 7" /></>
            )}
          </svg>
        </button>
      </div>
      <div
        ref={wrapperRef}
        className={`canvas-wrapper${effectiveTool === 'zoom' ? ' cursor-zoom' : ''}${dragOver ? ' canvas-drop-over' : ''}`}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="canvas-scroll">
          <div
            ref={containerRef}
            className="canvas-content"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
          >
            <div className="canvas-selection-layer">
              {overlays.map((o, i) => (
                <div
                  key={i}
                  className="selection-overlay"
                  style={{
                    left: o.left,
                    top: o.top,
                    width: o.width,
                    height: o.height,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {dragOver && <div className="canvas-drop-indicator">Drop SVG file here</div>}
      </div>
      {marqueeStyle && (
        <div
          className="marquee-rendered"
          style={{
            left: marqueeStyle.left,
            top: marqueeStyle.top,
            width: marqueeStyle.width,
            height: marqueeStyle.height,
          }}
        />
      )}
      {parsing && <div className="canvas-loading"><div className="canvas-loading-spinner" /></div>}
    </div>
  )
}

export default memo(Canvas)
