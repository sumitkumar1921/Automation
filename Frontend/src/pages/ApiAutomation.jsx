import React, { useState } from 'react';
import './ApiAutomation.css';

function ApiAutomation() {
  const [curl, setCurl] = useState('');
  const [apiDetails, setApiDetails] = useState(null);
  const [testCases, setTestCases] = useState({
    valid: false,
    invalidParam: false,
    missingParam: false,
    invalidHeader: false,
    missingHeader: false,
    schemaValidation: false,
  });

  const [responses, setResponses] = useState({
    validResponse: '',
    invalidParameterResponse: '',
    missingParameterResponse: '',
    invalidHeaderResponse: '',
    missingHeaderResponse: '',
  });

  const [result, setResult] = useState('');
  const [jsonFile, setJsonFile] = useState('');
  const [schemaFile, setSchemaFile] = useState({});
  const [loading, setLoading] = useState(false);

  const handleCheckboxChange = (e) => {
    setTestCases({ ...testCases, [e.target.name]: e.target.checked });
  };

  const handleResponseChange = (e) => {
    setResponses({ ...responses, [e.target.name]: e.target.value });
  };

  const fetchApiDetails = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/get-api-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ApiCurl: curl }),
      });
      const data = await response.json();
      setApiDetails(data);
    } catch (error) {
      console.error('Error fetching API details:', error);
    }
  };

  const formatJson = (input) => {
    try {
      let parsed = typeof input === 'string' ? JSON.parse(input) : input;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return input;
    }
  };

  const automateApi = async () => {
    if (!apiDetails) return alert('Please fetch API details first.');

    const payload = {
      apiDetail: JSON.stringify(apiDetails),
      valid: testCases.valid.toString(),
      invalidParameter: testCases.invalidParam.toString(),
      missingParameter: testCases.missingParam.toString(),
      invalidHeader: testCases.invalidHeader.toString(),
      missingHeader: testCases.missingHeader.toString(),
      schemaValidation: testCases.schemaValidation.toString(),
    };

    if (testCases.valid) payload.validResponse = responses.validResponse;
    if (testCases.invalidParam) payload.invalidParameterResponse = responses.invalidParameterResponse;
    if (testCases.missingParam) payload.missingParameterResponse = responses.missingParameterResponse;
    if (testCases.invalidHeader) payload.invalidHeaderResponse = responses.invalidHeaderResponse;
    if (testCases.missingHeader) payload.missingHeaderResponse = responses.missingHeaderResponse;

    try {
      setLoading(true);
      setResult('');
      setJsonFile('');
      setSchemaFile({});
      const response = await fetch('http://localhost:8000/api/api-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const code = data.code || '';
      const cleanCode = code.replace(/^```[a-z]*\n?/, '').replace(/```$/, '');
      setResult(cleanCode);
      setJsonFile(formatJson(data.jsonFile || ''));
      setSchemaFile(data.schemas || {});
    } catch (error) {
      console.error('Error automating API:', error);
      setResult('// Error while fetching automation result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="api-automation-container">
        <div className="api-input">
          <textarea
            placeholder="Paste your cURL command here"
            value={curl}
            onChange={(e) => setCurl(e.target.value)}
          />
        </div>
        <div className="api-button-wrapper">
          <button onClick={fetchApiDetails}>Get API Details</button>
        </div>
        <div className="api-response">
          {apiDetails ? (
            <>
              <h2>Parsed API Details:</h2>
              <div><strong>Method:</strong> {apiDetails.method}</div>
              <div><strong>URL:</strong> {apiDetails.url}</div>
              <div><strong>Headers:</strong></div>
              <pre>{formatJson(apiDetails.headers)}</pre>
              <div><strong>Params:</strong></div>
              <pre>{formatJson(apiDetails.params)}</pre>
              <div><strong>Body:</strong></div>
              <pre>{formatJson(apiDetails.body)}</pre>
            </>
          ) : (
            <p className="text-gray-500">Parsed API details will appear here.</p>
          )}
        </div>
      </div>

      <div className="test-case-panel">
        <h2>Select Test Case Types:</h2>
        <label><input type="checkbox" name="valid" checked={testCases.valid} onChange={handleCheckboxChange} /> Valid Test Case</label>
        {testCases.valid && <textarea className="expanded-textarea" name="validResponse" placeholder="Expected valid response JSON" value={responses.validResponse} onChange={handleResponseChange} />}        
        <label><input type="checkbox" name="invalidParam" checked={testCases.invalidParam} onChange={handleCheckboxChange} /> Invalid Parameter</label>
        {testCases.invalidParam && <textarea className="expanded-textarea" name="invalidParameterResponse" placeholder="Expected error for invalid parameter" value={responses.invalidParameterResponse} onChange={handleResponseChange} />}
        <label><input type="checkbox" name="missingParam" checked={testCases.missingParam} onChange={handleCheckboxChange} /> Missing Parameter</label>
        {testCases.missingParam && <textarea className="expanded-textarea" name="missingParameterResponse" placeholder="Expected error for missing parameter" value={responses.missingParameterResponse} onChange={handleResponseChange} />}
        <label><input type="checkbox" name="invalidHeader" checked={testCases.invalidHeader} onChange={handleCheckboxChange} /> Invalid Header</label>
        {testCases.invalidHeader && <textarea className="expanded-textarea" name="invalidHeaderResponse" placeholder="Expected error for invalid header" value={responses.invalidHeaderResponse} onChange={handleResponseChange} />}
        <label><input type="checkbox" name="missingHeader" checked={testCases.missingHeader} onChange={handleCheckboxChange} /> Missing Header</label>
        {testCases.missingHeader && <textarea className="expanded-textarea" name="missingHeaderResponse" placeholder="Expected error for missing header" value={responses.missingHeaderResponse} onChange={handleResponseChange} />}
        <label><input type="checkbox" name="schemaValidation" checked={testCases.schemaValidation} onChange={handleCheckboxChange} /> Schema Validation</label>
      </div>

      <div className="text-center">
        <button className="automate-button" onClick={automateApi} disabled={loading || !apiDetails}>
          {loading ? 'Generating...' : 'Automate API'}
        </button>
        {loading && <div className="loader">Please wait, generating test cases...</div>}
      </div>

      {result && (
        <div className="automation-result mt-6">
          <h2>Generated Test Code:</h2>
          <textarea rows={25} className="automation-result-textarea" value={result} readOnly />
        </div>
      )}

      {jsonFile && (
        <div className="automation-result mt-6">
          <h2>Test Data (JSON):</h2>
          <textarea rows={15} className="automation-result-textarea" value={jsonFile} readOnly />
        </div>
      )}

      {schemaFile && Object.keys(schemaFile).length > 0 && (
        <div className="automation-result mt-6">
          <h2>Generated Response Schemas:</h2>
          {Object.entries(schemaFile).map(([key, schema]) => (
            <div key={key} className="mb-4">
              <h3 className="font-semibold">{key}</h3>
              <textarea
                className="automation-result-textarea"
                rows={10}
                value={formatJson(schema)}
                readOnly
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApiAutomation;