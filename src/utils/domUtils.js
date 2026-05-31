export function isLeafElement(el) {
  if (!el || !el.tagName) return false
  return el.children.length === 0
}

function isSvgElement(el) {
  return el.tagName === el.tagName.toLowerCase()
}

export function getLeafElementsInRect(container, rect) {
  const result = []
  const svg = container.querySelector('svg')
  if (!svg) return result

  // Use SVG's native getIntersectionList when possible (much faster than manual bounding checks)
  if (typeof svg.getIntersectionList === 'function') {
    try {
      const svgRect = svg.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const vb = svg.getAttribute('viewBox')
      const parts = vb?.trim().split(/[\s,]+/).map(Number)
      if (parts && parts.length === 4) {
        const [vbX, vbY, vbW, vbH] = parts
        const scaleX = vbW / svgRect.width
        const scaleY = vbH / svgRect.height
        const left = (rect.left - (svgRect.left - containerRect.left)) * scaleX + vbX
        const top = (rect.top - (svgRect.top - containerRect.top)) * scaleY + vbY
        const svgMarquee = svg.createSVGRect()
        svgMarquee.x = left
        svgMarquee.y = top
        svgMarquee.width = (rect.right - rect.left) * scaleX
        svgMarquee.height = (rect.bottom - rect.top) * scaleY
        const nodes = svg.getIntersectionList(svgMarquee, null)
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i]
          if (el.children.length === 0) result.push(el)
        }
        return result
      }
    } catch {}
  }

  // Fallback: manual bounding rect check — only iterate SVG elements
  const containerRect = container.getBoundingClientRect()
  const all = svg ? svg.querySelectorAll('*') : container.querySelectorAll('*')
  for (const el of all) {
    if (el.children.length > 0) continue
    if (!isSvgElement(el)) continue
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

export function findNearestByTag(el, tag) {
  return el.closest(tag)
}

export function findNearestPath(el) {
  return el.closest('path')
}

export function isGroupElement(el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName.toLowerCase()
  const groupTags = new Set([
    'g', 'div', 'section', 'svg', 'main', 'article', 'nav',
    'header', 'footer', 'aside', 'ul', 'ol', 'li', 'table',
    'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'fieldset',
    'details', 'dialog', 'figure', 'figcaption',
  ])
  return groupTags.has(tag)
}

export const SVG_GROUP_TAGS = new Set(['g', 'svg'])

export function getElementAttributes(el) {
  const attrs = {}
  for (const attr of el.attributes) {
    attrs[attr.name] = attr.value
  }
  return attrs
}

export function setElementAttributes(el, attrs) {
  const toRemove = []
  for (const attr of el.attributes) {
    if (!attr.name.startsWith('data-marq-') && !(attr.name in attrs)) {
      toRemove.push(attr.name)
    }
  }
  for (const name of toRemove) {
    el.removeAttribute(name)
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== '' && value !== undefined && value !== null) {
      el.setAttribute(key, value)
    } else {
      el.removeAttribute(key)
    }
  }
}

export function extractElement(el, rootContainer) {
  const rect = el.getBoundingClientRect()
  const rootRect = rootContainer.getBoundingClientRect()

  const relX = rect.left - rootRect.left
  const relY = rect.top - rootRect.top

  const clone = el.cloneNode(true)

  if (rootContainer.closest('svg') || rootContainer.tagName.toLowerCase() === 'svg') {
    clone.setAttribute('transform', `translate(${relX}, ${relY})`)
  } else {
    clone.style.position = 'absolute'
    clone.style.left = `${relX}px`
    clone.style.top = `${relY}px`
  }

  rootContainer.appendChild(clone)
  el.remove()
  return clone
}

export function isContainer(el) {
  return el && el.children && el.children.length > 0
}

export function getLeafDescendants(container) {
  const leaves = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (node.children.length === 0) return NodeFilter.FILTER_ACCEPT
      return NodeFilter.FILTER_SKIP
    },
  })
  let node
  while ((node = walker.nextNode())) {
    leaves.push(node)
  }
  return leaves
}

export function getElementPathDescription(el) {
  const parts = []
  let current = el
  while (current && current !== document.body && current.parentElement) {
    const tag = current.tagName.toLowerCase()
    let desc = tag
    if (current.id) {
      desc = `${tag}#${current.id}`
    } else if (current.className && typeof current.className === 'string' && current.className.trim()) {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join('.')
      desc = `${tag}.${cls}`
    }
    parts.unshift(desc)
    current = current.parentElement
  }
  return parts.join(' > ') || el.tagName.toLowerCase()
}
