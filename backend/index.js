const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

// Load route files
const apiResponce= require('./routes/apiResponce.js'); // this api hit on run button and give api resonce
const generateTestCases= require('./routes/generateTestCases.js'); // this api generate test cases from AI
const updateResponce = require('./routes/updateResponce.js'); // this api update json file with responce from server (expected responce from server)
const automateApi = require('./routes/automateApi.js'); // this api write test cases in java using AI
const formatJson= require('./routes/formatJson.js');



// Use them under base paths
app.use('/api/api-responce', apiResponce); //this api hit on run button and give api resonce
app.use('/api/generate-test-cases', generateTestCases); // this api generate test cases from AI
app.use('/api/update-responce', updateResponce);// this api update json file with responce from server (expected responce from server)
app.use('/api/automate-api', automateApi); // this api write test cases in java using AI
app.use('/api/format-json', formatJson)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
