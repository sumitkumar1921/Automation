import { Routes, Route, useNavigate } from 'react-router-dom'
import AiAutomation from './pages/AiAutomation.jsx'

function App() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>

        <button
          onClick={() => navigate('/ai-automation')}
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          Ai Automation
        </button>
      </div>

      <Routes>
        <Route path="/ai-automation" element={<AiAutomation />} />
      </Routes>
    </div>
  )
}

export default App