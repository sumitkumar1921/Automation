import { Routes, Route, useNavigate } from 'react-router-dom'
import JavaToCypress from './pages/JavaToCypress.jsx'
import ApiAutomation from './pages/ApiAutomation.jsx'

function App() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => navigate('/api-automation')}
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          API Automation
        </button>
        <button
          onClick={() => navigate('/java-to-cypress')}
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          Java Selenium to Cypress
        </button>
      </div>

      <Routes>
        <Route path="/java-to-cypress" element={<JavaToCypress />} />
        <Route path="/api-automation" element={<ApiAutomation />} />
      </Routes>
    </div>
  )
}

export default App