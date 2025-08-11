const parseCurl = (curl) => {
  const lines = curl.split(/\r?\n/).map(line => line.trim());
  const methodMatch = curl.match(/-X\s+(\w+)/i);
  const urlMatch = curl.match(/(https?:\/\/[^\s\\'"]+)/i);

  const headers = {};
  let dataRaw = '';
  let body = {};

  lines.forEach(line => {
    // Match headers: -H "Key: Value"
    const headerMatch = line.match(/-H\s+['"]?([^:]+):\s?(.+?)['"]?$/i);
    if (headerMatch) {
      headers[headerMatch[1].trim()] = headerMatch[2].trim();
    }

    // Match --data or --data-raw: --data '{"key":"value"}'
    const dataMatch = line.match(/--data(?:-raw)?\s+['"]?(.*)['"]?/i);
    if (dataMatch) {
      dataRaw = dataMatch[1].trim();
    }
  });

  // ✅ Unescape escaped quotes
  let unescapedData = dataRaw.replace(/\\"/g, '"');

  // ✅ Trim anything after the final closing brace `}`
  const closingIndex = unescapedData.lastIndexOf('}');
  if (closingIndex !== -1) {
    if (closingIndex < unescapedData.length - 1) {
      console.warn('⚠️ Extra characters after valid JSON body were trimmed.');
    }
    unescapedData = unescapedData.slice(0, closingIndex + 1);
  }

  // ✅ Try parsing JSON safely
  try {
    body = unescapedData ? JSON.parse(unescapedData) : {};
  } catch (err) {
    console.error('❌ Failed to parse JSON body from cURL:', unescapedData);
    throw new Error(`Invalid JSON in --data: ${err.message}`);
  }

  return {
    method: methodMatch ? methodMatch[1].toUpperCase() : 'POST',
    url: urlMatch ? urlMatch[1] : '',
    headers,
    body,
  };
};

module.exports = parseCurl;
