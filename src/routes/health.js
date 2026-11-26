const { jsonResponse, methodNotAllowedResponse } =
  require("../http/responses");

async function health(req, res) {
  if (req.method !== "GET") {
    methodNotAllowedResponse(req, res, "GET");
    return;
  }

  jsonResponse(res, 200, {
    status: "healthy",
    message: "OK!",
  });
}

module.exports = { health };
