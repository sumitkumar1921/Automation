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

// Use them under base paths
app.use('/api/get-api-details', getApiDetailsRoute);
app.use('/api/java-to-cypress', java2CypressRoute);
app.use('/api/api-automation', apiAutomation);

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
