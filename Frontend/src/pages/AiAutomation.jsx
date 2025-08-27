import React, { useState } from 'react';
import './AiAutomation.css';


function AiAutomation() {
  const [curl, setCurl] = useState('');
  const [response, setResponse] = useState('');
  const [automationCode, setAutomationCode] = useState('');
  const [jsonFile, setJsonFile] = useState('');
  const [dataProvider, setDataProvider] = useState('');
  // Removed testClass state as per request
  const [schemaValid, setSchemaValid] = useState('');
  const [schemaInvalid, setSchemaInvalid] = useState('');
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingGetData, setLoadingGetData] = useState(false);
  const [loadingRunTests, setLoadingRunTests] = useState(false);
  const [loadingAutomate, setLoadingAutomate] = useState(false);
  const [selectedCases, setSelectedCases] = useState({
    valid: false,
    invalidParameter: false,
    missingParameter: false,
    invalidHeader: false,
    missingHeader: false,
    edgeCases: false,
  });

  const handleRunApi = async () => {
    setLoadingRun(true);
    try {
      const res = await fetch('http://localhost:8000/api/api-responce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ApiCurl: curl }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse('Error: ' + err.message);
    } finally {
      setLoadingRun(false);
    }
  };

  const handleGetAutomationData = async () => {
    setLoadingGetData(true);
    try {
      const res = await fetch('http://localhost:8000/api/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curl,
          instruction: 'Generate test data for the API',
          selectedCases,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Use exact keys from your response object
        setJsonFile(data.testData || '');
        setDataProvider(
          data['dataProvider'] ? formatCodeString(data['dataProvider']) : ''
        );
        // Removed setTestClass since no testClass box now
        setSchemaValid(
          data['schema in valid case'] ? formatCodeString(data['schema in valid case']) : ''
        );
        setSchemaInvalid(
          data['schema in invalid case'] ? formatCodeString(data['schema in invalid case']) : ''
        );
      } else {
        setJsonFile('// Failed to get test data.\n' + (data.error || ''));
        setDataProvider('');
        setSchemaValid('');
        setSchemaInvalid('');
      }
    } catch (err) {
      setJsonFile('// Error: ' + err.message);
      setDataProvider('');
      setSchemaValid('');
      setSchemaInvalid('');
    } finally {
      setLoadingGetData(false);
    }
  };

  // Helper to pretty format code strings (add line breaks if missing, etc)
  const formatCodeString = (codeStr) => {
    try {
      // If string looks like JSON, pretty print it
      if (codeStr.trim().startsWith('{') || codeStr.trim().startsWith('[')) {
        return JSON.stringify(JSON.parse(codeStr), null, 2);
      }
    } catch {
      // Not JSON, just return original string
    }
    return codeStr;
  };

  const handleRunApiTests = async () => {
    setLoadingRunTests(true);
    try {
      let testCaseText = jsonFile;

      if (testCaseText.trim().startsWith('[') && testCaseText.trim().endsWith(']')) {
        const parsedArray = JSON.parse(testCaseText);
        const blocks = parsedArray.map((test, i) => {
          const comment = test.comment || `// Test case ${i + 1}`;
          const body = JSON.stringify(test.body || test, null, 2);
          return `${comment}\n${body}`;
        });
        testCaseText = blocks.join('\n\n');
      }

      const res = await fetch('http://localhost:8000/api/update-responce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curl: curl,
          testCases: testCaseText,
        }),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.testResults)) {
        const blocks = data.testResults.map((test) => {
          const comment = test.comment || '// Test case';
          const block = JSON.stringify(test, null, 2);
          return `${comment}\n${block}`;
        });
        setJsonFile(blocks.join('\n\n'));
      } else {
        setJsonFile('// Unexpected response format:\n' + JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setJsonFile('// Error: ' + err.message);
    } finally {
      setLoadingRunTests(false);
    }
  };

  const handleAutomateApi = async () => {
    setLoadingAutomate(true);
    try {
      const res = await fetch('http://localhost:8000/api/automate-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curl: curl,
          testCases: jsonFile,
          
        }),
      });

      const data = await res.json();
      console.log(data);
      
      if (data.success || data.code) {
        setAutomationCode(formatCodeString(data.testClass));
        setSchemaValid(formatCodeString(data["schema in valid case"]));
        setSchemaInvalid(formatCodeString(data["schema in invalid case"]));
        setDataProvider(formatCodeString(data.dataProvider));
      } else {
        setAutomationCode('// Failed to generate automation code.\n' + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      setAutomationCode('// Error: ' + err.message);
    } finally {
      setLoadingAutomate(false);
    }
  };

  const handleCheckboxChange = (key) => {
    setSelectedCases((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const caseLabels = {
    valid: 'Valid Case',
    invalidParameter: 'Invalid Parameter',
    missingParameter: 'Missing Parameter',
    invalidHeader: 'Invalid Header',
    missingHeader: 'Missing Header',
    edgeCases: 'Edge Cases',
  };

  return (
    <div className="automation-wrapper">
      <div className="automation-container">
        <textarea
          className="curl-input"
          placeholder="Paste cURL command here..."
          value={curl}
          onChange={(e) => setCurl(e.target.value)}
        />
        <button className="run-button" onClick={handleRunApi} disabled={loadingRun}>
          {loadingRun ? 'Running...' : 'Run'}
        </button>
        <textarea
          className="response-box"
          placeholder="Response will appear here..."
          value={response}
          readOnly
        />
      </div>

      <div className="section-two">
        <div className="checkbox-columns">
          {Object.entries(selectedCases).map(([key, val]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={val}
                onChange={() => handleCheckboxChange(key)}
              />{' '}
              {caseLabels[key] || key}
            </label>
          ))}
        </div>
        <div className="automate-button-wrapper">
          <button className="automate-button" onClick={handleGetAutomationData} disabled={loadingGetData}>
            {loadingGetData ? 'Generating...' : 'Get Automation Data'}
          </button>
          <button className="automate-button" onClick={handleRunApiTests} disabled={loadingRunTests}>
            {loadingRunTests ? 'Running Tests...' : 'Run API Tests'}
          </button>
          <button className="automate-button" onClick={handleAutomateApi} disabled={loadingAutomate}>
            {loadingAutomate ? 'Creating Code...' : 'Automate API'}
          </button>
        </div>
      </div>

      <div className="section-three two-column-output">
        <div className="left-output">
          <h3>JSON Test Data / API Test Results</h3>
          <pre className="automation-output">{jsonFile || 'No data yet.'}</pre>
        </div>
        <div className="right-output">
          <h3>Test Class</h3>
          <pre className="automation-output">{automationCode || 'No code yet.'}</pre>
        </div>
      </div>

      <div className="section-four">
        <div className="output-box">
          <h4>Data Provider</h4>
          <pre>{dataProvider || 'No data yet.'}</pre>
        </div>
        {/* Removed Test Class box as requested */}
        <div className="output-box">
          <h4>Schema (Valid Case)</h4>
          <pre>{schemaValid || 'No data yet.'}</pre>
        </div>
        <div className="output-box">
          <h4>Schema (Invalid Case)</h4>
          <pre>{schemaInvalid || 'No data yet.'}</pre>
        </div>
      </div>
    </div>
  );
}

export default AiAutomation;
