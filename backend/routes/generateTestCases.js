const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/', async (req, res) => {
  let { curl, selectedCases, instruction } = req.body;

  if (!curl || !instruction || !selectedCases) {
    return res.status(200).json({ 
      success: false,
      ErrorMessage: 'Missing curl, instruction, or selectedCases in request body ' 
    });
  }

  try {
    // Clean overly escaped cURL  
    curl = curl.replace(/\\"/g, '"');

    const caseDescriptions = [];
    if (selectedCases.valid) caseDescriptions.push('• 1 valid case');
    if (selectedCases.invalidParameter) caseDescriptions.push('• Invalid value for each parameter');
    if (selectedCases.missingParameter) caseDescriptions.push('• Missing each required parameter');
    if (selectedCases.invalidHeader) caseDescriptions.push('• Invalid value for each header');
    if (selectedCases.missingHeader) caseDescriptions.push('• Missing each required header');
    if (selectedCases.edgeCases) caseDescriptions.push(
      '• Edge cases: For each field, include two invalid test cases:\n' +
      '  - Wrong value but correct type\n' +
      '  - Wrong type (e.g., number instead of string)'
    );

    const prompt = `
You are an expert API tester.

Your task is to generate ONLY the test cases explicitly requested below.
Do NOT add any other test cases beyond the types mentioned.

Requested test case types:
${caseDescriptions.join('\n')}

Each test case must strictly follow this format:  (for post api)
// inline comment
{
  "headers": {
    
  },
  "body": {
    // for post api request body here 
  }
}
Each test case must strictly follow this format:  (for get api api)
// inline comment
{
  "headers": {
    
  },
  "params": {
    // all parameter here 
  }
}


Strict Rules:
- Use ONLY JS-style inline comments (e.g., // valid case)
- DO NOT include any markdown (no triple backticks)
- DO NOT include extra blocks or keys like "username"
- DO NOT change or test the URL or endpoint
- DO NOT use JS syntax like .repeat() or new Date()
- DO NOT invent or infer new fields or structures

Here is the cURL:
${curl}
`.trim();

    const openRouterRes = await axios.post(
      `${process.env.AI_API_URL}`,
      
      {
        model: 'mistralai/devstral-small',
        // max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
        },
      }
    );

    let aiReply = openRouterRes.data.choices?.[0]?.message?.content?.trim();
    let jsonPart = aiReply.replace(/^```(js|json)?\s*/i, '').replace(/```$/, '').trim();

    if (jsonPart.includes('.repeat(') || jsonPart.includes('new Date(')) {
      console.warn('Invalid JS code detected in AI response');
      return res.status(400).json({
        success: false,
        error: 'AI response includes invalid JavaScript-like syntax.',
        raw: aiReply,
      });
    }

    return res.json({
      success: true,
      testData: jsonPart,
    });
  } catch (err) {
    console.error('Error in /api/get-test-data:', err?.response?.data || err);
    return res.status(500).json({
      success: false,
      error: 'AI generation failed',
      message: err?.response?.data?.error?.message || err.message || 'Unknown error',
    });
  }
});

module.exports = router;
