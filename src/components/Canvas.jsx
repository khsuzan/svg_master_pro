import { useRef, useState, useEffect, useCallback, memo, useLayoutEffect } from 'react'
import {
  isLeafElement,
  findNearestPath,
  findNearestByTag,
  isGroupElement,
  extractElement,
  getElementPathDescription,
} from '../utils/domUtils'
import { serializeContainer, stripSelectionMarkers } from '../utils/serializer'

const CANVAS_SIZE = 4000

const SELECTION_COLOR = '#0099ff'

function transformPathD(d, dx, dy, angleDeg, cx, cy) {
  const angleRad = angleDeg * Math.PI / 180
  const cosA = Math.cos(angleRad)
  const sinA = Math.sin(angleRad)
  const hasRotate = angleDeg !== 0

  const cmd = /([A-Za-z])([^A-Za-z]*?)(?=[A-Za-z]|$)/g
  let curX = 0, curY = 0, startX = 0, startY = 0

  const fmt = (n) => Number.isInteger(n) ? n : parseFloat(n.toFixed(4))
  const apply = (x, y) => {
    const tx = x + dx, ty = y + dy
    if (!hasRotate) return { x: tx, y: ty }
    return {
      x: cx + (tx - cx) * cosA - (ty - cy) * sinA,
      y: cy + (tx - cx) * sinA + (ty - cy) * cosA
    }
  }

  return d.replace(cmd, (_, letter, params) => {
    if (letter === 'Z' || letter === 'z') { curX = startX; curY = startY; return _ }
    const nums = (params.match(/[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/g) || []).map(Number)
    if (nums.length === 0) return _
    const isAbs = letter === letter.toUpperCase()
    const up = letter.toUpperCase()

    // M must be handled separately — subsequent pairs are implicit L
    if (up === 'M') {
      const parts = []
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x0 = isAbs ? nums[i] : curX + nums[i]
        const y0 = isAbs ? nums[i + 1] : curY + nums[i + 1]
        const p = apply(x0, y0)
        const l = i === 0 ? letter : (isAbs ? 'L' : 'l')
        parts.push(l + ' ' + fmt(p.x) + ' ' + fmt(p.y))
        curX = p.x; curY = p.y
      }
      startX = curX; startY = curY
      return parts.join('')
    }

    let outLetter = letter
    const outNums = []

    if (up === 'H') {
      const x = isAbs ? nums[0] : curX + nums[0]
      const p = apply(x, curY)
      if (hasRotate) { outLetter = isAbs ? 'L' : 'l'; outNums.push(p.x, p.y) }
      else { outNums.push(p.x) }
      curX = p.x; curY = p.y
    } else if (up === 'V') {
      const y = isAbs ? nums[0] : curY + nums[0]
      const p = apply(curX, y)
      if (hasRotate) { outLetter = isAbs ? 'L' : 'l'; outNums.push(p.x, p.y) }
      else { outNums.push(p.y) }
      curX = p.x; curY = p.y
    } else if (up === 'A') {
      const copy = nums.slice()
      for (let i = 0; i + 6 < copy.length; i += 7) {
        const x = isAbs ? copy[i + 5] : curX + copy[i + 5]
        const y = isAbs ? copy[i + 6] : curY + copy[i + 6]
        const p = apply(x, y)
        copy[i + 5] = p.x; copy[i + 6] = p.y
        curX = p.x; curY = p.y
      }
      outNums.push(...copy)
    } else {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x0 = isAbs ? nums[i] : curX + nums[i]
        const y0 = isAbs ? nums[i + 1] : curY + nums[i + 1]
        const p = apply(x0, y0)
        outNums.push(p.x, p.y)
        curX = p.x; curY = p.y
      }
    }

    return outLetter + ' ' + outNums.map(fmt).join(' ')
  })
}

function bakeTransforms(root) {
  const elements = root.querySelectorAll('*')
  for (const el of elements) {
    if (el.tagName.toLowerCase() === 'svg') continue
    const transform = el.getAttribute('transform')
    if (!transform) continue
    const translateRegex = /translate\s*\(\s*([-\d.e+]+)\s*[, ]\s*([-\d.e+]+)\s*\)/g
    let totalDx = 0, totalDy = 0
    let m
    while ((m = translateRegex.exec(transform)) !== null) {
      totalDx += parseFloat(m[1])
      totalDy += parseFloat(m[2])
    }
    let baked = false

    const maybeBakeAttr = (attr, dx, dy) => {
      const val = el.getAttribute(attr)
      if (val === null) return
      baked = true
      el.setAttribute(attr, (parseFloat(val) + (attr.endsWith('x') || attr === 'x1' || attr === 'x2' ? dx : dy)).toFixed(2))
    }

    maybeBakeAttr('x', totalDx, totalDy)
    maybeBakeAttr('y', totalDx, totalDy)
    maybeBakeAttr('cx', totalDx, totalDy)
    maybeBakeAttr('cy', totalDx, totalDy)
    maybeBakeAttr('x1', totalDx, totalDy)
    maybeBakeAttr('y1', totalDx, totalDy)
    maybeBakeAttr('x2', totalDx, totalDy)
    maybeBakeAttr('y2', totalDx, totalDy)

    let remaining = transform.replace(/translate\s*\([^)]*\)\s*/g, '').trim()
    let rotAngle = 0, rotCx = 0, rotCy = 0

    // Try to bake rotate(...) for path/polygon elements
    const rotMatch = remaining.match(/rotate\s*\(\s*([-\d.e+]+)\s*[\s,]\s*([-\d.e+]+)\s*[\s,]\s*([-\d.e+]+)\s*\)/)
    if (rotMatch && el.tagName.toLowerCase() === 'path') {
      rotAngle = parseFloat(rotMatch[1])
      rotCx = parseFloat(rotMatch[2])
      rotCy = parseFloat(rotMatch[3])
      remaining = remaining.replace(/rotate\s*\([^)]*\)\s*/, '').trim()
    }

    const d = el.getAttribute('d')
    if (d) {
      el.setAttribute('d', transformPathD(d, totalDx, totalDy, rotAngle, rotCx, rotCy))
      baked = true
    }
    const points = el.getAttribute('points')
    if (points && (totalDx !== 0 || totalDy !== 0)) {
      const pts = points.trim().split(/[\s,]+/).filter(Boolean).map(Number)
      if (pts.length > 0) {
        const offsetted = pts.map((v, i) => {
          const off = i % 2 === 0 ? totalDx : totalDy
          const n = v + off
          return Number.isInteger(n) ? n : parseFloat(n.toFixed(4))
        })
        const rebuilt = []
        for (let i = 0; i < offsetted.length; i += 2) {
          rebuilt.push(offsetted[i] + ',' + (offsetted[i+1] !== undefined ? offsetted[i+1] : ''))
        }
        el.setAttribute('points', rebuilt.join(' '))
      }
      baked = true
    }

    if (!baked) continue

    if (remaining) {
      el.setAttribute('transform', remaining)
    } else {
      el.removeAttribute('transform')
    }
  }
}

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

  if (!best) {
    for (const el of all) {
      if (el.children.length === 0) continue
      const outer = el.outerHTML
      const openTagEnd = outer.indexOf('>')
      if (openTagEnd === -1) continue
      const openingTag = outer.slice(0, openTagEnd + 1)
      const openIdx = code.indexOf(openingTag)
      if (openIdx === -1 || cursorPos < openIdx) continue
      const closeTag = `</${tagName}>`
      const closeIdx = code.indexOf(closeTag, openIdx + openingTag.length)
      const endIdx = closeIdx !== -1 ? closeIdx + closeTag.length : openIdx + openingTag.length
      if (cursorPos <= endIdx) {
        const size = endIdx - openIdx
        if (size < bestSize) {
          best = el
          bestSize = size
        }
      }
    }
  }
  return best
}

function circleIntersectsRect(cx, cy, r, rect) {
  const closestX = Math.max(rect.left, Math.min(cx, rect.right))
  const closestY = Math.max(rect.top, Math.min(cy, rect.bottom))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy <= r * r
}

function getElementsInBrush(container, cx, cy, radius) {
  const svg = container.querySelector('svg')
  if (!svg) return []
  const all = svg.querySelectorAll('*')
  const result = []
  for (const el of all) {
    if (el.children.length > 0) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (circleIntersectsRect(cx, cy, radius, rect)) {
      result.push(el)
    }
  }
  return result
}

function getFilteredElementsInRect(container, rect, tag) {
  const svg = container.querySelector('svg')
  if (!svg) return []
  const containerRect = container.getBoundingClientRect()
  const all = svg.querySelectorAll('*')
  const result = []
  for (const el of all) {
    if (el.tagName !== el.tagName.toLowerCase()) continue
    const elTag = el.tagName.toLowerCase()
    if (tag !== 'any' && elTag !== tag) continue
    if (tag === 'any' && el.children.length > 0) continue
    const elRect = el.getBoundingClientRect()
    const l = elRect.left - containerRect.left
    const t = elRect.top - containerRect.top
    const r = elRect.right - containerRect.left
    const b = elRect.bottom - containerRect.top
    if (r - l === 0 && b - t === 0) continue
    if (l < rect.right && r > rect.left && t < rect.bottom && b > rect.top) {
      result.push(el)
    }
  }
  return result
}

function getFilteredElementsInBrush(container, cx, cy, radius, tag) {
  const svg = container.querySelector('svg')
  if (!svg) return []
  const all = svg.querySelectorAll('*')
  const result = []
  for (const el of all) {
    if (el.tagName !== el.tagName.toLowerCase()) continue
    const elTag = el.tagName.toLowerCase()
    if (tag !== 'any' && elTag !== tag) continue
    if (tag === 'any' && el.children.length > 0) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (circleIntersectsRect(cx, cy, radius, rect)) {
      result.push(el)
    }
  }
  return result
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
  pathTagFilter = 'any',
  visualCssEnabled,
  cssContent = '',
  cssPseudoDisabled = false,
  onTransientChange,
  brushSize = 30,
  onBrushSizeChange,
  artboardName = 'Frame 1',
}) {
  const wrapperRef = useRef(null)
  const containerRef = useRef(null)
  const currentHtmlRef = useRef('')
  const [marqueeStyle, setMarqueeStyle] = useState(null)
  const [brushPos, setBrushPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const dragStart = useRef(null)
  const draggedRef = useRef(false)
  const clickedElementRef = useRef(null)
  const [overlays, setOverlays] = useState([])
  const onMoveRef = useRef(null)
  const onUpRef = useRef(null)
  const [zoom, setZoom] = useState(0.5)
  const zoomRef = useRef(1)
  zoomRef.current = zoom
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 })

  const cssEnabledRef = useRef(visualCssEnabled)
  cssEnabledRef.current = visualCssEnabled
  const cssContentRef = useRef(cssContent)
  cssContentRef.current = cssContent
  const cssPseudoRef = useRef(cssPseudoDisabled)
  cssPseudoRef.current = cssPseudoDisabled

  const pathTagFilterRef = useRef(pathTagFilter)
  pathTagFilterRef.current = pathTagFilter
  const [viewportSize, setViewportSize] = useState({ w: 1200, h: 800 })
  const viewportSizeRef = useRef({ w: 1200, h: 800 })
  const brushSizeRef = useRef(brushSize)
  brushSizeRef.current = brushSize
  const onBrushSizeChangeRef = useRef(onBrushSizeChange)
  onBrushSizeChangeRef.current = onBrushSizeChange
  viewportSizeRef.current = viewportSize
  const [dragOver, setDragOver] = useState(false)
  const [transientTool, setTransientTool] = useState(null)
  const savedToolRef = useRef(null)
  const effectiveTool = transientTool || activeTool
  const effectiveToolRef = useRef(effectiveTool)
  effectiveToolRef.current = effectiveTool
  const [rotationAngle, setRotationAngle] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
  const rotationStartRef = useRef(null)
  const rotationInitialRef = useRef(0)
  const [isPanning, setIsPanning] = useState(false)
  const isPanningRef = useRef(false)
  const panStartRef = useRef(null)
  const scrollStartRef = useRef(null)
  const spaceDownRef = useRef(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const rectZoomRef = useRef(false)
  const rectZoomDragRef = useRef(false)
  const scrollTargetRef = useRef(null)
  const dragMoveRef = useRef(false)
  const dragOrigTransformsRef = useRef(null)
  const dragOrigCtmRef = useRef(null)
  const rotateCenterRef = useRef(null)
  const rotationSvgCenterRef = useRef(null)
  const artboardDragRef = useRef(null)
  const moveThrottleRef = useRef(0)
  const selectionThrottleRef = useRef(0)
  const selectionRAFRef = useRef(null)
  const lastMoveClientX = useRef(0)
  const lastMoveClientY = useRef(0)

  const applySelectionStyles = useCallback(() => {
    if (!containerRef.current) return
    containerRef.current.querySelectorAll('[data-marq-selected]').forEach((el) => {
      el.removeAttribute('data-marq-selected')
    })
    for (const el of selectedRefs.current) {
      if (document.contains(el)) {
        el.setAttribute('data-marq-selected', '')
      }
    }
  }, [selectedRefs])

  const updateOverlayPositions = useCallback(() => {
    if (!containerRef.current) return
    const tool = effectiveToolRef.current
    if (tool !== 'select' && tool !== 'rotate') {
      rotateCenterRef.current = null
      setOverlays([])
      return
    }
    const contentRect = containerRef.current.getBoundingClientRect()
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
    let found = false
    for (const el of selectedRefs.current) {
      if (!document.contains(el)) continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      left = Math.min(left, rect.left)
      top = Math.min(top, rect.top)
      right = Math.max(right, rect.right)
      bottom = Math.max(bottom, rect.bottom)
      found = true
    }
    if (found) {
      const w = right - left, h = bottom - top
      rotateCenterRef.current = { x: left + w / 2, y: top + h / 2 }
      setOverlays([{
        left: left - contentRect.left,
        top: top - contentRect.top,
        width: w,
        height: h,
      }])
    } else {
      rotateCenterRef.current = null
      setOverlays([])
    }
  }, [selectedRefs])

  const syncToEditor = useCallback(() => {
    if (!containerRef.current) return
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return
    const clone = svg.cloneNode(true)
    clone.querySelector('#__vis_css')?.remove()
    bakeTransforms(clone)
    const newHtml = stripSelectionMarkers(clone.outerHTML)
    currentHtmlRef.current = newHtml
    onCodeChange(newHtml)
  }, [onCodeChange])

  useEffect(() => {
    if (!containerRef.current) return
    if (currentHtmlRef.current !== htmlCode) {
      const timer = setTimeout(() => {
        if (!containerRef.current) return
        let code = htmlCode
        // Fix root-level transform on <svg> — move it to a wrapper <g>
        const svgMatch = code.match(/<svg[^>]*>/i)
        const transformMatch = svgMatch?.[0]?.match(/\stransform="([^"]*)"/i)
        if (transformMatch) {
          const fixedTag = svgMatch[0].replace(transformMatch[0], '')
          const closeIdx = code.lastIndexOf('</svg>')
          if (closeIdx !== -1) {
            code = code.slice(0, closeIdx) + '</g>\n' + code.slice(closeIdx)
            code = code.replace(svgMatch[0], fixedTag + '<g transform="' + transformMatch[1] + '">\n')
          }
        }
        containerRef.current.innerHTML = code
        currentHtmlRef.current = code
        // Restore zoom-scaled SVG dimensions after DOM replacement
        const freshSvg = containerRef.current.querySelector('svg')
        if (freshSvg) {
          const vb = freshSvg.getAttribute('viewBox')
          if (vb) {
            const parts = vb.trim().split(/[\s,]+/).map(Number)
            if (parts.length === 4) {
              freshSvg.setAttribute('width', parts[2] * zoom)
              freshSvg.setAttribute('height', parts[3] * zoom)
            }
          }
        }
        // Re-inject visual CSS after DOM replacement
        if (cssEnabledRef.current) {
          const newSvg = containerRef.current.querySelector('svg')
          if (newSvg && !newSvg.querySelector('#__vis_css')) {
            let content = cssContentRef.current || `
        * { transition: fill 0.15s, stroke 0.15s, opacity 0.15s; }
        *:hover { fill: rgba(0, 153, 255, 0.15) !important; stroke: #09f !important; stroke-width: 1.5 !important; }
      `
            if (cssPseudoRef.current) {
              content = content.replace(/[^{]*\{[^}]*\}/g, (match) => {
                const sel = match.split('{')[0].trim()
                if (/:(hover|active|focus|visited|link|focus-within|focus-visible|target)\b/i.test(sel)) return ''
                return match
              })
            }
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
            style.id = '__vis_css'
            style.textContent = content
            newSvg.appendChild(style)
          }
        }
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
    if (!shiftKey && selectedRefs.current.size === 1) {
      const el = selectedRefs.current.values().next().value
      if (el && document.contains(el)) {
        const t = el.getAttribute('transform') || ''
        const m = t.match(/rotate\s*\(([^)]+)\)/)
        if (m) {
          const a = parseFloat(m[1].trim().split(/[\s,]+/)[0]) || 0
          setRotationAngle(((a % 360) + 360) % 360)
        } else {
          setRotationAngle(0)
        }
      }
    }
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions])

  const clearSelection = useCallback(() => {
    selectedRefs.current.clear()
    onSelectionChange(0)
    onSelectionUpdate?.(selectedRefs.current)
    setOverlays([])
    applySelectionStyles()
    setRotationAngle(0)
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

  const performDeleteAll = useCallback(() => {
    if (!containerRef.current) return
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return
    ;[].slice.call(svg.children).forEach((child) => {
      if (child.tagName && child.tagName.toLowerCase() !== 'defs') child.remove()
    })
    selectedRefs.current.clear()
    onSelectionChange(0)
    onSelectionUpdate?.(selectedRefs.current)
    setOverlays([])
    applySelectionStyles()
    syncToEditor()
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, syncToEditor])

  const performDeleteUnselected = useCallback(() => {
    if (!containerRef.current) return
    const selected = new Set(selectedRefs.current)
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return
    ;[].slice.call(svg.children).forEach((child) => {
      if (selected.has(child)) return
      if (child.tagName && child.tagName.toLowerCase() !== 'defs') {
        let hasSelected = false
        for (const el of selected) { if (child.contains(el)) { hasSelected = true; break } }
        if (!hasSelected) child.remove()
      }
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

  const cleanEmptyGroups = useCallback((tagSelector) => {
    if (!containerRef.current) return
    const sel = tagSelector || 'g, div, section'
    const els = containerRef.current.querySelectorAll(sel)
    els.forEach((el) => {
      const html = el.innerHTML.trim()
      if (!html || html === '') el.remove()
    })
    syncToEditor()
  }, [syncToEditor])

  const cleanEmptyAll = useCallback(() => {
    if (!containerRef.current) return
    const all = containerRef.current.querySelectorAll('*')
    all.forEach((el) => {
      if (el.children.length === 0 && el.tagName?.toLowerCase() !== 'svg') {
        const html = el.innerHTML.trim()
        if (!html || html === '') el.remove()
      }
    })
    syncToEditor()
  }, [syncToEditor])

  const countEmptyGroups = useCallback((tagSelector) => {
    if (!containerRef.current) return 0
    const sel = tagSelector || 'g, div, section'
    const els = containerRef.current.querySelectorAll(sel)
    let count = 0
    els.forEach((el) => {
      const html = el.innerHTML.trim()
      if (!html || html === '') count++
    })
    return count
  }, [])

  const removeEmptyGroups = useCallback((tagSelector) => {
    if (!containerRef.current) return
    const sel = tagSelector || 'g, div, section'
    const els = containerRef.current.querySelectorAll(sel)
    els.forEach((el) => {
      const html = el.innerHTML.trim()
      if (!html || html === '') el.remove()
    })
    syncToEditor()
  }, [syncToEditor])

  const applyRotationToElements = useCallback((angle, svgCenter) => {
    if (selectedRefs.current.size === 0) return
    let cx, cy
    if (svgCenter) {
      cx = svgCenter.x
      cy = svgCenter.y
    } else {
      const center = rotateCenterRef.current
      if (!center) return
      if (!containerRef.current) return
      const svg = containerRef.current.querySelector('svg')
      if (!svg) return
      const svgRect = svg.getBoundingClientRect()
      const vb = svg.getAttribute('viewBox') || '0 0 800 600'
      const [vbx, vby, vbw, vbh] = vb.trim().split(/[\s,]+/).map(Number)
      const svgW = parseFloat(svg.getAttribute('width')) || svgRect.width
      const svgH = parseFloat(svg.getAttribute('height')) || svgRect.height
      const scx = vbw / svgW, scy = vbh / svgH
      cx = (center.x - svgRect.left) * scx + vbx
      cy = (center.y - svgRect.top) * scy + vby
    }
    for (const el of selectedRefs.current) {
      if (!document.contains(el)) continue
      try {
        const cur = el.getAttribute('transform') || ''
        const cleaned = cur.replace(/rotate\s*\([^)]*\)\s*/g, '').trim()
        el.setAttribute('transform', `rotate(${angle} ${cx} ${cy})${cleaned ? ' ' + cleaned : ''}`)
      } catch { /* detached */ }
    }
    updateOverlayPositions()
  }, [selectedRefs, updateOverlayPositions])

  const handleRotationChange = useCallback((angle) => {
    const a = isNaN(angle) ? 0 : angle
    setRotationAngle(a)
    applyRotationToElements(a)
    const svg = containerRef.current?.querySelector('svg')
    if (svg) bakeTransforms(svg)
    syncToEditor()
  }, [applyRotationToElements, syncToEditor])

  const getUnionOverlayRect = useCallback(() => {
    if (overlays.length === 0) return null
    return overlays.reduce((acc, o) => ({
      left: Math.min(acc.left, o.left),
      top: Math.min(acc.top, o.top),
      right: Math.max(acc.right, o.left + o.width),
      bottom: Math.max(acc.bottom, o.top + o.height),
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })
  }, [overlays])

  const startRotation = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const overlayContainer = document.querySelector('.canvas-selection-layer')
    if (!overlayContainer) return
    const unionRect = getUnionOverlayRect()
    if (!unionRect) return
    const ocRect = overlayContainer.getBoundingClientRect()
    const centerX = ocRect.left + unionRect.left + (unionRect.right - unionRect.left) / 2
    const centerY = ocRect.top + unionRect.top + (unionRect.bottom - unionRect.top) / 2
    rotationStartRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
    rotationInitialRef.current = rotationAngle
    setIsRotating(true)
    
    // Store shift key state for precise rotation
    const isShiftKey = e.shiftKey

    const svg = containerRef.current?.querySelector('svg')
    let svgCenter = null
    if (svg && rotateCenterRef.current) {
      const svgRect = svg.getBoundingClientRect()
      const vb = svg.getAttribute('viewBox') || '0 0 800 600'
      const [vbx, vby, vbw, vbh] = vb.trim().split(/[\s,]+/).map(Number)
      const svgW = parseFloat(svg.getAttribute('width')) || svgRect.width
      const svgH = parseFloat(svg.getAttribute('height')) || svgRect.height
      const scx = vbw / svgW, scy = vbh / svgH
      const c = rotateCenterRef.current
      svgCenter = {
        x: (c.x - svgRect.left) * scx + vbx,
        y: (c.y - svgRect.top) * scy + vby,
      }
      rotationSvgCenterRef.current = svgCenter
    }

    const onMove = (ev) => {
      const currentAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI)
      let delta = currentAngle - rotationStartRef.current
      let newAngle = rotationInitialRef.current + delta
      
      // Precise rotation with Shift: snap to 10-degree increments
      if (ev.shiftKey || isShiftKey) {
        newAngle = Math.round(newAngle / 10) * 10
      }
      
      // Normalize angle to 0-360 range
      newAngle = ((newAngle % 360) + 360) % 360
      const rounded = Math.round(newAngle)
      setRotationAngle(rounded)
      applyRotationToElements(rounded, svgCenter || rotationSvgCenterRef.current)
    }

    const onUp = () => {
      setIsRotating(false)
      rotationSvgCenterRef.current = null
      rotationStartRef.current = null
      syncToEditor()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [getUnionOverlayRect, rotationAngle, applyRotationToElements, syncToEditor, setIsRotating])

  const handleArtboardDragStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const vb = svg.getAttribute('viewBox')
    if (!vb) return
    const parts = vb.trim().split(/[\s,]+/).map(Number)
    if (parts.length !== 4) return

    artboardDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startVbX: parts[0],
      startVbY: parts[1],
      vbW: parts[2],
      vbH: parts[3],
      zoom: zoomRef.current,
    }

    const onMove = (ev) => {
      const drag = artboardDragRef.current
      if (!drag) return
      const dx = ev.clientX - drag.startX
      const dy = ev.clientY - drag.startY
      const newVbX = drag.startVbX + dx / drag.zoom
      const newVbY = drag.startVbY + dy / drag.zoom
      const svg = containerRef.current?.querySelector('svg')
      if (!svg) return
      svg.setAttribute('viewBox', `${newVbX} ${newVbY} ${drag.vbW} ${drag.vbH}`)
    }

    const onUp = () => {
      artboardDragRef.current = null
      syncToEditor()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
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
        clearSelections: () => clearSelection(),
        performDelete,
        performDeleteAll,
        performDeleteUnselected,
        performCopy,
        performCut,
        performPaste,
        performExtract,
        performGroup,
        cleanEmptyGroups,
        cleanEmptyAll,
        countEmptyGroups,
        removeEmptyGroups,
        rotateSelected: (angle) => { setRotationAngle(angle); applyRotationToElements(angle); syncToEditor() },
        selectByOuterHTML,
        selectAtCursorPos,
        selectElementRef: (el) => {
          if (!el || !document.contains(el)) return
          selectedRefs.current.clear()
          selectedRefs.current.add(el)
          onSelectionChange(1)
          onSelectionUpdate?.(selectedRefs.current)
          applySelectionStyles()
          updateOverlayPositions()
        },
        getContentBBox: () => {
          const svg = containerRef.current?.querySelector('svg')
          if (!svg) return null
          try {
            let bbox = null
            for (const child of svg.children) {
              if (typeof child.getBBox !== 'function') continue
              const cb = child.getBBox()
              if (cb.width === 0 && cb.height === 0) continue
              if (bbox === null) {
                bbox = { x: cb.x, y: cb.y, w: cb.width, h: cb.height }
              } else {
                const x1 = Math.min(bbox.x, cb.x)
                const y1 = Math.min(bbox.y, cb.y)
                const x2 = Math.max(bbox.x + bbox.w, cb.x + cb.width)
                const y2 = Math.max(bbox.y + bbox.h, cb.y + cb.height)
                bbox = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
              }
            }
            return bbox
          } catch { return null }
        },
        zoomToContent: () => {
          const svg = containerRef.current?.querySelector('svg')
          const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
          if (!svg || !scrollEl) return
          try {
            let bbox = null
            for (const child of svg.children) {
              if (typeof child.getBBox !== 'function') continue
              const cb = child.getBBox()
              if (cb.width === 0 && cb.height === 0) continue
              if (bbox === null) {
                bbox = { x: cb.x, y: cb.y, w: cb.width, h: cb.height }
              } else {
                const x1 = Math.min(bbox.x, cb.x)
                const y1 = Math.min(bbox.y, cb.y)
                const x2 = Math.max(bbox.x + bbox.w, cb.x + cb.width)
                const y2 = Math.max(bbox.y + bbox.h, cb.y + cb.height)
                bbox = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
              }
            }
            if (!bbox || bbox.w === 0 || bbox.h === 0) return
            const vb = svg.getAttribute('viewBox')
            const parts = vb?.trim().split(/[\s,]+/).map(Number)
            if (!parts || parts.length !== 4) return
            const [vbX, vbY, vbW, vbH] = parts
            const vs = viewportSizeRef.current
            const viewW = scrollEl.clientWidth
            const viewH = scrollEl.clientHeight
            const curZ = zoomRef.current
            const padding = 40
            const newZoom = Math.min((viewW - padding * 2) / bbox.w, (viewH - padding * 2) / bbox.h)
            if (newZoom <= 0) return
            const centerSvgX = bbox.x + bbox.w / 2
            const centerSvgY = bbox.y + bbox.h / 2
            const newSvgW = vbW * newZoom
            const newSvgH = vbH * newZoom
            const cw = Math.max(CANVAS_SIZE * newZoom, vs.w)
            const ch = Math.max(CANVAS_SIZE * newZoom, vs.h)
            const newSvgLeft = cw / 2 - newSvgW / 2
            const newSvgTop = ch / 2 - newSvgH / 2
            const targetX = newSvgLeft + (centerSvgX - vbX) * newZoom
            const targetY = newSvgTop + (centerSvgY - vbY) * newZoom
            setZoom(z => +(newZoom).toFixed(2))
            scrollEl.scrollTo({ left: targetX - viewW / 2, top: targetY - viewH / 2, behavior: 'smooth' })
          } catch {}
        },
        zoomToCenter: () => {
          const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
          const vs = viewportSizeRef.current
          setZoom(1)
          if (scrollEl) {
            const half = CANVAS_SIZE / 2
            scrollEl.scrollTo({ left: half - vs.w / 2, top: half - vs.h / 2, behavior: 'smooth' })
          }
        },
        centerOnElement: (el) => {
          const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
          if (!scrollEl || !document.contains(el)) return
          try {
            const contentRect = containerRef.current.getBoundingClientRect()
            const elRect = el.getBoundingClientRect()
            const cx = elRect.left + elRect.width / 2 - contentRect.left
            const cy = elRect.top + elRect.height / 2 - contentRect.top
            scrollEl.scrollTo({ left: Math.max(0, cx - scrollEl.clientWidth / 2), top: Math.max(0, cy - scrollEl.clientHeight / 2), behavior: 'smooth' })
          } catch {}
        },
        activateRectZoom: () => {
          rectZoomRef.current = true
        },
      }
    }
  }, [actionsRef, performDelete, performCopy, performCut, performPaste, performExtract, performGroup, cleanEmptyGroups, selectByOuterHTML, selectAtCursorPos, zoom, wrapperRef, containerRef])

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
    const blockSpaceMouse = (e) => {
      if (spaceDownRef.current && (e.button === 0 || e.button === 1)) {
        e.preventDefault()
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Control' && !transientTool && !draggingRef.current && !isPanningRef.current) {
        savedToolRef.current = activeTool
        setTransientTool('move')
      }
      if (e.key === ' ' && !e.repeat && !isPanningRef.current) {
        const isEditing = document.activeElement?.tagName === 'TEXTAREA' ||
                          document.activeElement?.tagName === 'INPUT'
        if (isEditing) return
        e.preventDefault()
        spaceDownRef.current = true
        setSpaceDown(true)
        window.addEventListener('mousedown', blockSpaceMouse, true)
      }
      if (activeTool === 'brush-select') {
        const step = e.shiftKey ? 1 : 5
        if (e.key === '[') {
          e.preventDefault()
          onBrushSizeChangeRef.current?.(Math.max(5, brushSizeRef.current - step))
        }
        if (e.key === ']') {
          e.preventDefault()
          onBrushSizeChangeRef.current?.(Math.min(200, brushSizeRef.current + step))
        }
      }
    }
    const onKeyUp = (e) => {
      if (e.key === 'Control' && transientTool) {
        setTransientTool(null)
        savedToolRef.current = null
      }
      if (e.key === ' ') {
        spaceDownRef.current = false
        setSpaceDown(false)
        window.removeEventListener('mousedown', blockSpaceMouse, true)
      }
    }
    const onKeyPress = (e) => {
      if (e.key === ' ') e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keypress', onKeyPress)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keypress', onKeyPress)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousedown', blockSpaceMouse, true)
    }
  }, [transientTool, activeTool, onTransientChange])

  useEffect(() => {
    onTransientChange?.(transientTool)
  }, [transientTool, onTransientChange])

  // CSS-driven selection styling (avoids per-element inline style operations)
  useEffect(() => {
    let styleEl = document.getElementById('__marquee_selection_styles')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = '__marquee_selection_styles'
      document.head.appendChild(styleEl)
    }
    if (activeTool === 'path-select' || activeTool === 'brush-select') {
      styleEl.textContent = `
        [data-marq-selected] {
          stroke: ${SELECTION_COLOR} !important;
          stroke-width: 2px !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
          fill: rgba(0, 153, 255, 0.2) !important;
        }
      `
    } else {
      styleEl.textContent = `
        [data-marq-selected] {
          outline: 2px solid ${SELECTION_COLOR} !important;
          outline-offset: -1px !important;
        }
      `
    }
    return () => { styleEl?.remove() }
  }, [activeTool])

  // Temporary CSS injection for visualization
  useEffect(() => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const existing = svg.querySelector('#__vis_css')
    if (visualCssEnabled) {
      let content = cssContent || `
        * { transition: fill 0.15s, stroke 0.15s, opacity 0.15s; }
        *:hover { fill: rgba(0, 153, 255, 0.15) !important; stroke: #09f !important; stroke-width: 1.5 !important; }
      `
      if (cssPseudoDisabled) {
        content = content.replace(/[^{]*\{[^}]*\}/g, (match) => {
          const sel = match.split('{')[0].trim()
          if (/:(hover|active|focus|visited|link|focus-within|focus-visible|target)\b/i.test(sel)) return ''
          return match
        })
      }
      if (existing) {
        existing.textContent = content
      } else {
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
        style.id = '__vis_css'
        style.textContent = content
        svg.appendChild(style)
      }
    } else {
      existing?.remove()
    }
  }, [visualCssEnabled, cssContent, cssPseudoDisabled])

  const initialCenteredRef = useRef(false)

  useLayoutEffect(() => {
    if (scrollTargetRef.current) {
      const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
      if (scrollEl) {
        const maxX = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth)
        const maxY = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
        scrollEl.scrollLeft = scrollTargetRef.current.ratioX * maxX
        scrollEl.scrollTop = scrollTargetRef.current.ratioY * maxY
        scrollTargetRef.current = null
      }
    }
  })

  useEffect(() => {
    if (initialCenteredRef.current) return
    initialCenteredRef.current = true
    const raf = requestAnimationFrame(() => {
      const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
      if (scrollEl) {
        const viewW = scrollEl.clientWidth
        const viewH = scrollEl.clientHeight
        const contentW = scrollEl.scrollWidth
        const contentH = scrollEl.scrollHeight
        scrollEl.scrollTo({
          left: Math.max(0, (contentW - viewW) / 2),
          top: Math.max(0, (contentH - viewH) / 2),
        })
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const el = wrapperRef.current?.querySelector('.canvas-scroll')
    if (!el) return
    setViewportSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(([entry]) => {
      setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e) => {
      if (effectiveTool !== 'zoom' && !e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const step = e.shiftKey ? 0.03 : 0.1
      const delta = e.deltaY > 0 ? -step : step
      const newZoom = Math.max(0.1, Math.min(5, +(zoomRef.current + delta).toFixed(2)))
      const scrollEl = el.querySelector('.canvas-scroll')
      if (scrollEl && newZoom !== zoomRef.current) {
        const viewW = scrollEl.clientWidth
        const viewH = scrollEl.clientHeight
        const maxX = Math.max(0, scrollEl.scrollWidth - viewW)
        const maxY = Math.max(0, scrollEl.scrollHeight - viewH)
        const ratioX = maxX > 0 ? scrollEl.scrollLeft / maxX : 0.5
        const ratioY = maxY > 0 ? scrollEl.scrollTop / maxY : 0.5
        scrollTargetRef.current = { ratioX, ratioY }
      }
      setZoom(newZoom)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [effectiveTool])

  const startDrag = useCallback((e) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    draggingRef.current = true
    setDragging(true)
    draggedRef.current = false
    clickedElementRef.current = e.target
    setMarqueeStyle({
      left: e.clientX,
      top: e.clientY,
      width: 0,
      height: 0,
    })
    window.addEventListener('mousemove', stableMouseMove)
    window.addEventListener('mouseup', stableMouseUp)
  }, [stableMouseMove, stableMouseUp])

  const startPan = useCallback((e) => {
    const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
    if (!scrollEl) return
    isPanningRef.current = true
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
    scrollStartRef.current = { x: scrollEl.scrollLeft, y: scrollEl.scrollTop }

    const onMove = (ev) => {
      if (!isPanningRef.current || !scrollStartRef.current || !panStartRef.current) return
      scrollEl.scrollLeft = scrollStartRef.current.x - (ev.clientX - panStartRef.current.x)
      scrollEl.scrollTop = scrollStartRef.current.y - (ev.clientY - panStartRef.current.y)
    }
    const onUp = () => {
      isPanningRef.current = false
      setIsPanning(false)
      panStartRef.current = null
      scrollStartRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      e.preventDefault()
      e.stopPropagation()
      startPan(e)
      return
    }
    if (e.button === 2) return
    const target = e.target
    if (!containerRef.current) return
    if (target === containerRef.current) {
      if (effectiveTool === 'zoom') return
      if (effectiveTool === 'brush-select') {
        startDrag(e)
        const elements = getFilteredElementsInBrush(containerRef.current, e.clientX, e.clientY, brushSizeRef.current, pathTagFilterRef.current)
        if (e.shiftKey) {
          elements.forEach(el => selectedRefs.current.delete(el))
        } else {
          elements.forEach(el => selectedRefs.current.add(el))
        }
        onSelectionChange(selectedRefs.current.size)
        onSelectionUpdate?.(selectedRefs.current)
        applySelectionStyles()
        updateOverlayPositions()
        return
      }
      clearSelection()
      startDrag(e)
      return
    }
    if (effectiveTool === 'zoom') {
      if (rectZoomRef.current) {
        startDrag(e)
        rectZoomDragRef.current = true
      }
      return
    }
    if (effectiveTool === 'select') {
      const tag = pathTagFilterRef.current
      const matched = tag === 'any'
        ? (isLeafElement(target) || target.tagName.toLowerCase() === 'g' || isGroupElement(target) ? target : null)
        : findNearestByTag(target, tag)
      if (matched) {
        selectElement(matched, e.shiftKey)
      } else {
        clearSelection()
      }
      startDrag(e)
    } else if (effectiveTool === 'move') {
      if (selectedRefs.current.size > 0 && selectedRefs.current.has(target)) {
        startDrag(e)
        dragMoveRef.current = true
        dragOrigTransformsRef.current = new Map()
        dragOrigCtmRef.current = new Map()
        for (const el of selectedRefs.current) {
          if (document.contains(el)) {
            dragOrigTransformsRef.current.set(el, el.getAttribute('transform') || '')
            dragOrigCtmRef.current.set(el, el.getCTM())
          }
        }
      } else {
        clearSelection()
      }
    } else if (effectiveTool === 'path-select') {
      const tag = pathTagFilterRef.current
      const matched = tag === 'any'
        ? (isLeafElement(target) || target.tagName.toLowerCase() === 'g' || isGroupElement(target) ? target : null)
        : findNearestByTag(target, tag)
      if (matched) {
        selectElement(matched, e.shiftKey)
      } else {
        clearSelection()
      }
      startDrag(e)
    } else if (effectiveTool === 'brush-select') {
      const tag = pathTagFilterRef.current
      startDrag(e)
      const elements = getFilteredElementsInBrush(containerRef.current, e.clientX, e.clientY, brushSizeRef.current, tag)
      if (e.shiftKey) {
        elements.forEach(el => selectedRefs.current.delete(el))
      } else {
        elements.forEach(el => selectedRefs.current.add(el))
      }
      onSelectionChange(selectedRefs.current.size)
      onSelectionUpdate?.(selectedRefs.current)
      applySelectionStyles()
      updateOverlayPositions()
    } else if (effectiveTool === 'rotate') {
      const tag = pathTagFilterRef.current
      const matched = tag === 'any'
        ? (isLeafElement(target) || target.tagName.toLowerCase() === 'g' || isGroupElement(target) ? target : null)
        : findNearestByTag(target, tag)
      if (matched) {
        selectElement(matched, e.shiftKey)
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
  }, [effectiveTool, selectElement, clearSelection, syncToEditor, selectedRefs, onSelectionChange, applySelectionStyles, updateOverlayPositions, startPan])

  const handleDoubleClick = useCallback((e) => {
    if (effectiveTool === 'select' || effectiveTool === 'move') {
      const target = e.target
      const isSvg = target.tagName === target.tagName?.toLowerCase()
      if (isSvg && (isLeafElement(target) || target.tagName.toLowerCase() === 'g' || isGroupElement(target))) {
        onOpenGroupModal(target)
      }
    }
  }, [effectiveTool, onOpenGroupModal])

  const handleMouseMove = useCallback((e) => {
    if (isPanningRef.current) return
    if (!draggingRef.current || !dragStart.current || !containerRef.current) return

    lastMoveClientX.current = e.clientX
    lastMoveClientY.current = e.clientY

    // Drag-to-move selected elements
    if (dragMoveRef.current && selectedRefs.current.size > 0) {
      const now = Date.now()
      if (now - moveThrottleRef.current > 16) {
        moveThrottleRef.current = now
        const svg = containerRef.current.querySelector('svg')
        if (svg) {
          const rawDx = e.clientX - dragStart.current.x
          const rawDy = e.clientY - dragStart.current.y
          if (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3) draggedRef.current = true
          if (Math.abs(rawDx) > 0.5 || Math.abs(rawDy) > 0.5) {
            for (const el of selectedRefs.current) {
              if (document.contains(el)) {
                const origCtm = dragOrigCtmRef.current?.get(el)
                const orig = dragOrigTransformsRef.current?.get(el) || ''
                if (origCtm) {
                  const inv = origCtm.inverse()
                  const ld = inv.a * rawDx + inv.c * rawDy
                  const rd = inv.b * rawDx + inv.d * rawDy
                  el.setAttribute('transform', `${orig} translate(${ld.toFixed(2)}, ${rd.toFixed(2)})`)
                } else {
                  const curZ = zoomRef.current
                  el.setAttribute('transform', `${orig} translate(${(rawDx / curZ).toFixed(2)}, ${(rawDy / curZ).toFixed(2)})`)
                }
              }
            }
          }
        }
      }
      return
    }

    const dx = Math.abs(e.clientX - dragStart.current.x)
    const dy = Math.abs(e.clientY - dragStart.current.y)
    if (dx > 3 || dy > 3) draggedRef.current = true

    setMarqueeStyle({
      left: Math.min(dragStart.current.x, e.clientX),
      top: Math.min(dragStart.current.y, e.clientY),
      width: Math.abs(e.clientX - dragStart.current.x),
      height: Math.abs(e.clientY - dragStart.current.y),
    })

    if (activeTool === 'select' || activeTool === 'path-select' || activeTool === 'brush-select') {
      const now = Date.now()
      if (now - selectionThrottleRef.current < 40 && selectionRAFRef.current) return
      selectionThrottleRef.current = now
      if (selectionRAFRef.current) cancelAnimationFrame(selectionRAFRef.current)
      selectionRAFRef.current = requestAnimationFrame(() => {
        selectionRAFRef.current = null
        if (!containerRef.current || !dragStart.current) return
        if (activeTool === 'brush-select') {
          const elements = getFilteredElementsInBrush(containerRef.current, e.clientX, e.clientY, brushSizeRef.current, pathTagFilterRef.current)
          if (e.shiftKey) {
            elements.forEach(el => selectedRefs.current.delete(el))
          } else {
            elements.forEach(el => selectedRefs.current.add(el))
          }
          onSelectionChange(selectedRefs.current.size)
          onSelectionUpdate?.(selectedRefs.current)
          applySelectionStyles()
          updateOverlayPositions()
        } else {
          const contentRect = containerRef.current.getBoundingClientRect()
          const cLeft = Math.min(dragStart.current.x, lastMoveClientX.current) - contentRect.left
          const cTop = Math.min(dragStart.current.y, lastMoveClientY.current) - contentRect.top
          const cW = Math.abs(lastMoveClientX.current - dragStart.current.x)
          const cH = Math.abs(lastMoveClientY.current - dragStart.current.y)
          if (cW < 3 && cH < 3) return
          const marqueeRect = {
            left: cLeft,
            top: cTop,
            right: cLeft + cW,
            bottom: cTop + cH,
          }
          const filtered = getFilteredElementsInRect(containerRef.current, marqueeRect, pathTagFilterRef.current)
          if (e.shiftKey) {
            filtered.forEach(el => selectedRefs.current.delete(el))
          } else {
            selectedRefs.current.clear()
            filtered.forEach(el => selectedRefs.current.add(el))
          }
          onSelectionChange(selectedRefs.current.size)
          onSelectionUpdate?.(selectedRefs.current)
          applySelectionStyles()
          updateOverlayPositions()
        }
      })
    }
  }, [activeTool, selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions])

  const handleCanvasHover = useCallback((e) => {
    if (effectiveTool === 'brush-select') {
      setBrushPos({ x: e.clientX, y: e.clientY })
    }
  }, [effectiveTool])

  const handleCanvasLeave = useCallback(() => {
    setBrushPos(null)
  }, [])

  const handleMouseUp = useCallback((e) => {
    if (isPanningRef.current) return

    // Finalize drag-to-move
    if (dragMoveRef.current) {
      dragMoveRef.current = false
      dragOrigTransformsRef.current = null
      dragOrigCtmRef.current = null
      if (draggedRef.current) {
        const svg = containerRef.current?.querySelector('svg')
        if (svg) bakeTransforms(svg)
        syncToEditor()
      }
    }

    if (!draggingRef.current) return

    const clickedElement = clickedElementRef.current

    // Rect zoom: zoom to the dragged rectangle and center viewport
    if (rectZoomDragRef.current && draggedRef.current && marqueeStyle) {
      const marquee = marqueeStyle
      const wrapper = wrapperRef.current
      const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
      if (wrapper && scrollEl) {
        const wrapperRect = wrapper.getBoundingClientRect()
        const rx = marquee.left - wrapperRect.left
        const ry = marquee.top - wrapperRect.top
        const rw = marquee.width
        const rh = marquee.height
        if (rw > 10 && rh > 10) {
          const svg = containerRef.current?.querySelector('svg')
          if (svg) {
            const svgRect = svg.getBoundingClientRect()
            const vb = svg.getAttribute('viewBox')
            if (vb) {
              const parts = vb.trim().split(/[\s,]+/).map(Number)
              if (parts.length === 4) {
                const [vbX, vbY, vbW, vbH] = parts
                const currentZoom = svgRect.width / vbW
                const newZoom = Math.min(wrapperRect.width / rw, wrapperRect.height / rh) * currentZoom

                // SVG content coordinates at the center of the dragged rectangle
                const mcx = rx + rw / 2
                const mcy = ry + rh / 2
                const svgOffsetX = mcx - (svgRect.left - wrapperRect.left)
                const svgOffsetY = mcy - (svgRect.top - wrapperRect.top)
                const svgCx = svgOffsetX / svgRect.width * vbW + vbX
                const svgCy = svgOffsetY / svgRect.height * vbH + vbY

                // Where that SVG point sits in content coords after zoom
                const newSvgW = vbW * newZoom
                const newSvgH = vbH * newZoom
                const cw = Math.max(CANVAS_SIZE * newZoom, scrollEl.clientWidth)
                const ch = Math.max(CANVAS_SIZE * newZoom, scrollEl.clientHeight)
                const newSvgLeft = cw / 2 - newSvgW / 2
                const newSvgTop = ch / 2 - newSvgH / 2
                const targetX = newSvgLeft + (svgCx - vbX) * newZoom
                const targetY = newSvgTop + (svgCy - vbY) * newZoom

                setZoom(z => Math.max(0.1, Math.min(5, +(newZoom).toFixed(2))))
                scrollEl.scrollTo({ left: targetX - wrapperRect.width / 2, top: targetY - wrapperRect.height / 2 })
              }
            }
          }
        }
      }
      rectZoomRef.current = false
      rectZoomDragRef.current = false
    }

    // If no meaningful drag happened, select the clicked element (only for move tool)
    // select tool now handles selection in mousedown (like path-select)
    if (!draggedRef.current && clickedElement) {
      if (effectiveTool === 'move') {
        const isSvgContent =
          clickedElement.tagName === clickedElement.tagName?.toLowerCase() &&
          (isLeafElement(clickedElement) ||
            clickedElement.tagName?.toLowerCase() === 'g' ||
            isGroupElement(clickedElement))
        if (isSvgContent) {
          if (e.shiftKey) {
            selectedRefs.current.delete(clickedElement)
          } else {
            selectedRefs.current.clear()
            selectedRefs.current.add(clickedElement)
          }
          onSelectionChange(selectedRefs.current.size)
          onSelectionUpdate?.(selectedRefs.current)
          applySelectionStyles()
          updateOverlayPositions()
        } else {
          onSelectionChange(0)
          onSelectionUpdate?.(new Set())
          applySelectionStyles()
          updateOverlayPositions()
        }
      }
      clickedElementRef.current = null
    }

    draggingRef.current = false
    dragMoveRef.current = false
    dragOrigTransformsRef.current = null
    dragOrigCtmRef.current = null
    if (selectionRAFRef.current) { cancelAnimationFrame(selectionRAFRef.current); selectionRAFRef.current = null }
    setDragging(false)
    setMarqueeStyle(null)
    dragStart.current = null
    draggedRef.current = false
    window.removeEventListener('mousemove', stableMouseMove)
    window.removeEventListener('mouseup', stableMouseUp)
  }, [effectiveTool, selectedRefs, onSelectionChange, onSelectionUpdate, applySelectionStyles, updateOverlayPositions, stableMouseMove, stableMouseUp, marqueeStyle])

  const zoomReset = useCallback(() => {
    const scrollEl = wrapperRef.current?.querySelector('.canvas-scroll')
    if (scrollEl) {
      const viewW = scrollEl.clientWidth
      const viewH = scrollEl.clientHeight
      const maxX = Math.max(0, scrollEl.scrollWidth - viewW)
      const maxY = Math.max(0, scrollEl.scrollHeight - viewH)
      const half = CANVAS_SIZE / 2
      const targetLeft = Math.max(0, half - viewW / 2)
      const targetTop = Math.max(0, half - viewH / 2)
      scrollTargetRef.current = {
        ratioX: maxX > 0 ? targetLeft / maxX : 0.5,
        ratioY: maxY > 0 ? targetTop / maxY : 0.5,
      }
    }
    setZoom(1)
  }, [])

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
      const tag = pathTagFilterRef.current
      const selectTarget = tag !== 'any' ? findNearestByTag(target, tag) : target
      if (selectTarget) {
        selectedRefs.current.clear()
        selectedRefs.current.add(selectTarget)
        onSelectionChange(1)
        applySelectionStyles()
        updateOverlayPositions()
      }
    }
    onSelectionUpdate?.(selectedRefs.current)
    const desc = getElementPathDescription(target)
    onOpenContextMenu(e.clientX, e.clientY, target, desc, selectedRefs.current.size > 0)
  }, [selectedRefs, onSelectionChange, onSelectionUpdate, onOpenContextMenu, applySelectionStyles, updateOverlayPositions])

  const contentSize = {
    w: Math.max(CANVAS_SIZE * zoom, viewportSize.w),
    h: Math.max(CANVAS_SIZE * zoom, viewportSize.h),
  }
  const contentCenter = contentSize.w / 2
  const svgLeft = (contentSize.w - svgSize.w * zoom) / 2
  const svgTop = (contentSize.h - svgSize.h * zoom) / 2

  return (
    <div className="canvas-panel">
      <div className="canvas-floating-bar">
        <span className="canvas-dimension">{svgSize.w} × {svgSize.h}</span>
        <button className="canvas-zoom-val" onClick={zoomReset} title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <span className="canvas-floating-sep" />
        <span className="canvas-pan-hint" title="Middle-click or Space+drag to pan">✥ Pan</span>
        {overlays.length > 0 && (
          <>
            <span className="canvas-floating-sep" />
            <div className="rotation-control">
              <input
                type="number"
                className="rotation-input"
                value={rotationAngle}
                onChange={(e) => handleRotationChange(parseFloat(e.target.value) || 0)}
                min="-360"
                max="360"
                step="1"
                title="Rotation angle"
              />
              <span className="rotation-label">°</span>
              <button
                className="rotation-reset-btn"
                onClick={() => handleRotationChange(0)}
                title="Reset rotation"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
              </button>
            </div>
          </>
        )}
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
        className={`canvas-wrapper${effectiveTool === 'zoom' ? ' cursor-zoom' : ''}${effectiveTool === 'rotate' && selectedRefs.current.size > 0 ? ' rotate-mode' : ''}${dragOver ? ' canvas-drop-over' : ''}${spaceDown ? ' pan-mode' : ''}${isPanning ? ' pan-active' : ''}`}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleCanvasHover}
        onMouseLeave={handleCanvasLeave}
      >
        <div className="canvas-scroll">
          <div
            ref={containerRef}
            className="canvas-content"
            style={{ width: contentSize.w, height: contentSize.h }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
          >
            <div className="canvas-crosshair" style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            }}>
              <svg width="100%" height="100%" style={{ display: 'block' }}>
                <line x1={contentCenter - 20} y1={contentCenter} x2={contentCenter + 20} y2={contentCenter}
                  stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line x1={contentCenter} y1={contentCenter - 20} x2={contentCenter} y2={contentCenter + 20}
                  stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <circle cx={contentCenter} cy={contentCenter} r="2"
                  fill="rgba(255,255,255,0.25)" />
              </svg>
            </div>
            <div className="artboard-name-label"
              style={{
                left: Math.max(4, svgLeft),
                top: Math.max(2, svgTop - 22),
              }}
              onMouseDown={handleArtboardDragStart}
            >
              {artboardName}
            </div>
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
              {overlays.length > 0 && (() => {
                const r = overlays.reduce((acc, o) => ({
                  left: Math.min(acc.left, o.left),
                  top: Math.min(acc.top, o.top),
                  right: Math.max(acc.right, o.left + o.width),
                  bottom: Math.max(acc.bottom, o.top + o.height),
                }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })
                const midX = (r.left + r.right) / 2
                const midY = (r.top + r.bottom) / 2
                const hSize = 10
                const eSize = 8
                const rotR = 14
                const corners = [
                  { x: r.left, y: r.top, cur: 'nwse-resize' },
                  { x: r.right, y: r.top, cur: 'nesw-resize' },
                  { x: r.right, y: r.bottom, cur: 'nwse-resize' },
                  { x: r.left, y: r.bottom, cur: 'nesw-resize' },
                ]
                const edges = [
                  { x: midX, y: r.top, cur: 'ns-resize' },
                  { x: r.right, y: midY, cur: 'ew-resize' },
                  { x: midX, y: r.bottom, cur: 'ns-resize' },
                  { x: r.left, y: midY, cur: 'ew-resize' },
                ]
                return (
                  <>
                    {corners.map((c, i) => (
                      <div key={`rz-${i}`}
                        className="rotation-zone"
                        onMouseDown={startRotation}
                        style={{
                          position: 'absolute',
                          left: c.x - rotR,
                          top: c.y - rotR,
                          width: rotR * 2,
                          height: rotR * 2,
                        }}
                        title="Drag to rotate (Shift for 10° increments)"
                      />
                    ))}
                    {corners.map((c, i) => (
                      <div key={`c-${i}`}
                        className="resize-handle"
                        style={{
                          position: 'absolute',
                          left: c.x - hSize / 2,
                          top: c.y - hSize / 2,
                          width: hSize,
                          height: hSize,
                          cursor: c.cur,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ))}
                    {edges.map((c, i) => (
                      <div key={`e-${i}`}
                        className="resize-handle-edge"
                        style={{
                          position: 'absolute',
                          left: c.x - eSize / 2,
                          top: c.y - eSize / 2,
                          width: eSize,
                          height: eSize,
                          cursor: c.cur,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ))}
                    {isRotating && (
                      <div key="pivot" className="rotation-pivot"
                        style={{
                          position: 'absolute',
                          left: midX - 7,
                          top: midY - 7,
                          width: 14,
                          height: 14,
                        }}
                      />
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
        {dragOver && <div className="canvas-drop-indicator">Drop SVG file here</div>}
      </div>
      {activeTool !== 'brush-select' && marqueeStyle && (
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
      {activeTool === 'brush-select' && brushPos && (
        <div
          className="brush-circle"
          style={{
            left: brushPos.x,
            top: brushPos.y,
            width: brushSize * 2,
            height: brushSize * 2,
          }}
        />
      )}
      {parsing && <div className="canvas-loading"><div className="canvas-loading-spinner" /></div>}
    </div>
  )
}

export default memo(Canvas)
