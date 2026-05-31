import { useState } from 'react'

function parseViewBox(html) {
  const vb = html.match(/viewBox=["']([^"']+)["']/)
  const w = html.match(/width=["']([^"']+)["']/)
  const h = html.match(/height=["']([^"']+)["']/)
  const parts = vb ? vb[1].split(/\s+/) : ['0', '0', '800', '600']
  return {
    vbX: parts[0] || '0',
    vbY: parts[1] || '0',
    vbW: parts[2] || '800',
    vbH: parts[3] || '600',
    width: w ? w[1] : (parts[2] || '800'),
    height: h ? h[1] : (parts[3] || '600'),
  }
}

export function updateSvgAttrs(html, { vbX, vbY, vbW, vbH, width, height }) {
  let result = html
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`
  if (result.includes('viewBox')) {
    result = result.replace(/viewBox=["'][^"']*["']/, `viewBox="${viewBox}"`)
  } else {
    const svgMatch = result.match(/<svg\s/)
    if (svgMatch) {
      result = result.replace('<svg', `<svg viewBox="${viewBox}"`)
    }
  }
  if (width !== undefined && result.includes('width=')) {
    result = result.replace(/width=["'][^"']*["']/, `width="${width}"`)
  }
  if (height !== undefined && result.includes('height=')) {
    result = result.replace(/height=["'][^"']*["']/, `height="${height}"`)
  }
  return result
}

export default function ArtboardModal({ visible, htmlCode, onClose, onSave }) {
  const [values, setValues] = useState(() => parseViewBox(htmlCode))

  if (!visible) return null

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const handleSave = () => {
    const updated = updateSvgAttrs(htmlCode, values)
    onSave(updated)
    onClose()
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="group-modal" style={{ width: 400 }}>
        <div className="modal-header">
          <h3>Sizing</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <span className="modal-section-title">ViewBox</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label className="artboard-label">X</label>
                <input className="artboard-input" value={values.vbX} onChange={set('vbX')} />
              </div>
              <div>
                <label className="artboard-label">Y</label>
                <input className="artboard-input" value={values.vbY} onChange={set('vbY')} />
              </div>
              <div>
                <label className="artboard-label">Width</label>
                <input className="artboard-input" value={values.vbW} onChange={set('vbW')} />
              </div>
              <div>
                <label className="artboard-label">Height</label>
                <input className="artboard-input" value={values.vbH} onChange={set('vbH')} />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <span className="modal-section-title">Display Size</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label className="artboard-label">Width</label>
                <input className="artboard-input" value={values.width} onChange={set('width')} />
              </div>
              <div>
                <label className="artboard-label">Height</label>
                <input className="artboard-input" value={values.height} onChange={set('height')} />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div>viewBox="{values.vbX} {values.vbY} {values.vbW} {values.vbH}"</div>
              <div>width="{values.width}" height="{values.height}"</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>Apply</button>
        </div>
      </div>
    </div>
  )
}
