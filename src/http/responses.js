const { logger } = require("../config/logger");

function jsonResponse(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function methodNotAllowedResponse(req, res, allowedMethods) {
  logger.warn(`${req.method} method not allowed in this route`, {
    requestId: req.requestId,
    path: new URL(req.url, "http://localhost").pathname,
    allowedMethods,
  });

  jsonResponse(
    res,
    405,
    { status: "ERROR", message: "Method not allowed!" },
    {
      Allow:
        typeof allowedMethods === "string"
          ? allowedMethods
          : allowedMethods.join(", "),
    },
  );
}

module.exports = { jsonResponse, methodNotAllowedResponse };
