import React, { useState } from 'react'
import axios from 'axios'
import './JavaToCypress.css'


function JavaToCypress() {
  const [javaCode, setJavaCode] = useState('')
  const [cypressCode, setCypressCode] = useState('')
  const [loading, setLoading] = useState(false)

 const handleConvert = async () => {
  setLoading(true)
  try {
    const response = await axios.post('http://localhost:8000/api/java-to-cypress', {
      JavaCode: javaCode   // 🔁 key name must match backend: "JavaCode"
    })

    setCypressCode(response.data.cypressCode || '// No Cypress code returned')
  } catch (error) {
    setCypressCode('// Error converting code')
    console.error(error)
  }
  setLoading(false)
}


  return (
    <div className='page'>
      
      {/* Left Input Box */}
      <textarea className='textbox'
        placeholder="Paste Java Selenium code here..."
        value={javaCode}
        onChange={(e) => setJavaCode(e.target.value)}
      />

      {/* Center Button */}
      <div >
        <button
          onClick={handleConvert}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Converting...' : 'Convert to Cypress'}
        </button>
      </div>

      {/* Right Output Box */}
      <textarea
        className='textbox'
        placeholder="Cypress code will appear here..."
        value={cypressCode}
        readOnly
      />
    </div>
  )
}

export default JavaToCypress
