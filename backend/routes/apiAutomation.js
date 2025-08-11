const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.post('/', async (req, res) => {
  try {
    const {
      apiDetail,
      valid,
      validResponse,
      invalidParameter,
      invalidParameterResponse,
      missingParameter,
      missingParameterResponse,
      invalidHeader,
      invalidHeaderResponse,
      missingHeader,
      missingHeaderResponse,
      schemaValidation
    } = req.body;

    if (!apiDetail || typeof valid !== 'string') {
      return res.status(400).json({ error: 'apiDetail and valid are required.' });
    }

    // ✅ Build testDataJson
    const testDataJson = {};
    const schemas = {};

    if (valid === 'true' && validResponse) {
      testDataJson.validResponse = JSON.parse(validResponse);
      schemas.validResponseSchema = await generateSchema(validResponse);
    }
    if (invalidParameter === 'true' && invalidParameterResponse) {
      testDataJson.invalidParameterResponse = JSON.parse(invalidParameterResponse);
      schemas.invalidParameterSchema = await generateSchema(invalidParameterResponse);
    }
    if (missingParameter === 'true' && missingParameterResponse) {
      testDataJson.missingParameterResponse = JSON.parse(missingParameterResponse);
      schemas.missingParameterSchema = await generateSchema(missingParameterResponse);
    }
    if (invalidHeader === 'true' && invalidHeaderResponse) {
      testDataJson.invalidHeaderResponse = JSON.parse(invalidHeaderResponse);
      schemas.invalidHeaderSchema = await generateSchema(invalidHeaderResponse);
    }
    if (missingHeader === 'true' && missingHeaderResponse) {
      testDataJson.missingHeaderResponse = JSON.parse(missingHeaderResponse);
      schemas.missingHeaderSchema = await generateSchema(missingHeaderResponse);
    }

    // ✅ Prompt to AI
    let prompt = `You are a senior QA automation engineer. Generate a Java TestNG class using RestAssured.\n`;
    prompt += `Use testData.json for all expected values.\n`;
    prompt += `Use assertions like:\n`;
    prompt += `In negative test cases responce code is also 200 \n`;
    prompt += `Assert.assertEquals(response.jsonPath().get(\"chatId\").toString(), expectedJson.get(\"chatId\").getAsString(), \"chatId mismatch\");\n`;
    prompt += `Avoid using for-loops to assert fields. Write individual assertions only.\n`;
    prompt += `Use file: testData.json loaded via Gson.\n`;

    if (schemaValidation === 'true') {
      prompt += `Also call SchemaValidation.validateSchema(response, \"<schema_file_name>.json\") per test case.\n`;
      prompt += `Example: SchemaValidation.validateSchema(response, \"ValidresponseSchema.json\")\n`;
      prompt += `Schema files are manually added and not inferred from test data.\n`;
    }

    prompt += `Class name: APILoginTest\n\n`;
    prompt += `API Detail:\n${apiDetail}\n\n`;

    prompt += `Test Data JSON:\n${JSON.stringify(testDataJson, null, 2)}\n\n`;

    if (valid === 'true') {
      prompt += `Write test for valid response using expectedJson.validResponse\n`;
    }
    if (invalidParameter === 'true') {
      prompt += `Write test for invalid parameters using expectedJson.invalidParameterResponse\n`;
    }
    if (missingParameter === 'true') {
      prompt += `Write test for missing parameters using expectedJson.missingParameterResponse\n`;
    }
    if (invalidHeader === 'true') {
      prompt += `Write test for invalid headers using expectedJson.invalidHeaderResponse\n`;
    }
    if (missingHeader === 'true') {
      prompt += `Write test for missing headers using expectedJson.missingHeaderResponse\n`;
    }

    const aiResponse = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'mistralai/devstral-small',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const fullContent = aiResponse.data.choices?.[0]?.message?.content || '';
    const javaCode = fullContent.replace(/```[a-z]*\n?|```/g, '').trim();

    res.json({
      success: true,
      code: javaCode,
      jsonFile: JSON.stringify(testDataJson, null, 2),
      schemas
    });
  } catch (error) {
    console.error('Error generating automation code:', error);
    res.status(500).json({ error: 'Automation generation failed.' });
  }
});

// 🧠 Simple schema generator for flat structures
async function generateSchema(jsonStr) {
  try {
    const json = JSON.parse(jsonStr);
    return inferSchema(json);
  } catch {
    return {};
  }
}

function inferSchema(obj) {
  if (Array.isArray(obj)) return { type: 'array', items: inferSchema(obj[0] || {}) };
  if (typeof obj === 'object' && obj !== null) {
    const properties = {};
    for (const key in obj) {
      const val = obj[key];
      properties[key] = inferSchema(val);
    }
    return { type: 'object', properties, required: Object.keys(properties) };
  }
  return { type: typeof obj };
}

module.exports = router;