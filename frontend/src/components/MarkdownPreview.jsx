import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './MarkdownPreview.css'

const MarkdownPreview = ({ content, title, onClose }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace('.pdf', '')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">{title}</span>
          <div className="preview-actions">
            <button className="btn" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn" onClick={handleDownload}>Download</button>
            <button className="btn btn-close" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="preview-body">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default MarkdownPreview