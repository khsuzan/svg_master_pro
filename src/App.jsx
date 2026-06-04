import { useState, useRef, useCallback, useEffect } from 'react'
import { saveState, loadState } from './utils/storage'
import Toolbar from './components/Toolbar'
import CodePanel from './components/CodePanel'
import LayerPanel from './components/LayerPanel'
import Canvas from './components/Canvas'
import ContextMenu from './components/ContextMenu'
import CssPanel from './components/CssPanel'
import GroupModal from './components/GroupModal'
import ArtboardModal from './components/ArtboardModal'
import ConfirmModal from './components/ConfirmModal'
import { setElementAttributes } from './utils/domUtils'
import { serializeContainer, prettyPrint, minifyHtml, isPrettified, stripSelectionMarkers } from './utils/serializer'
import { updateSvgAttrs } from './components/ArtboardModal'
import './App.css'

const DEFAULT_CODE = `<svg width="1024" height="512" viewBox="0 0 1024 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Frame 2">
    <rect width="1024" height="512" fill="white"/>
    <g id="Group 2">
      <path id="Vector" d="M405.333 234.667L288 352L224 288L277.333 234.667H405.333Z" fill="#40C4FF"/>
      <path id="Vector_2" d="M405.333 469.333H277.333L224 416L288 352L405.333 469.333Z" fill="#01579B"/>
      <path id="Vector_3" d="M223.991 288.002L159.995 352.001L223.994 415.998L287.99 351.999L223.991 288.002Z" fill="#03A9F4"/>
      <path id="Vector_4" d="M224 416L320 384L288 352L224 416Z" fill="#084994"/>
      <path id="Vector_5" d="M277.333 42.6667L64 256L128 320L405.333 42.6667H277.333Z" fill="#40C4FF"/>
    </g>
    <g id="Group 1">
      <path id="Vector_6" d="M618.667 234.667L736 352L800 288L746.667 234.667H618.667Z" fill="#40C4FF"/>
      <path id="Vector_7" d="M618.667 469.333H746.667L800 416L736 352L618.667 469.333Z" fill="#01579B"/>
      <path id="Vector_8" d="M800.009 288.002L864.005 352.001L800.006 415.998L736.01 351.999L800.009 288.002Z" fill="#03A9F4"/>
      <path id="Vector_9" d="M800 416L704 384L736 352L800 416Z" fill="#084994"/>
      <path id="Vector_10" d="M746.667 42.6667L960 256L896 320L618.667 42.6667H746.667Z" fill="#40C4FF"/>
    </g>
  </g>
</svg>`

export default function App() {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_CODE)
  const [activeTool, setActiveTool] = useState('select')
  const [selectedCount, setSelectedCount] = useState(0)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, hasSelection: false })
  const [groupModal, setGroupModal] = useState({ visible: false, target: null })
  const [codePanelVisible, setCodePanelVisible] = useState(true)
  const [leftPanelTab, setLeftPanelTab] = useState('layers')
  const [selectedElement, setSelectedElement] = useState(null)
  const [artboardModal, setArtboardModal] = useState({ visible: false })
  const [parsing, setParsing] = useState(false)
  const [pathTagFilter, setPathTagFilter] = useState('any')
  const [visualCssEnabled, setVisualCssEnabled] = useState(false)
  const [cssContent, setCssContent] = useState('')
  const [cssPseudoDisabled, setCssPseudoDisabled] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')
  const saveInputRef = useRef(null)
  const [transientTool, setTransientTool] = useState(null)
  const [removalModal, setRemovalModal] = useState({ visible: false, tagSelector: 'g, div, section', count: 0 })

  const selectedRefs = useRef(new Set())
  const clipboardRef = useRef([])
  const [clipboardSize, setClipboardSize] = useState(0)
  const actionsRef = useRef(null)
  const codePanelRef = useRef(null)
  const codePrettified = isPrettified(htmlCode)

  const [history, setHistory] = useState([DEFAULT_CODE])
  const [historyIndex, setHistoryIndex] = useState(0)
  const suppressHistoryRef = useRef(false)
  const saveTimerRef = useRef(null)
  const initialLoadDoneRef = useRef(false)

  const handleCodeChange = useCallback((newCode) => {
    setHtmlCode(newCode)
    setParsing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setParsing(false)))
  }, [])

  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  const handleSelectionChange = useCallback((count) => {
    setSelectedCount(count)
  }, [])

  const handleClipboardChange = useCallback((size) => {
    setClipboardSize(size)
  }, [])

  const handleOpenContextMenu = useCallback((x, y, target, desc, hasSelection, isEmptyClick) => {
    setContextMenu({ visible: true, x, y, target, desc, hasSelection, isEmptyClick })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, hasSelection: false })
  }, [])

  const handleOpenGroupModal = useCallback((target) => {
    setGroupModal({ visible: true, target })
  }, [])

  const handleCloseGroupModal = useCallback(() => {
    setGroupModal({ visible: false, target: null })
  }, [])

  const handleCodeSelectElement = useCallback((arg1, arg2) => {
    if (typeof arg2 === 'number') {
      actionsRef.current?.selectAtCursorPos(arg1, arg2)
    } else if (typeof arg1 === 'string') {
      actionsRef.current?.selectByOuterHTML(arg1)
    }
  }, [])

  const handleLayerSelect = useCallback((el) => {
    if (!el) return
    if (document.contains(el)) {
      actionsRef.current?.selectElementRef(el)
      actionsRef.current?.centerOnElement(el)
    } else {
      actionsRef.current?.selectByOuterHTML(el.outerHTML)
    }
  }, [])

  const handleCanvasSize = useCallback(() => {
    setArtboardModal({ visible: true })
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  const handleSaveArtboard = useCallback((updatedHtml) => {
    setHtmlCode(updatedHtml)
    setParsing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setParsing(false)))
    const container = document.querySelector('.canvas-content')
    if (container) {
      container.innerHTML = updatedHtml
    }
  }, [])

  const handleSaveGroupAttributes = useCallback((target, attrs) => {
    setElementAttributes(target, attrs)
    const container = document.querySelector('.canvas-content')
    if (container) {
      const newHtml = serializeContainer(container, true)
      setHtmlCode(newHtml)
    }
  }, [])

  const handleSelectionUpdate = useCallback((selectedSet) => {
    if (!selectedSet || selectedSet.size === 0) {
      setSelectedElement(null)
      return
    }
    const els = Array.from(selectedSet).filter(el => document.contains(el))
    if (els.length === 0) {
      setSelectedElement(null)
      return
    }
    setSelectedElement(els[0])
    if (els.length === 1) {
      codePanelRef.current?.selectCodeInEditor(els[0].outerHTML)
    } else {
      els.sort((a, b) => {
        const pos = a.compareDocumentPosition(b)
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })
      codePanelRef.current?.selectRange(els.map(el => el.outerHTML))
    }
  }, [])

  const handleToggleCodePanel = useCallback(() => {
    setCodePanelVisible((v) => !v)
  }, [])

  const tagHint = pathTagFilter === 'any' ? '' : ` <${pathTagFilter}>`
  const toolHint = activeTool === 'select' ? `Click to select${tagHint} · Drag to marquee · Right-click tool for tag filter`
    : activeTool === 'path-select' ? `Click to select${tagHint} · Right-click tool for tag filter`
      : activeTool === 'zoom' ? 'Scroll to zoom · Ctrl+click to zoom out'
        : activeTool === 'brush-select' ? `Drag to paint-select${tagHint} · [ ] to resize brush · Shift to subtract · Right-click tool for tag filter`
          : activeTool === 'rotate' ? `Click to select · Drag corner to rotate · Shift+drag for 10° increments${tagHint}` : ''

  const callAction = useCallback((name, ...args) => {
    if (actionsRef.current && typeof actionsRef.current[name] === 'function') {
      actionsRef.current[name](...args)
    }
  }, [])

  const performDelete = useCallback(() => callAction('performDelete'), [callAction])
  const performDeleteAll = useCallback(() => callAction('performDeleteAll'), [callAction])
  const performDeleteUnselected = useCallback(() => callAction('performDeleteUnselected'), [callAction])
  const performCopy = useCallback(() => callAction('performCopy'), [callAction])
  const performCut = useCallback(() => callAction('performCut'), [callAction])
  const performPaste = useCallback(() => callAction('performPaste'), [callAction])
  const performExtract = useCallback(() => callAction('performExtract'), [callAction])
  const performGroup = useCallback(() => callAction('performGroup'), [callAction])
  const performSnapToCode = useCallback(() => {
    const els = Array.from(selectedRefs.current).filter(el => document.contains(el))
    if (els.length === 0) return
    const getCleanHtml = (el) => stripSelectionMarkers(el.outerHTML)
    if (els.length === 1) {
      codePanelRef.current?.selectCodeInEditor(getCleanHtml(els[0]))
    } else {
      els.sort((a, b) => {
        const pos = a.compareDocumentPosition(b)
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })
      codePanelRef.current?.selectRange(els.map(getCleanHtml))
    }
  }, [])

  const performCleanEmptyGroups = useCallback((tag) => {
    if (tag) {
      callAction('cleanEmptyGroups', tag)
    } else {
      callAction('cleanEmptyGroups')
    }
  }, [callAction])
  const performCleanEmptyAll = useCallback(() => callAction('cleanEmptyAll'), [callAction])

  const handleTransientChange = useCallback((tool) => {
    setTransientTool(tool)
  }, [])

  const handleCssChange = useCallback(({ cssContent: content, visualCssEnabled: enabled }) => {
    setCssContent(content)
    setVisualCssEnabled(enabled)
  }, [])

  const handleEmptyGroupRemoval = useCallback((tagSelector) => {
    const sel = tagSelector || 'g, div, section'
    const count = actionsRef.current?.countEmptyGroups?.(sel) ?? 0
    if (count === 0) return
    setRemovalModal({ visible: true, tagSelector: sel, count })
  }, [])

  const confirmEmptyGroupRemoval = useCallback(() => {
    callAction('removeEmptyGroups', removalModal.tagSelector)
    setRemovalModal({ visible: false, tagSelector: 'g, div, section', count: 0 })
  }, [callAction, removalModal.tagSelector])

  const cancelEmptyGroupRemoval = useCallback(() => {
    setRemovalModal({ visible: false, tagSelector: 'g, div, section', count: 0 })
  }, [])
  const performZoomToContent = useCallback(() => callAction('zoomToContent'), [callAction])
  const performZoomToCenter = useCallback(() => callAction('zoomToCenter'), [callAction])
  const performSelectZoomIn = useCallback(() => callAction('activateRectZoom'), [callAction])
  const performRotateSelected = useCallback((angle) => callAction('rotateSelected', angle), [callAction])

  const performToggleFormat = useCallback(() => {
    const result = codePrettified ? minifyHtml(htmlCode) : prettyPrint(htmlCode)
    setHtmlCode(result)
    setParsing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setParsing(false)))
    const container = document.querySelector('.canvas-content')
    if (container) {
      container.innerHTML = result
    }
  }, [htmlCode, codePrettified])

  const performClearSelections = useCallback(() => {
    callAction('clearSelections')
    setSelectedCount(0)
  }, [callAction])

  const handleMeasureContent = useCallback(() => {
    const bbox = actionsRef.current?.getContentBBox?.()
    return bbox || null
  }, [])

  const applySizing = useCallback((stretchOnly) => {
    const bbox = handleMeasureContent()
    if (!bbox) return
    const pad = 20
    const vbX = String(Math.floor(bbox.x - pad))
    const vbY = String(Math.floor(bbox.y - pad))
    const vbW = String(Math.ceil(bbox.w + pad * 2))
    const vbH = String(Math.ceil(bbox.h + pad * 2))
    const sizeW = String(Math.ceil(bbox.w + pad * 2))
    const sizeH = String(Math.ceil(bbox.h + pad * 2))
    const updated = updateSvgAttrs(htmlCode, {
      vbX, vbY, vbW, vbH,
      width: stretchOnly ? undefined : sizeW,
      height: stretchOnly ? undefined : sizeH,
    })
    handleSaveArtboard(updated)
  }, [htmlCode, handleMeasureContent, handleSaveArtboard])

  const handleCanvasSizing = useCallback(() => {
    applySizing(false)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [applySizing])

  const handleStretchViewbox = useCallback(() => {
    applySizing(true)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [applySizing])

  const downloadSvg = useCallback((name) => {
    const container = document.querySelector('.canvas-content')
    const filename = name ? `${name.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.svg` : 'svg_master.svg'
    if (!container) {
      const blob = new Blob([htmlCode], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    const svg = container.querySelector('svg')
    const svgHtml = svg ? svg.outerHTML : container.innerHTML
    const blob = new Blob([svgHtml], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [htmlCode])

  const handleSaveSvg = useCallback(() => {
    setSaveFileName('')
    setSaveModalOpen(true)
    setTimeout(() => saveInputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    if (initialLoadDoneRef.current) return
    initialLoadDoneRef.current = true
    loadState('svgCode').then((saved) => {
      if (saved && saved !== DEFAULT_CODE) {
        suppressHistoryRef.current = true
        setHtmlCode(saved)
        setHistory([saved])
        setHistoryIndex(0)
        suppressHistoryRef.current = false
      }
    })
  }, [])

  useEffect(() => {
    if (suppressHistoryRef.current || !initialLoadDoneRef.current) return
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1)
      const next = [...trimmed, htmlCode]
      if (next.length > 50) next.shift()
      return next
    })
    setHistoryIndex((i) => Math.min(i + 1, 49))
  }, [htmlCode])

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveState('svgCode', htmlCode)
      saveState('history', { entries: history, index: historyIndex })
    }, 500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [htmlCode, history, historyIndex])

  const performUndo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    suppressHistoryRef.current = true
    setHtmlCode(history[newIndex])
    setHistoryIndex(newIndex)
    suppressHistoryRef.current = false
    setParsing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setParsing(false)))
    const container = document.querySelector('.canvas-content')
    if (container) container.innerHTML = history[newIndex]
  }, [historyIndex, history])

  const performRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    suppressHistoryRef.current = true
    setHtmlCode(history[newIndex])
    setHistoryIndex(newIndex)
    suppressHistoryRef.current = false
    setParsing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setParsing(false)))
    const container = document.querySelector('.canvas-content')
    if (container) container.innerHTML = history[newIndex]
  }, [historyIndex, history])

  useEffect(() => {
    const suppressKey = (e) => {
      const isEditing = document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT'
      if (isEditing) return
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        e.preventDefault()
      }
    }
    const suppressClick = (e) => {
      if ((e.ctrlKey || e.metaKey || e.shiftKey) &&
        e.target.closest('.canvas-content')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', suppressKey, { capture: true })
    document.addEventListener('click', suppressClick, { capture: true })
    return () => {
      document.removeEventListener('keydown', suppressKey, { capture: true })
      document.removeEventListener('click', suppressClick, { capture: true })
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      const isEditing = document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT'
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (isEditing) return
        e.preventDefault()
        performUndo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        if (isEditing) return
        e.preventDefault()
        performRedo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [performUndo, performRedo])

  return (
    <div className="app">
      <div className="workspace">
        {codePanelVisible && (
          <div className="panel panel-left">
            <div className="left-panel-header">
              <button
                className={`left-panel-tab ${leftPanelTab === 'layers' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('layers')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Layers
              </button>
              <button
                className={`left-panel-tab ${leftPanelTab === 'code' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('code')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                Code
              </button>
              <button
                className={`left-panel-tab ${leftPanelTab === 'css' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('css')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                CSS
              </button>
            </div>
            <div className={`left-panel-content${leftPanelTab === 'layers' ? '' : ' left-panel-hidden'}`}>
              <LayerPanel
                htmlCode={htmlCode}
                selectedElement={selectedElement}
                onLayerSelect={handleLayerSelect}
                onOpenContextMenu={handleOpenContextMenu}
                onOpenProperties={handleOpenGroupModal}
              />
            </div>
            <div className={`left-panel-content${leftPanelTab === 'code' ? '' : ' left-panel-hidden'}`}>
              <CodePanel
                ref={codePanelRef}
                value={htmlCode}
                onChange={handleCodeChange}
                onCodeSelectElement={handleCodeSelectElement}
                hint={toolHint}
              />
            </div>
            <div className={`left-panel-content${leftPanelTab === 'css' ? '' : ' left-panel-hidden'}`}>
              <CssPanel
                cssContent={cssContent}
                visualCssEnabled={visualCssEnabled}
                cssPseudoDisabled={cssPseudoDisabled}
                onCssChange={handleCssChange}
                onTogglePseudoEffects={() => setCssPseudoDisabled((v) => !v)}
              />
            </div>
          </div>
        )}
        <div className={`panel panel-right ${!codePanelVisible ? 'panel-full' : ''}`}>
          <Canvas
            htmlCode={htmlCode}
            onCodeChange={handleCodeChange}
            activeTool={activeTool}
            selectedRefs={selectedRefs}
            onSelectionChange={handleSelectionChange}
            onOpenContextMenu={handleOpenContextMenu}
            onOpenGroupModal={handleOpenGroupModal}
            clipboardRef={clipboardRef}
            actionsRef={actionsRef}
            onClipboardChange={handleClipboardChange}
            onSelectionUpdate={handleSelectionUpdate}
            onToggleCodePanel={handleToggleCodePanel}
            codePanelVisible={codePanelVisible}
            parsing={parsing}
            pathTagFilter={pathTagFilter}
            visualCssEnabled={visualCssEnabled}
            cssContent={cssContent}
            cssPseudoDisabled={cssPseudoDisabled}
            onTransientChange={handleTransientChange}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
          />
        </div>
      </div>

      <Toolbar
        activeTool={transientTool || activeTool}
        onToolChange={handleToolChange}
        selectedCount={selectedCount}
        onDelete={performDelete}
        onDeleteAll={performDeleteAll}
        onDeleteUnselected={performDeleteUnselected}
        onCleanEmptyGroups={performCleanEmptyGroups}
        onCleanEmptyAll={performCleanEmptyAll}
        onEmptyGroupRemoval={handleEmptyGroupRemoval}
        onToggleFormat={performToggleFormat}
        onClearSelections={performClearSelections}
        codePrettified={codePrettified}
        clipboardSize={clipboardSize}
        onSave={handleSaveSvg}
        onZoomToContent={performZoomToContent}
        onZoomToCenter={performZoomToCenter}
        onSelectZoomIn={performSelectZoomIn}
        onRotateSelected={performRotateSelected}
        pathTagFilter={pathTagFilter}
        onPathTagFilterChange={setPathTagFilter}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
      />

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        hasSelection={contextMenu.hasSelection || selectedCount > 0}
        isEmptyClick={contextMenu.isEmptyClick}
        onClose={handleCloseContextMenu}
        onDelete={performDelete}
        onGroup={performGroup}
        onCopy={performCopy}
        onCut={performCut}
        onPaste={performPaste}
        onSnapToCode={performSnapToCode}
        onCanvasSize={handleCanvasSize}
        onCanvasSizing={handleCanvasSizing}
        onStretchViewbox={handleStretchViewbox}
        clipboardSize={clipboardSize}
      />

      <GroupModal
        visible={groupModal.visible}
        target={groupModal.target}
        onClose={handleCloseGroupModal}
        onSave={handleSaveGroupAttributes}
      />

      <ArtboardModal
        visible={artboardModal.visible}
        htmlCode={htmlCode}
        onClose={() => setArtboardModal({ visible: false })}
        onSave={handleSaveArtboard}
      />

      <ConfirmModal
        visible={removalModal.visible}
        title="Remove Empty Groups"
        message={`Are you sure you want to remove ${removalModal.count} empty element${removalModal.count === 1 ? '' : 's'} (${removalModal.tagSelector})?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmEmptyGroupRemoval}
        onCancel={cancelEmptyGroupRemoval}
      />

      {saveModalOpen && (
        <div className="modal-backdrop" onClick={() => setSaveModalOpen(false)}>
          <div className="group-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Save SVG File</h3>
              <button className="modal-close" onClick={() => setSaveModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#999' }}>
                File name (optional)
              </label>
              <input
                ref={saveInputRef}
                type="text"
                className="save-name-input"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                placeholder="svg_master"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    downloadSvg(saveFileName)
                    setSaveModalOpen(false)
                  }
                }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333',
                  background: '#1a1a1a', color: '#e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setSaveModalOpen(false)}>Cancel</button>
              <button
                className="modal-btn modal-btn-save"
                onClick={() => {
                  downloadSvg(saveFileName)
                  setSaveModalOpen(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
