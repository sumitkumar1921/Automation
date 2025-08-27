const express = require('express');
const router = express.Router();
const axios = require('axios');
const parseCurl = require('parse-curl');

router.post('/', async (req, res) => {
  const { ApiCurl } = req.body;

  if (!ApiCurl || typeof ApiCurl !== 'string') {
    return res.status(200).json({ success: false, message: 'ApiCurl must be a string' });
  }

  try {
    const parsed = parseCurl(ApiCurl);
    const method = (parsed.method || 'GET').toLowerCase();
    const url = parsed.url;
    const headers = parsed.header || {};
    const data = parsed.body || null;

    const response = await axios({
      method,
      url,
      headers,
      data,
      timeout: 10000,
    });

    //  Return only the actual API response body
    res.json({
        status: response.status,
        data: response.data,
      });

  } catch (error) {
    console.error('Request failed:', error.message);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message || 'Request failed',
      });
    }
  }
});

module.exports = router;
