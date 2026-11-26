async function readRequestBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

module.exports = { readRequestBody };
