const express = require('express');
const router = express.Router();
const axios = require('axios');
const { default: stripJsonComments } = require('strip-json-comments');
const parseCurl = require('../utils/parseCurls');
const qs = require('querystring');

router.post('/', async (req, res) => {
  try {
    const { curl, testCases } = req.body;
    if (!curl || !testCases) {
      return res.status(400).json({ success: false, message: 'Missing input' });
    }

    const parsedCurl = parseCurl(curl);
    let url = parsedCurl.url;
    let method = parsedCurl.method || 'POST';

    // Force GET for login endpoint
    if (url.includes('/user/login')) {
      method = 'GET';
    }

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

      if (!jsonPart || !/^[\[{]/.test(jsonPart)) {
        console.log('Skipping non-JSON block:', jsonPart);
        continue;
      }

      try {
        const test = JSON.parse(jsonPart);

        const headers = { ...parsedCurl.headers, ...(test.headers || {}) };
        const params = test.params || {};
        const body = test.body || {};

        const axiosConfig = {
          method,
          url,
          headers,
          validateStatus: () => true
        };

        if (method === 'GET') {
          if (Object.keys(params).length > 0) {
            const query = qs.stringify(params);
            axiosConfig.url = url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
          }
        } else {
          if (Object.keys(body).length > 0) {
            axiosConfig.data = body;
          }
        }

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
        results.push({
          comment: commentLine,
          body: jsonPart,
          response: {
            status: 'ERROR',
            error: { message: err.message }
          },
          error: true
        });
      }
    }

    res.json({ success: true, testResults: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
