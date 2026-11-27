const { logger } = require("../config/logger");
const { jsonResponse } = require("./responses");
const { ApiError } = require("./apiError");

const codeMapping = {
    400: "MALFORMED_REQUEST_BODY",
    404: "NOTE_NOT_FOUND",
    405: "WRONG_METHOD",
    500: "SERVER_ERROR"
}

function errorHandler(err, req, res) {
  const error = err instanceof Error ? err : new Error(String(err));
  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : 500;
  const requestInfo = {
    requestId: req.requestId,
    method: req.method,
    path: req.url,
    statusCode,
    ...(isApiError && error.operation
      ? { operation: error.operation }
      : {}),
  };

  if (isApiError && statusCode < 500) {
    logger.warn("Request failed", {
      ...requestInfo,
      error: error.message,
    });
  } else {
    logger.error("Request failed unexpectedly", {
      ...requestInfo,
      error: error.message,
      stack: error.stack,
    });
  }

  if (res.destroyed || res.writableEnded) return;

  if (res.headersSent) {
    res.destroy(error);
    return;
  }

  jsonResponse(
    res,
    statusCode,
    {
      status: "ERROR",
      code: codeMapping[statusCode],
      message: isApiError ? error.message : "Internal server error!",
    },
    isApiError ? error.headers : {},
  );
}

module.exports = { errorHandler };
