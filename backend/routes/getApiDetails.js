const express = require('express');
const router = express.Router();

const extractCurlDetails = (curlCommand) => {
  const result = {
    method: 'GET',
    url: '',
    headers: {},
    params: {},
    body: {}
  };

  // Extract method (e.g., -X POST or --request POST)
  const methodMatch = curlCommand.match(/--request\s+(\w+)/i) || curlCommand.match(/-X\s+(\w+)/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  }

  // Extract URL
  const urlMatch = curlCommand.match(/curl\s(?:.*?\s)?['"]?(https?:\/\/[^\s'"]+)['"]?/i);
  if (urlMatch) {
    const fullUrl = urlMatch[1];
    const [path, queryString] = fullUrl.split('?');
    result.url = path;

    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [key, ...rest] = pair.split('=');
        result.params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
      });
    }
  }

  // Extract headers (-H or --header)
  const headerRegex = /(?:-H|--header)\s+(["'])([^"']+?):\s?([^"']+?)\1/g;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(curlCommand)) !== null) {
    const key = headerMatch[2];
    const value = headerMatch[3];
    result.headers[key] = value;
  }

  // Extract body (-d, --data, --data-raw)
  const bodyMatch = curlCommand.match(/(?:--data|-d|--data-raw)\s+(['"])([\s\S]*?)\1/);
  if (bodyMatch) {
    try {
      result.body = JSON.parse(bodyMatch[2]);
    } catch {
      result.body = bodyMatch[2]; // raw fallback
    }
  }

  return result;
};

router.post('/', (req, res) => {
  const { ApiCurl } = req.body;

  if (!ApiCurl) {
    return res.status(400).json({ error: 'ApiCurl is required' });
  }

  try {
    const apiDetails = extractCurlDetails(ApiCurl);
    res.json(apiDetails);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse cURL command', details: err.message });
  }
});

// ✅ Correct export
module.exports = router;
