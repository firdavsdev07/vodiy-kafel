import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Eng tashqi chegara (S-043) — `Layout` ning o'zi yoki router
        yiqilsa ham odam oq ekran emas, tushunarli xabar ko'radi. */}
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
