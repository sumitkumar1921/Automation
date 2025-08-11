const express = require('express');
const router = express.Router();
const axios = require('axios');
const { default: stripJsonComments } = require('strip-json-comments');

router.post('/', async (req, res) => {
  try {
    const { curl, testCases } = req.body;

    if (!curl || !testCases) {
      return res.status(400).json({ success: false, message: 'Missing curl or testCases' });
    }

    // Clean test case JSON string (remove comments, trim)
    const cleaned = stripJsonComments(testCases)
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());

    // Construct prompt for AI including request for schemas
    let prompt = `You are a senior QA automation engineer.\n`;
    prompt += `Generate two Java classes: FetchReportDP (DataProvider) and FetchReportTest (TestNG tests) using RestAssured.\n\n`;
    prompt += `For every field in the test data JSON below, write an individual assertion line in the test class.\n`;
    prompt += `Use this assertion format:\n`;
    prompt += `Assert.assertEquals(response.jsonPath().get("<fieldPath>").toString(), expectedJson.get("<fieldPath>").getAsString(), "<fieldPath> mismatch");\n`;
    prompt += `Replace <fieldPath> with the exact JSON path or key.\n\n`;
    prompt += `Do NOT use loops, placeholders, or comments like "Add more assertions". Write every assertion explicitly.\n\n`;
    prompt += `Use the test data file named 'testData.json' loaded via Gson in the DataProvider.\n\n`;
    prompt += `Also, write the JSON Schema (Draft-07) for the VALID response (success case).\n`;
    prompt += `Also, write the JSON Schema (Draft-07) for the INVALID response (error case).\n\n`;
    prompt += `Also, validate schema in assertion in both valid and invalid case.\n\n`;
    prompt += `Here is the cURL command:\n${curl}\n\n`;
    prompt += `Here is the full test data JSON:\n${cleaned.join('\n')}\n`;

    // Call OpenRouter API
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/devstral-small',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful QA engineer that writes clean Java TestNG automation code with full assertions and JSON schemas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiOutput = response.data.choices[0].message.content;

    // Extract Java code blocks from AI response
    const codeBlocks = aiOutput.match(/```java\n([\s\S]*?)```/g);

    if (!codeBlocks || codeBlocks.length < 2) {
      return res.status(500).json({ success: false, message: 'AI response did not contain valid Java code blocks.' });
    }

    const dataProvider = codeBlocks[0].replace(/```java\n|```/g, '').trim();
    const testClass = codeBlocks[1].replace(/```java\n|```/g, '').trim();

    // Extract JSON Schema blocks for valid and invalid responses (look for ```json ... ``` blocks)
    // We expect 2 JSON schema blocks: first for valid, second for invalid
    const jsonSchemaBlocks = aiOutput.match(/```json\n([\s\S]*?)```/g) || [];

    let validSchema = '';
    let invalidSchema = '';

    if (jsonSchemaBlocks.length >= 2) {
      validSchema = jsonSchemaBlocks[0].replace(/```json\n|```/g, '').trim();
      invalidSchema = jsonSchemaBlocks[1].replace(/```json\n|```/g, '').trim();
    }

    return res.json({
      success: true,
      dataProvider,
      testClass,
      "schema in valid case": validSchema,
      "schema in invalid case": invalidSchema
    });

  } catch (error) {
    console.error('❌ Error in /automate-api:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
