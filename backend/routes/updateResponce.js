const express = require('express');
const router = express.Router();
const axios = require('axios');
const { default: stripJsonComments } = require('strip-json-comments');
const parseCurl = require('../utils/parseCurls');

router.post('/', async (req, res) => {
  try {
    const { curl, testCases } = req.body;
    if (!curl || !testCases) {
      return res.status(400).json({ success: false, message: 'Missing input' });
    }

    const parsedCurl = parseCurl(curl);
    let url = parsedCurl.url;
    const method = parsedCurl.method || 'POST';

    if (url.endsWith('"') || url.endsWith('%22')) {
      url = url.replace(/["%22]+$/, '');
    }

    const rawBlocks = testCases.split(/\n\s*\n/g);
    const results = [];

    for (const block of rawBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      const lines = trimmedBlock.split('\n');
      const commentLine = lines[0].startsWith('//') ? lines[0].trim() : '';
      const jsonLines = lines[0].startsWith('//') ? lines.slice(1).join('\n') : lines.join('\n');

      const jsonPart = stripJsonComments(jsonLines).trim();

      // ✅ Skip non-JSON blocks safely
      if (!jsonPart || !jsonPart.startsWith('{')) {
        console.log('⏭️ Skipping non-JSON block:', jsonPart);
        continue;
      }

      try {
        console.log('🧪 Parsing block:', jsonPart);
        const test = JSON.parse(jsonPart);
        const headers = test.headers || parsedCurl.headers || {};
        const body = test.body || test;

        const axiosConfig = {
          method,
          url,
          headers,
          data: body,
          validateStatus: () => true
        };

        const response = await axios(axiosConfig);

        const result = {
          comment: commentLine,
          body: test,
          response: {
            status: response.status,
            data: response.data
          }
        };

        if (response.status >= 400) {
          result.error = true;
        }

        results.push(result);
      } catch (err) {
        console.error('❌ Failed to parse JSON:', jsonPart);
        results.push({
          comment: commentLine,
          body: jsonPart,
          response: {
            status: 'ERROR',
            error: {
              message: err.message
            }
          },
          error: true
        });
      }
    }

    res.json({ success: true, testResults: results });
  } catch (err) {
    console.error('🔥 Server Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
