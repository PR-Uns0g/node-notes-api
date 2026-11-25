async function readRequestBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function methodNotAllowedResponse(res, allowedMethods) {
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
