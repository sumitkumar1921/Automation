const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

// Load route files
const getApiDetailsRoute = require('./routes/getApiDetails');
const java2CypressRoute = require('./routes/java2Cypress');
const apiAutomation= require('./routes/apiAutomation');
const aiAutomation= require('./routes/aiAutomation.js');
const getTestdata= require('./routes/getTestData.js');
const runTests = require('./routes/runTests.js');
const automateApi = require('./routes/automateApi.js');



// Use them under base paths
app.use('/api/get-api-details', getApiDetailsRoute);
app.use('/api/java-to-cypress', java2CypressRoute);
app.use('/api/api-automation', apiAutomation);
app.use('/api/ai-automation', aiAutomation);
app.use('/api/get-test-data', getTestdata);
app.use('/api/run-tests', runTests);
app.use('/api/automate-api', automateApi);

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
