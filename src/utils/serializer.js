export function stripSelectionMarkers(html) {
  return html
    .replace(/\s*data-marq-selected(=["']?["']?)?\s*/g, '')
    .replace(/\s*data-marq-path(=["']?["']?)?\s*/g, '')
}

export function serializeContainer(container, stripMarkers = true) {
  let html = container.innerHTML
  if (stripMarkers) {
    html = stripSelectionMarkers(html)
  }
  return html
}

export function prettyPrint(html) {
  let indent = 0
  const lines = []
  const tokens = html.replace(/>\s*</g, '>\n<').split('\n')

  for (let line of tokens) {
    line = line.trim()
    if (!line) continue

    const isClosing = line.startsWith('</')
    const isSelfClosing = line.endsWith('/>') || line.match(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)(\s|>)/i)
    const isComment = line.startsWith('<!--')

    if (isClosing && !isSelfClosing) {
      indent--
    }

    lines.push('  '.repeat(Math.max(0, indent)) + line)

    if (!isClosing && !isSelfClosing && !isComment && line.startsWith('<') && !line.startsWith('</')) {
      indent++
    }
  }

  return lines.join('\n')
}

export function minifyHtml(html) {
  return html
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .replace(/<!--.*?-->/gs, '')
    .trim()
}

export function isPrettified(html) {
  const lines = html.trim().split('\n')
  if (lines.length <= 1) return false
  const indentCount = lines.filter(l => l.startsWith(' ') || l.startsWith('\t')).length
  return indentCount > lines.length * 0.3
}
