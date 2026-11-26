const { logger } = require("./logger");

async function readRequestBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function methodNotAllowedResponse({ req, res }, allowedMethods) {
  logger.warn(`${req.method} method not allowed in this route`, {
    requestId: req.requestId,
    path: new URL(req.url, "http://localhost").pathname,
    allowedMethods,
  })
  res.writeHead(405, {
    Allow:
      typeof allowedMethods === "string"
        ? allowedMethods
        : allowedMethods.join(", "),
    "Content-Type": "application/json",
  });
  res.end(
    JSON.stringify({
      status: "ERROR",
      message: "Method not allowed!",
    }),
  );
}

module.exports = { readRequestBody, methodNotAllowedResponse };
