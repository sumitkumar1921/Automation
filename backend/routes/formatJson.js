const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/', async (req, res) => {
  try {
    const { rawjson } = req.body;

    if (!rawjson) {
      return res.status(400).json({ error: "rawjson is required in payload" });
    }

    // Call OpenRouter AI with mistralai/devstral-small
    const response = await axios.post(
      `${process.env.AI_API_URL}`,
      {
        model: "mistralai/devstral-small",
        messages: [
          {
            role: "system",
            content: `
              You are a JSON test case generator.
              Always return only valid JSON, no explanations, no markdown.

              The JSON must always follow this structure:

              {
                "/************Valid Case******************/",
                "ValidCase": [ ... ],

                "/************Invalid <FieldName> Case******************/",
                "Invalid<FieldName>Case": [ ... ],

                "/************Invalid <AnotherField> Case******************/",
                "Invalid<AnotherField>Case": [ ... ]
              }

              Rules for generation:
              - Never add comments outside JSON.
              - Each invalid case group must be **separately labeled** like:
                "InvalidPrivateKeyCase", "InvalidPublicKeyCase", "InvalidGroupNameCase", etc.
              - Each invalid object must include "status", and when applicable also "errorCode" + "message".
              - Keep the original input structure in "data", only modify values to create valid/invalid scenarios.
              - Pretty-print JSON with 2-space indentation.
            `
          },
          {
            role: "user",
            content: rawjson
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiMessage = response.data.choices?.[0]?.message?.content;

    // Try to parse to confirm it's valid JSON
    let formatted;
    try {
      formatted = JSON.parse(aiMessage);
    } catch (err) {
      return res.status(200).json({ formattedJson: aiMessage });
    }

    res.json({ formattedJson: formatted });

  } catch (error) {
    console.error("Error formatting JSON:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Failed to format JSON",
      details: error?.response?.data || error.message
    });
  }
});

module.exports = router;
