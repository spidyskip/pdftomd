import UploadForm from "./components/UploadForm/UploadForm";
import JobList from "./components/JobList/JobList";
import MarkdownPreview from "./components/MarkdownPreview/MarkdownPreview";
import { JobProvider } from "./context/JobContext";
import Toast from "./components/Toast/Toast";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import ConnectionStatus from "./components/ConnectionStatus/ConnectionStatus";
import BackendToggle from "./components/BackendToggle/BackendToggle";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <JobProvider>
        <div className="app">
          <header className="app-header">
            <div className="app-header-top">
              <h1>PDF to Markdown</h1>
              <div className="app-header-right">
                <BackendToggle />
                <ConnectionStatus />
              </div>
            </div>
            <p>Convert PDF documents to structured Markdown using GLM-OCR</p>
          </header>
          <main className="app-main">
            <UploadForm />
            <JobList />
          </main>
          <MarkdownPreview />
          <Toast />
        </div>
      </JobProvider>
    </ErrorBoundary>
  );
}

export default App;
