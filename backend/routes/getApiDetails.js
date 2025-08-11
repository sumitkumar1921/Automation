const express = require('express');
const router = express.Router();

const extractCurlDetails = (rawCurl) => {
  const result = {
    method: 'GET',
    url: '',
    headers: {},
    params: {},
    body: {}
  };

  // Preprocess multiline backslashes
  const curlCommand = rawCurl.replace(/\\\n/g, ' ').replace(/\r?\n/g, ' ');

  // Detect method
  const methodMatch = curlCommand.match(/(?:--request|-X)\s+(\w+)/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  } else if (/--data|-d|--data-raw|--data-urlencode|--data-binary|-F/.test(curlCommand)) {
    result.method = 'POST';
  }

  // Override with --get
  if (/--get/.test(curlCommand)) result.method = 'GET';

  // Extract URL from --url or inline
  const urlMatch = curlCommand.match(/(?:--url\s+|curl\s(?:-[^\s]+\s+)*)['"]?(https?:\/\/[^\s'"]+)['"]?/i);
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

  // Extract headers (quoted or unquoted)
  const headerRegex = /(?:-H|--header)=?(?:\s+)?(?:"([^"]+)"|'([^']+)'|([^\s"']+))/g;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(curlCommand)) !== null) {
    const raw = headerMatch[1] || headerMatch[2] || headerMatch[3];
    const [key, ...rest] = raw.split(':');
    if (key && rest.length > 0) {
      const val = rest.join(':').trim();
      result.headers[key.trim()] = val.includes('$') ? `from variable: ${val}` : val;
    }
  }

  const isJson = result.headers['Content-Type'] === 'application/json';

  // Extract body
  const dataRegex = /(?:--data-urlencode|--data|-d|--data-raw|--data-binary)\s+(?:"([^"]+)"|'([^']+)'|([^\s"']+))/g;
  const formBody = {};
  const allDataEntries = [];
  let dataMatch;

  while ((dataMatch = dataRegex.exec(curlCommand)) !== null) {
    const rawData = dataMatch[1] || dataMatch[2] || dataMatch[3];
    allDataEntries.push(rawData);
  }

  if (allDataEntries.includes('@-')) {
    result.body = 'from stdin';
  } else if (allDataEntries.length === 1 && allDataEntries[0].startsWith('@')) {
    result.body = `from file: ${allDataEntries[0].substring(1)}`;
  } else if (isJson && allDataEntries.length === 1) {
    try {
      result.body = JSON.parse(allDataEntries[0]);
    } catch {
      result.body = { raw: allDataEntries[0] };
    }
  } else if (/--get/.test(curlCommand)) {
    allDataEntries.forEach(data => {
      const [key, ...rest] = data.split('=');
      result.params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
    });
  } else {
    allDataEntries.forEach(data => {
      const [key, ...rest] = data.split('=');
      const val = rest.join('=');
      formBody[decodeURIComponent(key)] = val.includes('$') ? `from variable: ${val}` : decodeURIComponent(val);
    });
    if (Object.keys(formBody).length > 0) {
      result.body = formBody;
    }
  }

  // Handle multipart uploads -F
  const formRegex = /(?:-F|--form)\s+(?:"([^"]+)"|'([^']+)'|([^\s"']+))/g;
  let formMatch;
  while ((formMatch = formRegex.exec(curlCommand)) !== null) {
    const raw = formMatch[1] || formMatch[2] || formMatch[3];
    const [key, valueRaw] = raw.split('=');
    if (valueRaw?.startsWith('@')) {
      const [filePathPart, ...metaParts] = valueRaw.slice(1).split(';');
      const fileUpload = { file: filePathPart };
      metaParts.forEach(m => {
        const [mk, mv] = m.split('=');
        if (mk && mv) fileUpload[mk.trim()] = mv.trim();
      });
      result.body[key] = fileUpload;
    } else {
      result.body[key] = valueRaw.includes('$') ? `from variable: ${valueRaw}` : valueRaw;
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

module.exports = router;
