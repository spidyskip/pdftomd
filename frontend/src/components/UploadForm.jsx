import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import './UploadForm.css'

const API_BASE = '/api'

const UploadForm = ({ onJobCreated }) => {
  const [isUploading, setIsUploading] = useState(false)
  const [lastCount, setLastCount] = useState(0)

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsUploading(true)
    setLastCount(acceptedFiles.length)

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_BASE}/jobs`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.detail || 'Upload failed')
        }

        const result = await response.json()
        onJobCreated(result)
      } catch (error) {
        toast.error(`${file.name}: ${error.message}`)
      }
    }

    const label = acceptedFiles.length === 1 ? acceptedFiles[0].name : `${acceptedFiles.length} files`
    toast.success(`${label} queued`)
    setIsUploading(false)
  }, [onJobCreated])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
  })

  return (
    <div className="upload">
      <Toaster position="top-center" />
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${isUploading ? 'dropzone--disabled' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="dropzone-loading">
            <div className="dropzone-spinner" />
            <span className="dropzone-label">Processing…</span>
          </div>
        ) : (
          <div className="dropzone-content">
            <svg className="dropzone-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <span className="dropzone-label">
              {isDragActive ? 'Drop files here' : 'Drop PDFs here or click to upload'}
            </span>
            <span className="dropzone-hint">PDF files, up to 50 MB each</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadForm