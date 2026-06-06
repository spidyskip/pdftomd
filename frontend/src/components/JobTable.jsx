import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import './JobTable.css'

const API_BASE = '/api'

const statusConfig = {
  queued: { label: 'Queued', color: 'var(--text-muted)' },
  processing: { label: 'Processing', color: 'var(--warning)' },
  finished: { label: 'Done', color: 'var(--success)' },
  failed: { label: 'Failed', color: 'var(--error)' },
}

const JobTable = ({ jobs, onRemoveJob, onPreview }) => {
  const [jobStatuses, setJobStatuses] = useState({})

  useEffect(() => {
    const interval = setInterval(async () => {
      for (const job of jobs) {
        if (job.status === 'finished' || job.status === 'failed') continue
        try {
          const res = await fetch(`${API_BASE}/jobs/${job.id}`)
          if (res.ok) {
            const data = await res.json()
            setJobStatuses((prev) => ({ ...prev, [job.id]: data }))
          }
        } catch {
          /* ignore */
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [jobs])

  const handleDownload = async (job) => {
    try {
      const res = await fetch(`${API_BASE}/result/${job.id}`)
      if (!res.ok) throw new Error('Result not ready')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${job.filename.replace('.pdf', '')}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleView = async (job) => {
    try {
      const res = await fetch(`${API_BASE}/result/${job.id}`)
      if (!res.ok) throw new Error('Result not ready')
      const text = await res.text()
      onPreview(text, job.filename)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="jobs-empty">
        <p>No documents yet</p>
        <span>Drop a PDF above to convert it to Markdown</span>
      </div>
    )
  }

  return (
    <div className="jobs">
      <div className="jobs-list">
        {jobs.map((job) => {
          const live = jobStatuses[job.id] || job
          const progress = live.progress || 0

          return (
            <div key={job.id} className="job-row">
              <div className="job-row-main">
                <span className="job-name">{job.filename}</span>
                <div className="job-meta">
                  {live.page_count != null && (
                    <span className="job-pages">{live.page_count} pages</span>
                  )}
                  <span className="job-status" style={{ color: statusConfig[live.status]?.color }}>
                    <span className="status-dot" />
                    {statusConfig[live.status]?.label || live.status}
                  </span>
                </div>
              </div>

              {live.status === 'processing' && (
                <div className="job-progress">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="progress-text">{live.status_text || `${progress}%`}</span>
                </div>
              )}

              {live.status === 'failed' && live.error && (
                <div className="job-error">{live.error}</div>
              )}

              <div className="job-actions">
                {live.status === 'finished' && (
                  <>
                    <button className="job-btn" onClick={() => handleView(job)}>Preview</button>
                    <button className="job-btn" onClick={() => handleDownload(job)}>Download</button>
                  </>
                )}
                <button className="job-btn job-btn-danger" onClick={() => onRemoveJob(job.id)}>Remove</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default JobTable