import { useState, useRef, useCallback } from 'react'
import Toolbar from './components/Toolbar'
import CodePanel from './components/CodePanel'
import Canvas from './components/Canvas'
import ContextMenu from './components/ContextMenu'
import GroupModal from './components/GroupModal'
import ArtboardModal from './components/ArtboardModal'
import { setElementAttributes } from './utils/domUtils'
import { serializeContainer, prettyPrint, minifyHtml, isPrettified } from './utils/serializer'
import './App.css'

const DEFAULT_CODE = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 124 124" fill="none">
<rect width="124" height="124" rx="24" fill="#F97316"/>
<path d="M19.375 36.7818V100.625C19.375 102.834 21.1659 104.625 23.375 104.625H87.2181C90.7818 104.625 92.5664 100.316 90.0466 97.7966L26.2034 33.9534C23.6836 31.4336 19.375 33.2182 19.375 36.7818Z" fill="white"/>
<circle cx="63.2109" cy="37.5391" r="18.1641" fill="black"/>
<rect opacity="0.4" x="81.1328" y="80.7198" width="17.5687" height="17.3876" rx="4" transform="rotate(-45 81.1328 80.7198)" fill="#FDBA74"/>
</svg>`

export default function App() {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_CODE)
  const [activeTool, setActiveTool] = useState('select')
  const [selectedCount, setSelectedCount] = useState(0)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, hasSelection: false })
  const [groupModal, setGroupModal] = useState({ visible: false, target: null })
  const [codePanelVisible, setCodePanelVisible] = useState(true)
  const [selectedElement, setSelectedElement] = useState(null)
  const [artboardModal, setArtboardModal] = useState({ visible: false })
  const [parsing, setParsing] = useState(false)

  const selectedRefs = useRef(new Set())
  const clipboardRef = useRef([])
  const [clipboardSize, setClipboardSize] = useState(0)
  const actionsRef = useRef(null)
  const codePanelRef = useRef(null)
  const codePrettified = isPrettified(htmlCode)

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

  const toolHint = activeTool === 'select' ? 'Click to select · Drag to marquee'
    : activeTool === 'path-select' ? 'Click to select path elements'
    : activeTool === 'zoom' ? 'Scroll to zoom · Ctrl+click to zoom out' : ''

  const callAction = useCallback((name, ...args) => {
    if (actionsRef.current && actionsRef.current[name]) {
      actionsRef.current[name](...args)
    }
  }, [])

  const performDelete = useCallback(() => callAction('performDelete'), [callAction])
  const performCopy = useCallback(() => callAction('performCopy'), [callAction])
  const performCut = useCallback(() => callAction('performCut'), [callAction])
  const performPaste = useCallback(() => callAction('performPaste'), [callAction])
  const performExtract = useCallback(() => callAction('performExtract'), [callAction])
  const performGroup = useCallback(() => callAction('performGroup'), [callAction])
  const performCleanEmptyGroups = useCallback(() => callAction('cleanEmptyGroups'), [callAction])

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

  return (
    <div className="app">
      <div className="workspace">
        {codePanelVisible && (
          <div className="panel panel-left">
            <CodePanel
              ref={codePanelRef}
              value={htmlCode}
              onChange={handleCodeChange}
              selectedElement={selectedElement}
              onCodeSelectElement={handleCodeSelectElement}
              hint={toolHint}
            />
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
          />
        </div>
      </div>

      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        selectedCount={selectedCount}
        onDelete={performDelete}
        onExtract={performExtract}
        onCopy={performCopy}
        onCut={performCut}
        onPaste={performPaste}
        onGroup={performGroup}
        onCleanEmptyGroups={performCleanEmptyGroups}
        onToggleFormat={performToggleFormat}
        codePrettified={codePrettified}
        canDelete={selectedCount > 0}
        canExtract={selectedCount > 0}
        canCopy={selectedCount > 0}
        canPaste={clipboardSize > 0}
        clipboardSize={clipboardSize}
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
        onExtract={performExtract}
        onCanvasSize={handleCanvasSize}
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
    </div>
  )
}
