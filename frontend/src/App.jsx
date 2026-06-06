import React from 'react'
import UploadForm from './components/UploadForm'
import JobTable from './components/JobTable'
import MarkdownPreview from './components/MarkdownPreview'
import './App.css'

function App() {
  const [jobs, setJobs] = React.useState([])
  const [previewContent, setPreviewContent] = React.useState('')
  const [previewTitle, setPreviewTitle] = React.useState('')

  const handleJobCreated = (job) => {
    setJobs((prev) => [...prev, job])
  }

  const handleRemoveJob = (jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId))
  }

  const handlePreview = (content, title) => {
    setPreviewContent(content)
    setPreviewTitle(title)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF to Markdown</h1>
        <p>Convert PDF documents to structured Markdown using GLM-OCR</p>
      </header>

      <main className="app-main">
        <UploadForm onJobCreated={handleJobCreated} />
        <JobTable
          jobs={jobs}
          onRemoveJob={handleRemoveJob}
          onPreview={handlePreview}
        />
      </main>

      {previewContent && (
        <MarkdownPreview
          content={previewContent}
          title={previewTitle}
          onClose={() => setPreviewContent('')}
        />
      )}
    </div>
  )
}

export default App