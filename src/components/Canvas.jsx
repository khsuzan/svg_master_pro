import { useRef, useState, useEffect, useCallback } from 'react'
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

export default function Canvas({
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
}) {
  const wrapperRef = useRef(null)
  const containerRef = useRef(null)
  const currentHtmlRef = useRef(htmlCode)
  const [marquee, setMarquee] = useState(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const draggedRef = useRef(false)
  const [overlays, setOverlays] = useState([])

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
      containerRef.current.innerHTML = htmlCode
      currentHtmlRef.current = htmlCode
      selectedRefs.current.clear()
      onSelectionChange(0)
      setOverlays([])
    }
    applySelectionStyles()
    updateOverlayPositions()
  }, [htmlCode, applySelectionStyles, updateOverlayPositions, selectedRefs, onSelectionChange])

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
    applySelectionStyles()
    updateOverlayPositions()
  }, [selectedRefs, onSelectionChange, applySelectionStyles, updateOverlayPositions])

  const clearSelection = useCallback(() => {
    selectedRefs.current.clear()
    onSelectionChange(0)
    setOverlays([])
    applySelectionStyles()
  }, [selectedRefs, onSelectionChange, applySelectionStyles])

  const performDelete = useCallback(() => {
    if (!containerRef.current || selectedRefs.current.size === 0) return
    selectedRefs.current.forEach((el) => {
      if (document.contains(el)) el.remove()
    })
    selectedRefs.current.clear()
    onSelectionChange(0)
    setOverlays([])
    applySelectionStyles()
    syncToEditor()
  }, [selectedRefs, onSelectionChange, applySelectionStyles, syncToEditor])

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
    setOverlays([])
    applySelectionStyles()
    syncToEditor()
  }, [clipboardRef, syncToEditor, selectedRefs, onSelectionChange, applySelectionStyles])

  const performExtract = useCallback(() => {
    if (!containerRef.current || selectedRefs.current.size === 0) return
    const root = containerRef.current
    const elements = Array.from(selectedRefs.current).filter((el) => document.contains(el))
    selectedRefs.current.clear()
    onSelectionChange(0)
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
    applySelectionStyles()
    updateOverlayPositions()
    syncToEditor()
  }, [selectedRefs, onSelectionChange, applySelectionStyles, updateOverlayPositions, syncToEditor])

  const cleanEmptyGroups = useCallback(() => {
    if (!containerRef.current) return
    const groups = containerRef.current.querySelectorAll('g, div, section')
    groups.forEach((g) => {
      const html = g.innerHTML.trim()
      if (!html || html === '') g.remove()
    })
    syncToEditor()
  }, [syncToEditor])

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
      }
    }
  }, [actionsRef, performDelete, performCopy, performCut, performPaste, performExtract, performGroup, cleanEmptyGroups])

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

  const startDrag = useCallback((e) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
    draggedRef.current = false
    if (containerRef.current) {
      const contentRect = containerRef.current.getBoundingClientRect()
      setMarquee({
        left: e.clientX - contentRect.left,
        top: e.clientY - contentRect.top,
        width: 0,
        height: 0,
      })
    }
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return
    const target = e.target
    if (!containerRef.current) return
    if (target === containerRef.current) {
      clearSelection()
      startDrag(e)
      return
    }
    if (activeTool === 'select') {
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
    } else if (activeTool === 'path-select') {
      const path = findNearestPath(target)
      if (path) {
        selectElement(path, e.shiftKey)
      } else {
        clearSelection()
      }
    } else if (activeTool === 'delete-tool') {
      if (target !== containerRef.current) {
        target.remove()
        selectedRefs.current.delete(target)
        onSelectionChange(selectedRefs.current.size)
        applySelectionStyles()
        updateOverlayPositions()
        syncToEditor()
      }
    }
  }, [activeTool, selectElement, clearSelection, syncToEditor, onOpenGroupModal, selectedRefs, onSelectionChange, applySelectionStyles, updateOverlayPositions])

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current || !containerRef.current) return

    const dx = Math.abs(e.clientX - dragStart.current.x)
    const dy = Math.abs(e.clientY - dragStart.current.y)
    if (dx > 3 || dy > 3) draggedRef.current = true

    const contentRect = containerRef.current.getBoundingClientRect()
    const left = Math.min(dragStart.current.x, e.clientX) - contentRect.left
    const top = Math.min(dragStart.current.y, e.clientY) - contentRect.top
    const w = Math.abs(e.clientX - dragStart.current.x)
    const h = Math.abs(e.clientY - dragStart.current.y)
    setMarquee({ left, top, width: w, height: h })

    if (activeTool === 'select' || activeTool === 'path-select') {
      const marqueeRect = {
        left,
        top,
        right: left + w,
        bottom: top + h,
      }
      const leaves = getLeafElementsInRect(containerRef.current, marqueeRect)
      selectedRefs.current.clear()
      leaves.forEach(el => selectedRefs.current.add(el))
      onSelectionChange(selectedRefs.current.size)
      applySelectionStyles()
      updateOverlayPositions()
    }
  }, [dragging, activeTool, selectedRefs, onSelectionChange, applySelectionStyles, updateOverlayPositions])

  const handleMouseUp = useCallback(() => {
    if (!dragging) return
    setDragging(false)
    setMarquee(null)
    dragStart.current = null
    draggedRef.current = false
  }, [dragging])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const target = e.target
    if (target && target !== containerRef.current) {
      if (!selectedRefs.current.has(target) && isLeafElement(target)) {
        selectedRefs.current.clear()
        selectedRefs.current.add(target)
        onSelectionChange(1)
        applySelectionStyles()
        updateOverlayPositions()
      }
      const desc = getElementPathDescription(target)
      onOpenContextMenu(e.clientX, e.clientY, target, desc, selectedRefs.current.size > 0)
    }
  }, [selectedRefs, onSelectionChange, onOpenContextMenu, applySelectionStyles, updateOverlayPositions])

  return (
    <div className="canvas-panel">
      <div className="canvas-header">
        <span className="canvas-header-title">Visual Canvas</span>
        <span className="canvas-header-hint">
          {activeTool === 'select' ? 'Click to select · Drag to marquee · Shift+click to add' : ''}
          {activeTool === 'path-select' ? 'Click to select path elements from any group depth' : ''}
          {activeTool === 'delete-tool' ? 'Click elements to delete them' : ''}
        </span>
      </div>
      <div
        ref={wrapperRef}
        className="canvas-wrapper"
      >
        <div className="canvas-scroll">
          <div
            ref={containerRef}
            className="canvas-content"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
              {marquee && (
                <div
                  className="marquee-rect"
                  style={{
                    left: marquee.left,
                    top: marquee.top,
                    width: marquee.width,
                    height: marquee.height,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
