import { useState, useRef, useCallback } from 'react'
import Toolbar from './components/Toolbar'
import CodePanel from './components/CodePanel'
import Canvas from './components/Canvas'
import ContextMenu from './components/ContextMenu'
import GroupModal from './components/GroupModal'
import { setElementAttributes } from './utils/domUtils'
import { serializeContainer } from './utils/serializer'
import './App.css'

const DEFAULT_CODE = `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="180" height="80" rx="8" fill="#6366f1" />
  <circle cx="300" cy="150" r="60" fill="#ec4899" />
  <ellipse cx="500" cy="120" rx="80" ry="40" fill="#14b8a6" />
  <line x1="100" y1="300" x2="300" y2="400" stroke="#f59e0b" stroke-width="4" />
  <polyline points="400,300 500,350 450,420 550,380" fill="none" stroke="#8b5cf6" stroke-width="3" />
  <polygon points="150,450 250,550 50,550" fill="#ef4444" />
  <path d="M600,100 C620,50 680,50 700,100 C720,150 680,200 650,200 C620,200 580,150 600,100Z" fill="#3b82f6" />

  <g id="logo-group" fill="#a855f7">
    <rect x="50" y="50" width="40" height="40" rx="6" />
    <rect x="100" y="50" width="40" height="40" rx="6" />
    <rect x="50" y="100" width="40" height="40" rx="6" />
  </g>

  <g id="icon-set" transform="translate(350, 250)">
    <circle cx="0" cy="0" r="20" fill="#10b981" />
    <g id="sub-group" transform="translate(60, 0)">
      <rect x="-15" y="-15" width="30" height="30" rx="4" fill="#f97316" />
      <path d="M-8,-8 L8,-8 L0,8Z" fill="#fff" opacity="0.6" />
    </g>
  </g>

  <text x="400" y="550" text-anchor="middle" font-size="20" font-family="system-ui" fill="#6b7280">
    Drag to marquee select — only deepest leaf nodes are selected
  </text>
</svg>`

export default function App() {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_CODE)
  const [activeTool, setActiveTool] = useState('select')
  const [selectedCount, setSelectedCount] = useState(0)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, hasSelection: false })
  const [groupModal, setGroupModal] = useState({ visible: false, target: null })

  const selectedRefs = useRef(new Set())
  const clipboardRef = useRef([])
  const [clipboardSize, setClipboardSize] = useState(0)
  const actionsRef = useRef(null)

  const handleCodeChange = useCallback((newCode) => {
    setHtmlCode(newCode)
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

  const handleOpenContextMenu = useCallback((x, y, target, desc, hasSelection) => {
    setContextMenu({ visible: true, x, y, target, desc, hasSelection })
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

  const handleSaveGroupAttributes = useCallback((target, attrs) => {
    setElementAttributes(target, attrs)
    const container = document.querySelector('.canvas-content')
    if (container) {
      const newHtml = serializeContainer(container, true)
      setHtmlCode(newHtml)
    }
  }, [])

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

  return (
    <div className="app">
      <div className="workspace">
        <div className="panel panel-left">
          <CodePanel
            value={htmlCode}
            onChange={handleCodeChange}
          />
        </div>
        <div className="panel panel-right">
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
        onClose={handleCloseContextMenu}
        onDelete={performDelete}
        onGroup={performGroup}
        onCopy={performCopy}
        onCut={performCut}
        onPaste={performPaste}
        onExtract={performExtract}
        clipboardSize={clipboardSize}
      />

      <GroupModal
        visible={groupModal.visible}
        target={groupModal.target}
        onClose={handleCloseGroupModal}
        onSave={handleSaveGroupAttributes}
      />
    </div>
  )
}
