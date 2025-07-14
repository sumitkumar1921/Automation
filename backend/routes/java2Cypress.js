const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

router.post('/', async (req, res) => {
  const { JavaCode } = req.body;

  if (!JavaCode) {
    return res.status(400).json({ error: 'JavaCode is required' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/devstral-small',
        messages: [
          {
            role: 'system',
            content: 'You are a code converter that transforms Java Selenium test code into Cypress JavaScript code. Respond with Cypress code only.',
          },
          {
            role: 'user',
            content: `Convert this Java Selenium code to Cypress:\n\n${JavaCode}`,
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:8000', // Optional for OpenRouter
          'X-Title': 'Java-to-Cypress-Converter'
        }
      }
    );

    // Clean up the response
    let cypressCode = response.data.choices?.[0]?.message?.content || '';
    cypressCode = cypressCode.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();

    res.json({ cypressCode });
  } catch (err) {
    console.error('OpenRouter API error:', err.message);
    res.status(500).json({
      error: 'Failed to convert Java code',
      details: err.response?.data || err.message
    });
  }
});

module.exports = router;
